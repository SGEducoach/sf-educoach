import { describe, expect, test } from "vitest";
import { BRANS_LISTESI, kurumBransListesi } from "./types";

describe("kurumBransListesi", () => {
  // Kullanıcı kararı (02.10.2026): "Bilişim" ve "Bilgisayar" TEK branşta
  // birleşti — MEB adı "Bilişim Teknolojileri". Eski adlar listede olmamalı,
  // yoksa aynı öğretmen iki ayrı branş gibi görünür.
  test("okul listesine Bilişim Teknolojileri branşını ekler", () => {
    expect(kurumBransListesi("okul")).toContain("Bilişim Teknolojileri");
    expect(kurumBransListesi("okul")).not.toContain("Bilişim");
    expect(kurumBransListesi("okul")).not.toContain("Bilgisayar");
  });

  test("dershane listesine okul özel branşlarını eklemez", () => {
    expect(kurumBransListesi("dershane")).toEqual(BRANS_LISTESI);
    expect(kurumBransListesi("dershane")).not.toContain("Bilişim Teknolojileri");
    expect(kurumBransListesi("dershane")).not.toContain("Bilgisayar");
  });
});
