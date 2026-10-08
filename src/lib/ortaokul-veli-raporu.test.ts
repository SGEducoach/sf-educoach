import { describe, expect, test } from "vitest";
import { ortaokulVeliRaporuGetir } from "./ortaokul-veli-raporu";

// Ortaokul velisinin raporu (O1). En kritik iki şey:
//   1. net ORTAOKUL formülüyle (D − Y/3) hesaplanmalı — lise D−Y/4 değil
//   2. soru çalışması olmayan derste net GÖSTERİLMEMELİ (null, 0 değil)

type Satir = Record<string, unknown>;
function istemciKur(veri: { calismalar: Satir[]; gorevler: Satir[]; yeterlilikler: Satir[] }) {
  const zincir = (satirlar: Satir[]) => {
    const z: Record<string, unknown> = {};
    for (const ad of ["select", "eq", "gte", "order", "limit"]) {
      z[ad] = () => z;
    }
    z.then = (coz: (v: unknown) => unknown) => Promise.resolve({ data: satirlar, error: null }).then(coz);
    return z;
  };
  return {
    from: (tablo: string) => {
      if (tablo === "ortaokul_calismalar") return zincir(veri.calismalar);
      if (tablo === "gorev_atamalari") return zincir(veri.gorevler);
      if (tablo === "ortaokul_konu_yeterlilikleri") return zincir(veri.yeterlilikler);
      return zincir([]);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const bos = { calismalar: [], gorevler: [], yeterlilikler: [] };

describe("veri yokken", () => {
  test("veriVarMi false döner, sıfırlarla dolu grafik üretmez", async () => {
    const r = await ortaokulVeliRaporuGetir(istemciKur(bos), "ogr-1");
    expect(r.veriVarMi).toBe(false);
    expect(r.dersler).toEqual([]);
    expect(r.toplamDakika).toBe(0);
  });
});

describe("net hesabı ORTAOKUL formülüyle", () => {
  test("3 yanlış 1 doğruyu götürür", async () => {
    const r = await ortaokulVeliRaporuGetir(istemciKur({
      ...bos,
      calismalar: [{
        tur: "soru", tarih: "2026-10-01", sure_dakika: 40,
        dogru: 20, yanlis: 9, bos: 1,
        ortaokul_mufredat_dersleri: { ad: "Matematik" },
      }],
    }), "ogr-1");
    // Ortaokul: 20 − 9/3 = 17. Lise formülü olsaydı 20 − 9/4 = 17.75 olurdu.
    expect(r.dersler[0].net).toBe(17);
  });

  test("aynı derste birden fazla kayıt toplanır", async () => {
    const r = await ortaokulVeliRaporuGetir(istemciKur({
      ...bos,
      calismalar: [
        { tur: "soru", tarih: "2026-10-01", sure_dakika: 20, dogru: 10, yanlis: 3, bos: 0, ortaokul_mufredat_dersleri: { ad: "Türkçe" } },
        { tur: "soru", tarih: "2026-10-02", sure_dakika: 30, dogru: 5, yanlis: 3, bos: 2, ortaokul_mufredat_dersleri: { ad: "Türkçe" } },
      ],
    }), "ogr-1");
    expect(r.dersler[0].dakika).toBe(50);
    expect(r.dersler[0].soruSayisi).toBe(2);
    // 15 dogru, 6 yanlis -> 15 - 6/3 = 13
    expect(r.dersler[0].net).toBe(13);
  });
});

describe("konu çalışması net üretmez", () => {
  test("yalnız konu çalışması olan derste net null", async () => {
    const r = await ortaokulVeliRaporuGetir(istemciKur({
      ...bos,
      calismalar: [{
        tur: "konu", tarih: "2026-10-01", sure_dakika: 45,
        dogru: null, yanlis: null, bos: null,
        ortaokul_mufredat_dersleri: { ad: "Fen Bilimleri" },
      }],
    }), "ogr-1");
    expect(r.dersler[0].net).toBeNull();
    expect(r.dersler[0].konuSayisi).toBe(1);
    expect(r.dersler[0].soruSayisi).toBe(0);
    expect(r.konuCalismasi).toBe(1);
  });
});

describe("görev sayımı", () => {
  test("durumlara göre ayrışır", async () => {
    const r = await ortaokulVeliRaporuGetir(istemciKur({
      ...bos,
      gorevler: [{ durum: "tamamlandi" }, { durum: "tamamlandi" }, { durum: "bekliyor" }, { durum: "tamamlanmadi" }],
    }), "ogr-1");
    expect(r.gorevVerilen).toBe(4);
    expect(r.gorevTamamlanan).toBe(2);
    expect(r.gorevBekleyen).toBe(1);
    expect(r.veriVarMi).toBe(true);
  });
});

describe("ders adı çözümü", () => {
  // Gömülü ilişki çalışma anında NESNE döner, tipte dizi görünür — ikisi de
  // tolere edilmeli (proje notu).
  test("gömülü ilişki dizi gelirse de çalışır", async () => {
    const r = await ortaokulVeliRaporuGetir(istemciKur({
      ...bos,
      calismalar: [{ tur: "konu", tarih: "2026-10-01", sure_dakika: 10, dogru: 0, yanlis: 0, bos: 0, ortaokul_mufredat_dersleri: [{ ad: "Sosyal Bilgiler" }] }],
    }), "ogr-1");
    expect(r.dersler[0].ders).toBe("Sosyal Bilgiler");
  });

  test("ders bilgisi yoksa uydurulmaz", async () => {
    const r = await ortaokulVeliRaporuGetir(istemciKur({
      ...bos,
      calismalar: [{ tur: "konu", tarih: "2026-10-01", sure_dakika: 10, dogru: 0, yanlis: 0, bos: 0, ortaokul_mufredat_dersleri: null }],
    }), "ogr-1");
    expect(r.dersler[0].ders).toBe("Belirtilmemiş");
  });
});

describe("sıralama", () => {
  test("en çok çalışılan ders başta", async () => {
    const r = await ortaokulVeliRaporuGetir(istemciKur({
      ...bos,
      calismalar: [
        { tur: "konu", tarih: "2026-10-01", sure_dakika: 10, dogru: 0, yanlis: 0, bos: 0, ortaokul_mufredat_dersleri: { ad: "Az" } },
        { tur: "konu", tarih: "2026-10-01", sure_dakika: 90, dogru: 0, yanlis: 0, bos: 0, ortaokul_mufredat_dersleri: { ad: "Çok" } },
      ],
    }), "ogr-1");
    expect(r.dersler.map((d) => d.ders)).toEqual(["Çok", "Az"]);
  });
});

describe("yeterlilik kararları", () => {
  test("tema ve ders adı iç içe ilişkiden çözülür", async () => {
    const r = await ortaokulVeliRaporuGetir(istemciKur({
      ...bos,
      yeterlilikler: [{
        durum: "yeterli", aciklama: "Güzel ilerleme",
        ortaokul_mufredat_temalari: { ad: "Kesirler", ortaokul_mufredat_dersleri: { ad: "Matematik" } },
      }],
    }), "ogr-1");
    expect(r.kararlar).toEqual([{ tema: "Kesirler", ders: "Matematik", durum: "yeterli", aciklama: "Güzel ilerleme" }]);
  });
});

// Yardım istekleri BİLİNÇLİ olarak rapora girmiyor: çocuğun öğretmene
// uzanması özel kalmalı, veliye raporlanırsa çocuk yardım istemekten
// çekinir. Bu test o kararı kayda geçiriyor.
describe("gizlilik kararı", () => {
  test("rapor yardım isteği alanı TAŞIMIYOR", async () => {
    const r = await ortaokulVeliRaporuGetir(istemciKur(bos), "ogr-1");
    expect(Object.keys(r)).not.toContain("yardimIstekleri");
    expect(JSON.stringify(r)).not.toContain("yardim");
  });
});
