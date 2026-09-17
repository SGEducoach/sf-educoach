import { describe, expect, test } from "vitest";
import { nobetleriCoz, programPdfiniCoz } from "./ders-programi-pdf";
import type { PdfOgesi } from "./pdf-metni";

// Gerçek MEB ders programı PDF'inin yerleşimi (bkz. ders-programi-pdf.ts):
// sütun başlıkları (1)…(8) 50,5 punto aralıklı, sınıf satırı gün satırının
// 10 punto üstünde.
function oge(metin: string, x: number, y: number, sayfa = 1): PdfOgesi {
  return { sayfa, metin, x, y, genislik: metin.length * 4.5 };
}

const SUTUN_X = [87, 137.5, 188, 238.5, 289, 339.5, 390, 440.5];

function ornekOgeler(): PdfOgesi[] {
  return [
    oge("Sayı", 50, 778), oge(":", 67, 778), oge("Sınıf Öğretmenliği : 9/C", 216, 778),
    oge("Nöbet Günü ve Yeri :", 355, 778), oge("Pzt BİRİNCİ KAT", 440, 778),
    oge("Adı Soyadı : ABDULLAH METİN", 26, 766), oge("Eğitici Kolu(Kulüp) :", 214, 766),
    oge("Ders\\Gün", 31, 753),
    ...SUTUN_X.map((x, i) => oge(`(${i + 1})`, x, 753)),
    oge("(9)", 491, 753), oge("(10)", 539, 753),
    // Pazartesi: 1. ve 2. saat 10/A DKAB1
    oge("10/A", 83.6, 723), oge("10/A", 134.1, 723),
    oge("Pazartesi", 24.7, 713), oge("DKAB1", 79.4, 713), oge("DKAB1", 129.9, 713),
    // Salı: 3. saat 9/C SİYER
    oge("9/C", 187, 693),
    oge("Salı", 24.7, 683), oge("SİYER", 181.8, 683),
    oge("Cuma", 24.7, 594),
  ];
}

describe("nobetleriCoz", () => {
  test("tek nöbet: gün kısaltması ve yer", () => {
    expect(nobetleriCoz("Pzt BİRİNCİ KAT").nobetler).toEqual([{ gun: "pazartesi", yer: "BİRİNCİ KAT" }]);
  });
  test("virgülle ayrılmış iki nöbet", () => {
    expect(nobetleriCoz("Pzt Müdür yardımcısı,Prs Müdür yardımcısı").nobetler).toEqual([
      { gun: "pazartesi", yer: "Müdür yardımcısı" },
      { gun: "persembe", yer: "Müdür yardımcısı" },
    ]);
  });
  test("gün kısaltmaları", () => {
    expect(nobetleriCoz("Cuma KANTİN").nobetler[0].gun).toBe("cuma");
    expect(nobetleriCoz("Cmt BAHÇE").nobetler[0].gun).toBe("cumartesi");
    expect(nobetleriCoz("Çar GİRİŞ KAT").nobetler[0].gun).toBe("carsamba");
    expect(nobetleriCoz("Sali İKİNCİ KAT").nobetler[0].gun).toBe("sali");
  });
  test("okunamayan gün uyarı verir", () => {
    const sonuc = nobetleriCoz("Xyz BİRİNCİ KAT");
    expect(sonuc.nobetler).toHaveLength(0);
    expect(sonuc.uyarilar[0]).toMatch(/okunamadı/);
  });
});

describe("programPdfiniCoz", () => {
  test("ad, sınıf öğretmenliği, nöbet ve hücreler", () => {
    const { ogretmenler, uyarilar } = programPdfiniCoz(ornekOgeler());
    expect(uyarilar).toEqual([]);
    expect(ogretmenler).toHaveLength(1);
    const o = ogretmenler[0];
    expect(o.ad).toBe("ABDULLAH METİN");
    expect(o.sinifOgretmenligi).toBe("9/C");
    expect(o.nobetler).toEqual([{ gun: "pazartesi", yer: "BİRİNCİ KAT" }]);
    expect(o.hucreler).toEqual([
      { gun: "pazartesi", sira: 1, sinif: "10/A", ders: "DKAB1" },
      { gun: "pazartesi", sira: 2, sinif: "10/A", ders: "DKAB1" },
      { gun: "sali", sira: 3, sinif: "9/C", ders: "SİYER" },
    ]);
  });

  test("iki öğretmen bloğu ayrı ayrı çözülür", () => {
    const ikinci = ornekOgeler().map((o) => ({ ...o, y: o.y - 350 }))
      .map((o) => o.metin === "Adı Soyadı : ABDULLAH METİN" ? { ...o, metin: "Adı Soyadı : AHMET AKTAŞ" } : o)
      .map((o) => o.metin === "Pzt BİRİNCİ KAT" ? { ...o, metin: "Cuma KANTİN" } : o);
    const { ogretmenler } = programPdfiniCoz([...ornekOgeler(), ...ikinci]);
    expect(ogretmenler.map((o) => o.ad)).toEqual(["ABDULLAH METİN", "AHMET AKTAŞ"]);
    expect(ogretmenler[1].nobetler).toEqual([{ gun: "cuma", yer: "KANTİN" }]);
    expect(ogretmenler[1].hucreler).toHaveLength(3);
  });

  test("nöbeti olmayan öğretmen sorun çıkarmaz", () => {
    const ogeler = ornekOgeler().filter((o) => o.metin !== "Pzt BİRİNCİ KAT");
    const { ogretmenler, uyarilar } = programPdfiniCoz(ogeler);
    expect(ogretmenler[0].nobetler).toEqual([]);
    expect(uyarilar).toEqual([]);
  });

  test("boş PDF uyarı verir", () => {
    expect(programPdfiniCoz([]).uyarilar[0]).toMatch(/bulunamadı/);
  });
});
