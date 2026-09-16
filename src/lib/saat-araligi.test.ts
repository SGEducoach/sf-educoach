import { describe, expect, it } from "vitest";
import { saatAraligiSuresi, tarihliSaatAraliklariCakisiyor } from "./saat-araligi";

describe("gece yarısını aşan saat aralıkları", () => {
  it("23.00–01.00 aralığını iki saat sayar", () => {
    expect(saatAraligiSuresi("23:00", "01:00")).toBe(120);
  });

  it("ertesi günün erken saatindeki kayıtla çakışmayı bulur", () => {
    expect(tarihliSaatAraliklariCakisiyor(
      "2026-09-16", "23:00", "01:00",
      "2026-09-17", "00:30", "01:30",
    )).toBe(true);
    expect(tarihliSaatAraliklariCakisiyor(
      "2026-09-16", "23:00", "01:00",
      "2026-09-17", "01:00", "02:00",
    )).toBe(false);
  });
});
