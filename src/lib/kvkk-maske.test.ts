import { describe, expect, test } from "vitest";
import { telefonMaskele } from "./kvkk-maske";

describe("telefonMaskele", () => {
  test("kayıtlı biçimlerin hepsi aynı maskeye iner; ortadaki 5 hane görünmez", () => {
    for (const t of ["5321234567", "05321234567", "905321234567", "+90 (532) 123 45 67"]) {
      expect(telefonMaskele(t)).toBe("0532 *** ** 67");
    }
  });
  test("kısa/serbest biçimde yalnız son 2 hane", () => {
    expect(telefonMaskele("12345")).toBe("*** 45");
    expect(telefonMaskele("12")).toBe("***");
  });
  test("boş telefon null", () => {
    expect(telefonMaskele(null)).toBeNull();
    expect(telefonMaskele("  ")).toBeNull();
  });
});
