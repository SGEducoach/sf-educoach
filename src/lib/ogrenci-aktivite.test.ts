import { describe, expect, it } from "vitest";
import { GOREV_PENCERESI_GUN, gorevPenceresiBaslangici, ogrenciAktiviteOzetiEslestir, ogrenciAktiviteOzetleriGetir, type AktiviteRpcIstemcisi } from "@/lib/ogrenci-aktivite";

// Sahte RPC istemcisi: her çağrıda gelen öğrenci kimliklerini kaydeder, her
// kimlik için bir satır döner (gerçek RPC gibi öğrenci başına tek satır).
function sahteIstemci(cevap?: (ids: string[]) => { data: unknown; error: { message: string } | null }) {
  const cagrilar: { fn: string; ids: string[]; bugun: string }[] = [];
  const istemci: AktiviteRpcIstemcisi = {
    rpc: async (fn, args) => {
      const ids = args.p_student_ids as string[];
      cagrilar.push({ fn, ids, bugun: args.p_bugun as string });
      return cevap
        ? cevap(ids)
        : { data: ids.map((id) => ({ student_id: id, son_hareket: "2026-10-20", acik_gorev: 1, gorev_toplam: 2 })), error: null };
    },
  };
  return { istemci, cagrilar };
}

describe("ogrenciAktiviteOzetleriGetir", () => {
  it("RPC'yi doğru adla ve p_bugun ile çağırır, haritaya çevirir", async () => {
    const { istemci, cagrilar } = sahteIstemci();
    const harita = await ogrenciAktiviteOzetleriGetir(istemci, ["a", "b"], "2026-10-23");
    expect(cagrilar).toEqual([{ fn: "ogrenci_aktivite_ozeti", ids: ["a", "b"], bugun: "2026-10-23" }]);
    expect(harita.get("a")).toEqual({ studentId: "a", sonHareket: "2026-10-20", acikGorev: 1, gorevToplam: 2 });
    expect(harita.size).toBe(2);
  });

  it("tekrar eden kimlikleri teke indirir", async () => {
    const { istemci, cagrilar } = sahteIstemci();
    await ogrenciAktiviteOzetleriGetir(istemci, ["a", "a", "b"], "2026-10-23");
    expect(cagrilar[0].ids).toEqual(["a", "b"]);
  });

  it("500'den fazla öğrenciyi parçalara böler, hiçbirini kaybetmez (max_rows = 1000 sınırı)", async () => {
    const ids = Array.from({ length: 1234 }, (_, i) => `s${i}`);
    const { istemci, cagrilar } = sahteIstemci();
    const harita = await ogrenciAktiviteOzetleriGetir(istemci, ids, "2026-10-23");
    expect(cagrilar.map((c) => c.ids.length)).toEqual([500, 500, 234]);
    expect(harita.size).toBe(1234);
  });

  it("boş listede RPC çağırmaz", async () => {
    const { istemci, cagrilar } = sahteIstemci();
    expect((await ogrenciAktiviteOzetleriGetir(istemci, [], "2026-10-23")).size).toBe(0);
    expect(cagrilar).toHaveLength(0);
  });

  it("RPC hatasında fırlatır (eksik veriyle sessizce devam etmez)", async () => {
    const { istemci } = sahteIstemci(() => ({ data: null, error: { message: "permission denied" } }));
    await expect(ogrenciAktiviteOzetleriGetir(istemci, ["a"], "2026-10-23")).rejects.toThrow("permission denied");
  });
});

describe("gorevPenceresiBaslangici", () => {
  it("pencere 30 gün (kullanıcı kararı 23.10.2026)", () => {
    expect(GOREV_PENCERESI_GUN).toBe(30);
  });

  it("bugünden 30 gün öncesini döner", () => {
    expect(gorevPenceresiBaslangici("2026-10-23")).toBe("2026-09-23");
  });

  it("ay/yıl sınırını doğru geçer", () => {
    expect(gorevPenceresiBaslangici("2026-01-05")).toBe("2025-12-06");
  });
});

describe("ogrenciAktiviteOzetiEslestir", () => {
  it("eksik görev alanlarını 0'a çevirir", () => {
    expect(ogrenciAktiviteOzetiEslestir({ student_id: "s1", son_hareket: null, acik_gorev: null, gorev_toplam: null })).toEqual({
      studentId: "s1",
      sonHareket: null,
      acikGorev: 0,
      gorevToplam: 0,
    });
  });

  it("RPC satırını uygulama tipine çevirir", () => {
    expect(ogrenciAktiviteOzetiEslestir({ student_id: "s2", son_hareket: "2026-10-20", acik_gorev: 2, gorev_toplam: 5 })).toEqual({
      studentId: "s2",
      sonHareket: "2026-10-20",
      acikGorev: 2,
      gorevToplam: 5,
    });
  });
});
