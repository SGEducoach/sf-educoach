import { describe, expect, test } from "vitest";
import { sekmeleriBol, DOGRUDAN_SEKME } from "@/components/dashboard/AltSekmeCubugu";
import type { DashboardBolumu, DashboardMenuOgesi } from "@/lib/dashboard-navigation";

const O = (bolum: string): DashboardMenuOgesi =>
  ({ bolum: bolum as DashboardBolumu, href: `/d/${bolum}`, etiket: bolum, ikon: "ogrenci" });

const UZUN = ["ozet", "gorevler", "analiz", "duyurular", "onaylar", "profil", "takvim"].map(O);

describe("sekmeleriBol", () => {
  test("kısa menüde 'Daha' gerekmez, hepsi görünür", () => {
    const bes = ["ozet", "gorevler", "analiz", "duyurular", "onaylar"].map(O);
    const { gorunen, kalan } = sekmeleriBol(bes, "ozet" as DashboardBolumu);
    expect(gorunen).toHaveLength(5);
    expect(kalan).toEqual([]);
  });

  test("uzun menüde ilk dört görünür, kalanı 'Daha'ya düşer", () => {
    const { gorunen, kalan } = sekmeleriBol(UZUN, "ozet" as DashboardBolumu);
    expect(gorunen.map((o) => o.bolum)).toEqual(["ozet", "gorevler", "analiz", "duyurular"]);
    expect(kalan.map((o) => o.bolum)).toEqual(["onaylar", "profil", "takvim"]);
    expect(gorunen).toHaveLength(DOGRUDAN_SEKME);
  });

  // Aktif bölüm "Daha"nın içindeyse çubukta hiçbir şey seçili görünmez ve
  // kullanıcı nerede olduğunu kaybeder.
  test("aktif bölüm 'Daha'daysa çubuğa çekilir", () => {
    const { gorunen, kalan } = sekmeleriBol(UZUN, "takvim" as DashboardBolumu);
    expect(gorunen.map((o) => o.bolum)).toEqual(["ozet", "gorevler", "analiz", "takvim"]);
    // Yerinden ettiği bölüm kaybolmaz, "Daha"nın başına geçer.
    expect(kalan.map((o) => o.bolum)).toEqual(["duyurular", "onaylar", "profil"]);
  });

  test("aktif bölüm zaten çubuktaysa sıra değişmez", () => {
    const { gorunen } = sekmeleriBol(UZUN, "analiz" as DashboardBolumu);
    expect(gorunen.map((o) => o.bolum)).toEqual(["ozet", "gorevler", "analiz", "duyurular"]);
  });

  test("girdi dizisi bozulmaz", () => {
    const kopya = UZUN.map((o) => o.bolum);
    sekmeleriBol(UZUN, "takvim" as DashboardBolumu);
    expect(UZUN.map((o) => o.bolum)).toEqual(kopya);
  });

  test("boş menü çökmez", () => {
    expect(sekmeleriBol([], "ozet" as DashboardBolumu)).toEqual({ gorunen: [], kalan: [] });
  });
});
