import { describe, expect, test } from "vitest";
import { DUYURU_SABLONLARI, devamsizlikVeliKarti, kartTarihi, topluListeSayfalari, varsayilanDegerler } from "./whatsapp-duyuru";

const sablon = (a: string) => DUYURU_SABLONLARI.find((s) => s.anahtar === a)!;

describe("whatsapp duyuru şablonları", () => {
  test("anahtarlar tekil, her şablonun fotoğrafı ve en az bir alanı var", () => {
    const anahtarlar = DUYURU_SABLONLARI.map((s) => s.anahtar);
    expect(new Set(anahtarlar).size).toBe(anahtarlar.length);
    for (const s of DUYURU_SABLONLARI) {
      expect(s.foto).toMatch(/\.jpg$/);
      expect(s.alanlar.length).toBeGreaterThan(0);
    }
  });

  test("SeFu markası yalnız giriş gerektiren deneme sonuçlarında", () => {
    const girisli = DUYURU_SABLONLARI.filter((s) => s.icerik(varsayilanDegerler(s)).girisGerekli).map((s) => s.anahtar);
    expect(girisli).toEqual(["deneme-sonuc"]);
  });

  test("veli toplantısı: boş alanlar satıra düşmez, tarih Türkçe", () => {
    const k = sablon("veli-toplantisi").icerik({ kapsam: "12. sınıf velilerimiz", tarih: "2026-10-25", saat: "19:30", yer: "", gundem: "" });
    expect(k.altBaslik).toBe("12. sınıf velilerimiz");
    expect(k.satirlar).toEqual([{ etiket: "Tarih", deger: "25 Ekim 2026 Pazar" }, { etiket: "Saat", deger: "19:30" }]);
    expect(k.aciklama).toBeNull();
  });

  test("kartTarihi geçersiz değeri olduğu gibi bırakır", () => {
    expect(kartTarihi("2026-10-29")).toBe("29 Ekim 2026 Perşembe");
    expect(kartTarihi("yarın")).toBe("yarın");
  });
});

describe("devamsızlık", () => {
  test("veli kartı yalnız o öğrencinin bilgisini taşır; not yoksa hazır metin", () => {
    const k = devamsizlikVeliKarti({ id: "1", ad: "Ali Kaya", sinif: "12-A", dersSaat: "1. ve 2. ders" }, "2026-10-19", "");
    expect(k.satirlar.map((s) => s.etiket)).toEqual(["Öğrenci", "Sınıf", "Tarih", "Ders / saat"]);
    expect(k.aciklama).toContain("Ali Kaya, 19 Ekim 2026 Pazartesi tarihinde derse katılmamıştır (1. ve 2. ders).");
    expect(devamsizlikVeliKarti({ id: "1", ad: "A", sinif: null, dersSaat: "" }, "2026-10-19", "Özel not").aciklama).toBe("Özel not");
  });

  test("toplu liste sayfalara bölünür", () => {
    expect(topluListeSayfalari(Array.from({ length: 35 }, (_, i) => i), 16).map((s) => s.length)).toEqual([16, 16, 3]);
  });
});
