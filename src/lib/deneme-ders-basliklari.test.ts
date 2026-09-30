import { describe, expect, test } from "vitest";
import { birlesikTytDersBasliklariMi, dersEtiketleriCikar } from "./deneme-pdf-ayristirici";

// Okul net listesi ("Limit" biçimi) başlık satırından ders adlarının
// çıkarılması. Kullanıcı bildirimi 29.09.2026: Kafa Dengi listesi Limit'in
// aynısı ama "Felsefe (Seçmeli)" sütunu yok (11 yerine 10 ders) ve ders
// adları "Sıra Ö.No İsim Sınıf" satırının devamında geliyor. Tam-satır
// deseni tutmayınca etiketler "Ders 1..10" kalıyor, PDF deterministik
// yoldan okunamayıp Claude'a düşüyor ve reddediliyordu.

const KAFA_DENGI = "Sıra Ö.No İsim Sınıf Türkçe Tarih-1 Coğrafya-1 Felsefe Din Kül. ve Ahl. Bil. Matematik-1 Geometri Fizik Kimya Biyoloji Toplam TYT";
const LIMIT = "Türkçe Tarih-1 Coğrafya-1 Felsefe Din Kül. ve Ahl. Bil. Felsefe (Seçmeli) Matematik-1 Geometri Fizik Kimya Biyoloji";

describe("dersEtiketleriCikar", () => {
  test("Kafa Dengi: 10 ders, sabit sütun öneki ve sondaki Toplam/TYT ayıklanır", () => {
    expect(dersEtiketleriCikar(KAFA_DENGI, 10)).toEqual([
      "Türkçe", "Tarih-1", "Coğrafya-1", "Felsefe", "Din Kül. ve Ahl. Bil.",
      "Matematik-1", "Geometri", "Fizik", "Kimya", "Biyoloji",
    ]);
  });

  test("Limit: 11 dersli seçmeli içeren şablon aynen tanınmayı sürdürür", () => {
    expect(dersEtiketleriCikar(LIMIT, 11)).toEqual([
      "Türkçe", "Tarih-1", "Coğrafya-1", "Felsefe", "Din Kül. ve Ahl. Bil.", "Felsefe (Seçmeli)",
      "Matematik-1", "Geometri", "Fizik", "Kimya", "Biyoloji",
    ]);
  });

  test("birleşik sütunlu şablon (TYT Türkçe/Sosyal/Matematik/Fen) korunur", () => {
    const dersler = dersEtiketleriCikar("TYT Türkçe TYT Sosyal TYT Matematik TYT Fen", 4);
    expect(dersler).toEqual(["TYT Türkçe", "TYT Sosyal", "TYT Matematik", "TYT Fen"]);
    expect(birlesikTytDersBasliklariMi(dersler)).toBe(true);
  });

  test("birleşik TYT başlık kontrolü eksik veya sırası bozuk listeyi kabul etmez", () => {
    expect(birlesikTytDersBasliklariMi(["TYT Türkçe", "TYT Matematik", "TYT Sosyal", "TYT Fen"])).toBe(false);
    expect(birlesikTytDersBasliklariMi(["TYT Türkçe", "TYT Sosyal", "TYT Matematik"])).toBe(false);
  });

  test("ders sayısı gramerle tutmuyorsa jenerik ada düşer", () => {
    // Başlıkta 10 ad var ama gramer 11 sütun diyorsa hizalama bozuktur:
    // yanlış derse yazmaktansa jenerik kalıp Claude'a düşmek güvenli.
    expect(dersEtiketleriCikar(KAFA_DENGI, 11)).toEqual(
      Array.from({ length: 11 }, (_, i) => `Ders ${i + 1}`),
    );
  });

  test("bilinmeyen ders adı varsa jenerik ada düşer", () => {
    expect(dersEtiketleriCikar("Edebiyat Tarih-2 Coğrafya-2", 3))
      .toEqual(["Ders 1", "Ders 2", "Ders 3"]);
  });

  test("seçmeli, düz Felsefe ile karışmaz", () => {
    expect(dersEtiketleriCikar("Felsefe Felsefe (Seçmeli)", 2)).toEqual(["Felsefe", "Felsefe (Seçmeli)"]);
  });
});
