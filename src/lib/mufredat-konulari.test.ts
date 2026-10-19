import { describe, expect, test } from "vitest";
import { MUFREDAT_KONULARI, konuOgrenciyeUygunMu, konuSinavi, konuSinifiSecenekleri } from "./mufredat-konulari";

describe("ortak konu kapsamı", () => {
  test("11. sınıf için TYT seçimi 11. sınıf AYT konularını göstermez", () => {
    expect(konuSinifiSecenekleri(11, "TYT")).toEqual([9, 10]);
    expect(konuSinifiSecenekleri(11, "AYT")).toEqual([11]);
    expect(konuSinifiSecenekleri(11, null)).toEqual([9, 10, 11]);
  });
  test("taslak Türkçe Maarif dersi ortak listede yer almaz", () => {
    expect(MUFREDAT_KONULARI.some((k) => k.ders === "Türkçe (Maarif)")).toBe(false);
    expect(MUFREDAT_KONULARI.some((k) => k.ders === "Türkçe" && k.seviye === "TYT")).toBe(true);
  });
  test("Hazırlık adları korunup 9. sınıfa taşınır", () => {
    const konu = MUFREDAT_KONULARI.find((k) => k.konu === "Doğrusal İlişkiler ve Problemler");
    expect(konu?.seviye).toBe("9. Sınıf");
    expect(konuSinavi(konu!)).toBe("TYT");
    expect(konuOgrenciyeUygunMu(konu!, "9", "SAY")).toBe(true);
    expect(MUFREDAT_KONULARI.some((k) => k.seviye === "Hazırlık")).toBe(false);
  });

  test("9-10 TYT, 11-12 AYT olur; kurum türünden bağımsız alan filtresi uygulanır", () => {
    const temel = { ders: "Matematik", seviye: "10. Sınıf" };
    const ileri = { ders: "Matematik", seviye: "11. Sınıf" };
    const tarih = { ders: "Tarih", seviye: "11. Sınıf" };
    expect(konuSinavi(temel)).toBe("TYT");
    expect(konuSinavi(ileri)).toBe("AYT");
    expect(konuOgrenciyeUygunMu(ileri, "10", "SAY")).toBe(false);
    expect(konuOgrenciyeUygunMu(ileri, "11", "SAY")).toBe(true);
    expect(konuOgrenciyeUygunMu(tarih, "12", "SAY")).toBe(false);
    expect(konuOgrenciyeUygunMu(tarih, "12", "EA")).toBe(true);
    expect(konuOgrenciyeUygunMu({ ders: "Edebiyat", seviye: "AYT" }, "11", "EA")).toBe(false);
  });
});
