import { describe, expect, test } from "vitest";
import {
  YETERLILIK_DURUMLARI, YETERLILIK_ETIKET, YETERLILIK_ETIKET_OGRENCI,
  destekGerekenler, temaYeterlilikleri, yeterlilikDurumuCoz, yeterlilikKararVerebilir, yeterlilikOzeti,
} from "./ortaokul-yeterlilik";
import type { YeterlilikKarari } from "./ortaokul-yeterlilik";
import { BOLUM_ETIKET, ORTAOKUL_BOLUMLERI, bolumCoz } from "./ortaokul-bolum";

const TEMALAR = [
  { id: "t1", ad: "Sayılar", kod: "MAT.5.1" },
  { id: "t2", ad: null, kod: "MAT.5.2" },
  { id: "t3", ad: "Geometri", kod: "MAT.5.3" },
];

function karar(p: Partial<YeterlilikKarari> & { temaId: string }): YeterlilikKarari {
  return {
    bolum: "maarif", durum: "ogreniyor", kararVerenAdi: "Ayşe Öğretmen",
    aciklama: null, guncellenmeTarihi: "2026-10-01T10:00:00Z", ...p,
  };
}

// EN ÖNEMLİ KURAL: kararı yalnız öğretmen verir (kullanıcı kararı 01.10.2026).
// Bu test bozulursa öğrenci kendi yeterliliğine karar verebilir hâle gelir.
describe("yeterlilikKararVerebilir", () => {
  test("öğrenci ve veli KARAR VEREMEZ", () => {
    expect(yeterlilikKararVerebilir("ogrenci")).toBe(false);
    expect(yeterlilikKararVerebilir("veli")).toBe(false);
  });

  test("öğretmen, müdür ve admin karar verir", () => {
    expect(yeterlilikKararVerebilir("ogretmen")).toBe(true);
    expect(yeterlilikKararVerebilir("mudur")).toBe(true);
    expect(yeterlilikKararVerebilir("admin")).toBe(true);
  });

  test("bilinmeyen/boş rol karar veremez", () => {
    expect(yeterlilikKararVerebilir(null)).toBe(false);
    expect(yeterlilikKararVerebilir(undefined)).toBe(false);
    expect(yeterlilikKararVerebilir("saçma")).toBe(false);
  });
});

describe("yeterlilikDurumuCoz", () => {
  test("geçerli durumlar geçer, geçersizler null", () => {
    for (const d of YETERLILIK_DURUMLARI) expect(yeterlilikDurumuCoz(d), d).toBe(d);
    expect(yeterlilikDurumuCoz("basarisiz")).toBeNull();
    expect(yeterlilikDurumuCoz(null)).toBeNull();
  });
});

describe("temaYeterlilikleri", () => {
  test("kararsız tema listede kalır ve durumu NULL olur", () => {
    const satirlar = temaYeterlilikleri(TEMALAR, [karar({ temaId: "t1" })], "maarif");
    expect(satirlar).toHaveLength(3);
    expect(satirlar[0].durum).toBe("ogreniyor");
    // Karar verilmemiş tema "baslamadi" DEĞİL null: öğretmen henüz bakmadı.
    expect(satirlar[1].durum).toBeNull();
    expect(satirlar[2].durum).toBeNull();
  });

  test("adı olmayan tema kodla gösterilir", () => {
    const satirlar = temaYeterlilikleri(TEMALAR, [], "maarif");
    expect(satirlar[1].temaAdi).toBe("MAT.5.2");
  });

  // Maarif ve LGS AYRI kararlar: biri diğerine sızmamalı.
  test("başka bölümün kararı sızmaz", () => {
    const kararlar = [karar({ temaId: "t1", bolum: "lgs", durum: "saglamlastirdi" })];
    expect(temaYeterlilikleri(TEMALAR, kararlar, "maarif")[0].durum).toBeNull();
    expect(temaYeterlilikleri(TEMALAR, kararlar, "lgs")[0].durum).toBe("saglamlastirdi");
  });

  test("karar veren öğretmenin adı taşınıyor", () => {
    const satirlar = temaYeterlilikleri(TEMALAR, [karar({ temaId: "t1", kararVerenAdi: "Ali Hoca" })], "maarif");
    expect(satirlar[0].kararVerenAdi).toBe("Ali Hoca");
  });
});

describe("yeterlilikOzeti", () => {
  test("kararlı ve bekleyen sayıları", () => {
    const satirlar = temaYeterlilikleri(TEMALAR, [
      karar({ temaId: "t1", durum: "saglamlastirdi" }),
      karar({ temaId: "t3", durum: "biraz_pratik" }),
    ], "maarif");
    const o = yeterlilikOzeti(satirlar);
    expect(o).toMatchObject({ toplam: 3, kararli: 2, bekleyen: 1 });
    expect(o.dagilim.saglamlastirdi).toBe(1);
    expect(o.dagilim.biraz_pratik).toBe(1);
    expect(o.dagilim.baslamadi).toBe(0);
  });

  test("hiç karar yoksa hepsi bekliyor", () => {
    const o = yeterlilikOzeti(temaYeterlilikleri(TEMALAR, [], "maarif"));
    expect(o).toMatchObject({ toplam: 3, kararli: 0, bekleyen: 3 });
  });
});

describe("destekGerekenler", () => {
  test("en çok destek gereken başta", () => {
    const satirlar = temaYeterlilikleri([
      ...TEMALAR, { id: "t4", ad: "Kesirler", kod: "MAT.5.4" },
    ], [
      karar({ temaId: "t1", durum: "biraz_pratik" }),
      karar({ temaId: "t2", durum: "tekrar_zamani" }),
      karar({ temaId: "t3", durum: "saglamlastirdi" }),
      karar({ temaId: "t4", durum: "ogreniyor" }),
    ], "maarif");
    expect(destekGerekenler(satirlar).map((s) => s.temaId)).toEqual(["t2", "t1", "t4"]);
  });

  test("sağlamlaştırılan ve kararsız temalar destek listesinde yok", () => {
    const satirlar = temaYeterlilikleri(TEMALAR, [karar({ temaId: "t1", durum: "saglamlastirdi" })], "maarif");
    expect(destekGerekenler(satirlar)).toHaveLength(0);
  });
});

describe("etiketler", () => {
  test("her durumun iki dili de var", () => {
    for (const d of YETERLILIK_DURUMLARI) {
      expect(YETERLILIK_ETIKET[d], d).toBeTruthy();
      expect(YETERLILIK_ETIKET_OGRENCI[d], d).toBeTruthy();
    }
  });

  // §21.2: akademik durumda alarm/başarısızlık dili yok.
  test("durum metinlerinde başarısızlık dili yok", () => {
    const hepsi = [...Object.values(YETERLILIK_ETIKET), ...Object.values(YETERLILIK_ETIKET_OGRENCI)]
      .join(" ").toLocaleLowerCase("tr");
    for (const yasak of ["başarısız", "yetersiz", "kötü", "zayıf", "geride"]) {
      expect(hepsi, yasak).not.toContain(yasak);
    }
  });
});

describe("bölümler", () => {
  test("iki bölüm ve etiketleri", () => {
    expect(ORTAOKUL_BOLUMLERI).toEqual(["maarif", "lgs"]);
    expect(BOLUM_ETIKET.maarif).toBe("Maarif");
    expect(BOLUM_ETIKET.lgs).toBe("LGS");
  });

  test("bölüm çözümü bilinmeyen değerde Maarif'e düşer", () => {
    expect(bolumCoz("lgs")).toBe("lgs");
    expect(bolumCoz("maarif")).toBe("maarif");
    expect(bolumCoz("saçma")).toBe("maarif");
    expect(bolumCoz(null)).toBe("maarif");
  });
});
