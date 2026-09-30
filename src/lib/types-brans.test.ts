import { describe, expect, test } from "vitest";
import { BRANS_LISTESI, kurumBransListesi } from "./types";

describe("kurumBransListesi", () => {
  test("okul listesine Bilişim ve Bilgisayar branşlarını ekler", () => {
    expect(kurumBransListesi("okul")).toContain("Bilişim");
    expect(kurumBransListesi("okul")).toContain("Bilgisayar");
  });

  test("dershane listesine okul özel branşlarını eklemez", () => {
    expect(kurumBransListesi("dershane")).toEqual(BRANS_LISTESI);
    expect(kurumBransListesi("dershane")).not.toContain("Bilişim");
    expect(kurumBransListesi("dershane")).not.toContain("Bilgisayar");
  });
});
