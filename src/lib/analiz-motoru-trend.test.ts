import { describe, expect, test } from "vitest";
import { icgoruMetinleriOlustur, trendHesapla, turTrendleriniBirlestir, type TrendSonucu } from "./analiz-motoru";

const yukselen: TrendSonucu = { yon: "yukselen", haftalikDegisim: 2 };
const dusen: TrendSonucu = { yon: "dusen", haftalikDegisim: -1.5 };
const durgun: TrendSonucu = { yon: "durgun", haftalikDegisim: 0.1 };
const yok: TrendSonucu = { yon: null, haftalikDegisim: null };

describe("turTrendleriniBirlestir", () => {
  test("TYT yükselip AYT düşüyorsa tek bir genel yön söylenmez", () => {
    expect(turTrendleriniBirlestir([yukselen, dusen])).toEqual(yok);
  });
  test("tek türde veri varsa o türün trendi aynen kullanılır", () => {
    expect(turTrendleriniBirlestir([yukselen, yok])).toEqual(yukselen);
  });
  test("ikisi aynı yöndeyse o yön; biri durgunsa hareket eden", () => {
    expect(turTrendleriniBirlestir([dusen, dusen]).yon).toBe("dusen");
    expect(turTrendleriniBirlestir([durgun, yukselen])).toEqual(yukselen);
  });
  test("TYT netleri artarken araya giren düşük AYT netleri genel yönü düşürmez", () => {
    // Eski davranış: tüm netler tek seride (TYT 90→105, AYT 40-45) "düşen" çıkıyordu.
    const tyt = trendHesapla([0, 14, 28, 42].map((g, i) => ({ gunOffset: g, deger: 90 + i * 5 })));
    const ayt = trendHesapla([7, 21, 35, 49].map((g, i) => ({ gunOffset: g, deger: 45 - i })));
    const karisik = trendHesapla([
      { gunOffset: 0, deger: 90 }, { gunOffset: 7, deger: 45 }, { gunOffset: 14, deger: 95 }, { gunOffset: 21, deger: 44 },
      { gunOffset: 28, deger: 100 }, { gunOffset: 35, deger: 43 }, { gunOffset: 42, deger: 105 }, { gunOffset: 49, deger: 42 },
    ]);
    expect(karisik.yon).toBe("dusen");
    expect(tyt.yon).toBe("yukselen");
    expect(turTrendleriniBirlestir([tyt, ayt]).yon).not.toBe("dusen");
  });
});

describe("icgoruMetinleriOlustur — deneme trendi", () => {
  const ortak = { dersTrendleri: {}, hizDogruluk: [], oncelikSiralamasi: [] };
  test("tür trendleri verilince TYT ve AYT ayrı cümle olur, genel cümle kurulmaz", () => {
    const m = icgoruMetinleriOlustur({ ...ortak, denemeTrend: dusen, denemeTrendTur: { TYT: yukselen, AYT: dusen } });
    expect(m.some((x) => x.startsWith("TYT netin") && x.includes("artıyor"))).toBe(true);
    expect(m.some((x) => x.startsWith("AYT netin") && x.includes("geriliyor"))).toBe(true);
    expect(m.some((x) => x.startsWith("Genel deneme netin"))).toBe(false);
  });
  test("tür trendi verilmezse (Branş) genel cümle kullanılır", () => {
    const m = icgoruMetinleriOlustur({ ...ortak, denemeTrend: yukselen });
    expect(m.some((x) => x.startsWith("Genel deneme netin"))).toBe(true);
  });
});
