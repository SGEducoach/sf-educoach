import { describe, expect, test } from "vitest";
import { kisiDurumunuUygula, kisiyeYeniSayisi, sinifTakipKapsamiVarMi, sinifTakipNotunuTemizle, sinifTakipTuruMu, sinifTaramaAnahtari } from "./sinif-takip";

describe("sinifTakipKapsamiVarMi", () => {
  test("lise ve ortaokul sınıf öğretmeninde kapsam vardır", () => {
    expect(sinifTakipKapsamiVarMi({ sinifId: "c1", sinifSeviyesi: "10", grupMu: false })).toBe(true);
    expect(sinifTakipKapsamiVarMi({ sinifId: "c1", sinifSeviyesi: "6", grupMu: false })).toBe(true);
  });
  test("sınıfı olmayan, ilkokul ya da grup koçluğu kurumu hariçtir", () => {
    expect(sinifTakipKapsamiVarMi({ sinifId: null, sinifSeviyesi: null, grupMu: false })).toBe(false);
    expect(sinifTakipKapsamiVarMi({ sinifId: "c1", sinifSeviyesi: "3", grupMu: false })).toBe(false);
    expect(sinifTakipKapsamiVarMi({ sinifId: "c1", sinifSeviyesi: "10", grupMu: true })).toBe(false);
  });
});

describe("sınıf takip türleri", () => {
  test("yalnız net düşüşü, ders düşüşü ve sessizlik", () => {
    expect(["net_dususu", "ders_dususu", "sessizlik"].every(sinifTakipTuruMu)).toBe(true);
    expect(sinifTakipTuruMu("net_yukselisi")).toBe(false);
    expect(sinifTakipTuruMu("gorev_birikmesi")).toBe(false);
  });
  test("tarama anahtarı sınıfa özeldir", () => {
    expect(sinifTaramaAnahtari("abc")).toBe("sinif:abc");
  });
});

describe("kisiDurumunuUygula", () => {
  const kayit = (id: string) => ({ id, durum: "ele_alindi" as const, notMetni: "REHBER NOTU — gizli", kapatanAdi: "Rehber", kapatilmaAt: "2026-10-20T10:00:00Z" });

  test("rehberin ortak durumu ve NOTU sınıf öğretmenine sızmaz", () => {
    const [b] = kisiDurumunuUygula([kayit("a")], new Map());
    expect(b.durum).toBe("yeni");
    expect(b.notMetni).toBeNull();
    expect(b.kapatanAdi).toBeNull();
    expect(b.kapatilmaAt).toBeNull();
  });

  test("kişinin kendi durumu ve notu uygulanır", () => {
    const [b] = kisiDurumunuUygula([kayit("a")], new Map([["a", { durum: "goruldu" as const, notMetni: "Veliyle konuşuldu" }]]));
    expect(b.durum).toBe("goruldu");
    expect(b.notMetni).toBe("Veliyle konuşuldu");
  });

  test("yeni sayısı kendi durum satırı olmayanlardır", () => {
    const d = new Map([["a", { durum: "goruldu" as const, notMetni: null }]]);
    expect(kisiyeYeniSayisi(["a", "b", "c"], d)).toBe(2);
  });
});

describe("sinifTakipNotunuTemizle", () => {
  test("boşlukları atar, boşsa null, uzunu keser", () => {
    expect(sinifTakipNotunuTemizle("  merhaba ")).toBe("merhaba");
    expect(sinifTakipNotunuTemizle("   ")).toBeNull();
    expect(sinifTakipNotunuTemizle(undefined)).toBeNull();
    expect(sinifTakipNotunuTemizle("x".repeat(900))).toHaveLength(500);
  });
});
