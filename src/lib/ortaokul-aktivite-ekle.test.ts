import { describe, expect, test } from "vitest";
import { ortaokulHareketiniEkle, sonHareketiBirlestir } from "./ortaokul-aktivite-ekle";

const BUGUN = "2026-10-23";
const bos = (id: string) => ({ studentId: id, aktiflik: 0, sonDonem: 0, oncekiDonem: 0, gorevToplam: 2, gorevTamamlanan: 1, gorevBekleyen: 1, gorevTamamlanmayan: 0, verisiVarMi: false });

describe("ortaokulHareketiniEkle", () => {
  test("özet yoksa sıfırdan kurar; çalışma günleri pencerelere dağılır", () => {
    const o = ortaokulHareketiniEkle(undefined, "a", ["2026-10-22", "2026-10-15", "2026-10-05", "2026-08-01"], BUGUN, 30, 14);
    expect(o).toMatchObject({ aktiflik: 3, sonDonem: 2, oncekiDonem: 1, verisiVarMi: true });
  });

  test("RPC özetindeki görev sayıları korunur, hareket üstüne eklenir", () => {
    const o = ortaokulHareketiniEkle({ ...bos("a"), aktiflik: 2, sonDonem: 1, oncekiDonem: 1 }, "a", ["2026-10-23"], BUGUN, 30, 14);
    expect(o).toMatchObject({ aktiflik: 3, sonDonem: 2, oncekiDonem: 1, gorevToplam: 2, gorevTamamlanan: 1, verisiVarMi: true });
  });

  test("hiç çalışma yoksa özet değişmez (verisiVarMi RPC'den gelir)", () => {
    const ozet = bos("a");
    expect(ortaokulHareketiniEkle(ozet, "a", [], BUGUN, 30, 14)).toBe(ozet);
  });

  test("pencere dışı eski çalışma yalnız 'verisi var' yapar", () => {
    const o = ortaokulHareketiniEkle(undefined, "a", ["2026-06-01"], BUGUN, 30, 14);
    expect(o).toMatchObject({ aktiflik: 0, sonDonem: 0, oncekiDonem: 0, verisiVarMi: true });
  });
});

describe("sonHareketiBirlestir", () => {
  test("yeni olanı seçer, eksik tarihi tolere eder", () => {
    expect(sonHareketiBirlestir("2026-10-01", "2026-10-20")).toBe("2026-10-20");
    expect(sonHareketiBirlestir("2026-10-20", null)).toBe("2026-10-20");
    expect(sonHareketiBirlestir(null, "2026-10-05")).toBe("2026-10-05");
    expect(sonHareketiBirlestir(null, undefined)).toBeNull();
  });
});
