import { describe, expect, test } from "vitest";
import { baslikBicimi } from "./baslik-bicimi";

describe("baslikBicimi", () => {
  test("her sözcüğün baş harfi büyür, Türkçe i doğru", () => {
    expect(baslikBicimi("Rehberlik servisi")).toBe("Rehberlik Servisi");
    expect(baslikBicimi("Şiirde söz sanatları")).toBe("Şiirde Söz Sanatları");
    expect(baslikBicimi("İslam medeniyetinin günümüze etkileri")).toBe("İslam Medeniyetinin Günümüze Etkileri");
  });

  test("bağlaçlar küçük kalır, başta değilse", () => {
    expect(baslikBicimi("Deyim, atasözü ve söz sanatları")).toBe("Deyim, Atasözü ve Söz Sanatları");
    expect(baslikBicimi("Rapor ve tutanak yazma")).toBe("Rapor ve Tutanak Yazma");
    expect(baslikBicimi("Öteleme, dönme, yansıma")).toBe("Öteleme, Dönme, Yansıma");
  });

  test("kesme, tire, parantez ve kısaltmalar", () => {
    expect(baslikBicimi("Osmanlı Devleti'nin kuruluşu")).toBe("Osmanlı Devleti'nin Kuruluşu");
    expect(baslikBicimi("Din-bilim ilişkisi")).toBe("Din-Bilim İlişkisi");
    expect(baslikBicimi("Trigonometri (dik üçgen, alan)")).toBe("Trigonometri (Dik Üçgen, Alan)");
    expect(baslikBicimi("pH ve TYT soruları")).toBe("pH ve TYT Soruları");
    expect(baslikBicimi("2. dereceden denklemler")).toBe("2. Dereceden Denklemler");
    expect(baslikBicimi("Kur'an-ı Kerim")).toBe("Kur'an-ı Kerim");
    expect(baslikBicimi("I. ve II. Meşrutiyet")).toBe("I. ve II. Meşrutiyet");
    expect(baslikBicimi("Doğal afet türleri (deprem, sel vb.)")).toBe("Doğal Afet Türleri (Deprem, Sel vb.)");
    expect(baslikBicimi("Zayıf etkileşimler (Van der Waals, hidrojen bağı)")).toBe("Zayıf Etkileşimler (Van der Waals, Hidrojen Bağı)");
    expect(baslikBicimi("Yazılı anlatım: deneme ve eleştiri")).toBe("Yazılı Anlatım: Deneme ve Eleştiri");
    expect(baslikBicimi("Servet-i Fünun edebiyatı")).toBe("Servet-i Fünun Edebiyatı");
  });

  test("zaten doğru olan değişmez", () => {
    for (const s of ["Edebi Sanatlar (Söz Sanatları)", "İş, Enerji ve Güç", "Geometrik Dönüşümler, Üçgende Eşlik ve Benzerlik"]) {
      expect(baslikBicimi(s)).toBe(s);
    }
  });
});
