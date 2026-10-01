import { describe, expect, test } from "vitest";
import {
  EN_FAZLA_DAKIKA, SORU_BASINA_DAKIKA,
  calismaGirdisiDogrula, calismaMesaji, calismaOzeti,
} from "./ortaokul-calisma";
import type { CalismaGirdisi, CalismaKaydi } from "./ortaokul-calisma";

function girdi(p: Partial<CalismaGirdisi> = {}): CalismaGirdisi {
  return { bolum: "maarif", tur: "konu", dersId: "d1", tarih: "2026-10-01", sureDakika: 30, ...p };
}

describe("calismaGirdisiDogrula — konu çalışması", () => {
  test("süre ve ders varsa geçerli", () => {
    const s = calismaGirdisiDogrula(girdi());
    expect(s.gecerli).toBe(true);
    expect(s.temiz).toMatchObject({ tur: "konu", sureDakika: 30, dogru: null, yanlis: null, bos: null });
  });

  test("ders seçilmemişse yaşa uygun hata", () => {
    expect(calismaGirdisiDogrula(girdi({ dersId: "" })).hata).toBe("Hangi dersi çalıştığını seç.");
  });

  test("süresiz konu çalışması reddedilir", () => {
    expect(calismaGirdisiDogrula(girdi({ sureDakika: 0 })).hata).toBe("Ne kadar çalıştığını yaz.");
    expect(calismaGirdisiDogrula(girdi({ sureDakika: null })).gecerli).toBe(false);
  });

  test("üst sınırda kabul, bir fazlası ret", () => {
    expect(calismaGirdisiDogrula(girdi({ sureDakika: EN_FAZLA_DAKIKA })).gecerli).toBe(true);
    expect(calismaGirdisiDogrula(girdi({ sureDakika: EN_FAZLA_DAKIKA + 1 })).gecerli).toBe(false);
  });

  test("tema seçmek zorunlu değil", () => {
    expect(calismaGirdisiDogrula(girdi({ temaId: null })).temiz?.temaId).toBeNull();
    expect(calismaGirdisiDogrula(girdi({ temaId: "  " })).temiz?.temaId).toBeNull();
    expect(calismaGirdisiDogrula(girdi({ temaId: "t1" })).temiz?.temaId).toBe("t1");
  });

  test("bozuk tarih reddedilir", () => {
    expect(calismaGirdisiDogrula(girdi({ tarih: "01.10.2026" })).gecerli).toBe(false);
    expect(calismaGirdisiDogrula(girdi({ tarih: "" })).gecerli).toBe(false);
  });
});

describe("calismaGirdisiDogrula — soru çözümü", () => {
  const soru = (p: Partial<CalismaGirdisi> = {}) =>
    calismaGirdisiDogrula(girdi({ tur: "soru", sureDakika: null, dogru: 8, yanlis: 2, bos: 0, ...p }));

  test("en az bir soru girilmeli", () => {
    expect(soru({ dogru: 0, yanlis: 0, bos: 0 }).hata).toBe("Kaç soru çözdüğünü yaz.");
  });

  test("süre girilmesi zorunlu değil", () => {
    const s = soru();
    expect(s.gecerli).toBe(true);
    expect(s.temiz?.sureDakika).toBeNull();
  });

  // Veritabanı kısıtıyla aynı kural (migration 0132 / 0125 ilkesi): BOŞ
  // sorular da süre bütçesine sayılır. Ayrışırsa öğrenci ham DB hatası görür.
  test("süre sınırı soru başına iki dakika, BOŞ dahil", () => {
    expect(soru({ dogru: 10, yanlis: 0, bos: 0, sureDakika: 20 }).gecerli).toBe(true);
    expect(soru({ dogru: 10, yanlis: 0, bos: 0, sureDakika: 21 }).gecerli).toBe(false);
    // 10 cevaplı + 10 boş = 20 soru → 40 dk sınırı.
    expect(soru({ dogru: 10, yanlis: 0, bos: 10, sureDakika: 40 }).gecerli).toBe(true);
  });

  test("sınır aşılınca kaç dakika girilebileceği söyleniyor", () => {
    const s = soru({ dogru: 5, yanlis: 0, bos: 0, sureDakika: 60 });
    expect(s.hata).toContain(String(SORU_BASINA_DAKIKA * 5));
  });

  test("negatif ve ondalık değerler sıfıra iner", () => {
    expect(soru({ dogru: -3, yanlis: 0, bos: 0 }).gecerli).toBe(false);
    expect(soru({ dogru: 4.7, yanlis: 0, bos: 0 }).temiz?.dogru).toBe(4);
  });
});

describe("calismaOzeti", () => {
  const kayit = (p: Partial<CalismaKaydi>): CalismaKaydi => ({
    id: "k", bolum: "maarif", tur: "konu", dersAdi: "Matematik", temaAdi: null,
    tarih: "2026-10-01", sureDakika: null, dogru: null, yanlis: null, bos: null, ...p,
  });

  test("süre ve soru toplanıyor", () => {
    const o = calismaOzeti([
      kayit({ sureDakika: 30 }),
      kayit({ tur: "soru", dogru: 8, yanlis: 2, bos: 0, sureDakika: 20 }),
    ]);
    expect(o).toMatchObject({ kayit: 2, toplamDakika: 50, toplamSoru: 10, dogrulukYuzde: 80 });
  });

  // Yüzde uydurulmuyor: soru çözümü yoksa doğruluk YOK (§7.2 "yüzde tek
  // başına gösterilmez" ilkesinin veri tarafı).
  test("soru çözümü yoksa doğruluk null", () => {
    expect(calismaOzeti([kayit({ sureDakika: 30 })]).dogrulukYuzde).toBeNull();
    expect(calismaOzeti([]).dogrulukYuzde).toBeNull();
  });

  test("boş sorular doğruluğa katılmaz ama toplam soruya katılır", () => {
    const o = calismaOzeti([kayit({ tur: "soru", dogru: 5, yanlis: 5, bos: 10 })]);
    expect(o.toplamSoru).toBe(20);
    expect(o.dogrulukYuzde).toBe(50);
  });
});

describe("calismaMesaji", () => {
  test("kayıt yoksa bölüme özgü boş mesaj", () => {
    expect(calismaMesaji(calismaOzeti([]))).toBe("Bu bölümde henüz çalışma kaydın yok.");
  });

  test("sayı veriyor, hüküm vermiyor", () => {
    const mesaj = calismaMesaji({ kayit: 2, toplamDakika: 50, toplamSoru: 10, dogrulukYuzde: 80 });
    expect(mesaj).toContain("50 dakika");
    expect(mesaj).toContain("10 soru");
    for (const yasak of ["başarısız", "yetersiz", "az", "kötü"]) {
      expect(mesaj.toLocaleLowerCase("tr"), yasak).not.toContain(yasak);
    }
  });
});
