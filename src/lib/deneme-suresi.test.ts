import { describe, expect, it } from "vitest";
import { kurumDenemeSuresiDolduMu } from "@/lib/deneme-suresi";

describe("kuruma özel deneme süresi", () => {
  const gecmis = new Date(Date.now() - 60_000).toISOString();
  const gelecek = new Date(Date.now() + 60_000).toISOString();

  it("tarih girilmemiş veya henüz dolmamış kurumun erişimini açık tutar", () => {
    expect(kurumDenemeSuresiDolduMu({ grupMu: false, denemeBitisTarihi: null })).toBe(false);
    expect(kurumDenemeSuresiDolduMu({ grupMu: false, denemeBitisTarihi: gelecek })).toBe(false);
  });

  it("süresi dolan okul ve dershaneyi durdurur, grup koçluğunu etkilemez", () => {
    expect(kurumDenemeSuresiDolduMu({ grupMu: false, denemeBitisTarihi: gecmis })).toBe(true);
    expect(kurumDenemeSuresiDolduMu({ grupMu: true, denemeBitisTarihi: gecmis })).toBe(false);
  });
});
