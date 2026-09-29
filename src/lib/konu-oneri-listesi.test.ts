import { describe, expect, it } from "vitest";
import { soruKonuOnerileri } from "./konu-oneri-listesi";
import { BRANS_DENEMESI_KONUSU } from "./types";

const ONERILER = [
  { ders: "Matematik", konu: "Türev", seviye: "12" },
  { ders: "Matematik", konu: "Limit", seviye: "12" },
  { ders: "Türkçe", konu: "Paragraf", seviye: "11" },
];

describe("soru çözümü konu önerileri", () => {
  it("branş denemesi listenin en başında", () => {
    const liste = soruKonuOnerileri(ONERILER, "Matematik", "");
    expect(liste[0].konu).toBe(BRANS_DENEMESI_KONUSU);
    expect(liste.map((o) => o.konu)).toEqual([BRANS_DENEMESI_KONUSU, "Türev", "Limit"]);
  });

  it("seçilen dersin konularıyla birlikte gelir", () => {
    const liste = soruKonuOnerileri(ONERILER, "Türkçe", "");
    expect(liste.map((o) => o.konu)).toEqual([BRANS_DENEMESI_KONUSU, "Paragraf"]);
  });

  it("hiç konusu olmayan derste de görünür", () => {
    const liste = soruKonuOnerileri(ONERILER, "Felsefe", "");
    expect(liste).toHaveLength(1);
    expect(liste[0].konu).toBe(BRANS_DENEMESI_KONUSU);
    expect(liste[0].ders).toBe("Felsefe");
  });

  it("kendi adıyla aranabilir", () => {
    for (const arama of ["branş", "Branş", "deneme", "BRANŞ DEN"]) {
      expect(soruKonuOnerileri(ONERILER, "Matematik", arama)[0]?.konu, arama).toBe(BRANS_DENEMESI_KONUSU);
    }
  });

  it("alakasız arama yazılınca listeden çıkar", () => {
    const liste = soruKonuOnerileri(ONERILER, "Matematik", "türev");
    expect(liste.map((o) => o.konu)).toEqual(["Türev"]);
  });

  it("aramada büyük İ/ı farkı branş başlığını düşürmez", () => {
    expect(soruKonuOnerileri(ONERILER, "Matematik", "Deneme")[0].konu).toBe(BRANS_DENEMESI_KONUSU);
  });
});
