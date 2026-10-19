import { describe, expect, test } from "vitest";
import { lgsOkulListesiCoz } from "./lgs-okul-listesi";
import type { PdfOgesi } from "./pdf-metni";

// Örnek PDF'lerin (19.10.2026) düzeni yapay verilerle: başlık, ders kodları,
// D/Y/N etiketleri, öğrenci satırları. Konumlar gerçek PDF'tekiyle aynı.
const DYN_X = [146.5, 161.2, 176.3, 191.9, 206.5, 221.7, 237.2, 251.9, 267.0, 282.6, 297.2, 312.4, 327.9, 342.6, 357.8, 373.3, 387.9, 403.1, 418.6, 433.3, 448.5];
const oge = (sayfa: number, y: number, x: number, metin: string, genislik = metin.length * 3.8): PdfOgesi => ({ sayfa, y, x, metin, genislik });

function sayfaBasligi(sayfa: number, baslik = "OKUL NET LİSTESİ (LGS sıralı)"): PdfOgesi[] {
  return [
    oge(sayfa, 804, 230, baslik, 140),
    oge(sayfa, 787, 58.8, "İL", 7.1), oge(sayfa, 787, 238.7, "OKUL", 21.5), oge(sayfa, 787, 365.2, "SINAV ADI", 40.6), oge(sayfa, 787, 458.2, "OKUL", 19.1),
    oge(sayfa, 771, 29.7, "İL ADI", 30), oge(sayfa, 771, 181.7, "ÖRNEK ORTAOKULU", 100), oge(sayfa, 771, 317.8, "8. Sınıf Deneme-1 3", 70), oge(sayfa, 771, 463.3, "3", 4),
    oge(sayfa, 756, 144.1, "Sözel (TÜR)", 40.6), oge(sayfa, 756, 189.6, "Sözel (TAR)", 40.3), oge(sayfa, 756, 235.6, "Sözel (DİN)", 39),
    oge(sayfa, 756, 280.9, "Sözel (İNG) Sayısal (MAT)", 88.6), oge(sayfa, 756, 368.1, "Sayısal (FEN)", 46.1),
    ...DYN_X.map((x, i) => oge(sayfa, 729, x, "DYN"[i % 3], 4.5)), oge(sayfa, 729, 465.1, "Puanı", 16.6),
  ];
}

// D/Y/N değerlerini sütun merkezlerine yazar; null = boş hücre.
function ogrenciSatiri(sayfa: number, y: number, kimlik: PdfOgesi[], hucreler: (string | null)[], puan: string): PdfOgesi[] {
  return [
    ...kimlik,
    ...hucreler.flatMap((h, i) => (h === null ? [] : [oge(sayfa, y, DYN_X[i] + 2.3 - (h.length * 3.6) / 2, h, h.length * 3.6)])),
    oge(sayfa, y, 473.4 - 12, puan, 24.8),
    oge(sayfa, y + 4.3, 557.4, "14", 7.6), // genel derece (ayrı satır)
  ];
}

const tam = ["19", "1", "18,67", "10", "0", "10,00", "9", "1", "8,67", "9", "1", "8,67", "18", "2", "17,33", "16", "4", "14,67", "81", "9", "78,01"];

describe("LGS okul net listesi okuyucusu", () => {
  test("öğrenci satırları, dersi boş bırakan öğrenci ve bitişik numara", () => {
    const ogeler = [
      ...sayfaBasligi(1),
      ...ogrenciSatiri(1, 685, [oge(1, 685, 29.3, "1", 3.8), oge(1, 685, 42.5, "307", 11.4), oge(1, 685, 59.5, "ÖRNEK BİR", 40), oge(1, 685, 127.6, "8-B", 10.1)], tam, "456,958"),
      // İngilizce hiç cevaplanmamış: o üç hücre boş.
      ...ogrenciSatiri(1, 665, [oge(1, 665, 27.4, "2", 3.8), oge(1, 665, 42.5, "380", 11.4), oge(1, 665, 59.5, "ÖRNEK İKİ", 40), oge(1, 665, 127.6, "8-A", 10.1)],
        ["7", "13", "2,67", "2", "6", "0,00", "5", "5", "3,33", null, null, null, "3", "11", "-0,67", "8", "11", "4,33", "25", "46", "9,66"], "227,401"),
      // Uzun okul numarası sıraya bitişik; sınıf adın sonuna yapışık.
      ...ogrenciSatiri(1, 645, [oge(1, 645, 27.4, "3", 7.6), oge(1, 645, 32.9, "99513858", 30.5), oge(1, 645, 59.5, "ÖRNEK ÜÇ AD8-C", 66)], tam, "450,000"),
    ];
    const r = lgsOkulListesiCoz(ogeler);
    expect(r.basarili).toBe(true);
    expect(r.sinavAdi).toBe("8. Sınıf Deneme-1");
    expect(r.okunamayanSatirlar).toEqual([]);
    expect(r.ogrenciler.map((o) => [o.sira, o.ogrenciNo, o.isimHam, o.sinif])).toEqual([
      [1, 307, "ÖRNEK BİR", "8-B"], [2, 380, "ÖRNEK İKİ", "8-A"], [3, 99513858, "ÖRNEK ÜÇ AD", "8-C"],
    ]);
    const [bir, iki] = r.ogrenciler;
    expect(bir.dersSonuclari).toHaveLength(6);
    expect(bir.dersSonuclari[1]).toEqual({ ders: "T.C. İnkılap Tarihi ve Atatürkçülük", dogru: 10, yanlis: 0, net: 10 });
    expect(bir.toplam).toEqual({ dogru: 81, yanlis: 9, net: 78.01 });
    expect(bir.puan).toBe(456.958);
    expect(iki.dersSonuclari.map((d) => d.ders)).not.toContain("İngilizce");
    expect(iki.dersSonuclari.find((d) => d.ders === "Matematik")).toMatchObject({ dogru: 3, yanlis: 11, net: -0.67 });
  });

  test("tek parça gelen sayılar konumlarından ayrılır", () => {
    const y = 685;
    const kimlik = [oge(1, y, 29.3, "1", 3.8), oge(1, y, 42.5, "307", 11.4), oge(1, y, 59.5, "ÖRNEK BİR", 40), oge(1, y, 127.6, "8-B", 10.1)];
    const ogeler = [
      ...sayfaBasligi(1), ...kimlik,
      oge(1, y, 145.0, "19", 7.6), oge(1, y, 161.1, "1", 3.8), oge(1, y, 170.0, "18,67 10", 28.0), oge(1, y, 206.4, "0", 3.8), oge(1, y, 215.4, "10,00", 17.2),
      oge(1, y, 237.6, "9", 3.8), oge(1, y, 251.8, "1", 3.8), oge(1, y, 262.6, "8,67", 13.4), oge(1, y, 283.0, "9", 3.8), oge(1, y, 297.1, "1", 3.8), oge(1, y, 308.0, "8,67", 13.4),
      oge(1, y, 326.4, "18", 7.6), oge(1, y, 342.5, "2", 3.8), oge(1, y, 351.4, "17,33 16", 28.0), oge(1, y, 387.9, "4", 3.8), oge(1, y, 396.8, "14,67 81", 28.0),
      oge(1, y, 433.2, "9", 3.8), oge(1, y, 442.1, "78,01 456,958", 43.7), oge(1, y, 491.3, "1", 3.8),
    ];
    const r = lgsOkulListesiCoz(ogeler);
    expect(r.ogrenciler).toHaveLength(1);
    expect(r.ogrenciler[0].toplam).toEqual({ dogru: 81, yanlis: 9, net: 78.01 });
    expect(r.ogrenciler[0].puan).toBe(456.958);
  });

  test("tutmayan satır tahmin edilmez, okunamadı sayılır; sınıf sayfaları okunmaz", () => {
    const bozuk = [...tam];
    bozuk[2] = "17,00"; // Türkçe neti D−Y/3 ile tutmuyor
    const ogeler = [
      ...sayfaBasligi(1),
      ...ogrenciSatiri(1, 685, [oge(1, 685, 29.3, "1", 3.8), oge(1, 685, 42.5, "307", 11.4), oge(1, 685, 59.5, "ÖRNEK BİR", 40), oge(1, 685, 127.6, "8-B", 10.1)], bozuk, "456,958"),
      ...sayfaBasligi(2, "8-B SINIFI NET LİSTESİ (LGS sıralı)"),
      ...ogrenciSatiri(2, 685, [oge(2, 685, 29.3, "1", 3.8), oge(2, 685, 42.5, "999", 11.4), oge(2, 685, 59.5, "BAŞKA BİRİ", 40), oge(2, 685, 127.6, "8-B", 10.1)], tam, "456,958"),
    ];
    const r = lgsOkulListesiCoz(ogeler);
    expect(r.ogrenciler).toEqual([]);
    expect(r.okunamayanSatirlar).toEqual([{ isimHam: "ÖRNEK BİR", sira: 1, neden: "TÜR neti D−Y/3 ile tutmuyor" }]);
  });

  test("biçim tanınmazsa nedeniyle durur", () => {
    expect(lgsOkulListesiCoz([oge(1, 800, 10, "BAŞKA BİR RAPOR", 80)])).toMatchObject({ basarili: false, hata: expect.stringMatching(/OKUL NET LİSTESİ/) });
  });
});
