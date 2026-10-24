import { describe, expect, test } from "vitest";
import { ogretmenOdevKonuAdayi } from "./mufredat-konulari";

describe("ogretmenOdevKonuAdayi (öğretmen 'Ödev ver' konu listesi)", () => {
  test("10. sınıfa 9. sınıf konusu (açıortay-kenarortay) görünür — tekrar ödevi", () => {
    expect(ogretmenOdevKonuAdayi("9. Sınıf", ["10"], false)).toBe(true);
    expect(ogretmenOdevKonuAdayi("10. Sınıf", ["10"], false)).toBe(true);
  });

  test("üst sınıfın konusu görünmez", () => {
    expect(ogretmenOdevKonuAdayi("11. Sınıf", ["10"], false)).toBe(false);
    expect(ogretmenOdevKonuAdayi("12. Sınıf", ["9"], false)).toBe(false);
  });

  test("birden çok hedef sınıfta en üst sınıf esas alınır (toplu ödev)", () => {
    expect(ogretmenOdevKonuAdayi("10. Sınıf", ["9", "10"], false)).toBe(true);
    expect(ogretmenOdevKonuAdayi("11. Sınıf", ["9", "10"], false)).toBe(false);
  });

  test("Hazırlık konusu 9. sınıf sayılır", () => {
    expect(ogretmenOdevKonuAdayi("Hazırlık", ["10"], false)).toBe(true);
  });

  test("TYT/AYT etiketli, seviyesiz konular ve hedef seviyesi belirsiz durumda hep listelenir", () => {
    expect(ogretmenOdevKonuAdayi("TYT", ["10"], false)).toBe(true);
    expect(ogretmenOdevKonuAdayi("AYT", ["9"], false)).toBe(true);
    expect(ogretmenOdevKonuAdayi(null, ["10"], false)).toBe(true);
    expect(ogretmenOdevKonuAdayi("11. Sınıf", [], false)).toBe(true);
  });

  test("ortaokulda yalnız tam eşleşen seviye (davranış değişmedi)", () => {
    expect(ogretmenOdevKonuAdayi("6. Sınıf", ["6"], true)).toBe(true);
    expect(ogretmenOdevKonuAdayi("5. Sınıf", ["6"], true)).toBe(false);
    expect(ogretmenOdevKonuAdayi("7. Sınıf", ["6"], true)).toBe(false);
  });
});
