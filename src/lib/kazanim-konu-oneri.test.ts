import { describe, expect, test } from "vitest";
import { MUFREDAT_KONULARI } from "./mufredat-konulari";
import { kazanimDersiniKanoniklestir, konuOnerileri, konuOnerisi, type KonuAdayi } from "./kazanim-konu-oneri";

function adaylar(ders: string): KonuAdayi[] {
  return MUFREDAT_KONULARI.filter((k) => k.ders === ders).map((k) => ({ konu: k.konu, etiket: k.konu }));
}

describe("kazanimDersiniKanoniklestir", () => {
  test.each([
    ["Tarih-1", "Tarih"], ["Matematik-1", "Matematik"], ["Geometri", "Matematik"], ["Coğrafya-1", "Coğrafya"],
    ["Din Kül. ve Ahl. Bil.", "Din Kültürü"], ["Felsefe (Seçmeli)", "Felsefe"], ["Türkçe", "Türkçe"],
  ])("%s → %s", (ham, beklenen) => expect(kazanimDersiniKanoniklestir(ham)).toBe(beklenen));

  test("müfredatta olmayan ders → null", () => {
    expect(kazanimDersiniKanoniklestir("TYT Sosyal")).toBeNull();
  });
});

describe("konuOnerisi (gerçek müfredat adaylarıyla)", () => {
  test("kısa konu adı doğru müfredat konusuna gider", () => {
    expect(konuOnerisi("OPTİK", adaylar("Fizik"))?.konu).toMatch(/Optik/);
  });
  test("yalnızca bir kelimesi tutan ilgisiz konu önerilmez (Rasyonel Sayılar ≠ Rasyonel Fonksiyonlar)", () => {
    expect(konuOnerisi("RASYONEL SAYILAR", adaylar("Matematik"))).toBeNull();
  });
  test("uzun kazanım cümlesi (Orbital) alt başlığa önerilir", () => {
    const altBaslik = { konu: "Periyodik sistem ve periyodik özellikler", etiket: "Kimya Bilimine Giriş, Atom Teorileri ve Periyodik Sistem › Periyodik sistem ve periyodik özellikler" };
    const o = konuOnerisi("Periyodik özelliklerin değişme eğilimlerini açıklar.", [...adaylar("Kimya"), { konu: altBaslik.konu, etiket: altBaslik.konu }]);
    expect(o?.konu).toBe(altBaslik.konu);
  });
  test("ilgisiz metin öneri üretmez", () => {
    expect(konuOnerisi("Tamamen alakasız bir cümle", adaylar("Fizik"))).toBeNull();
  });
});

// Kullanıcı geri bildirimi (25.09.2026): eşleşmeden kalan başlıklara da aday
// gösterilsin. Ek tolerans (önek eşleşmesi) ve zayıf aday listesi.
describe("konuOnerileri (zayıf adaylar)", () => {
  test("ek farkı olan başlık aday olarak gelir", () => {
    const adaylar: KonuAdayi[] = [
      { konu: "Üslü sayılar ve işlemler", etiket: "Üslü sayılar ve işlemler" },
      { konu: "Hücre organelleri ve görevleri", etiket: "Hücre organelleri ve görevleri" },
    ];
    const liste = konuOnerileri("Üslü ifadeler", adaylar);
    expect(liste[0]?.konu).toBe("Üslü sayılar ve işlemler");
    expect(liste.some((o) => o.konu.startsWith("Hücre"))).toBe(false);
  });
  test("tekil güçlü öneri davranışı değişmedi", () => {
    expect(konuOnerisi("RASYONEL SAYILAR", adaylar("Matematik"))).toBeNull();
    expect(konuOnerisi("OPTİK", adaylar("Fizik"))?.konu).toMatch(/Optik/);
  });
  test("en fazla istenen sayıda aday döner", () => {
    expect(konuOnerileri("Sayı Problemleri", adaylar("Matematik"), 2).length).toBeLessThanOrEqual(2);
  });
});
