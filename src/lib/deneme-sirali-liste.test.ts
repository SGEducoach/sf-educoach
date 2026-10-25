import { describe, expect, test } from "vitest";
import { siraliListeCoz } from "./deneme-sirali-liste";

// Satırlar Kariyerim dershanesinin "TÜRKİYE GENELİ TYT İLK PROVA" sıralı
// listesinden (sayfa 1) — isimler değiştirildi, sayılar gerçek.
const SAYFA = [
  "TÜRKİYE GENELİ TYT İLK PROVA (T1226)",
  "ÖZEL KARİYERİM KİŞİSEL GELİŞİM KURSU TYT SIRALI TYT LİSTESİ",
  "Sayfa 1 / 5",
  "SIRA TÜRKÇE TAR-1 COĞ-1 FEL-1 DİN-1 T. MAT GEO-1 FİZ-1 KİM-1 BİY-1 TOPLAM TYT ŞB KRM İLÇE İL GENEL",
  "ŞB ADI SOYADI",
  "NO D. Y. N. D. Y. N. D. Y. N. D. Y. N. D. Y. N. D. Y. N. D. Y. N. D. Y. N. D. Y. N. D. Y. N. D. Y. N. PUANI DRC. DRC. DRC. DRC. DRC.",
  "1 ALİ VELİ 37 3 36,25 5 0 5,00 3 1 2,75 5 0 5,00 5 0 5,00 24 1 23,75 9 0 9,00 6 1 5,75 7 0 7,00 5 1 4,75 106 7 104,25 452,238 1 1 2 19 1568",
  "13 31 5 29,75 5 0 5,00 3 2 2,50 3 1 2,75 3 2 2,50 22 2 21,50 8 1 7,75 6 1 5,75 6 1 5,75 3 1 2,75 90 16 86,00 397,352 12 13 36 252 16779",
  "23 AYŞE YILMAZ 27 12 24,00 3 2 2,50 3 0 3,00 3 1 2,75 3 2 2,50 22 4 21,00 10 0 10,00 1 5 -0,25 6 0 6,00 3 0 3,00 81 26 74,50 365,379 22 23 64 485 32212",
  // Bir ders bloğu eksik (hangisi olduğu belli değil) → okunamaz
  "24 EKSİK SATIR 30 10 27,50 4 1 3,75 2 0 2,00 5 0 5,00 4 0 4,00 9 2 8,50 9 0 9,00 7 0 7,00 6 1 5,75 76 14 72,50 364,126 23 24 65 498 32890",
  "350",
  "TYT PUANI",
];

// Elbistan Fen Lisesi "GELİŞİM İZLEME SINAVLARI" (25.10.2026): ŞB harfi isme yapışıyor.
const GELISIM = [
  "ELBİSTAN İMKB FEN LİSESİ TYT SIRALI TYT LİSTESİ",
  "GELİŞİM İZLEME SINAVLARI 11. SINIF TYT-1 (L1126)",
  "SIRA TÜRKÇE TAR-1 COĞ-1 FEL-1 DİN-1 T. MAT GEO-1 FİZ-1 KİM-1 BİY-1 TOPLAM TYT ŞB KRM İLÇE İL GENEL",
  ...Array.from({ length: 12 }, (_, i) => `${i + 1} ${["C", "A", "B"][i % 3]} ${i === 3 ? "M ENES" : `ÖĞRENCİ${i + 1} SOYAD`}${i === 1 ? " FB*" : ""} 36 4 35,00 5 0 5,00 4 1 3,75 5 0 5,00 5 0 5,00 27 3 26,25 9 1 8,75 6 1 5,75 7 0 7,00 5 1 4,75 109 11 106,25 458,562 1 1 1 1 46`),
];

describe("siraliListeCoz — ŞB sütunu", () => {
  const s = siraliListeCoz([GELISIM]);
  test("şube harfi isimden ayrılır, sınıf başlıktaki seviyeyle birleşir", () => {
    expect(s.basarili).toBe(true);
    expect(s.ogrenciler[0]).toMatchObject({ isimHam: "ÖĞRENCİ1 SOYAD", sube: "C", sinif: "11-C" });
    expect(s.ogrenciler[3]).toMatchObject({ isimHam: "M ENES", sube: "C" });
  });
  test("addaki * işaretli parça atılır", () => {
    expect(s.ogrenciler[1].isimHam).toBe("ÖĞRENCİ2 SOYAD");
  });
  test("şubesiz liste (Kariyerim) olduğu gibi kalır", () => {
    const k = siraliListeCoz([SAYFA]);
    expect(k.ogrenciler.find((o) => o.isimHam === "AYŞE YILMAZ")?.sube).toBeUndefined();
  });
});

describe("siraliListeCoz", () => {
  const s = siraliListeCoz([SAYFA]);

  test("başlıktan 10 ders ve 5 sıralama sütunu okunur", () => {
    expect(s.basarili).toBe(true);
    expect(s.dersEtiketleri).toEqual(["TÜRKÇE", "TAR-1", "COĞ-1", "FEL-1", "DİN-1", "T. MAT", "GEO-1", "FİZ-1", "KİM-1", "BİY-1"]);
  });

  test("satır TYT derslerine indirgenir (Matematik = T. MAT + GEO), negatif net dahil", () => {
    const ali = s.ogrenciler.find((o) => o.isimHam === "ALİ VELİ")!;
    expect(ali.toplam).toEqual({ dogru: 106, yanlis: 7, net: 104.25 });
    expect(ali.dersSonuclari).toContainEqual({ ders: "Matematik", dogru: 33, yanlis: 1 });
    expect(ali.dersSonuclari).toContainEqual({ ders: "Din Kültürü", dogru: 5, yanlis: 0 });
    expect(ali.dersSonuclari).toHaveLength(9);
    expect(s.ogrenciler.find((o) => o.isimHam === "AYŞE YILMAZ")!.dersSonuclari).toContainEqual({ ders: "Fizik", dogru: 1, yanlis: 5 });
  });

  test("isimsiz satır da okunur (eşleştirmede elenir), eksik bloklu satır okunamaz, grafik sayıları yok sayılır", () => {
    expect(s.ogrenciler.map((o) => o.sira)).toEqual([1, 13, 23]);
    expect(s.ogrenciler.find((o) => o.sira === 13)!.isimHam).toBe("");
    expect(s.okunamayanSatirlar).toEqual([{ sira: 24, isimHam: "EKSİK SATIR" }]);
  });

  test("başlık yoksa ya da ders sütunu tanınmıyorsa başarısız", () => {
    expect(siraliListeCoz([["1 A 2 3"]]).basarili).toBe(false);
    const garip = siraliListeCoz([["SIRA TÜRKÇE UZAY-9 TOPLAM TYT GENEL", "1 A 1 0 1,00 1 0 1,00 2 0 2,00 300,1 5"]]);
    expect(garip.basarili).toBe(false);
    expect(garip.hata).toContain("UZAY-9");
  });
});
