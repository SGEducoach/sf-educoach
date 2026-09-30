import { describe, expect, test } from "vitest";
import { ORTAOKUL_BRANSLARI, bransListesi, kademeBul, lgsSinifiMi, ortaokulMu, seviyeNormalize } from "./kademe";
import { BRANS_LISTESI } from "./types";
import { REHBER_BRANSI } from "./rehberlik";

describe("seviyeNormalize", () => {
  test("farklı yazımlar tek biçime iner", () => {
    expect(seviyeNormalize("8")).toBe("8");
    expect(seviyeNormalize(" 8 ")).toBe("8");
    expect(seviyeNormalize("8. Sınıf")).toBe("8");
    expect(seviyeNormalize("12.sınıf")).toBe("12");
  });
  test("sayısal olmayan ve sınır dışı değerler null", () => {
    expect(seviyeNormalize("Mezun")).toBeNull();
    expect(seviyeNormalize("Hazırlık")).toBeNull();
    expect(seviyeNormalize("")).toBeNull();
    expect(seviyeNormalize(null)).toBeNull();
    expect(seviyeNormalize("13")).toBeNull();
    expect(seviyeNormalize("0")).toBeNull();
  });
});

describe("kademeBul", () => {
  test("5-8 ortaokul, 9-12 lise", () => {
    for (const s of ["5", "6", "7", "8"]) expect(kademeBul(s), s).toBe("ortaokul");
    for (const s of ["9", "10", "11", "12"]) expect(kademeBul(s), s).toBe("lise");
  });
  test("ilkokul ve tanımsız seviyeler kademesiz", () => {
    for (const s of ["1", "2", "3", "4"]) expect(kademeBul(s), s).toBeNull();
    expect(kademeBul("Mezun")).toBeNull();
    expect(kademeBul(null)).toBeNull();
  });
  test("sınıfı olmayan öğrenci kademesiz sayılır — panel varsayılana düşmeli", () => {
    expect(ortaokulMu(null)).toBe(false);
    expect(ortaokulMu(undefined)).toBe(false);
  });
});

describe("lgsSinifiMi", () => {
  test("yalnız 8. sınıf", () => {
    expect(lgsSinifiMi("8")).toBe(true);
    expect(lgsSinifiMi("8. Sınıf")).toBe(true);
    expect(lgsSinifiMi("7")).toBe(false);
    expect(lgsSinifiMi("12")).toBe(false);
  });
});

describe("bransListesi", () => {
  test("ortaokulda ortaokul branşları, diğer hâllerde lise listesi", () => {
    expect(bransListesi("ortaokul")).toContain("Fen Bilimleri");
    expect(bransListesi("ortaokul")).toContain("Sosyal Bilgiler");
    expect(bransListesi("ortaokul")).toContain("Türkçe");
    expect(bransListesi("lise")).toContain("Türk Dili ve Edebiyatı");
    expect(bransListesi("lise")).not.toContain("Fen Bilimleri");
    expect(bransListesi(null)).toEqual(BRANS_LISTESI);
  });

  test("iki kademede de ders veren branşların metni birebir aynı", () => {
    // Aksi hâlde aynı öğretmen iki ayrı branş gibi görünür.
    for (const ortak of ["Matematik", "İngilizce", "Din Kültürü", "Beden Eğitimi", "Müzik", "Diğer"]) {
      expect(ORTAOKUL_BRANSLARI, ortak).toContain(ortak);
      expect(BRANS_LISTESI, ortak).toContain(ortak);
    }
  });

  test("rehber branşı iki listede de aynı sabitten gelir", () => {
    expect(ORTAOKUL_BRANSLARI).toContain(REHBER_BRANSI);
    expect(BRANS_LISTESI).toContain(REHBER_BRANSI);
  });
});
