import { describe, expect, it } from "vitest";
import type { AktiviteRpcIstemcisi } from "@/lib/ogrenci-aktivite";
import { sinifAnalizOzetiEslestir, sinifAnalizOzetleriGetir } from "@/lib/sinif-analiz-ozeti";

const satir = (id: string) => ({
  student_id: id, aktiflik: 3, son_donem: 2, onceki_donem: 1,
  gorev_toplam: 10, gorev_tamamlanan: 4, gorev_bekleyen: 5, gorev_tamamlanmayan: 1, veri_var_mi: true,
});

function sahteIstemci(cevap?: (ids: string[]) => { data: unknown; error: { message: string } | null }) {
  const cagrilar: { fn: string; args: Record<string, unknown> }[] = [];
  const istemci: AktiviteRpcIstemcisi = {
    rpc: async (fn, args) => {
      cagrilar.push({ fn, args });
      const ids = args.p_student_ids as string[];
      return cevap ? cevap(ids) : { data: ids.map(satir), error: null };
    },
  };
  return { istemci, cagrilar };
}

describe("sinifAnalizOzetiEslestir", () => {
  it("RPC satırını uygulama tipine çevirir", () => {
    expect(sinifAnalizOzetiEslestir(satir("s1"))).toEqual({
      studentId: "s1", aktiflik: 3, sonDonem: 2, oncekiDonem: 1,
      gorevToplam: 10, gorevTamamlanan: 4, gorevBekleyen: 5, gorevTamamlanmayan: 1, verisiVarMi: true,
    });
  });

  it("eksik alanları 0 / false yapar", () => {
    const bos = sinifAnalizOzetiEslestir({
      student_id: "s2", aktiflik: null, son_donem: null, onceki_donem: null,
      gorev_toplam: null, gorev_tamamlanan: null, gorev_bekleyen: null, gorev_tamamlanmayan: null, veri_var_mi: null,
    });
    expect(bos).toEqual({
      studentId: "s2", aktiflik: 0, sonDonem: 0, oncekiDonem: 0,
      gorevToplam: 0, gorevTamamlanan: 0, gorevBekleyen: 0, gorevTamamlanmayan: 0, verisiVarMi: false,
    });
  });
});

describe("sinifAnalizOzetleriGetir", () => {
  it("RPC'yi doğru ad ve parametrelerle çağırır", async () => {
    const { istemci, cagrilar } = sahteIstemci();
    const harita = await sinifAnalizOzetleriGetir(istemci, ["a", "b"], "2026-10-23", 30, 14);
    expect(cagrilar).toEqual([{
      fn: "sinif_analiz_ozeti",
      args: { p_student_ids: ["a", "b"], p_bugun: "2026-10-23", p_aktiflik_gun: 30, p_trend_gun: 14 },
    }]);
    expect(harita.get("b")?.gorevToplam).toBe(10);
  });

  it("500'den fazla öğrenciyi parçalar, hiçbirini kaybetmez (max_rows = 1000 sınırı)", async () => {
    const ids = Array.from({ length: 1100 }, (_, i) => `s${i}`);
    const { istemci, cagrilar } = sahteIstemci();
    const harita = await sinifAnalizOzetleriGetir(istemci, ids, "2026-10-23", 30, 14);
    expect(cagrilar.map((c) => (c.args.p_student_ids as string[]).length)).toEqual([500, 500, 100]);
    expect(harita.size).toBe(1100);
  });

  it("boş listede RPC çağırmaz", async () => {
    const { istemci, cagrilar } = sahteIstemci();
    expect((await sinifAnalizOzetleriGetir(istemci, [], "2026-10-23", 30, 14)).size).toBe(0);
    expect(cagrilar).toHaveLength(0);
  });

  it("RPC hatasında fırlatır", async () => {
    const { istemci } = sahteIstemci(() => ({ data: null, error: { message: "function does not exist" } }));
    await expect(sinifAnalizOzetleriGetir(istemci, ["a"], "2026-10-23", 30, 14)).rejects.toThrow("function does not exist");
  });
});
