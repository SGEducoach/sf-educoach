import { describe, expect, test } from "vitest";
import { gunFarki, yonBelirle } from "./rehber-kapsam-listesi";

describe("gunFarki", () => {
  test("gün sayısını doğru hesaplar", () => {
    expect(gunFarki("2026-10-07", "2026-10-07")).toBe(0);
    expect(gunFarki("2026-10-07", "2026-09-25")).toBe(12);
  });

  // Yaz saati / UTC kayması bir günü 23 veya 25 saate çevirebiliyor; tarihler
  // öğlen 12:00 UTC'ye sabitlendiği için yuvarlama hep doğru güne düşer.
  test("ay ve yıl sınırlarını aşarken kaymaz", () => {
    expect(gunFarki("2026-03-01", "2026-02-28")).toBe(1);
    expect(gunFarki("2027-01-01", "2026-12-31")).toBe(1);
    expect(gunFarki("2026-04-01", "2026-03-28")).toBe(4);
  });
});

describe("yonBelirle — netler YENİDEN ESKİYE", () => {
  // Adım 1'in ilkesiyle aynı: yeterli veri yoksa eğilim UYDURULMAZ.
  test("tek denemede yön yok", () => {
    expect(yonBelirle([70])).toBeNull();
    expect(yonBelirle([])).toBeNull();
  });

  test("son deneme öncekilerin ortalamasının üstündeyse yukarı", () => {
    expect(yonBelirle([80, 60, 60])).toBe("yukari");
  });

  test("son deneme öncekilerin ortalamasının altındaysa aşağı", () => {
    expect(yonBelirle([50, 70, 70])).toBe("asagi");
  });

  test("küçük dalgalanma düşüş sayılmaz (±%2 bant)", () => {
    expect(yonBelirle([69.5, 70, 70])).toBe("sabit");
    expect(yonBelirle([70, 70, 70])).toBe("sabit");
  });

  test("iki deneme yeterli", () => {
    expect(yonBelirle([80, 60])).toBe("yukari");
    expect(yonBelirle([60, 80])).toBe("asagi");
  });

  // Pencere 3: dördüncü ve sonraki denemeler yönü etkilemez.
  test("yalnızca son üç deneme sayılır", () => {
    expect(yonBelirle([60, 60, 60, 10, 10])).toBe("sabit");
  });

  // Negatif net mümkün (yanlışlar doğruları götürürse) — bant mutlak değerle
  // hesaplandığı için sıfıra yakın ortalamalarda da çalışır.
  test("negatif ve sıfıra yakın netlerde patlamaz", () => {
    expect(yonBelirle([-5, -1, -1])).toBe("asagi");
    expect(yonBelirle([0, 0])).toBe("sabit");
    expect(yonBelirle([3, 0, 0])).toBe("yukari");
  });
});
