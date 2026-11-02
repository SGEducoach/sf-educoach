import { describe, expect, it } from "vitest";
import { eslesmeyenYurtNobetiSiniri } from "./nobet-yukleme";

describe("eşleşmeyen yurt nöbeti temizlik sınırı", () => {
  it("ayın 25'inden önce yalnızca önceki aylar silinir", () => {
    expect(eslesmeyenYurtNobetiSiniri("2026-10-24")).toBe("2026-10-01");
    expect(eslesmeyenYurtNobetiSiniri("2026-10-01")).toBe("2026-10-01");
  });
  it("ayın 25'inden itibaren o ay da silinir, sonraki ay korunur", () => {
    expect(eslesmeyenYurtNobetiSiniri("2026-10-25")).toBe("2026-11-01");
    expect(eslesmeyenYurtNobetiSiniri("2026-10-31")).toBe("2026-11-01");
  });
  it("aralıkta yıl devrini doğru hesaplar", () => {
    expect(eslesmeyenYurtNobetiSiniri("2026-12-25")).toBe("2027-01-01");
    expect(eslesmeyenYurtNobetiSiniri("2026-12-10")).toBe("2026-12-01");
  });
});
