import { describe, expect, test } from "vitest";
import { sinifListesiSayfalariniCoz, sutunAdlariniCoz, tytDerslerineIndirge } from "./deneme-sinif-listesi";
import type { GenisMetin } from "./deneme-sinif-listesi";

// Konumlar gerçek "ORBİTAL DENEME KULÜBÜ TYT" sınıf listesinden (12-A,
// sayfa 3) ölçüldü: her değerin merkezi başlıktaki D/Y/N harfinin merkeziyle
// aynı; öğrencinin hiç çözmediği Felsefe (Seçmeli) sütununda değer yok.
function satir(y: number, ogeler: [string, number, number][]): GenisMetin[] {
  return ogeler.map(([str, x, w]) => ({ str, x, y, w }));
}

const DYN_X = [152.9, 206.7, 260.6, 314.5, 368.3, 422.2, 476, 529.9, 583.8, 637.6, 691.5, 745.3];
const BASLIK: GenisMetin[] = [
  ...satir(560, [["12-A SINIFI TYT NET LİSTESİ (TYT sıralı)", 300, 200]]),
  ...satir(520, [
    ["Sıra", 24.4, 13.6], ["Ö.No", 42.2, 14.8], ["İsim", 87.7, 14.5], ["Sınıf", 131.3, 15.2],
    ["Türkçe", 162.4, 23.8], ["Tarih-1", 215.8, 24.8], ["Coğrafya-1", 262.7, 38.7], ["Felsefe", 323.4, 25],
    ["Din Kül. ve Ahl. Bil.", 356.4, 66.6], ["Felsefe (Seçmeli) Matematik-1", 413.5, 106.1], ["Geometri", 535, 32.7],
    ["Fizik", 597.4, 15.6], ["Kimya", 648.2, 21.8], ["Biyoloji", 700.3, 25.3], ["Toplam", 753.7, 26.1], ["TYT", 800, 12.8],
  ]),
  ...satir(510, [
    ...DYN_X.flatMap((x): [string, number, number][] => [["D", x, 4.6], ["Y", x + 16.1, 3.7], ["N", x + 34.8, 4.5]]),
    ["Genel", 797.7, 17.5],
  ]),
  ...satir(495, [["Genel Ortalama", 30, 60], ["27,25", 180, 17.2], ["9,01", 197, 13.4]]),
  ...satir(485, [["SINIF: 12-A", 30, 40]]),
];

const NURSENA = satir(470, [
  ["1", 29.3, 3.8], ["169", 43.9, 11.4], ["NURSENA DEMİR", 62.4, 50.7], ["12-A", 133.2, 13.9],
  ["34", 151.4, 7.6], ["5", 168.9, 3.8], ["32,75", 181.3, 17.2],
  ["5", 207.1, 3.8], ["0", 222.7, 3.8], ["5,00", 237.1, 13.4],
  ["4", 261, 3.8], ["1", 276.6, 3.8], ["3,75", 291, 13.4],
  ["4", 314.9, 3.8], ["1", 330.5, 3.8], ["3,75", 344.8, 13.4],
  ["5", 368.7, 3.8], ["0", 384.3, 3.8], ["5,00", 398.7, 13.4],
  ["27", 474.5, 7.6], ["1", 492, 3.8], ["26,75", 504.5, 17.2],
  ["9", 530.3, 3.8], ["1", 545.9, 3.8], ["8,75", 560.3, 13.4],
  ["5", 584.2, 3.8], ["2", 599.7, 3.8], ["4,50", 614.1, 13.4],
  ["7", 638, 3.8], ["0", 653.6, 3.8], ["7,00", 668, 13.4],
  ["5", 691.9, 3.8], ["1", 707.5, 3.8], ["4,75", 721.8, 13.4],
  ["105", 741.9, 11.4], ["12", 759.4, 7.6], ["102,00", 771.9, 21],
  ["238", 800.7, 11.4],
]);

describe("sutunAdlariniCoz", () => {
  test("boşluklu ve birleşik ders adları doğru bölünür", () => {
    expect(sutunAdlariniCoz("Türkçe Tarih-1 Coğrafya-1 Felsefe Din Kül. ve Ahl. Bil. Felsefe (Seçmeli) Matematik-1 Geometri Fizik Kimya Biyoloji Toplam TYT"))
      .toEqual(["Türkçe", "Tarih-1", "Coğrafya-1", "Felsefe", "Din Kül. ve Ahl. Bil.", "Felsefe (Seçmeli)", "Matematik-1", "Geometri", "Fizik", "Kimya", "Biyoloji", "Toplam"]);
  });
  test("tanınmayan ders adı varsa sayfa tanınmaz", () => {
    expect(sutunAdlariniCoz("Edebiyat Tarih-2 Toplam")).toBeNull();
  });
});

describe("sinifListesiSayfalariniCoz", () => {
  test("gerçek satır: sayılar sütun konumuna oturur, boş ders sıfır olur", () => {
    const sonuc = sinifListesiSayfalariniCoz([[...BASLIK, ...NURSENA]]);
    expect(sonuc.basarili).toBe(true);
    expect(sonuc.okunamayanSatir).toBe(0);
    const [o] = sonuc.ogrenciler;
    expect(o.isimHam).toBe("NURSENA DEMİR");
    expect(o.ogrenciNo).toBe(169);
    expect(o.sinif).toBe("12-A");
    expect(o.toplam).toEqual({ dogru: 105, yanlis: 12, net: 102 });
    const ders = (ad: string) => o.dersSonuclari.find((d) => d.ders === ad);
    expect(ders("Felsefe (Seçmeli)")).toEqual({ ders: "Felsefe (Seçmeli)", dogru: 0, yanlis: 0, net: 0 });
    // Seçmeli boş diye dersler kaymamalı: Matematik-1 hâlâ 27 doğru.
    expect(ders("Matematik-1")).toEqual({ ders: "Matematik-1", dogru: 27, yanlis: 1, net: 26.75 });
    expect(ders("Biyoloji")).toEqual({ ders: "Biyoloji", dogru: 5, yanlis: 1, net: 4.75 });
  });

  test("toplamla tutmayan satır okunmaz (yanlış kayıt yazılmaz)", () => {
    const bozuk = NURSENA.map((o) => (o.str === "105" ? { ...o, str: "99" } : o));
    const sonuc = sinifListesiSayfalariniCoz([[...BASLIK, ...bozuk]]);
    expect(sonuc.basarili).toBe(false);
    expect(sonuc.okunamayanSatir).toBe(1);
  });

  test("hiçbir sütuna oturmayan sayı satırı reddettirir", () => {
    const kayik = [...NURSENA, { str: "3", x: 445, y: 470, w: 3.8 }]; // Seçmeli D ile Y arası
    expect(sinifListesiSayfalariniCoz([[...BASLIK, ...kayik]]).okunamayanSatir).toBe(1);
  });

  test("birleşik parçalar ayrılır: 'AD SOYAD 12-B' ve 'sınıf+sayı' (12-XX32)", () => {
    // Gerçek satır (sayfa 11): sınıf "12-XX" ile Türkçe doğru sayısı "32"
    // tek parça; Tarih/Coğrafya vb. normal. Felsefe (Seçmeli) yok.
    const yapisik = satir(460, [
      ["1", 29.3, 3.8], ["246", 43.9, 11.4], ["ONUR ÖZDEMİR", 62.4, 48], ["12-XX32", 133.2, 25.8],
      ["4", 168.9, 3.8], ["31,00", 181.3, 17.2],
      ["5", 207.1, 3.8], ["0", 222.7, 3.8], ["5,00", 237.1, 13.4],
      ["3", 261, 3.8], ["1", 276.6, 3.8], ["2,75", 291, 13.4],
      ["5", 314.9, 3.8], ["0", 330.5, 3.8], ["5,00", 344.8, 13.4],
      ["4", 368.7, 3.8], ["0", 384.3, 3.8], ["4,00", 398.7, 13.4],
      ["22", 474.5, 7.6], ["5", 492, 3.8], ["20,75", 504.5, 17.2],
      ["6", 530.3, 3.8], ["1", 545.9, 3.8], ["5,75", 560.3, 13.4],
      ["4", 584.2, 3.8], ["2", 599.7, 3.8], ["3,50", 614.1, 13.4],
      ["4", 638, 3.8], ["2", 653.6, 3.8], ["3,50", 668, 13.4],
      ["5", 691.9, 3.8], ["0", 707.5, 3.8], ["5,00", 721.8, 13.4],
      ["90", 743.8, 7.6], ["15", 759.4, 7.6], ["86,25", 773.8, 17.2], ["1828", 798.8, 15.3],
    ]);
    const adSinif = NURSENA.map((o) => (o.str === "NURSENA DEMİR" ? { ...o, str: "NURSENA DEMİR 12-A", w: 70 } : o))
      .filter((o) => o.str !== "12-A");
    const sonuc = sinifListesiSayfalariniCoz([[...BASLIK, ...yapisik, ...adSinif]]);
    expect(sonuc.okunamayanSatir).toBe(0);
    const onur = sonuc.ogrenciler.find((o) => o.ogrenciNo === 246)!;
    expect(onur.sinif).toBe("12-XX");
    expect(onur.dersSonuclari[0]).toEqual({ ders: "Türkçe", dogru: 32, yanlis: 4, net: 31 });
    const nursena = sonuc.ogrenciler.find((o) => o.ogrenciNo === 169)!;
    expect([nursena.isimHam, nursena.sinif]).toEqual(["NURSENA DEMİR", "12-A"]);
  });

  test("aynı öğrenci iki sayfada geçerse bir kez sayılır", () => {
    const sonuc = sinifListesiSayfalariniCoz([[...BASLIK, ...NURSENA], [...BASLIK, ...NURSENA]]);
    expect(sonuc.ogrenciler).toHaveLength(1);
  });

  test("sınıf listesi olmayan PDF tanınmaz", () => {
    expect(sinifListesiSayfalariniCoz([satir(500, [["OKUL TYT NET LİSTESİ", 10, 100]])]).basarili).toBe(false);
  });
});

describe("tytDerslerineIndirge", () => {
  const ESLESTIRME = {
    "Türkçe": "Türkçe", "Tarih-1": "Tarih", "Coğrafya-1": "Coğrafya", "Felsefe": "Felsefe",
    "Din Kül. ve Ahl. Bil.": "Din Kültürü", "Matematik-1": "Matematik", "Geometri": "Matematik",
    "Fizik": "Fizik", "Kimya": "Kimya", "Biyoloji": "Biyoloji",
  };
  test("Matematik-1 ve Geometri Matematik'te toplanır, seçmeli hariç", () => {
    const sonuc = sinifListesiSayfalariniCoz([[...BASLIK, ...NURSENA]]);
    const tyt = tytDerslerineIndirge(sonuc.ogrenciler[0].dersSonuclari, ESLESTIRME)!;
    expect(tyt.find((d) => d.ders === "Matematik")).toEqual({ ders: "Matematik", dogru: 36, yanlis: 2 });
    expect(tyt.some((d) => d.ders.includes("Seçmeli"))).toBe(false);
    expect(tyt.reduce((t, d) => t + d.dogru, 0)).toBe(105);
  });
  test("bilinmeyen ders adında null döner", () => {
    expect(tytDerslerineIndirge([{ ders: "Edebiyat", dogru: 1, yanlis: 0, net: 1 }], ESLESTIRME)).toBeNull();
  });
});
