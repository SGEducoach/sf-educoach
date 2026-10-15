import { describe, expect, test } from "vitest";
import { LGS_DERSLERI, denemeNetKademesi, dersSoruSayisi, netHesapla } from "./types";
import { gecerliDersler } from "./deneme-dersleri";

describe("LGS denemesi (16.10.2026, kolej)", () => {
  test("altı ders, toplam 90 soru", () => {
    expect(gecerliDersler("LGS")).toEqual([...LGS_DERSLERI]);
    expect(LGS_DERSLERI.reduce((t, d) => t + (dersSoruSayisi("LGS", d) ?? 0), 0)).toBe(90);
  });
  test("net ortaokul formülüyle: 3 yanlış 1 doğruyu götürür", () => {
    expect(denemeNetKademesi("LGS")).toBe("ortaokul");
    expect(denemeNetKademesi("TYT")).toBe("lise");
    expect(netHesapla(18, 3, denemeNetKademesi("LGS"))).toBe(17);
  });
});
