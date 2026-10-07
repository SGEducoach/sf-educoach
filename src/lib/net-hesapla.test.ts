import { describe, expect, test } from "vitest";
import { YANLIS_KATSAYISI, netHesapla } from "./types";

// Net formülü kademeye göre değişir (kullanıcı kararı 08.10.2026):
// lise/YKS D−Y/4, ortaokul/LGS D−Y/3. Bu testler O2'nin (ortaokul panelini
// lise izlerinden arındırma) en kritik parçasını kilitliyor: yanlış formül
// tüm ortaokul analizini bozar.
describe("katsayılar", () => {
  test("lise 4, ortaokul 3", () => {
    expect(YANLIS_KATSAYISI.lise).toBe(4);
    expect(YANLIS_KATSAYISI.ortaokul).toBe(3);
  });
});

describe("netHesapla — varsayılan LİSE", () => {
  // Varsayılanın lise olması bilinçli: fonksiyon 9 dosyadan çağrılıyor ve
  // hepsi bugün lise verisi işliyor. Bu test varsayılanın kaymasını engeller.
  test("kademe geçilmezse lise formülü uygulanır", () => {
    expect(netHesapla(20, 4)).toBe(netHesapla(20, 4, "lise"));
    expect(netHesapla(20, 4)).toBe(19);
  });

  test("lise: 4 yanlış 1 doğruyu götürür", () => {
    expect(netHesapla(10, 4, "lise")).toBe(9);
    expect(netHesapla(40, 8, "lise")).toBe(38);
  });
});

describe("netHesapla — ORTAOKUL (LGS)", () => {
  test("3 yanlış 1 doğruyu götürür", () => {
    expect(netHesapla(10, 3, "ortaokul")).toBe(9);
    expect(netHesapla(20, 9, "ortaokul")).toBe(17);
  });

  // Aynı girdide iki kademe FARKLI sonuç vermeli — formülün gerçekten
  // ayrıştığının kanıtı.
  test("aynı girdide lise ve ortaokul farklı sonuç verir", () => {
    expect(netHesapla(20, 6, "lise")).toBe(18.5);
    expect(netHesapla(20, 6, "ortaokul")).toBe(18);
  });
});

describe("kenar durumlar", () => {
  test("yanlış yoksa net doğruya eşit", () => {
    expect(netHesapla(15, 0, "lise")).toBe(15);
    expect(netHesapla(15, 0, "ortaokul")).toBe(15);
  });

  test("hepsi boşsa net sıfır", () => {
    expect(netHesapla(0, 0, "ortaokul")).toBe(0);
  });

  // Yanlış doğruyu aşarsa net NEGATİF olur — kırpılmıyor, çünkü analiz
  // tarafında gerçek değer gerekiyor (bkz. rehber-bayrak net düşüşü).
  test("negatif net kırpılmaz", () => {
    expect(netHesapla(1, 9, "ortaokul")).toBe(-2);
    expect(netHesapla(1, 12, "lise")).toBe(-2);
  });

  test("iki ondalığa yuvarlanır", () => {
    expect(netHesapla(10, 1, "ortaokul")).toBe(9.67);
    expect(netHesapla(10, 1, "lise")).toBe(9.75);
  });
});
