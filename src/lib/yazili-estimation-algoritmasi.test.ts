import { describe, expect, test } from "vitest";
import { akilliTahminV1 } from "./yazili-estimation-algoritmasi";
import type { OgrenciToplam, TemsiliOgrenci } from "./yazili-estimation-algoritmasi";

describe('akilliTahminV1', () => {
  const maxPuanlar = [10, 10, 20]; // total 40

  test('class size <= 6: all representatives, output equals input totals', () => {
    const ogrenciler: OgrenciToplam[] = [
      { id: '1', toplam: 30 },
      { id: '2', toplam: 20 },
      { id: '3', toplam: 10 },
    ];
    const temsiliOgrenciler: TemsiliOgrenci[] = [
      { id: '1', toplam: 30, skorlar: [8, 8, 14] },
      { id: '2', toplam: 20, skorlar: [5, 5, 10] },
      { id: '3', toplam: 10, skorlar: [2, 2, 6] },
    ];
    const result = akilliTahminV1(ogrenciler, temsiliOgrenciler, maxPuanlar);
    expect(result['1']).toEqual([8, 8, 14]);
    expect(result['2']).toEqual([5, 5, 10]);
    expect(result['3']).toEqual([2, 2, 6]);
    // sum invariants
    for (const id of ['1', '2', '3']) {
      const sum = result[id].reduce((a, b) => a + b, 0);
      const ogr = ogrenciler.find(o => o.id === id)!;
      expect(sum).toBe(ogr.toplam);
      for (let j = 0; j < maxPuanlar.length; j++) {
        expect(result[id][j]).toBeGreaterThanOrEqual(0);
        expect(result[id][j]).toBeLessThanOrEqual(maxPuanlar[j]);
      }
    }
  });

  test('representative scores unchanged', () => {
    const ogrenciler: OgrenciToplam[] = [
      { id: 'r1', toplam: 25 },
      { id: 'e1', toplam: 15 },
    ];
    const temsiliOgrenciler: TemsiliOgrenci[] = [
      { id: 'r1', toplam: 25, skorlar: [5, 5, 15] },
    ];
    const result = akilliTahminV1(ogrenciler, temsiliOgrenciler, maxPuanlar);
    expect(result['r1']).toEqual([5, 5, 15]);
    // estimated student sum must equal real total
    const estSum = result['e1'].reduce((a, b) => a + b, 0);
    expect(estSum).toBe(15);
    // each score within bounds
    for (let j = 0; j < maxPuanlar.length; j++) {
      const val = result['e1'][j];
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(maxPuanlar[j]);
    }
  });

  test('total zero', () => {
    const ogrenciler: OgrenciToplam[] = [{ id: 'e1', toplam: 0 }];
    const temsiliOgrenciler: TemsiliOgrenci[] = [
      { id: 'r1', toplam: 10, skorlar: [2, 3, 5] },
      { id: 'r2', toplam: 10, skorlar: [2, 3, 5] },
    ];
    const result = akilliTahminV1(ogrenciler, temsiliOgrenciler, maxPuanlar);
    expect(result['e1']).toEqual([0, 0, 0]);
  });

  test('total equal to exam maximum', () => {
    const ogrenciler: OgrenciToplam[] = [{ id: 'e1', toplam: 40 }];
    const temsiliOgrenciler: TemsiliOgrenci[] = [
      { id: 'r1', toplam: 40, skorlar: [10, 10, 20] },
    ];
    const result = akilliTahminV1(ogrenciler, temsiliOgrenciler, maxPuanlar);
    expect(result['e1']).toEqual([10, 10, 20]);
  });

  test('heterogeneous question max scores', () => {
    const maxPuanlar = [5, 10, 15]; // total 30
    const ogrenciler: OgrenciToplam[] = [{ id: 'e1', toplam: 20 }];
    const temsiliOgrenciler: TemsiliOgrenci[] = [
      { id: 'r1', toplam: 15, skorlar: [3, 5, 7] },
      { id: 'r2', toplam: 15, skorlar: [2, 5, 8] },
    ];
    const result = akilliTahminV1(ogrenciler, temsiliOgrenciler, maxPuanlar);
    const est = result['e1'];
    const sum = est.reduce((a, b) => a + b, 0);
    expect(sum).toBe(20);
    for (let j = 0; j < maxPuanlar.length; j++) {
      expect(est[j]).toBeGreaterThanOrEqual(0);
      expect(est[j]).toBeLessThanOrEqual(maxPuanlar[j]);
    }
  });

  test('low-performing student', () => {
    const ogrenciler: OgrenciToplam[] = [{ id: 'e1', toplam: 5 }];
    const temsiliOgrenciler: TemsiliOgrenci[] = [
      { id: 'r1', toplam: 30, skorlar: [8, 8, 14] },
      { id: 'r2', toplam: 30, skorlar: [7, 7, 16] },
    ];
    const result = akilliTahminV1(ogrenciler, temsiliOgrenciler, maxPuanlar);
    const est = result['e1'];
    const sum = est.reduce((a, b) => a + b, 0);
    expect(sum).toBe(5);
    for (let j = 0; j < maxPuanlar.length; j++) {
      expect(est[j]).toBeGreaterThanOrEqual(0);
      expect(est[j]).toBeLessThanOrEqual(maxPuanlar[j]);
    }
  });

  test('high-performing student', () => {
    const ogrenciler: OgrenciToplam[] = [{ id: 'e1', toplam: 35 }];
    const temsiliOgrenciler: TemsiliOgrenci[] = [
      { id: 'r1', toplam: 20, skorlar: [5, 5, 10] },
      { id: 'r2', toplam: 20, skorlar: [4, 6, 10] },
    ];
    const result = akilliTahminV1(ogrenciler, temsiliOgrenciler, maxPuanlar);
    const est = result['e1'];
    const sum = est.reduce((a, b) => a + b, 0);
    expect(sum).toBe(35);
    for (let j = 0; j < maxPuanlar.length; j++) {
      expect(est[j]).toBeGreaterThanOrEqual(0);
      expect(est[j]).toBeLessThanOrEqual(maxPuanlar[j]);
    }
  });

  test('tied representative totals', () => {
    const ogrenciler: OgrenciToplam[] = [
      { id: 'e1', toplam: 25 },
      { id: 'e2', toplam: 25 },
    ];
    const temsiliOgrenciler: TemsiliOgrenci[] = [
      { id: 'r1', toplam: 20, skorlar: [5, 5, 10] },
      { id: 'r2', toplam: 20, skorlar: [5, 5, 10] },
    ];
    const result = akilliTahminV1(ogrenciler, temsiliOgrenciler, maxPuanlar);
    // both estimates should be identical
    expect(result['e1']).toEqual(result['e2']);
    const sum1 = result['e1'].reduce((a, b) => a + b, 0);
    const sum2 = result['e2'].reduce((a, b) => a + b, 0);
    expect(sum1).toBe(25);
    expect(sum2).toBe(25);
    for (let j = 0; j < maxPuanlar.length; j++) {
      expect(result['e1'][j]).toBeGreaterThanOrEqual(0);
      expect(result['e1'][j]).toBeLessThanOrEqual(maxPuanlar[j]);
      expect(result['e2'][j]).toBeGreaterThanOrEqual(0);
      expect(result['e2'][j]).toBeLessThanOrEqual(maxPuanlar[j]);
    }
  });

  test('deterministic repeated execution', () => {
    const ogrenciler: OgrenciToplam[] = [
      { id: 'e1', toplam: 18 },
      { id: 'e2', toplam: 22 },
    ];
    const temsiliOgrenciler: TemsiliOgrenci[] = [
      { id: 'r1', toplam: 20, skorlar: [5, 5, 10] },
      { id: 'r2', toplam: 20, skorlar: [4, 6, 10] },
    ];
    const result1 = akilliTahminV1(ogrenciler, temsiliOgrenciler, maxPuanlar);
    const result2 = akilliTahminV1(ogrenciler, temsiliOgrenciler, maxPuanlar);
    expect(result1).toEqual(result2);
  });

  test('representative count > 6 triggers algorithm', () => {
    // 7 students total, 3 representatives
    const ogrenciler: OgrenciToplam[] = Array.from({ length: 7 }, (_, i) => ({
      id: `${i + 1}`,
      toplam: 5 * (i + 1), // 5,10,15,20,25,30,35
    }));
    const temsiliOgrenciler: TemsiliOgrenci[] = [
      { id: '1', toplam: 5, skorlar: [1, 1, 3] },
      { id: '4', toplam: 20, skorlar: [5, 5, 10] },
      { id: '7', toplam: 35, skorlar: [9, 9, 17] },
    ];
    const result = akilliTahminV1(ogrenciler, temsiliOgrenciler, maxPuanlar);
    // reps unchanged
    expect(result['1']).toEqual([1, 1, 3]);
    expect(result['4']).toEqual([5, 5, 10]);
    expect(result['7']).toEqual([9, 9, 17]);
    // non-reps sum to their totals
    for (const id of ['2', '3', '5', '6']) {
      const sum = result[id].reduce((a, b) => a + b, 0);
      const ogr = ogrenciler.find(o => o.id === id)!;
      expect(sum).toBe(ogr.toplam);
      for (let j = 0; j < maxPuanlar.length; j++) {
        const val = result[id][j];
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(maxPuanlar[j]);
      }
    }
  });
});
