import { describe, expect, test } from "vitest";
import { adAnahtari, grupGirdisiHatasi, grupKapasitesiMi, grupKoduNormalize, grupKoduUret, grupOgrencisiGirdisiHatasi, kalanGun } from "./grup-kocluk";

describe("grupKoduUret", () => {
  test("grup adının ilk kelimesini kullanır", () => {
    expect(grupKoduUret("Yıldız Eğitim")).toBe("yıldızsefu");
    expect(grupKoduUret("  Başarı   Akademi ")).toBe("başarısefu");
  });
  test("çakışan kodlara sıra numarası ekler", () => {
    expect(grupKoduUret("Yıldız Eğitim", 2)).toBe("yıldızsefu2");
    expect(grupKoduUret("*** Grup")).toBe("grupsefu");
  });
  test("yazım farklarını aynı giriş koduna dönüştürür", () => {
    expect(grupKoduNormalize(" YILDIZ SEFU ")).toBe("yıldızsefu");
    expect(grupKoduNormalize("yıldızsefu")).toBe("yıldızsefu");
  });
});

describe("kalanGun", () => {
  test("gün farkı; bitiş günü 0, ertesi gün -1", () => {
    expect(kalanGun("2026-09-30", "2026-09-18")).toBe(12);
    expect(kalanGun("2026-09-18", "2026-09-18")).toBe(0);
    expect(kalanGun("2026-09-17", "2026-09-18")).toBe(-1);
  });
});

describe("grupGirdisiHatasi", () => {
  const gecerli = {
    grupAdi: "Yıldız Koçluk", kocAd: "Ayşe Yılmaz", kocEmail: "ayse@ornek.com", kocTelefon: "5321234567",
    kapasite: 10, bitisTarihi: "2027-06-30", taahhut: true,
  };
  test("geçerli girdi", () => {
    expect(grupGirdisiHatasi(gecerli, "2026-09-18")).toBeNull();
  });
  test("hatalı alanlar yakalanır", () => {
    expect(grupGirdisiHatasi({ ...gecerli, kapasite: 12 }, "2026-09-18")).toMatch(/Kapasite/);
    expect(grupGirdisiHatasi({ ...gecerli, kocAd: "Ayşe" }, "2026-09-18")).toMatch(/soyad/);
    expect(grupGirdisiHatasi({ ...gecerli, kocEmail: "ayse" }, "2026-09-18")).toMatch(/e-posta/);
    expect(grupGirdisiHatasi({ ...gecerli, kocTelefon: "532 123" }, "2026-09-18")).toMatch(/Telefon/);
    expect(grupGirdisiHatasi({ ...gecerli, bitisTarihi: "2026-09-01" }, "2026-09-18")).toMatch(/önce/);
    expect(grupGirdisiHatasi({ ...gecerli, taahhut: false }, "2026-09-18")).toMatch(/taahhüd/);
  });
  test("kapasite kümesi", () => {
    expect([5, 10, 15, 20].every(grupKapasitesiMi)).toBe(true);
    expect(grupKapasitesiMi(7)).toBe(false);
  });
});

describe("grupOgrencisiGirdisiHatasi", () => {
  test("geçerli girdi", () => {
    expect(grupOgrencisiGirdisiHatasi({ ad: "Ali Veli", kullaniciAdi: "ali_veli12", seviye: "11" })).toBeNull();
  });
  test("hatalar", () => {
    expect(grupOgrencisiGirdisiHatasi({ ad: "Ali", kullaniciAdi: "ali_veli12", seviye: "11" })).toMatch(/soyad/);
    expect(grupOgrencisiGirdisiHatasi({ ad: "Ali Veli", kullaniciAdi: "ali", seviye: "11" })).toMatch(/6-30/);
    expect(grupOgrencisiGirdisiHatasi({ ad: "Ali Veli", kullaniciAdi: "alişveli", seviye: "11" })).toMatch(/Türkçe/);
    expect(grupOgrencisiGirdisiHatasi({ ad: "Ali Veli", kullaniciAdi: "ali veli12", seviye: "11" })).toMatch(/6-30/);
    expect(grupOgrencisiGirdisiHatasi({ ad: "Ali Veli", kullaniciAdi: "ali_veli12", seviye: "Mezun" })).toMatch(/düzey/);
  });
});

describe("adAnahtari", () => {
  test("Türkçe harf ve büyük/küçük harf farkı sadeleşir", () => {
    expect(adAnahtari("  Ayşe   YILDIZ İÇEL ")).toBe("ayse yildiz icel");
    expect(adAnahtari("ÖMER ŞAHİN")).toBe(adAnahtari("Ömer Şahin"));
    expect(adAnahtari("Işıl Güneş")).toBe("isil gunes");
  });
});
