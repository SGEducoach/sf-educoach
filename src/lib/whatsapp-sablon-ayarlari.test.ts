import { describe, expect, test } from "vitest";
import { TUM_SABLONLAR, UCRETLI_KURUM_SABLONLARI, etkinSablon, etkinSablonlar, kurumaUygunSablonlar, ucretliKurumMu } from "./whatsapp-sablon-ayarlari";

describe("whatsapp şablon ayarları", () => {
  test("bütün şablonlar tanımlı ve anahtarlar tekil", () => {
    const anahtarlar = TUM_SABLONLAR.map((t) => t.anahtar);
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
    expect(anahtarlar).toEqual(expect.arrayContaining(["veli-toplantisi", "devamsizlik", "aksam-yoklamasi", "evci-izni", "carsi-izni"]));
  });

  test("ayar yoksa varsayılan ad ve yerleşik fotoğraf", () => {
    const e = etkinSablon("veli-toplantisi", undefined);
    expect(e).toEqual({ anahtar: "veli-toplantisi", ad: "Veli Toplantısı", baslik: null, gizli: false, fotolar: ["/duyuru-fotograflari/veli-toplantisi.jpg"] });
  });

  test("admin adı, başlığı ve fotoğrafları uygulanır; yerleşik foto gizlenebilir", () => {
    const e = etkinSablon("veli-toplantisi", {
      anahtar: "veli-toplantisi", ad: "Veli Buluşması", baslik: "Veli Buluşması", gizli: true, yerlesikFotoGizli: true,
      fotograflar: [{ id: "a", adres: "/api/duyuru-fotografi?id=a" }],
    });
    expect(e).toEqual({ anahtar: "veli-toplantisi", ad: "Veli Buluşması", baslik: "Veli Buluşması", gizli: true, fotolar: ["/api/duyuru-fotografi?id=a"] });
  });

  test("başlığı hazırlayanın yazdığı şablonda admin başlığı uygulanmaz", () => {
    expect(TUM_SABLONLAR.find((t) => t.anahtar === "genel")?.baslik).toBeNull();
    expect(etkinSablon("genel", { anahtar: "genel", ad: null, baslik: "X", gizli: false, yerlesikFotoGizli: false, fotograflar: [] }).baslik).toBeNull();
  });

  test("toplu harita her şablonu içerir", () => {
    expect(Object.keys(etkinSablonlar([])).length).toBe(TUM_SABLONLAR.length);
  });

  test("ücret ve kayıt kartları yalnız dershane ve özel okulda görünür", () => {
    expect(UCRETLI_KURUM_SABLONLARI.every((a) => TUM_SABLONLAR.some((t) => t.anahtar === a))).toBe(true);
    expect(ucretliKurumMu({ tur: "dershane" })).toBe(true);
    expect(ucretliKurumMu({ tur: "okul", ozel: true })).toBe(true);
    expect(ucretliKurumMu({ tur: "okul", ozel: false })).toBe(false);
    expect(ucretliKurumMu({ tur: "okul" })).toBe(false);
    const devlet = kurumaUygunSablonlar(etkinSablonlar([]), false);
    expect(devlet["ucret-hatirlatma"].gizli).toBe(true);
    expect(devlet["kayit"].gizli).toBe(true);
    expect(devlet["veli-toplantisi"].gizli).toBe(false);
    expect(kurumaUygunSablonlar(etkinSablonlar([]), true)["ucret-hatirlatma"].gizli).toBe(false);
  });
});
