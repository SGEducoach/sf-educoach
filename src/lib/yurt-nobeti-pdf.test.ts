import { describe, expect, test } from "vitest";
import { yurtNobetiPdfiniCoz } from "./yurt-nobeti-pdf";
import type { PdfOgesi } from "./pdf-metni";

// Gerçek belletmen listesinin yerleşimi: tarih ilk sütunda, adlar ~130/265/
// 370/505 civarında; Türkçe harfler ayrı parça olarak geliyor (birleştirilir),
// "Yatılı" etiketleri ayrı satırda.
function oge(metin: string, x: number, y: number, genislik = metin.length * 4.5, sayfa = 1): PdfOgesi {
  return { sayfa, metin, x, y, genislik };
}

describe("yurtNobetiPdfiniCoz", () => {
  test("tarih satırındaki öğretmenleri çıkarır", () => {
    const { gorevler, ilkTarih, sonTarih, uyarilar } = yurtNobetiPdfiniCoz([
      oge("Tarih", 8, 512), oge("Belletmen Öğretmen", 116, 512),
      oge("13/09/2026 EKREM ERDEM", 8, 495), oge("FARUK GÜL", 268, 495),
      oge("Yatılı", 149, 484), oge("Pazar", 10, 481),
      oge("14/09/2026 UĞUR ÖKSÜZ", 8, 469), oge("YELİZ ÖZDEMİR", 508, 469),
    ]);
    expect(uyarilar).toEqual([]);
    expect(gorevler).toEqual([
      { ad: "EKREM ERDEM", tarih: "2026-09-13" },
      { ad: "FARUK GÜL", tarih: "2026-09-13" },
      { ad: "UĞUR ÖKSÜZ", tarih: "2026-09-14" },
      { ad: "YELİZ ÖZDEMİR", tarih: "2026-09-14" },
    ]);
    expect([ilkTarih, sonTarih]).toEqual(["2026-09-13", "2026-09-14"]);
  });

  test("parçalı gelen Türkçe harfler birleştirilir", () => {
    const { gorevler } = yurtNobetiPdfiniCoz([
      oge("15/09/2026 KENAN AKDEM", 8, 444, 120),
      oge("İ", 128.5, 444, 2.5),
      oge("R", 131.2, 444, 4),
      oge("MELEK BENG", 364, 444, 38),
      oge("İ", 402.2, 444, 2.4),
      oge("SU ALTUNC", 404.8, 444, 34),
      oge("İ", 439, 444, 2.4),
      oge("O", 441.6, 444, 5),
      oge("Ğ", 446.8, 444, 4.5),
      oge("LU", 451.5, 444, 8),
    ]);
    expect(gorevler).toEqual([
      { ad: "KENAN AKDEMİR", tarih: "2026-09-15" },
      { ad: "MELEK BENGİSU ALTUNCİOĞLU", tarih: "2026-09-15" },
    ]);
  });

  test("boşluk karakteri gelmeyen adlarda kelimeler ayrılır", () => {
    // Gerçek listede "AL" + "İ" + "YILMAZ" parçaları boşluk parçası olmadan
    // geliyordu; kelime aralığı eşiği olmadan "ALİYILMAZ" çıkıyordu.
    const { gorevler, uyarilar } = yurtNobetiPdfiniCoz([
      oge("18/09/2026 AL", 8, 368, 137.9),
      oge("İ", 146, 368, 2.4),
      oge("YILMAZ", 149.6, 368, 26),
    ]);
    expect(gorevler).toEqual([{ ad: "ALİ YILMAZ", tarih: "2026-09-18" }]);
    expect(uyarilar).toEqual([]);
  });

  test("aynı gün aynı öğretmen iki kez sayılmaz, ad olmayanlar uyarıya düşer", () => {
    const { gorevler, uyarilar } = yurtNobetiPdfiniCoz([
      oge("16/09/2026 ONUR AKSOY", 8, 419), oge("ONUR AKSOY", 265, 419), oge("12345", 400, 419),
    ]);
    expect(gorevler).toEqual([{ ad: "ONUR AKSOY", tarih: "2026-09-16" }]);
    expect(uyarilar[0]).toMatch(/okunamadı/);
  });

  test("tarihsiz PDF uyarı verir", () => {
    expect(yurtNobetiPdfiniCoz([oge("Eylül Ayı Belletmen Öğretmen Listesi", 330, 537)]).uyarilar[0]).toMatch(/bulunamadı/);
  });
});
