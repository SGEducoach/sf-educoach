import { describe, expect, test } from "vitest";
import { dersAraliklari, kazanimSorulariniCikar, type OgrenciKarneVerisi } from "./kazanim-soru-cikarimi";
import type { KarneDersOrtalamasi, SoruDurumu } from "./karne-birinci-sayfa";

function ders(ad: string, soru: number): KarneDersOrtalamasi {
  return { ders: ad, soru, dogru: 0, yanlis: 0, net: 0, basari: 0, sinifOrt: null, kurumOrt: null, genelOrt: null };
}

const DERSLER = [ders("Tarih-1", 2), ders("Felsefe", 2), ders("Felsefe (Seçmeli)", 2), ders("TYT Sosyal", 4)];

// Sosyal testi 4 soru: Tarih 1-2, Felsefe 3-4 (Seçmeli de 3-4'ü paylaşır).
// Tarih: "A" konusu 1 soru, "B" konusu 1 soru; Felsefe: "C" 2 soru.
function ogrenci(id: string, kitapcik: string, durumlar: SoruDurumu[], kazanim: Record<string, [number, number, number]>): OgrenciKarneVerisi {
  return {
    ogrenciId: id,
    dersler: DERSLER,
    testler: [{ test: "TYT Sosyal", kitapcik, sorular: durumlar.map((d, i) => ({ no: i + 1, cevap: null, anahtar: null, durum: d })) }],
    kazanimlar: Object.entries(kazanim).map(([k, [soru, dogru, yanlis]]) => ({
      ders: k === "C" ? "Felsefe" : "Tarih-1", kazanimMetni: k, soru, dogru, yanlis,
    })),
  };
}

describe("dersAraliklari", () => {
  test("alt toplamdan önceki dersler sırayla, seçmeli bir önceki dersle aynı aralık", () => {
    const a = dersAraliklari(DERSLER, [{ test: "TYT Sosyal", kitapcik: "A", sorular: [] }]);
    expect(a.get("Tarih-1")).toEqual({ test: "TYT Sosyal", sorular: [1, 2] });
    expect(a.get("Felsefe")).toEqual({ test: "TYT Sosyal", sorular: [3, 4] });
    expect(a.get("Felsefe (Seçmeli)")).toEqual({ test: "TYT Sosyal", sorular: [3, 4] });
  });
});

describe("kazanimSorulariniCikar", () => {
  test("öğrencilerin D/Y'leri tek bir soruyla tutuyorsa konu o sorudur; kitapçıklar ayrı", () => {
    // A kitapçığında konu "A" = 1. soru, "B" = 2. soru; B kitapçığında tersi.
    const veri = [
      ogrenci("1", "A", ["dogru", "yanlis", "dogru", "dogru"], { A: [1, 1, 0], B: [1, 0, 1], C: [2, 2, 0] }),
      ogrenci("2", "A", ["yanlis", "dogru", "dogru", "bos"], { A: [1, 0, 1], B: [1, 1, 0], C: [2, 1, 0] }),
      ogrenci("3", "B", ["dogru", "yanlis", "bos", "bos"], { A: [1, 0, 1], B: [1, 1, 0], C: [2, 0, 0] }),
      ogrenci("4", "B", ["yanlis", "dogru", "dogru", "yanlis"], { A: [1, 1, 0], B: [1, 0, 1], C: [2, 1, 1] }),
    ];
    const s = kazanimSorulariniCikar(veri);
    const bul = (k: string, kit: string) => s.find((x) => x.kazanimMetni === k && x.kitapcik === kit);
    expect(bul("A", "A")).toMatchObject({ sorular: [1], kesin: true, test: "TYT Sosyal" });
    expect(bul("B", "A")).toMatchObject({ sorular: [2], kesin: true });
    expect(bul("A", "B")).toMatchObject({ sorular: [2], kesin: true });
    expect(bul("B", "B")).toMatchObject({ sorular: [1], kesin: true });
    expect(bul("C", "A")).toMatchObject({ sorular: [3, 4], kesin: true });
  });

  test("ayırt edilemeyen sorular (herkes aynı cevap) kesin değil olarak adaylarıyla döner", () => {
    const veri = [
      ogrenci("1", "A", ["dogru", "dogru", "dogru", "dogru"], { A: [1, 1, 0], B: [1, 1, 0], C: [2, 2, 0] }),
      ogrenci("2", "A", ["dogru", "dogru", "dogru", "dogru"], { A: [1, 1, 0], B: [1, 1, 0], C: [2, 2, 0] }),
    ];
    const a = kazanimSorulariniCikar(veri).find((x) => x.kazanimMetni === "A");
    expect(a).toMatchObject({ soruSayisi: 1, sorular: [1, 2], kesin: false });
  });
});
