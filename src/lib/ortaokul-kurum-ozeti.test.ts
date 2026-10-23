import { describe, expect, it } from "vitest";
import { DOGRULUK_MIN_SORU, haftaIndeksi, ortaokulKurumOzetiHesapla, type OzetGirdisi } from "./ortaokul-kurum-ozeti";

const BUGUN = "2026-10-20";
const bos: OzetGirdisi = { ogrenciler: [], ilkokulOgrenciSayisi: 0, calismalar: [], gorevler: [], yeterlilikler: [], acikYardimlar: [] };
const c = (studentId: string, tarih: string, o: Partial<{ dakika: number; dogru: number; yanlis: number; bos: number }> = {}) =>
  ({ studentId, tarih, dakika: 0, dogru: 0, yanlis: 0, bos: 0, ...o });

describe("haftaIndeksi", () => {
  it("bugün ve 6 gün önce 0. hafta, 7 gün önce 1. hafta", () => {
    expect(haftaIndeksi(BUGUN, "2026-10-20")).toBe(0);
    expect(haftaIndeksi(BUGUN, "2026-10-14")).toBe(0);
    expect(haftaIndeksi(BUGUN, "2026-10-13")).toBe(1);
  });
  it("pencere dışı ve gelecek tarih yok sayılır", () => {
    expect(haftaIndeksi(BUGUN, "2026-08-01")).toBeNull();
    expect(haftaIndeksi(BUGUN, "2026-10-21")).toBeNull();
  });
});

describe("ortaokulKurumOzetiHesapla", () => {
  it("öğrencisiz kurumda boş ama bozulmamış özet döner", () => {
    const o = ortaokulKurumOzetiHesapla(bos, BUGUN);
    expect(o.seviyeler).toEqual([]);
    expect(o.genel).toHaveLength(8);
  });

  it("aynı öğrenci aynı haftada tek kez sayılır, dakika ve soru toplanır", () => {
    const o = ortaokulKurumOzetiHesapla({
      ...bos,
      ogrenciler: [{ id: "a", seviye: "5" }, { id: "b", seviye: "5" }],
      calismalar: [c("a", "2026-10-20", { dakika: 20 }), c("a", "2026-10-19", { dogru: 5, yanlis: 2, bos: 1, dakika: 10 })],
    }, BUGUN);
    const s = o.seviyeler[0];
    expect(s.ogrenciSayisi).toBe(2);
    expect(s.buHaftaAktif).toBe(1);
    expect(s.buHaftaDakika).toBe(30);
    expect(s.buHaftaSoru).toBe(8);
  });

  it("doğruluk yetersiz örnekte gösterilmez, yeterli örnekte yüzde döner", () => {
    const az = ortaokulKurumOzetiHesapla({
      ...bos, ogrenciler: [{ id: "a", seviye: "6" }], calismalar: [c("a", BUGUN, { dogru: 5, yanlis: 0 })],
    }, BUGUN);
    expect(az.seviyeler[0].dogrulukYuzde).toBeNull();
    const cok = ortaokulKurumOzetiHesapla({
      ...bos, ogrenciler: [{ id: "a", seviye: "6" }], calismalar: [c("a", BUGUN, { dogru: DOGRULUK_MIN_SORU, yanlis: DOGRULUK_MIN_SORU })],
    }, BUGUN);
    expect(cok.seviyeler[0].dogrulukYuzde).toBe(50);
  });

  it("bilinmeyen öğrenci ve geçersiz yeterlilik durumu sessizce atlanır", () => {
    const o = ortaokulKurumOzetiHesapla({
      ...bos,
      ogrenciler: [{ id: "a", seviye: "7" }],
      calismalar: [c("x", BUGUN, { dakika: 99 })],
      yeterlilikler: [{ studentId: "a", durum: "saglamlastirdi" }, { studentId: "a", durum: "uydurma" }, { studentId: "x", durum: "ogreniyor" }],
    }, BUGUN);
    expect(o.seviyeler[0].buHaftaDakika).toBe(0);
    expect(o.seviyeler[0].yeterlilik.saglamlastirdi).toBe(1);
    expect(Object.values(o.seviyeler[0].yeterlilik).reduce((t, n) => t + n, 0)).toBe(1);
  });

  it("görev oranı ve açık yardım seviyeye göre ayrışır", () => {
    const o = ortaokulKurumOzetiHesapla({
      ...bos,
      ogrenciler: [{ id: "a", seviye: "5" }, { id: "b", seviye: "8" }],
      gorevler: [{ studentId: "a", durum: "tamamlandi" }, { studentId: "a", durum: "bekliyor" }, { studentId: "b", durum: "tamamlandi" }],
      acikYardimlar: [{ studentId: "b" }],
    }, BUGUN);
    const [bes, sekiz] = o.seviyeler;
    expect([bes.gorevTamamlanan, bes.gorevToplam, bes.acikYardim]).toEqual([1, 2, 0]);
    expect([sekiz.gorevTamamlanan, sekiz.gorevToplam, sekiz.acikYardim]).toEqual([1, 1, 1]);
  });
});
