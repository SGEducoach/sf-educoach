import { describe, expect, test } from "vitest";
import {
  GUNLUK_ODAK_VARSAYILAN,
  gorevGruplari,
  gunlukOdakSiniri,
  haftaMesaji,
  haftaPlani,
  tahminiDakika,
} from "./ortaokul-gorevler";
import type { BugunGorevi } from "./ortaokul-bugun";

const BUGUN = "2026-10-01"; // Perşembe

function gorev(p: Partial<BugunGorevi> & { atamaId: string; tarih: string }): BugunGorevi {
  return {
    tur: "konu",
    ders: "Matematik",
    konu: null,
    aciklama: null,
    sonTarih: null,
    hedefSoruSayisi: null,
    hedefDakika: null,
    ogretmenAdi: null,
    tamamlandi: false,
    ...p,
  };
}

describe("gorevGruplari", () => {
  test("bugün en üstte, gecikmişler ikinci grupta", () => {
    const gruplar = gorevGruplari([
      gorev({ atamaId: "gec", tarih: "2026-09-28" }),
      gorev({ atamaId: "bugun", tarih: BUGUN }),
      gorev({ atamaId: "yarin", tarih: "2026-10-02" }),
    ], BUGUN);
    expect(gruplar.map((g) => g.anahtar)).toEqual(["bugun", "gecikti", "yarin"]);
  });

  test("boş grup hiç çizilmez", () => {
    const gruplar = gorevGruplari([gorev({ atamaId: "a", tarih: BUGUN })], BUGUN);
    expect(gruplar).toHaveLength(1);
    expect(gruplar[0].gorevler).toHaveLength(1);
  });

  test("hiç görev yoksa grup da yok", () => {
    expect(gorevGruplari([], BUGUN)).toEqual([]);
  });

  test("gecikmişlerde en uzun bekleyen önce", () => {
    const gruplar = gorevGruplari([
      gorev({ atamaId: "dun", tarih: "2026-09-30" }),
      gorev({ atamaId: "bir-hafta", tarih: "2026-09-24" }),
    ], BUGUN);
    const gecikti = gruplar.find((g) => g.anahtar === "gecikti");
    expect(gecikti?.gorevler.map((k) => k.atamaId)).toEqual(["bir-hafta", "dun"]);
  });

  test("bu hafta ile sonraki günler ayrışıyor", () => {
    const gruplar = gorevGruplari([
      gorev({ atamaId: "uc-gun", tarih: "2026-10-04" }),
      gorev({ atamaId: "on-gun", tarih: "2026-10-11" }),
    ], BUGUN);
    expect(gruplar.find((g) => g.anahtar === "bu-hafta")?.gorevler.map((k) => k.atamaId)).toEqual(["uc-gun"]);
    expect(gruplar.find((g) => g.anahtar === "sonra")?.gorevler.map((k) => k.atamaId)).toEqual(["on-gun"]);
  });

  test("tamamlanan görev yalnız son yedi günden gösterilir", () => {
    const gruplar = gorevGruplari([
      gorev({ atamaId: "yeni-bitti", tarih: "2026-09-29", tamamlandi: true }),
      gorev({ atamaId: "cok-eski", tarih: "2026-08-01", tamamlandi: true }),
    ], BUGUN);
    const bitti = gruplar.find((g) => g.anahtar === "tamamlandi");
    expect(bitti?.gorevler.map((k) => k.atamaId)).toEqual(["yeni-bitti"]);
  });

  test("tamamlanan görevde eylem düğmesi yok", () => {
    const gruplar = gorevGruplari([gorev({ atamaId: "a", tarih: BUGUN, tamamlandi: true })], BUGUN);
    const kart = gruplar[0].gorevler[0];
    expect(kart.eylem).toBeNull();
    expect(kart.zamanEtiketi).toBe("Tamamlandı");
  });

  // §8.3: gecikme öğrencinin kimlik etiketi değil görevin durumu. Metinde
  // suçlayıcı/etiketleyici bir sözcük geçmemeli.
  test("gecikme metni öğrenciyi etiketlemiyor", () => {
    const gruplar = gorevGruplari([gorev({ atamaId: "a", tarih: "2026-09-28" })], BUGUN);
    const gecikti = gruplar.find((g) => g.anahtar === "gecikti");
    const metin = `${gecikti?.baslik} ${gecikti?.aciklama} ${gecikti?.gorevler[0].zamanEtiketi} ${gecikti?.gorevler[0].eylem}`;
    for (const yasak of ["tembel", "başarısız", "geride", "kötü", "ihmal", "suç"]) {
      expect(metin.toLocaleLowerCase("tr"), yasak).not.toContain(yasak);
    }
  });

  test("son tarih varsa görev günü değil son tarih ölçüt", () => {
    const gruplar = gorevGruplari([
      gorev({ atamaId: "a", tarih: "2026-09-20", sonTarih: BUGUN }),
    ], BUGUN);
    expect(gruplar[0].anahtar).toBe("bugun");
  });

  test("başlık konu varsa konu, yoksa görev türü", () => {
    const gruplar = gorevGruplari([
      gorev({ atamaId: "a", tarih: BUGUN, konu: "  Kesirler  " }),
      gorev({ atamaId: "b", tarih: BUGUN, konu: "   ", tur: "okuma" }),
    ], BUGUN);
    const basliklar = gruplar[0].gorevler.map((k) => k.baslik);
    expect(basliklar).toContain("Kesirler");
    expect(basliklar).toContain("okuma");
  });
});

describe("tahminiDakika", () => {
  test("öğretmen dakikası varsa o kullanılır", () => {
    expect(tahminiDakika({ hedefDakika: 25, hedefSoruSayisi: 40 })).toBe(25);
  });
  test("dakika yoksa soru başına iki dakika", () => {
    expect(tahminiDakika({ hedefDakika: null, hedefSoruSayisi: 10 })).toBe(20);
  });
  test("ikisi de yoksa null — ekranda süre etiketi hiç çıkmaz", () => {
    expect(tahminiDakika({ hedefDakika: null, hedefSoruSayisi: null })).toBeNull();
    expect(tahminiDakika({ hedefDakika: 0, hedefSoruSayisi: 0 })).toBeNull();
  });
});

describe("gunlukOdakSiniri", () => {
  test("küçük sınıfta süre daha kısa", () => {
    expect(gunlukOdakSiniri("5")).toBeLessThan(gunlukOdakSiniri("8"));
    expect(gunlukOdakSiniri("5")).toBe(60);
    expect(gunlukOdakSiniri("8")).toBe(100);
  });
  test("bilinmeyen sınıfta varsayılan", () => {
    expect(gunlukOdakSiniri(null)).toBe(GUNLUK_ODAK_VARSAYILAN);
    expect(gunlukOdakSiniri("Mezun")).toBe(GUNLUK_ODAK_VARSAYILAN);
  });
});

describe("haftaPlani", () => {
  const pazartesi = "2026-09-28";

  test("yedi gün, doğru Türkçe gün adlarıyla", () => {
    const gunler = haftaPlani([], pazartesi, BUGUN, "8");
    expect(gunler).toHaveLength(7);
    expect(gunler.map((g) => g.gunAdi)).toEqual([
      "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar",
    ]);
  });

  test("bugün ve geçmiş günler işaretli", () => {
    const gunler = haftaPlani([], pazartesi, BUGUN, "8");
    expect(gunler.filter((g) => g.bugunMu).map((g) => g.tarih)).toEqual([BUGUN]);
    expect(gunler.filter((g) => g.gecmisMi).map((g) => g.gunAdi)).toEqual(["Pazartesi", "Salı", "Çarşamba"]);
  });

  test("görev kendi gününe düşüyor, dakikalar toplanıyor", () => {
    const gunler = haftaPlani([
      gorev({ atamaId: "a", tarih: "2026-09-30", hedefDakika: 30 }),
      gorev({ atamaId: "b", tarih: "2026-09-30", hedefSoruSayisi: 10 }),
    ], pazartesi, BUGUN, "8");
    const carsamba = gunler.find((g) => g.tarih === "2026-09-30");
    expect(carsamba?.gorevler).toHaveLength(2);
    expect(carsamba?.toplamDakika).toBe(50);
  });

  test("sınıf sınırını aşan gün yoğun işaretleniyor", () => {
    const gunler = haftaPlani([
      gorev({ atamaId: "a", tarih: BUGUN, hedefDakika: 70 }),
    ], pazartesi, BUGUN, "5");
    expect(gunler.find((g) => g.bugunMu)?.yogunMu).toBe(true);
    // Aynı iş 8. sınıf sınırını (100 dk) aşmıyor.
    const sekiz = haftaPlani([gorev({ atamaId: "a", tarih: BUGUN, hedefDakika: 70 })], pazartesi, BUGUN, "8");
    expect(sekiz.find((g) => g.bugunMu)?.yogunMu).toBe(false);
  });

  // Süresi bilinmeyen görev varsa toplam dakika EKSİK; ekran "yoğun değil"
  // damgasını güvenle basamaz, bunu söylemek zorunda.
  test("süresi bilinmeyen görev sayılıyor", () => {
    const gunler = haftaPlani([
      gorev({ atamaId: "a", tarih: BUGUN, hedefDakika: 20 }),
      gorev({ atamaId: "b", tarih: BUGUN }),
    ], pazartesi, BUGUN, "8");
    const bugunku = gunler.find((g) => g.bugunMu);
    expect(bugunku?.suresiBilinmeyen).toBe(1);
    expect(bugunku?.toplamDakika).toBe(20);
  });

  test("son tarihi olan görev son tarihin gününe yazılıyor", () => {
    const gunler = haftaPlani([
      gorev({ atamaId: "a", tarih: "2026-09-28", sonTarih: "2026-10-02" }),
    ], pazartesi, BUGUN, "8");
    expect(gunler.find((g) => g.tarih === "2026-09-28")?.gorevler).toHaveLength(0);
    expect(gunler.find((g) => g.tarih === "2026-10-02")?.gorevler).toHaveLength(1);
  });
});

describe("haftaMesaji", () => {
  const pazartesi = "2026-09-28";

  test("boş hafta", () => {
    expect(haftaMesaji(haftaPlani([], pazartesi, BUGUN, "8"))).toBe("Bu hafta için planlanmış bir işin yok.");
  });

  test("sayı veriyor, hüküm vermiyor", () => {
    const mesaj = haftaMesaji(haftaPlani([
      gorev({ atamaId: "a", tarih: BUGUN, hedefDakika: 30 }),
      gorev({ atamaId: "b", tarih: "2026-10-02", hedefDakika: 30, tamamlandi: true }),
    ], pazartesi, BUGUN, "8"));
    expect(mesaj).toContain("2 işin var");
    expect(mesaj).toContain("1 tanesini bitirdin");
    for (const yasak of ["tembel", "başarısız", "yetersiz", "kötü"]) {
      expect(mesaj.toLocaleLowerCase("tr"), yasak).not.toContain(yasak);
    }
  });

  test("yoğun gün adıyla söyleniyor", () => {
    const mesaj = haftaMesaji(haftaPlani([
      gorev({ atamaId: "a", tarih: "2026-10-02", hedefDakika: 200 }),
    ], pazartesi, BUGUN, "8"));
    expect(mesaj).toContain("Cuma");
  });
});

// Öğretmenin konu altına yazdığı alt başlık/not (kullanıcı isteği
// 02.10.2026). İşin ne olduğu bazen konu adında değil tam olarak burada
// yazıyor ("sayfa 42-48"); karta taşınmazsa öğrenci yanlış işi yapar.
describe("öğretmen notu", () => {
  test("not karta taşınıyor", () => {
    const gruplar = gorevGruplari([
      gorev({ atamaId: "a", tarih: BUGUN, konu: "Kesirler", aciklama: "sayfa 42-48" }),
    ], BUGUN);
    expect(gruplar[0].gorevler[0].aciklama).toBe("sayfa 42-48");
  });

  test("boş ve yalnız boşluktan oluşan not NULL olur", () => {
    const gruplar = gorevGruplari([
      gorev({ atamaId: "a", tarih: BUGUN, aciklama: "   " }),
      gorev({ atamaId: "b", tarih: BUGUN, aciklama: null }),
    ], BUGUN);
    for (const k of gruplar[0].gorevler) expect(k.aciklama).toBeNull();
  });

  test("notun baştaki/sondaki boşluğu atılıyor", () => {
    const gruplar = gorevGruplari([
      gorev({ atamaId: "a", tarih: BUGUN, aciklama: "  defterden tekrar  " }),
    ], BUGUN);
    expect(gruplar[0].gorevler[0].aciklama).toBe("defterden tekrar");
  });
});
