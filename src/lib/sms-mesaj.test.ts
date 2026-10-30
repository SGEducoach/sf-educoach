import { describe, expect, it } from "vitest";
import { smsIcerigiTemizle, smsUzunlugu } from "@/lib/sms-mesaj";

describe("smsUzunlugu", () => {
  it("GSM karakterleriyle 160'a kadar tek parça", () => {
    const u = smsUzunlugu("a".repeat(160));
    expect(u).toMatchObject({ unicode: false, parca: 1, parcaBasinaKarakter: 160 });
    expect(smsUzunlugu("a".repeat(161))).toMatchObject({ parca: 2, parcaBasinaKarakter: 153 });
  });
  it("genişletme karakterleri iki yer tutar", () => {
    expect(smsUzunlugu("€".repeat(81)).parca).toBe(2);
  });
  it("Türkçe ş/ğ/ı Unicode sayılır ve parçalar kısalır", () => {
    expect(smsUzunlugu("Sayın velimiz, öğrenciniz şu gün")).toMatchObject({ unicode: true, parca: 1, parcaBasinaKarakter: 70 });
    expect(smsUzunlugu("ş".repeat(71))).toMatchObject({ unicode: true, parca: 2, parcaBasinaKarakter: 67 });
  });
  it("boş metin sıfır parça", () => {
    expect(smsUzunlugu("").parca).toBe(0);
  });
});

describe("smsIcerigiTemizle", () => {
  it("kontrol karakterlerini atar, satır sonlarını sadeleştirir", () => {
    expect(smsIcerigiTemizle("  Merhaba\u0000\r\nVeli\u0007 ")).toBe("Merhaba\nVeli");
  });
});
