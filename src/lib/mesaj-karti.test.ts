import { describe, expect, test } from "vitest";
import { kartTarihi, mesajKartiIcerigi, type MesajKartiGorevi } from "./mesaj-karti";

const temel: Omit<MesajKartiGorevi, "id" | "tur" | "konu"> = {
  ders: "Türkçe", hedefSoru: null, hedefDakika: null, tarih: "2026-10-18", sonTarih: "2026-10-25", aciklama: null,
  siniflar: ["11-A", "11-B", "11-C", "11-D"],
};

describe("mesajKartiIcerigi", () => {
  test("gerçek örnek: soru çözümü + konu çalışma", () => {
    const k = mesajKartiIcerigi([
      { ...temel, id: "1", tur: "soru", konu: "Sözcükte Yapı (Kök ve Ekler)", aciklama: "30+ olacak şekilde çözelim.Sisteme işlemeyi unutmayın!" },
      { ...temel, id: "2", tur: "konu", konu: "Ses Bilgisi", sonTarih: "2026-10-22", aciklama: "Bu haftaki konumuz" },
    ], "Sedat Güler");
    expect(k.ustBaslik).toBe("11. Sınıflar");
    expect(k.sinifSatiri).toBe("11-A · 11-B · 11-C · 11-D");
    expect(k.baslikVurgu).toBe("Türkçe");
    expect(k.odevler[0]).toMatchObject({ turEtiketi: "Soru çözümü", hedef: "En az 30 soru", tarih: "Son gün: 25 Ekim Pazar" });
    expect(k.odevler[1]).toMatchObject({ turEtiketi: "Konu çalışma", hedef: "Bu haftaki konumuz", tarih: "18 Ekim Pazar – 22 Ekim Perşembe" });
    expect(k.altSol).toBe("Türkçe · Sedat Güler");
  });

  test("sistemdeki hedef açıklamadan önce gelir; uzun açıklama hedef olmaz", () => {
    const k = mesajKartiIcerigi([
      { ...temel, id: "1", tur: "soru", konu: "Paragraf", hedefSoru: 40, aciklama: "20+" },
      { ...temel, id: "2", tur: "konu", konu: "Ses Bilgisi", aciklama: "Bu konuyu ders kitabından ve notlarınızdan ayrıntılı çalışın" },
    ], null);
    expect(k.odevler[0].hedef).toBe("En az 40 soru");
    expect(k.odevler[1].hedef).toBeNull();
    expect(k.altSol).toBe("Türkçe");
  });

  test("farklı dersler ve seviyeler; sınıflar sayısal sırada; en fazla 4 ödev", () => {
    const k = mesajKartiIcerigi([
      { ...temel, id: "1", tur: "soru", konu: "A", siniflar: ["10-B"] },
      { ...temel, id: "2", tur: "deneme", konu: null, ders: "Matematik", siniflar: ["9-A"] },
      { ...temel, id: "3", tur: "soru", konu: "C", siniflar: ["10-A"] },
      { ...temel, id: "4", tur: "soru", konu: "D", siniflar: [] },
      { ...temel, id: "5", tur: "soru", konu: "E", siniflar: ["12-A"] },
    ], "X");
    expect(k.odevler).toHaveLength(4);
    expect(k.sinifSatiri).toBe("9-A · 10-A · 10-B");
    expect(k.ustBaslik).toBe("9, 10. Sınıflar");
    expect(k.baslikVurgu).toBe("");
    expect(k.odevler[1].baslik).toBe("Matematik"); // konusuz deneme ders adıyla
  });

  test("kartTarihi Türkçe gün adıyla", () => {
    expect(kartTarihi("2026-10-22")).toBe("22 Ekim Perşembe");
  });
});
