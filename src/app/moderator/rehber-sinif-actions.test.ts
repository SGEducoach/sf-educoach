import { beforeEach, describe, expect, it, vi } from "vitest";

// Rehberlik Servisi atamaları (migration 0144). 0143'ten iki fark:
//   1) kimlik teachers.brans değil, rehberlik_servisi üyeliği;
//   2) kapsam yalnız lise (9-12) değil, kurumun GERÇEK sınıf düzeyleri —
//      ortaokul+lise bir okulda rehberler kademeleri paylaşabildiği için.
const state = vi.hoisted(() => ({
  user: "mod", role: "ogretmen", school: "school-a", tur: "okul",
  siniflar: ["9", "11"] as string[],
  uyeler: ["rehber-a"] as string[],
  updated: [] as unknown[],
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: state.user ? { id: state.user } : null } }) },
}) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({
  from: (table: string) => {
    const filters: Record<string, unknown> = {};
    const rows = () => table === "profiles" ? [{ role: state.role }]
      : table === "school_moderators" ? [{ school_id: state.school }]
      : table === "schools" ? [{ id: state.school, tur: state.tur }]
      : table === "classes" ? state.siniflar.map((seviye) => ({ seviye }))
      : table === "rehberlik_servisi"
        && filters.school_id === state.school
        && state.uyeler.includes(filters.profile_id as string)
        ? [{ profile_id: filters.profile_id }] : [];
    const chain = {
      select: () => chain,
      eq: (key: string, value: unknown) => { filters[key] = value; return chain; },
      is: () => chain,
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      update: (value: unknown) => { state.updated.push(value); return chain; },
      insert: async () => ({ error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows(), error: null }).then(resolve),
    };
    return chain;
  },
}) }));

import { rehberSinifAtamasiKaydet } from "./rehber-sinif-actions";

describe("Rehberlik Servisi sınıf ataması — sunucu yetkisi", () => {
  beforeEach(() => Object.assign(state, {
    user: "mod", role: "ogretmen", school: "school-a", tur: "okul",
    siniflar: ["9", "11"], uyeler: ["rehber-a"], updated: [],
  }));

  it("moderatör 9 ve 11 atayabilir; tekrarlı düzeyler tekilleşir", async () => {
    expect((await rehberSinifAtamasiKaydet("rehber-a", ["9", "11", "9"])).error).toBeNull();
    expect(state.updated).toEqual([{ sinif_duzeyleri: ["9", "11"] }]);
  });

  it("boş seçim erişimi kaldırmak için kaydedilebilir", async () => {
    expect((await rehberSinifAtamasiKaydet("rehber-a", [])).error).toBeNull();
    expect(state.updated).toEqual([{ sinif_duzeyleri: [] }]);
  });

  // 0144 ile gelen davranış: ortaokul kapsam DIŞI değil. Kademe paylaşımı
  // ("biri 5-8, diğeri 9-12") ancak bu sayede kurulabiliyor.
  it("ortaokul düzeyi (5-8) atanabilir", async () => {
    state.siniflar = ["5", "6", "7", "8"];
    expect((await rehberSinifAtamasiKaydet("rehber-a", ["5", "8"])).error).toBeNull();
    expect(state.updated).toEqual([{ sinif_duzeyleri: ["5", "8"] }]);
  });

  it("ortaokul+lise kurumunda kademeler ayrı ayrı paylaşılabilir", async () => {
    state.siniflar = ["5", "6", "7", "8", "9", "10", "11", "12"];
    state.uyeler = ["rehber-a", "rehber-b"];
    expect((await rehberSinifAtamasiKaydet("rehber-a", ["5", "6", "7", "8"])).error).toBeNull();
    expect((await rehberSinifAtamasiKaydet("rehber-b", ["9", "10", "11", "12"])).error).toBeNull();
    expect(state.updated).toEqual([
      { sinif_duzeyleri: ["5", "6", "7", "8"] },
      { sinif_duzeyleri: ["9", "10", "11", "12"] },
    ]);
  });

  it.each(["dershane", "grup"])("%s kurumuna dokunmaz", async (tur) => {
    state.tur = tur;
    expect((await rehberSinifAtamasiKaydet("rehber-a", ["9"])).error).toBeTruthy();
    expect(state.updated).toEqual([]);
  });

  it.each(["8", "12", "hatalı", "4"])("kurumda olmayan/geçersiz %s düzeyini reddeder", async (seviye) => {
    expect((await rehberSinifAtamasiKaydet("rehber-a", [seviye])).error).toBeTruthy();
    expect(state.updated).toEqual([]);
  });

  it("başka kurum adına gönderilen isteği reddeder", async () => {
    expect((await rehberSinifAtamasiKaydet("rehber-a", ["9"], "school-b")).error).toBeTruthy();
    expect(state.updated).toEqual([]);
  });

  // Kimlik artık branş değil: servise ÜYE OLMAYAN öğretmene düzey atanamaz.
  it("servis üyesi olmayan öğretmene atama yapamaz", async () => {
    expect((await rehberSinifAtamasiKaydet("rehber-b", ["9"])).error).toBeTruthy();
    expect(state.updated).toEqual([]);
  });

  it("oturumsuz istek veri yazamaz", async () => {
    state.user = "";
    expect((await rehberSinifAtamasiKaydet("rehber-a", ["9"])).error).toBeTruthy();
    expect(state.updated).toEqual([]);
  });
});
