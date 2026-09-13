import { describe, expect, test } from "vitest";
import {
  bloklariDogrula, haftaninPazartesisi, otoProgramOlustur, paylastir, periyotHatasi,
  type OtoProgramAyari, type OtoProgramVerisi,
} from "./oto-program";

// 2026-09-14 pazartesi.
function veri(ek: Partial<OtoProgramVerisi> = {}): OtoProgramVerisi {
  return {
    bugun: "2026-09-14",
    baslangicTarihi: "2026-09-14",
    haftaSayisi: 1,
    okulOgrencisi: true,
    dersListesi: ["Matematik", "Fizik", "Kimya", "Biyoloji"],
    konuKuyruklari: { Matematik: ["M1", "M2", "M3", "M4"], Fizik: ["F1", "F2"], Kimya: ["K1"] },
    doluAraliklar: [],
    sabitGorevler: [],
    degisecekKalemSayisi: 0,
    sonProgram: null,
    ...ek,
  };
}

function ayar(ek: Partial<OtoProgramAyari> = {}): OtoProgramAyari {
  return {
    gunler: [0],
    haftaIciPeriyotlari: [{ baslangic: "17:00", bitis: "19:00" }],
    haftaSonuPeriyotlari: [{ baslangic: "10:00", bitis: "12:00" }],
    dersler: [{ ders: "Matematik", agirlik: "orta" }],
    ...ek,
  };
}

describe("tarih yardımcıları", () => {
  test("haftanın pazartesisi", () => {
    expect(haftaninPazartesisi("2026-09-13")).toBe("2026-09-07");
    expect(haftaninPazartesisi("2026-09-14")).toBe("2026-09-14");
    expect(haftaninPazartesisi("2026-09-20")).toBe("2026-09-14");
  });
});

describe("paylastir — ağırlık payları 3/2/1", () => {
  test("12 blok ağırlıklı/orta/hafif → 6/4/2", () => {
    expect(paylastir(12, [{ ders: "A", agirlik: "agirlikli" }, { ders: "B", agirlik: "orta" }, { ders: "C", agirlik: "hafif" }])).toEqual([6, 4, 2]);
  });
  test("toplam korunur", () => {
    const sonuc = paylastir(7, [{ ders: "A", agirlik: "agirlikli" }, { ders: "B", agirlik: "orta" }, { ders: "C", agirlik: "hafif" }]);
    expect(sonuc.reduce((t, v) => t + v, 0)).toBe(7);
  });
});

describe("periyotHatasi", () => {
  test("okul öğrencisinde hafta içi okul saati kapalı", () => {
    expect(periyotHatasi([{ baslangic: "15:00", bitis: "17:00" }], true, "Hafta içi")).toMatch(/okul saatine/);
    expect(periyotHatasi([{ baslangic: "16:00", bitis: "18:00" }], true, "Hafta içi")).toBeNull();
    expect(periyotHatasi([{ baslangic: "09:00", bitis: "11:00" }], false, "Hafta içi")).toBeNull();
  });
  test("15 dakikalık adım, çakışma ve en fazla 3 aralık", () => {
    expect(periyotHatasi([{ baslangic: "17:10", bitis: "19:00" }], false, "X")).toMatch(/15 dakikalık/);
    expect(periyotHatasi([{ baslangic: "17:00", bitis: "19:00" }, { baslangic: "18:00", bitis: "20:00" }], false, "X")).toMatch(/çakışıyor/);
    const dort = ["08:00", "10:00", "12:00", "14:00"].map((b) => ({ baslangic: b, bitis: b.replace(/^(\d\d)/, (s) => String(Number(s) + 1).padStart(2, "0")) }));
    expect(periyotHatasi(dort, false, "X")).toMatch(/en fazla 3/);
  });
});

describe("otoProgramOlustur", () => {
  test("40 dk blok + 10 dk mola; konu sonra aynı konunun sorusu", () => {
    const bloklar = otoProgramOlustur(veri(), ayar());
    expect(bloklar.map((b) => [b.baslangic, b.bitis, b.tur, b.konu])).toEqual([
      ["17:00", "17:40", "konu", "M1"],
      ["17:50", "18:30", "soru", "M1"],
    ]);
  });

  test("dolu aralık atlanır", () => {
    const bloklar = otoProgramOlustur(veri({ doluAraliklar: [{ tarih: "2026-09-14", baslangic: "17:00", bitis: "17:30" }] }), ayar());
    expect(bloklar[0].baslangic).toBe("17:30");
  });

  test("okul öğrencisinde hafta içi 07-16 arasına blok konmaz, dershanede konur", () => {
    const sabah = ayar({ haftaIciPeriyotlari: [{ baslangic: "09:00", bitis: "11:00" }] });
    expect(otoProgramOlustur(veri(), sabah)).toHaveLength(0);
    expect(otoProgramOlustur(veri({ okulOgrencisi: false }), sabah).length).toBeGreaterThan(0);
  });

  test("ağırlığa göre dağılım", () => {
    const bloklar = otoProgramOlustur(veri(), ayar({
      gunler: [0, 1, 2, 3, 4, 5],
      dersler: [{ ders: "Matematik", agirlik: "agirlikli" }, { ders: "Fizik", agirlik: "orta" }, { ders: "Kimya", agirlik: "hafif" }],
    }));
    const say = (ders: string) => bloklar.filter((b) => b.ders === ders).length;
    expect([say("Matematik"), say("Fizik"), say("Kimya")]).toEqual([6, 4, 2]);
  });

  test("alternatif ders varken aynı ders bir günde en fazla 2 blok", () => {
    const bloklar = otoProgramOlustur(veri(), ayar({
      gunler: [0, 1],
      haftaIciPeriyotlari: [{ baslangic: "16:00", bitis: "18:00" }, { baslangic: "19:00", bitis: "21:00" }],
      dersler: [{ ders: "Matematik", agirlik: "orta" }, { ders: "Fizik", agirlik: "orta" }, { ders: "Kimya", agirlik: "orta" }],
    }));
    for (const tarih of ["2026-09-14", "2026-09-15"]) {
      for (const ders of ["Matematik", "Fizik", "Kimya"]) {
        expect(bloklar.filter((b) => b.tarih === tarih && b.ders === ders).length).toBeLessThanOrEqual(2);
      }
    }
  });

  test("aylıkta konular haftadan haftaya ilerler", () => {
    const bloklar = otoProgramOlustur(veri({ haftaSayisi: 2 }), ayar());
    const konuBloklari = bloklar.filter((b) => b.tur === "konu").map((b) => [b.tarih, b.konu]);
    expect(konuBloklari).toEqual([["2026-09-14", "M1"], ["2026-09-21", "M2"]]);
  });

  test("22.00 sonrası soru çözümü", () => {
    const bloklar = otoProgramOlustur(veri(), ayar({ haftaIciPeriyotlari: [{ baslangic: "22:00", bitis: "23:00" }] }));
    expect(bloklar[0].tur).toBe("soru");
  });

  test("saatsiz öğretmen ödevi kendi tarih aralığındaki ilk boş bloğa", () => {
    const bloklar = otoProgramOlustur(
      veri({ sabitGorevler: [{ atamaId: "a1", tur: "konu", ders: "Biyoloji", konu: "Hücre", tarih: "2026-09-15", sonTarih: "2026-09-16" }] }),
      ayar({ gunler: [0, 1, 2] }),
    );
    const odev = bloklar.find((b) => b.atamaId === "a1");
    expect(odev).toMatchObject({ tarih: "2026-09-15", baslangic: "17:00", ders: "Biyoloji" });
  });

  test("geçmiş günlere blok konmaz", () => {
    const bloklar = otoProgramOlustur(veri({ bugun: "2026-09-15" }), ayar({ gunler: [0, 1] }));
    expect(bloklar.every((b) => b.tarih >= "2026-09-15")).toBe(true);
  });
});

describe("bloklariDogrula", () => {
  const blok = (ek: object) => ({ anahtar: "x", tarih: "2026-09-14", baslangic: "17:00", bitis: "17:40", tur: "konu" as const, ders: "Matematik", konu: null, atamaId: null, ...ek });
  test("geçerli program", () => {
    expect(bloklariDogrula([blok({}), blok({ anahtar: "y", baslangic: "17:50", bitis: "18:30" })], veri())).toBeNull();
  });
  test("çakışan kalemler ve okul saati reddedilir", () => {
    expect(bloklariDogrula([blok({}), blok({ anahtar: "y", baslangic: "17:20", bitis: "18:00" })], veri())).toMatch(/aynı saate/);
    expect(bloklariDogrula([blok({ baslangic: "10:00", bitis: "10:40" })], veri())).toMatch(/okul saatine/);
    expect(bloklariDogrula([blok({ ders: "Tarih" })], veri())).toMatch(/ders listenizde yok/);
  });
});
