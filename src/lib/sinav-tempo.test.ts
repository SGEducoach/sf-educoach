import { describe, expect, it } from "vitest";
import {
  SINAV_SURESI_DAKIKA, dersTempoButcesi, olcumGecerliMi, sinavProjeksiyonu,
} from "./sinav-tempo";
import { TYT_DERSLERI, AYT_DERSLERI, dersSoruSayisi } from "./types";

describe("sınav tempo bütçesi", () => {
  it("TYT bütçesi 165 dakikaya sığar ve kodlama payı bırakır", () => {
    const toplam = TYT_DERSLERI.reduce((t, ders) => {
      const soru = dersSoruSayisi("TYT", ders) ?? 0;
      const tempo = dersTempoButcesi("TYT", ders) ?? 0;
      return t + soru * tempo;
    }, 0);
    expect(toplam).toBeLessThan(SINAV_SURESI_DAKIKA.TYT);
    // Pay ne yok olsun ne de bütçenin beşte birini geçsin.
    expect(SINAV_SURESI_DAKIKA.TYT - toplam).toBeGreaterThan(5);
    expect(SINAV_SURESI_DAKIKA.TYT - toplam).toBeLessThan(33);
  });

  it("branş denemesi (120 soru) de 165 dakikaya sığar", () => {
    const toplam = TYT_DERSLERI.reduce((t, ders) => {
      const soru = dersSoruSayisi("BRANS", ders) ?? 0;
      const tempo = dersTempoButcesi("BRANS", ders) ?? 0;
      return t + soru * tempo;
    }, 0);
    expect(toplam).toBeLessThan(SINAV_SURESI_DAKIKA.BRANS);
  });

  it("her AYT alanı 180 dakikaya sığar", () => {
    for (const alan of ["SAY", "EA", "SOZ"] as const) {
      const toplam = AYT_DERSLERI[alan].reduce((t, ders) => {
        const soru = dersSoruSayisi("AYT", ders) ?? 0;
        const tempo = dersTempoButcesi("AYT", ders) ?? 0;
        return t + soru * tempo;
      }, 0);
      expect(toplam, alan).toBeGreaterThan(0);
      expect(toplam, alan).toBeLessThan(SINAV_SURESI_DAKIKA.AYT);
    }
  });

  it("her TYT dersinin bir bütçesi var", () => {
    for (const ders of TYT_DERSLERI) expect(dersTempoButcesi("TYT", ders), ders).toBeGreaterThan(0);
  });
});

describe("ölçüm bandı", () => {
  it("25 saniyede bir soru ölçüm dışı", () => {
    expect(olcumGecerliMi(0.4)).toBe(true);
    expect(olcumGecerliMi(0.39)).toBe(false);
  });
  it("soru başına 5 dakikanın üstü ölçüm dışı", () => {
    expect(olcumGecerliMi(5)).toBe(true);
    expect(olcumGecerliMi(5.1)).toBe(false);
  });
});

describe("sınav projeksiyonu", () => {
  const tempo = (dk: number) => TYT_DERSLERI.map((ders) => ({ ders, ortSureDakika: dk, soru: 0 }));

  it("bütçeye uyan tempoda süre artar ve tüm sorular yetişir", () => {
    const p = sinavProjeksiyonu("TYT", TYT_DERSLERI, tempo(1.0));
    expect(p).not.toBeNull();
    expect(p!.toplamSoru).toBe(120);
    expect(p!.gerekenDakika).toBe(120);
    expect(p!.farkDakika).toBe(45);
    expect(p!.yetisenSoru).toBe(120);
  });

  it("yavaş tempoda açık verir ve soruların bir kısmı yetişmez", () => {
    const p = sinavProjeksiyonu("TYT", TYT_DERSLERI, tempo(2))!;
    expect(p.gerekenDakika).toBe(240);
    expect(p.farkDakika).toBe(-75);
    expect(p.yetisenSoru).toBe(82);
  });

  it("ölçülmemiş ders bütçe temposuyla sayılır", () => {
    const p = sinavProjeksiyonu("TYT", TYT_DERSLERI, [{ ders: "Matematik", ortSureDakika: 2.5, soru: 0 }])!;
    expect(p.olculenDers).toBe(1);
    expect(p.toplamDers).toBe(9);
    // Matematik 40 soru × 2,5 = 100 dk; kalan dersler bütçeden (153,1 - 60).
    expect(p.gerekenDakika).toBe(193);
  });

  it("hiç ölçüm yoksa projeksiyon üretilmez", () => {
    expect(sinavProjeksiyonu("TYT", TYT_DERSLERI, [])).toBeNull();
  });

  it("ölçüm bandı dışındaki tempo yok sayılır", () => {
    const p = sinavProjeksiyonu("TYT", TYT_DERSLERI, [
      { ders: "Matematik", ortSureDakika: 0.1, soru: 0 },
      { ders: "Türkçe", ortSureDakika: 1.5, soru: 0 },
    ])!;
    expect(p.olculenDers).toBe(1);
  });
});
