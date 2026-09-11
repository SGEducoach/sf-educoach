import { describe, expect, test } from "vitest";
import { oransalDagit, soruPuaniGerekenler, soruPuaniHatasi, soruPuanlariniHesapla, temsilcileriSec } from "./yazili-soru-puanlari";

const maxPuanlar = [10, 20, 30, 40]; // toplam 100
const toplamlar = [95, 88, 76, 70, 64, 55, 49, 40, 31, 12];
const sinif = toplamlar.map((toplam, i) => ({ id: `o${i}`, toplam }));
const topla = (dizi: number[]) => dizi.reduce((a, b) => a + b, 0);

describe("temsilcileriSec", () => {
  test("10 kişide en iyi 2, orta 2 (medyan çevresi), en düşük 2 — 6 farklı kişi", () => {
    const secim = temsilcileriSec(sinif);
    expect(secim.map((t) => t.id)).toEqual(["o0", "o1", "o4", "o5", "o8", "o9"]);
    expect(secim.map((t) => t.grup)).toEqual(["en-iyi", "en-iyi", "orta", "orta", "en-dusuk", "en-dusuk"]);
  });

  test("girdi sırası sonucu değiştirmez", () => {
    expect(temsilcileriSec([...sinif].reverse())).toEqual(temsilcileriSec(sinif));
  });

  test("7 kişide de 6 farklı kişi seçilir", () => {
    expect(new Set(temsilcileriSec(sinif.slice(0, 7)).map((t) => t.id)).size).toBe(6);
  });

  test("6 veya daha az kişide herkes seçilir", () => {
    expect(temsilcileriSec(sinif.slice(0, 4))).toHaveLength(4);
  });
});

describe("oransalDagit", () => {
  test("toplam korunur, her puan 0 ile sorunun maksimumu arasında tam sayı", () => {
    const sonuc = oransalDagit(sinif, maxPuanlar);
    for (const o of sinif) {
      expect(topla(sonuc[o.id])).toBe(o.toplam);
      sonuc[o.id].forEach((v, j) => {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(maxPuanlar[j]);
      });
    }
  });

  test("tam puan maksimumlara, sıfır sıfıra dağılır", () => {
    const sonuc = oransalDagit([{ id: "tam", toplam: 100 }, { id: "sifir", toplam: 0 }], maxPuanlar);
    expect(sonuc.tam).toEqual(maxPuanlar);
    expect(sonuc.sifir).toEqual([0, 0, 0, 0]);
  });

  test("bölünmeyen oranlarda da toplam korunur", () => {
    const sonuc = oransalDagit([{ id: "x", toplam: 7 }], [3, 3, 3]);
    expect(topla(sonuc.x)).toBe(7);
    sonuc.x.forEach((v) => expect(v).toBeLessThanOrEqual(3));
  });
});

describe("soruPuanlariniHesapla", () => {
  test("otomatik: kimse girilen değil, sürüm oransal-v1, herkese puan var", () => {
    expect(soruPuaniGerekenler("otomatik", sinif)).toEqual([]);
    const hesap = soruPuanlariniHesapla({ mod: "otomatik", ogrenciler: sinif, temsiliSkorlar: {}, maxPuanlar });
    expect(hesap.gercekIdler.size).toBe(0);
    expect(hesap.tahminSurumu).toBe("oransal-v1");
    expect(Object.keys(hesap.skorlar)).toHaveLength(sinif.length);
  });

  test("temsili: 6 kişi girilen, diğerleri tahmin, herkesin toplamı korunur", () => {
    const tamPuanlar = oransalDagit(sinif, maxPuanlar);
    const temsiliSkorlar = Object.fromEntries(temsilcileriSec(sinif).map((t) => [t.id, tamPuanlar[t.id]]));
    const hesap = soruPuanlariniHesapla({ mod: "temsili", ogrenciler: sinif, temsiliSkorlar, maxPuanlar });
    expect(hesap.gercekIdler.size).toBe(6);
    expect(hesap.tahminSurumu).toBe("v1");
    for (const o of sinif) expect(topla(hesap.skorlar[o.id])).toBe(o.toplam);
  });

  test("tek-tek: herkes girilen, tahmin yok, girilenler aynen kalır", () => {
    const temsiliSkorlar = oransalDagit(sinif, maxPuanlar);
    const hesap = soruPuanlariniHesapla({ mod: "tek-tek", ogrenciler: sinif, temsiliSkorlar, maxPuanlar });
    expect(hesap.gercekIdler.size).toBe(sinif.length);
    expect(hesap.tahminSurumu).toBeNull();
    expect(hesap.skorlar).toEqual(temsiliSkorlar);
  });
});

describe("soruPuaniHatasi", () => {
  const ogrenciler = [{ id: "a", toplam: 30 }];
  const kontrol = (skorlar: number[]) =>
    soruPuaniHatasi({ mod: "tek-tek", ogrenciler, temsiliSkorlar: { a: skorlar }, maxPuanlar, adlar: { a: "Ali" } });

  test("eksik puan öğrenciyi adıyla anar", () => expect(kontrol([10, NaN, 10, 0])).toMatch(/^Ali: her soru için puan girin/));
  test("sorunun maksimumunu aşan puan", () => expect(kontrol([11, 9, 10, 0])).toMatch(/1\. soru 0 ile 10 arasında/));
  test("toplam uyuşmazlığı", () => expect(kontrol([10, 10, 5, 0])).toMatch(/\(25\).*\(30\)/));
  test("geçerli giriş", () => expect(kontrol([10, 10, 10, 0])).toBeNull());
  test("otomatik modda giriş istenmez", () =>
    expect(soruPuaniHatasi({ mod: "otomatik", ogrenciler, temsiliSkorlar: {}, maxPuanlar })).toBeNull());
});
