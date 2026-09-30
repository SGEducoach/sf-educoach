import { describe, expect, it } from "vitest";
import { hizDogrulukKategorisiBelirle, makasTeshisiBelirle } from "./analiz-motoru";
import { DOGRULUK_ESIGI_CALISMA, DOGRULUK_ESIGI_SINAV, dersTempoButcesi } from "./sinav-tempo";

// 28.09.2026 revizyonu: eşik artık öğrencinin kendi genel ortalaması değil,
// ders bazlı dış referans (popülasyon medyanı ya da sınav bütçesi).
describe("hız-doğruluk ders eşikleri", () => {
  it("matematikte sınav bütçesi 1 dakika 30 saniye olarak korunuyor", () => {
    expect(dersTempoButcesi("TYT", "Matematik")).toBe(1.5);
  });

  it("referansın altında ve doğruysa hızlı-doğru", () => {
    expect(hizDogrulukKategorisiBelirle({
      ders: "Matematik",
      ortSureDakika: 1.2,
      dogrulukOrani: 0.9,
      referansDakika: 1.27,
      dogrulukEsigi: DOGRULUK_ESIGI_CALISMA,
    })).toBe("hizli-dogru");
  });

  it("referansın %10 üstüne kadar hâlâ hızlı sayılır (tolerans)", () => {
    expect(hizDogrulukKategorisiBelirle({
      ders: "Türkçe",
      ortSureDakika: 1.2,
      dogrulukOrani: 0.9,
      referansDakika: 1.1,
      dogrulukEsigi: DOGRULUK_ESIGI_CALISMA,
    })).toBe("hizli-dogru");
  });

  it("toleransın da üstü yavaş sayılır", () => {
    expect(hizDogrulukKategorisiBelirle({
      ders: "Türkçe",
      ortSureDakika: 1.3,
      dogrulukOrani: 0.9,
      referansDakika: 1.1,
      dogrulukEsigi: DOGRULUK_ESIGI_CALISMA,
    })).toBe("yavas-dogru");
  });

  it("çalışma modunda %85 altı doğruluk 'hatalı' köşesini doldurur", () => {
    // Eski %60 eşiğiyle bu kayıt 'hizli-dogru' görünüyordu: canlı veride
    // doğruluk medyanı %92 olduğu için "hatalı" köşeleri hiç dolmuyordu.
    expect(hizDogrulukKategorisiBelirle({
      ders: "Türkçe",
      ortSureDakika: 1.0,
      dogrulukOrani: 0.78,
      referansDakika: 1.1,
      dogrulukEsigi: DOGRULUK_ESIGI_CALISMA,
    })).toBe("hizli-hatali");
  });

  it("deneme modunda eşik %60 kalır", () => {
    expect(hizDogrulukKategorisiBelirle({
      ders: "Türkçe",
      ortSureDakika: 1.0,
      dogrulukOrani: 0.78,
      referansDakika: 1.1,
      dogrulukEsigi: DOGRULUK_ESIGI_SINAV,
    })).toBe("hizli-dogru");
  });
});

// Katman 9 — yetişme/makas.
describe("makas teşhisi", () => {
  it("boş yüksek ama zaman kanıtı yoksa yetişemiyor demez", () => {
    // Örnek: Biyolojide 13 sorunun 8'i boş. Boşlar tek başına süre kanıtı değildir.
    expect(makasTeshisiBelirle({
      bosOrani: 8 / 13,
      sinavDogrulukOrani: 0.79,
      calismaDogrulukOrani: 0.94,
    })).toBe("bos-yuksek");
  });

  it("boş yüksek ve ayrı zaman kanıtı varsa yetişemiyor", () => {
    expect(makasTeshisiBelirle({
      bosOrani: 0.41,
      sinavDogrulukOrani: 0.79,
      calismaDogrulukOrani: 0.94,
      zamanKaniti: true,
    })).toBe("yetisemiyor");
  });

  it("boş yüksek ve cevapladığı da yanlışsa: bilgi eksiği", () => {
    expect(makasTeshisiBelirle({
      bosOrani: 0.4,
      sinavDogrulukOrani: 0.45,
      calismaDogrulukOrani: 0.9,
    })).toBe("bilgi");
  });

  it("soruları yetiştiriyor ama çalışmadaki doğruluğu sınavda düşüyorsa", () => {
    expect(makasTeshisiBelirle({
      bosOrani: 0.07,
      sinavDogrulukOrani: 0.72,
      calismaDogrulukOrani: 0.9,
    })).toBe("sinavda-dusus");
  });

  it("hem yetişiyor hem doğruluk korunuyorsa sağlam", () => {
    expect(makasTeshisiBelirle({
      bosOrani: 0.05,
      sinavDogrulukOrani: 0.88,
      calismaDogrulukOrani: 0.92,
    })).toBe("saglam");
  });

  it("çalışma verisi yoksa makas aranmaz", () => {
    expect(makasTeshisiBelirle({
      bosOrani: 0.05,
      sinavDogrulukOrani: 0.7,
      calismaDogrulukOrani: null,
    })).toBe("saglam");
  });
});
