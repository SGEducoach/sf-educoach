import { describe, expect, test } from "vitest";
import { EN_FAZLA_KART, bugunKartlari, gunMesaji, sureEtiketi, zamanEtiketi } from "./ortaokul-bugun";
import type { BugunGorevi } from "./ortaokul-bugun";

const BUGUN = "2026-10-05";

function gorev(o: Partial<BugunGorevi> & { atamaId: string; tarih: string }): BugunGorevi {
  return {
    tur: "Soru çözme", ders: "Matematik", konu: null, sonTarih: null,
    hedefSoruSayisi: null, hedefDakika: null, ogretmenAdi: null, tamamlandi: false,
    ...o,
  };
}

describe("zamanEtiketi", () => {
  test("yaşa uygun ifade, ham tarih değil", () => {
    expect(zamanEtiketi(0)).toBe("Bugün");
    expect(zamanEtiketi(1)).toBe("Yarın");
    expect(zamanEtiketi(3)).toBe("3 gün sonra");
    expect(zamanEtiketi(-1)).toBe("Dün kalmış");
    expect(zamanEtiketi(-4)).toBe("4 gün gecikti");
  });
});

describe("sureEtiketi", () => {
  test("dakika verilmişse aralık üretir", () => {
    expect(sureEtiketi(20, null)).toBe("15-25 dk");
  });
  test("dakika yoksa soru sayısından türetir", () => {
    expect(sureEtiketi(null, 10)).toBe("15-25 dk");
  });
  test("bilgi yoksa etiket yok — uydurma süre gösterilmez", () => {
    expect(sureEtiketi(null, null)).toBeNull();
    expect(sureEtiketi(0, 0)).toBeNull();
  });
  test("çok kısa işte alt sınır 5 dakika", () => {
    expect(sureEtiketi(2, null)).toBe("5-10 dk");
  });
});

describe("bugunKartlari", () => {
  test("en fazla üç kart gösterilir", () => {
    const g = Array.from({ length: 6 }, (_, i) => gorev({ atamaId: `a${i}`, tarih: BUGUN }));
    expect(bugunKartlari(g, BUGUN)).toHaveLength(EN_FAZLA_KART);
  });

  test("tamamlanan iş kartlara girmez", () => {
    const k = bugunKartlari([
      gorev({ atamaId: "a1", tarih: BUGUN, tamamlandi: true }),
      gorev({ atamaId: "a2", tarih: BUGUN }),
    ], BUGUN);
    expect(k.map((x) => x.atamaId)).toEqual(["a2"]);
  });

  test("önce bugün, sonra gecikmiş, sonra yarın", () => {
    const k = bugunKartlari([
      gorev({ atamaId: "yarin", tarih: "2026-10-06" }),
      gorev({ atamaId: "gecikmis", tarih: "2026-10-03" }),
      gorev({ atamaId: "bugun", tarih: BUGUN }),
    ], BUGUN);
    expect(k.map((x) => x.atamaId)).toEqual(["bugun", "gecikmis", "yarin"]);
    expect(k.map((x) => x.tur)).toEqual(["bugun-teslim", "gecikmis", "yarin"]);
  });

  test("son tarih varsa ölçüt odur", () => {
    const k = bugunKartlari([
      gorev({ atamaId: "a1", tarih: "2026-10-01", sonTarih: BUGUN }),
    ], BUGUN);
    expect(k[0].zamanEtiketi).toBe("Bugün");
    expect(k[0].tur).toBe("bugun-teslim");
  });

  test("bir haftadan uzak işler bugünü kalabalıklaştırmaz", () => {
    const k = bugunKartlari([gorev({ atamaId: "uzak", tarih: "2026-10-20" })], BUGUN);
    expect(k).toEqual([]);
  });

  test("konu yoksa başlık görev türüne düşer", () => {
    const k = bugunKartlari([gorev({ atamaId: "a1", tarih: BUGUN, tur: "Okuma", konu: null })], BUGUN);
    expect(k[0].baslik).toBe("Okuma");
  });

  test("her kartta tek eylem var ve türüne göre değişir", () => {
    const k = bugunKartlari([
      gorev({ atamaId: "bugun", tarih: BUGUN }),
      gorev({ atamaId: "gecikmis", tarih: "2026-10-02" }),
    ], BUGUN);
    expect(k[0].eylem).toBe("Başla");
    expect(k[1].eylem).toBe("Şimdi yap");
  });
});

describe("gunMesaji", () => {
  test("süreç övülür, kimlik etiketi kullanılmaz", () => {
    expect(gunMesaji(0, 3)).toMatch(/bitirdin/);
    expect(gunMesaji(2, 1)).toBe("1 işi bitirdin, 2 tane kaldı.");
    expect(gunMesaji(1, 0)).toMatch(/tek bir işin/);
    expect(gunMesaji(4, 0)).toMatch(/Birinden başla/);
  });
  test("boş günde suçlayıcı dil yok", () => {
    expect(gunMesaji(0, 0)).toBe("Bugün için bekleyen bir işin yok.");
  });
  test("hiçbir mesajda kimlik etiketi geçmez", () => {
    for (const m of [gunMesaji(0, 0), gunMesaji(0, 2), gunMesaji(3, 0), gunMesaji(1, 1)]) {
      expect(m).not.toMatch(/tembel|başarısız|geride|maalesef/i);
    }
  });
});
