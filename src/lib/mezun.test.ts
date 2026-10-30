import { describe, expect, it } from "vitest";
import { adSoyadAyir, mezunBilgisiDogrula, mezunGuncellemesi, mezunPdfEslestir, otomatikAktarimYili } from "./mezun";
import { mezunPdfiniCoz } from "./mezun-pdf";
import type { PdfOgesi } from "./pdf-metni";

// Uydurma adlar (kişisel veri depoya girmez).

describe("ad soyad ayırma ve alan doğrulama", () => {
  it("son sözcük soyad, büyük harfli ad düzeltilir", () => {
    expect(adSoyadAyir("AHMET CAN YILDIZ")).toEqual({ ad: "Ahmet Can", soyad: "Yıldız" });
    expect(adSoyadAyir("ELİF")).toEqual({ ad: "Elif", soyad: "" });
  });
  it("ad ve geçerli yıl zorunlu; bozuk telefon/e-posta kaydı engellemez, uyarı olur", () => {
    const r = mezunBilgisiDogrula({ ad: "zeynep", soyad: "KAYA", telefon: "0532 123 45 67", eposta: " Zeynep@Ornek.COM ", mezuniyetYili: "2023", il: "kahramanmaraş" }, 2026);
    expect(r.bilgi).toMatchObject({ ad: "Zeynep", soyad: "Kaya", telefon: "905321234567", eposta: "zeynep@ornek.com", mezuniyetYili: 2023, il: "Kahramanmaraş" });
    const bozuk = mezunBilgisiDogrula({ ad: "Ali", soyad: "Er", telefon: "123", eposta: "ali-at-ornek", mezuniyetYili: 2020 }, 2026);
    expect(bozuk.bilgi).toMatchObject({ telefon: null, eposta: null });
    expect(bozuk.uyarilar).toHaveLength(2);
    expect(mezunBilgisiDogrula({ soyad: "Er", mezuniyetYili: 2020 }, 2026).hatalar).toContain("Ad boş.");
    expect(mezunBilgisiDogrula({ ad: "Ali", mezuniyetYili: 2030 }, 2026).bilgi).toBeNull();
    expect(mezunBilgisiDogrula({ ad: "Ali", mezuniyetYili: "" }, 2026).hatalar).toContain("Mezuniyet yılı boş.");
  });
});

describe("otomatik aktarım zamanı (1 Temmuz–31 Ağustos)", () => {
  it("yalnız Temmuz ve Ağustos'ta o yılı verir", () => {
    expect(otomatikAktarimYili("2027-06-30")).toBeNull();
    expect(otomatikAktarimYili("2027-07-01")).toBe(2027);
    expect(otomatikAktarimYili("2027-08-31")).toBe(2027);
    expect(otomatikAktarimYili("2027-09-01")).toBeNull();
  });
});

describe("PDF eşleştirme", () => {
  const mevcut = [
    { id: "m1", ad: "Ahmet", soyad: "Yıldız", mezuniyetYili: 2022, telefon: "905321112233" },
    { id: "m2", ad: "Elif", soyad: "Kaya", mezuniyetYili: 2021, telefon: null },
  ];
  it("aynı ad soyad + yıl güncellenir; yalnız telefonu aynı başka kişi yeni sayılır; PDF içi tekrar hatalı", () => {
    const r = mezunPdfEslestir([
      { ad: "AHMET", soyad: "YILDIZ", mezuniyetYili: "2022", universite: "Ankara Üniversitesi" },
      { ad: "Mehmet", soyad: "Ak", telefon: "0532 111 22 33", mezuniyetYili: "2019" },
      { ad: "Elif", soyad: "Kaya", mezuniyetYili: "2020" },
      { ad: "Elif", soyad: "Kaya", mezuniyetYili: "2020" },
      { ad: "", soyad: "Boş", mezuniyetYili: "2020" },
    ], mevcut, 2026);
    expect(r.map((s) => [s.durum, s.mezunId])).toEqual([["guncelle", "m1"], ["yeni", null], ["yeni", null], ["hatali", null], ["hatali", null]]);
  });
  it("güncellemede PDF'te boş alan mevcut bilgiyi silmez", () => {
    const g = mezunGuncellemesi({ ad: "Ahmet", soyad: "Yıldız", il: null, ilce: null, eposta: null, telefon: null, universite: "ODTÜ", meslek: null, mezuniyetYili: 2022 });
    expect(g).toEqual({ ad: "Ahmet", soyad: "Yıldız", universite: "ODTÜ", mezuniyetYili: 2022 });
  });
});

describe("mezun listesi PDF'i", () => {
  // Bir satırdaki hücreler: [metin, x]. Excel'den PDF'e kaydedilmiş tablo gibi.
  const satir = (y: number, hucreler: [string, number][], sayfa = 1): PdfOgesi[] =>
    hucreler.map(([metin, x]) => ({ sayfa, metin, x, y, genislik: metin.length * 4 }));
  const baslik = (y: number, sayfa = 1) => satir(y, [["Ad", 40], ["Soyad", 110], ["İl", 180], ["Telefon", 250], ["Üniversite", 340], ["Mezuniyet Yılı", 470]], sayfa);

  it("başlıktan sütunları bulur; satırları, taşan hücreyi ve yeni sayfayı okur", () => {
    const ogeler = [
      ...satir(800, [["Mezun Listesi", 40]]),
      ...baslik(780),
      ...satir(760, [["AYŞE", 40], ["DEMİR", 110], ["Ankara", 180], ["0532 111 22 33", 250], ["Hacettepe", 340], ["2021", 480]]),
      ...satir(750, [["Üniversitesi Tıp", 340]]),
      ...satir(740, [["MURAT", 40], ["ŞAHİN", 110], ["2019", 480]]),
      ...baslik(780, 2),
      ...satir(760, [["CAN", 40], ["ÖZ", 110], ["2020", 480]], 2),
    ];
    const r = mezunPdfiniCoz(ogeler);
    expect(r.baslikBulundu).toBe(true);
    expect(r.eksikSutunlar).toEqual([]);
    expect(r.satirlar).toEqual([
      { ad: "AYŞE", soyad: "DEMİR", il: "Ankara", telefon: "0532 111 22 33", universite: "Hacettepe Üniversitesi Tıp", mezuniyetYili: "2021" },
      { ad: "MURAT", soyad: "ŞAHİN", mezuniyetYili: "2019" },
      { ad: "CAN", soyad: "ÖZ", mezuniyetYili: "2020" },
    ]);
  });
  it("\"Ad Soyad\" tek sütunsa ayırır; başlıksız PDF'te satır okumaz", () => {
    const ogeler = [
      ...satir(780, [["Ad Soyad", 40], ["Meslek", 200], ["Mezuniyet", 320]]),
      ...satir(760, [["Zehra Nur Tekin", 40], ["Hemşire", 200], ["2015", 330]]),
    ];
    expect(mezunPdfiniCoz(ogeler).satirlar).toEqual([{ ad: "Zehra Nur", soyad: "Tekin", meslek: "Hemşire", mezuniyetYili: "2015" }]);
    const basliksiz = mezunPdfiniCoz(satir(760, [["Zehra", 40], ["Tekin", 110]]));
    expect(basliksiz).toMatchObject({ baslikBulundu: false, satirlar: [] });
  });
});
