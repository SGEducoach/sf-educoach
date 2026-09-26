import { describe, expect, test } from "vitest";
import { modBelirle, simdikiSaatTR, TEMA_BETIGI, tercihOku } from "./gunduz-gece";

describe("gece/gündüz modu", () => {
  test("otomatik: 07:00–18:59 gündüz, gerisi gece", () => {
    expect(modBelirle("otomatik", 6)).toBe("gece");
    expect(modBelirle("otomatik", 7)).toBe("gunduz");
    expect(modBelirle("otomatik", 18)).toBe("gunduz");
    expect(modBelirle("otomatik", 19)).toBe("gece");
    expect(modBelirle("otomatik", 0)).toBe("gece");
  });
  test("kullanıcı tercihi saati ezer", () => {
    expect(modBelirle("gunduz", 23)).toBe("gunduz");
    expect(modBelirle("gece", 12)).toBe("gece");
  });
  test("bilinmeyen kayıt otomatik sayılır", () => {
    expect(tercihOku(null)).toBe("otomatik");
    expect(tercihOku("koyu")).toBe("otomatik");
    expect(tercihOku("gece")).toBe("gece");
  });
  test("Türkiye saati (UTC+3)", () => {
    expect(simdikiSaatTR(new Date("2026-09-27T03:30:00Z"))).toBe(6);
    expect(simdikiSaatTR(new Date("2026-09-27T16:00:00Z"))).toBe(19);
  });

  // İlk boyama betiği modBelirle ile aynı kararı vermeli.
  test.each([
    [null, "2026-09-27T09:00:00Z", "gunduz"], [null, "2026-09-27T20:00:00Z", "gece"],
    ["gece", "2026-09-27T09:00:00Z", "gece"], ["gunduz", "2026-09-27T21:00:00Z", "gunduz"],
  ])("betik: tercih=%s zaman=%s → %s", (tercih, zaman, beklenen) => {
    const nitelikler: Record<string, string> = {};
    const RealDate = Date;
    const sahteDate = class extends RealDate { constructor() { super(zaman as string); } } as unknown as DateConstructor;
    const calistir = new Function("localStorage", "document", "Date", TEMA_BETIGI);
    calistir(
      { getItem: () => tercih },
      { documentElement: { setAttribute: (k: string, v: string) => { nitelikler[k] = v; } } },
      sahteDate,
    );
    expect(nitelikler["data-tema"]).toBe(beklenen);
  });
});
