import { beforeEach, describe, expect, it, vi } from "vitest";
import { MUFREDAT_BASVURU_ONEKI, mufredatBasvurusunuOku } from "@/lib/mufredat-basvurusu";

const state = vi.hoisted(() => ({
  user: "ogretmen-a", role: "ogretmen", aktif: true, schoolId: "11111111-1111-4111-8111-111111111111",
  okul: true, yazmaHatasi: false, profilHatasi: false, inserted: [] as { table: string; row: Record<string, unknown> }[],
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("redirect"); }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: state.user ? { id: state.user } : null } }) },
  from: () => { const chain = { select: () => chain, eq: () => chain, single: async () => ({ data: { role: state.role } }), maybeSingle: async () => ({
    data: { role: state.role, aktif: state.aktif }, error: state.profilHatasi ? { message: "hata" } : null,
  }) }; return chain; },
}) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: (table: string) => {
  const chain = {
    select: () => chain, eq: () => chain,
    maybeSingle: async () => ({ data: table === "teachers" ? { school_id: state.schoolId }
      : state.okul ? { ad: "Gerçek Okul" } : null, error: null }),
    insert: async (row: Record<string, unknown>) => { state.inserted.push({ table, row }); return { error: state.yazmaHatasi ? { message: "secret sql error" } : null }; },
  }; return chain;
} }) }));

import { mufredatBasvurusuGonder } from "./mufredat-basvuru-actions";
import { hataBildir } from "./hata-actions";
const girdi = { kademe: "lise", program: "Maarif", sinif: "11", ders: "Matematik", konu: "Trigonometri", altBaslik: "Birim çember",
  hataTuru: "alt_baslik_eksik", tespit: "Birim çember alt başlığı eksik görünüyor.", oneri: "Birim çember başlığı bu konunun altına eklenmeli.", onerilenSinif: "", kaynak: "" };

describe("müfredat başvurusu sunucu sınırı", () => {
  beforeEach(() => Object.assign(state, { user: "ogretmen-a", role: "ogretmen", aktif: true,
    schoolId: "11111111-1111-4111-8111-111111111111", okul: true, yazmaHatasi: false, profilHatasi: false, inserted: [] }));
  it("kimlik ve kurumu sunucudan alır; yalnız hata kaydı yazar, müfredatı değiştirmez", async () => {
    expect((await mufredatBasvurusuGonder({ ...girdi, kurumId: "baska-kurum", bildiren_id: "baskasi" }, "/dashboard/dersler")).error).toBeNull();
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0].table).toBe("hata_bildirimleri");
    expect(state.inserted[0].row).toMatchObject({ bildiren_id: "ogretmen-a", bildiren_rol: "ogretmen", sayfa: "/dashboard/dersler" });
    expect(mufredatBasvurusunuOku(state.inserted[0].row.mesaj as string)).toMatchObject({ kurumId: state.schoolId, kurumAdi: "Gerçek Okul" });
  });
  it.each(["ogrenci", "veli", "mudur", "admin"])("%s rolü doğrudan action ile başvuru yazamaz", async (role) => {
    state.role = role;
    expect((await mufredatBasvurusuGonder(girdi)).error).toBeTruthy();
    expect(state.inserted).toEqual([]);
  });
  it("oturumsuz ve pasif hesaplar yazamaz", async () => {
    state.user = "";
    expect((await mufredatBasvurusuGonder(girdi)).error).toBeTruthy();
    state.user = "ogretmen-a"; state.aktif = false;
    expect((await mufredatBasvurusuGonder(girdi)).error).toBeTruthy();
    expect(state.inserted).toEqual([]);
  });
  it("profil hatasında ve kurum kaydı eksikken güvenli şekilde reddeder", async () => {
    state.profilHatasi = true;
    expect((await mufredatBasvurusuGonder(girdi)).error).toBeTruthy();
    state.profilHatasi = false; state.schoolId = "";
    expect((await mufredatBasvurusuGonder(girdi)).error).toBeTruthy();
    state.schoolId = "11111111-1111-4111-8111-111111111111"; state.okul = false;
    expect((await mufredatBasvurusuGonder(girdi)).error).toBeTruthy();
    expect(state.inserted).toEqual([]);
  });
  it("geçersiz tespit ve öneri veri tabanına ulaşmaz", async () => {
    expect((await mufredatBasvurusuGonder({ ...girdi, oneri: "" })).error).toBeTruthy();
    expect(state.inserted).toEqual([]);
  });
  it("veritabanı hatasını başarı saymaz ve iç hata bilgisini sızdırmaz", async () => {
    state.yazmaHatasi = true;
    const r = await mufredatBasvurusuGonder(girdi);
    expect(r.error).toContain("kaydedilemedi");
    expect(r.error).not.toContain("secret");
  });
  it("geçersiz sayfayı güvenli yerel yola dönüştürür", async () => {
    await mufredatBasvurusuGonder(girdi, "https://baska.example");
    expect(state.inserted[0].row.sayfa).toBe("/dashboard");
  });
  it("genel hata formundan sahte kurum bağlamıyla müfredat başvurusu üretilemez", async () => {
    expect((await hataBildir(MUFREDAT_BASVURU_ONEKI + JSON.stringify({ ...girdi, kurumId: "baska-okul" }))).error).toContain("formunu kullanın");
    expect(state.inserted).toEqual([]);
  });
});
