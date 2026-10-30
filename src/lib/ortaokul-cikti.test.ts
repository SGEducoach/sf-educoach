import { describe, expect, it } from "vitest";
import veri from "./ortaokul-senaryo-ciktilari.json";
import {
  CIKTI_DERSLERI, bransCiktiDersleri, ciktiDersiMi, ciktiDuzeyiMi, ortaokulCiktiSinifiMi, senaryoOzeti, sinifCiktiDersleri,
  ulkeGeneliMi, yaziliCiktilari, yaziliSenaryolari, type SenaryoCiktisi,
} from "./ortaokul-cikti";

const ciktilar = veri.ciktilar as SenaryoCiktisi[];
const dersSinif = (ders: string, sinif: string) => ciktilar.filter((c) => c.ders === ders && c.sinif === sinif);

describe("senaryo verisi (MEB 2026-2027 1. dönem konu soru dağılım tabloları)", () => {
  it("323 öğrenme çıktısı; her ders ve sınıfta en az bir çıktı var", () => {
    expect(ciktilar).toHaveLength(323);
    for (const d of CIKTI_DERSLERI) for (const s of d.siniflar) expect(dersSinif(d.anahtar, s).length, `${d.anahtar} ${s}`).toBeGreaterThan(0);
  });
  it("kodlar ders ve sınıf içinde tekil, kod sınıf numarasını taşır, her çıktı en az bir yazılıda", () => {
    const anahtarlar = ciktilar.map((c) => `${c.ders}|${c.sinif}|${c.kod}`);
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
    for (const c of ciktilar) {
      expect(ciktiDersiMi(c.ders)).toBe(true);
      expect(c.kod).toMatch(new RegExp(`(^|[.A-Z])${c.sinif}\\.`));
      expect(c.metin.length).toBeGreaterThan(5);
      expect(c.yazili1 ?? c.yazili2).toBeDefined();
    }
  });
  it("6. sınıf Matematik 1. yazılısı ve 7. sınıf Türkçe 2. yazılısı ülke geneli (senaryo yok)", () => {
    expect(ulkeGeneliMi(dersSinif("matematik", "6"), 1)).toBe(true);
    expect(yaziliSenaryolari(dersSinif("matematik", "6"), 1)).toEqual([]);
    expect(ulkeGeneliMi(dersSinif("turkce", "7"), 2)).toBe(true);
    expect(ulkeGeneliMi(dersSinif("matematik", "5"), 1)).toBe(false);
  });
});

describe("yazılı ve senaryo süzgeci", () => {
  const ornek: SenaryoCiktisi[] = [
    { ders: "din", sinif: "5", kod: "DKAB.5.1.1", metin: "Birinci çıktı", unite: null, konu: null, yazili1: { "1": 1, "2": 1 }, yazili2: { "4": 1 } },
    { ders: "din", sinif: "5", kod: "DKAB.5.1.2", metin: "İkinci çıktı", unite: null, konu: null, yazili1: { "3": 2 } },
    { ders: "din", sinif: "5", kod: "DKAB.5.2.1", metin: "Üçüncü çıktı", unite: null, konu: null, yazili2: { "1": 1 } },
  ];
  it("yazılıdaki çıktılar ve senaryo numaraları", () => {
    expect(yaziliCiktilari(ornek, 1).map((c) => c.kod)).toEqual(["DKAB.5.1.1", "DKAB.5.1.2"]);
    expect(yaziliCiktilari(ornek, 2).map((c) => c.kod)).toEqual(["DKAB.5.1.1", "DKAB.5.2.1"]);
    expect(yaziliSenaryolari(ornek, 1)).toEqual([1, 2, 3]);
  });
  it("senaryo seçilince yalnız o senaryodaki çıktılar", () => {
    expect(yaziliCiktilari(ornek, 1, 3).map((c) => c.kod)).toEqual(["DKAB.5.1.2"]);
    expect(yaziliCiktilari(ornek, 1, 2).map((c) => c.kod)).toEqual(["DKAB.5.1.1"]);
  });
  it("ülke geneli sınavda senaryo süzgeci uygulanmaz", () => {
    const ulke: SenaryoCiktisi[] = [{ ders: "matematik", sinif: "6", kod: "MAT.6.1.1", metin: "x çıktısı", unite: null, konu: null, yazili1: "ulke" }];
    expect(yaziliCiktilari(ulke, 1, 2)).toHaveLength(1);
    expect(senaryoOzeti(ulke[0], 1)).toBe("Ülke geneli ortak sınav");
  });
  it("senaryo özeti soru sayılarını sıralı yazar", () => {
    expect(senaryoOzeti(ornek[0], 1)).toBe("S1: 1 soru · S2: 1 soru");
    expect(senaryoOzeti(ornek[2], 1)).toBe("");
  });
});

describe("dersler, branşlar ve düzeyler", () => {
  it("Sosyal Bilgiler 5-7'de, İnkılap Tarihi 8'de; ikisini de Sosyal Bilgiler öğretmeni yazar", () => {
    expect(sinifCiktiDersleri("7")).toContain("sosyal");
    expect(sinifCiktiDersleri("7")).not.toContain("inkilap");
    expect(sinifCiktiDersleri("8")).toContain("inkilap");
    expect(sinifCiktiDersleri("8")).not.toContain("sosyal");
    expect(bransCiktiDersleri("Sosyal Bilgiler")).toEqual(["sosyal", "inkilap"]);
  });
  it("branşı olmayan ya da senaryosu olmayan branş ders almaz", () => {
    expect(bransCiktiDersleri("Din Kültürü")).toEqual(["din"]);
    expect(bransCiktiDersleri("Görsel Sanatlar")).toEqual([]);
    expect(bransCiktiDersleri("Sınıf Öğretmeni")).toEqual([]);
    expect(bransCiktiDersleri(null)).toEqual([]);
  });
  it("yalnız 5-8. sınıflar; MEB'in dört düzeyi", () => {
    expect(["4", "5", "8", "9"].map(ortaokulCiktiSinifiMi)).toEqual([false, true, true, false]);
    expect(ciktiDuzeyiMi("cok_iyi")).toBe(true);
    expect(ciktiDuzeyiMi("basarili")).toBe(false);
  });
});
