import { describe, expect, test } from "vitest";
import { kisiDurumunuUygula, kisiyeYeniSayisi, sinifTakipKapsamiVarMi, sinifTakipNotunuTemizle, sinifTakipTuruMu, sinifTaramaAnahtari, sutunYokHatasiMi, yonlendirmeHatasi } from "./sinif-takip";

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
  test("rehberle aynı beş tür (yükseliş ve biriken görev dahil, 24.10.2026)", () => {
    expect(["net_dususu", "net_yukselisi", "ders_dususu", "sessizlik", "gorev_birikmesi"].every(sinifTakipTuruMu)).toBe(true);
    expect(sinifTakipTuruMu("bilinmeyen")).toBe(false);
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

describe("rehberliğe yönlendirme (0177)", () => {
  test("gerekçe en az 10 karakter", () => {
    expect(yonlendirmeHatasi(null)).not.toBeNull();
    expect(yonlendirmeHatasi("kısa")).not.toBeNull();
    expect(yonlendirmeHatasi("Öğrenciyle görüştüm, destek gerekiyor.")).toBeNull();
  });
  test("sütun yok hatası tanınır; başka hata tanınmaz", () => {
    expect(sutunYokHatasiMi({ code: "42703", message: "column does not exist" })).toBe(true);
    expect(sutunYokHatasiMi({ code: "PGRST204", message: "Could not find the 'rehbere_yonlendirildi' column" })).toBe(true);
    expect(sutunYokHatasiMi({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(sutunYokHatasiMi(null)).toBe(false);
  });
  test("öğretmenin yönlendirme işareti kendi görünümüne taşınır", () => {
    const kayit: { id: string; durum: "yeni"; notMetni: string | null; kapatanAdi: string | null; kapatilmaAt: string | null; rehbereYonlendirildi?: boolean } = { id: "b1", durum: "yeni", notMetni: null, kapatanAdi: null, kapatilmaAt: null };
    const [y] = kisiDurumunuUygula([kayit], new Map([["b1", { durum: "ele_alindi" as const, notMetni: "Gerekçe metni", rehbereYonlendirildi: true }]]));
    expect(y).toMatchObject({ durum: "ele_alindi", rehbereYonlendirildi: true });
    const [n] = kisiDurumunuUygula([kayit], new Map());
    expect(n.rehbereYonlendirildi).toBe(false);
  });
});
