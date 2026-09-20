import { describe, expect, it } from "vitest";
import { hizDogrulukKategorisiBelirle } from "./analiz-motoru";

describe("hız-doğruluk ders eşikleri", () => {
  it("matematikte 1 dakika 30 saniyeyi hızlı kabul eder", () => {
    expect(hizDogrulukKategorisiBelirle({
      ders: "Matematik",
      ortSureDakika: 1.5,
      dogrulukOrani: 0.8,
      genelOrtSureDakika: 0.9,
    })).toBe("hizli-dogru");
  });

  it("matematikte 1 dakika 30 saniyenin üstünü yavaş kabul eder", () => {
    expect(hizDogrulukKategorisiBelirle({
      ders: "Matematik",
      ortSureDakika: 1.51,
      dogrulukOrani: 0.8,
      genelOrtSureDakika: 2,
    })).toBe("yavas-dogru");
  });

  it("diğer derslerde öğrencinin genel ortalamasını kullanmayı sürdürür", () => {
    expect(hizDogrulukKategorisiBelirle({
      ders: "Türkçe",
      ortSureDakika: 1.2,
      dogrulukOrani: 0.55,
      genelOrtSureDakika: 1.3,
    })).toBe("hizli-hatali");
  });
});
