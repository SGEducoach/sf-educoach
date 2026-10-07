import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: "mod", role: "ogretmen", school: "school-a", tur: "okul", kademe: "lise",
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
      : table === "schools" ? [{ id: state.school, tur: state.tur, kademe: state.kademe }]
      : table === "classes" ? [{ seviye: "9" }, { seviye: "11" }]
      : table === "teachers" && filters.school_id === state.school && filters.id === "rehber-a"
        ? [{ id: "rehber-a" }] : [];
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

describe("Lise rehber sınıf ataması — sunucu yetkisi", () => {
  beforeEach(() => Object.assign(state, { user: "mod", role: "ogretmen", school: "school-a", tur: "okul", kademe: "lise", updated: [] }));
  it("moderatör 9 ve 11 atayabilir; tekrarlı düzeyler tekilleşir", async () => {
    expect((await rehberSinifAtamasiKaydet("rehber-a", ["9", "11", "9"])).error).toBeNull();
    expect(state.updated).toEqual([{ rehber_sinif_duzeyleri: ["9", "11"] }]);
  });
  it("boş seçim erişimi kaldırmak için kaydedilebilir", async () => {
    expect((await rehberSinifAtamasiKaydet("rehber-a", [])).error).toBeNull();
    expect(state.updated).toEqual([{ rehber_sinif_duzeyleri: [] }]);
  });
  it.each(["dershane", "grup"])("%s kurumuna dokunmaz", async (tur) => {
    state.tur = tur;
    expect((await rehberSinifAtamasiKaydet("rehber-a", ["9"])).error).toBeTruthy();
    expect(state.updated).toEqual([]);
  });
  it.each(["8", "12", "hatalı"])("kurumda olmayan/geçersiz %s düzeyini reddeder", async (seviye) => {
    expect((await rehberSinifAtamasiKaydet("rehber-a", [seviye])).error).toBeTruthy();
    expect(state.updated).toEqual([]);
  });
  it("başka kurum adına gönderilen isteği reddeder", async () => {
    expect((await rehberSinifAtamasiKaydet("rehber-a", ["9"], "school-b")).error).toBeTruthy();
    expect(state.updated).toEqual([]);
  });
  it("başka öğretmen kaydını güncelleyemez", async () => {
    expect((await rehberSinifAtamasiKaydet("rehber-b", ["9"])).error).toBeTruthy();
    expect(state.updated).toEqual([]);
  });
  it("oturumsuz istek veri yazamaz", async () => {
    state.user = "";
    expect((await rehberSinifAtamasiKaydet("rehber-a", ["9"])).error).toBeTruthy();
    expect(state.updated).toEqual([]);
  });
  it("ortaokul kurumuna dokunmaz", async () => {
    state.kademe = "ortaokul";
    expect((await rehberSinifAtamasiKaydet("rehber-a", ["9"])).error).toBeTruthy();
    expect(state.updated).toEqual([]);
  });
});
