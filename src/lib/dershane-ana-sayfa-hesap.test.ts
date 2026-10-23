import { describe, expect, test } from "vitest";
import {
  anaSayfaSerileriHesapla, bucketIndexHesapla, noktaMetni,
  type DenemeGirdisi, type OgrenciGirdisi,
} from "./dershane-ana-sayfa-hesap";

const BUGUN = "2026-10-20";

function ogrenciler(sayi: number, seviye = "12", sinifId = "c12a", sinifAd = "12-A", onek = "o"): OgrenciGirdisi[] {
  return Array.from({ length: sayi }, (_, i) => ({ id: `${onek}${i}`, seviye, sinifId, sinifAd }));
}
// 40 doğru, 0 yanlış tek ders — net 40; kolay okunsun diye.
function deneme(studentId: string, tarih: string, tur: string, dogru: number, yanlis = 0): DenemeGirdisi {
  return { studentId, tarih, tur, dersler: [{ dogru, yanlis }] };
}

describe("tür ayrımı", () => {
  test("TYT ve AYT AYRI seriler; karma ortalama üretilmez", () => {
    const og = ogrenciler(4);
    const v = anaSayfaSerileriHesapla(BUGUN, og, [
      deneme("o0", "2026-10-19", "TYT", 80), deneme("o1", "2026-10-19", "TYT", 60),
      deneme("o2", "2026-10-19", "AYT", 20), deneme("o3", "2026-10-19", "AYT", 30),
    ], []);
    const sonTyt = v.turler.TYT.genel.at(-1)!;
    const sonAyt = v.turler.AYT.genel.at(-1)!;
    expect(sonTyt.netOrtalama).toBe(70);
    expect(sonAyt.netOrtalama).toBe(25);
    // (80+60+20+30)/4 = 47,5 hiçbir yerde görünmemeli
    const hepsi = JSON.stringify(v);
    expect(hepsi).not.toContain("47.5");
  });

  test("LGS lise özetine girmez, branş 'diğer' olarak sayılır", () => {
    const og = ogrenciler(2);
    const v = anaSayfaSerileriHesapla(BUGUN, og, [
      deneme("o0", "2026-10-19", "LGS", 90), deneme("o1", "2026-10-19", "BRANS", 30),
    ], []);
    expect(v.turler.TYT.denemeKaydi).toBe(0);
    expect(v.turler.AYT.denemeKaydi).toBe(0);
    expect(v.digerDenemeKaydi).toBe(1); // LGS sayılmaz, branş sayılır
  });

  test("net yanlış katsayısı lise (1/4): 40 doğru 8 yanlış = 38", () => {
    const v = anaSayfaSerileriHesapla(BUGUN, ogrenciler(1), [deneme("o0", "2026-10-19", "TYT", 40, 8)], []);
    expect(v.turler.TYT.genel.at(-1)!.netOrtalama).toBe(38);
  });

  test("ders sonucu boş deneme 0 net sayılmaz", () => {
    const v = anaSayfaSerileriHesapla(BUGUN, ogrenciler(1), [{ studentId: "o0", tarih: "2026-10-19", tur: "TYT", dersler: [] }], []);
    expect(v.turler.TYT.denemeKaydi).toBe(0);
    expect(v.turler.TYT.genel.at(-1)!.denemeSayisi).toBe(0);
  });

  test("varsayılan tür: daha çok öğrencinin girdiği; eşitse TYT", () => {
    const og = ogrenciler(5);
    const aytAgir = anaSayfaSerileriHesapla(BUGUN, og, [
      deneme("o0", "2026-10-19", "TYT", 50),
      deneme("o1", "2026-10-19", "AYT", 50), deneme("o2", "2026-10-19", "AYT", 50),
    ], []);
    expect(aytAgir.varsayilanTur).toBe("AYT");
    expect(anaSayfaSerileriHesapla(BUGUN, og, [], []).varsayilanTur).toBe("TYT");
  });
});

describe("kapsam yetersiz hafta", () => {
  test("ham net serilere sızmaz: 3/40 öğrenci => netOrtalama null", () => {
    const og = ogrenciler(40);
    const v = anaSayfaSerileriHesapla(BUGUN, og, [
      deneme("o0", "2026-10-19", "TYT", 99), deneme("o1", "2026-10-19", "TYT", 99), deneme("o2", "2026-10-19", "TYT", 99),
    ], []);
    const n = v.turler.TYT.genel.at(-1)!;
    expect(n.netOrtalama).toBeNull();
    expect(n.kapsamYeterli).toBe(false);
    expect(n.denemeOgrenci).toBe(3);
    expect(n.ogrenciSayisi).toBe(40);
    expect(JSON.stringify(v)).not.toContain("99");
    expect(noktaMetni(n)).toContain("40 öğrenciden yalnızca 3 tanesi");
  });

  test("12/40 (%30) yeterli: net + n/toplam metni", () => {
    const og = ogrenciler(40);
    const d = og.slice(0, 12).map((o) => deneme(o.id, "2026-10-19", "TYT", 50));
    const n = anaSayfaSerileriHesapla(BUGUN, og, d, []).turler.TYT.genel.at(-1)!;
    expect(n.netOrtalama).toBe(50);
    expect(noktaMetni(n)).toBe("50 net · 12/40 öğrenci");
  });

  test("kapsam KAYIT değil ÖĞRENCİ sayısı: tek öğrencinin 5 denemesi kapsamı 1 yapar", () => {
    const og = ogrenciler(10);
    const d = Array.from({ length: 5 }, () => deneme("o0", "2026-10-19", "TYT", 50));
    const n = anaSayfaSerileriHesapla(BUGUN, og, d, []).turler.TYT.genel.at(-1)!;
    expect(n.denemeSayisi).toBe(5);
    expect(n.denemeOgrenci).toBe(1);
    expect(n.netOrtalama).toBeNull();
  });

  test("kademe/sınıf kendi paydasıyla: kurumda yeterli, 9. sınıfta yetersiz", () => {
    const og = [...ogrenciler(10, "12", "c12", "12-A", "a"), ...ogrenciler(10, "9", "c9", "9-A", "b")];
    const d = og.slice(0, 10).map((o) => deneme(o.id, "2026-10-19", "TYT", 50)); // yalnız 12. sınıf
    const t = anaSayfaSerileriHesapla(BUGUN, og, d, []).turler.TYT;
    expect(t.genel.at(-1)!.netOrtalama).toBe(50); // 10/20
    const k9 = t.kademeler.find((k) => k.seviye === "9")!;
    expect(k9.ogrenciSayisi).toBe(10);
    expect(k9.noktalar.at(-1)!.netOrtalama).toBeNull();
    expect(t.kademeler.find((k) => k.seviye === "12")!.noktalar.at(-1)!.netOrtalama).toBe(50);
  });

  test("deneme olmayan hafta: null ve 'deneme yok' metni", () => {
    const n = anaSayfaSerileriHesapla(BUGUN, ogrenciler(5), [], []).turler.TYT.genel.at(-1)!;
    expect(n.netOrtalama).toBeNull();
    expect(noktaMetni(n)).toBe("Bu haftada deneme yok");
  });
});

describe("kapsam ve pencere", () => {
  test("ortaokul öğrencisi lise özetine girmez (öğrenci sayısı ve denemesi)", () => {
    const og = [...ogrenciler(3, "12", "c12", "12-A", "a"), ...ogrenciler(2, "8", "c8", "8-A", "b")];
    const v = anaSayfaSerileriHesapla(BUGUN, og, [deneme("b0", "2026-10-19", "TYT", 50), deneme("a0", "2026-10-19", "TYT", 50)], []);
    expect(v.ogrenciSayisi).toBe(3);
    expect(v.turler.TYT.denemeKaydi).toBe(1);
    expect(v.turler.TYT.kademeler.map((k) => k.seviye)).toEqual(["12"]);
  });

  test("8 hafta, eskiden yeniye; tarih aralığı pencereyi söyler", () => {
    const v = anaSayfaSerileriHesapla(BUGUN, ogrenciler(2), [], []);
    expect(v.turler.TYT.genel).toHaveLength(8);
    expect(v.turler.TYT.genel[0].haftaBaslangic < v.turler.TYT.genel[7].haftaBaslangic).toBe(true);
    expect(v.turler.TYT.genel[7].haftaBitis).toBe(BUGUN);
    expect(v.tarihAraligi).toEqual({ baslangic: v.turler.TYT.genel[0].haftaBaslangic, bitis: BUGUN });
  });

  test("bucket sınırı: bugün=0, 7 gün önce=1, 56 gün önce pencere dışı, gelecek yok sayılır", () => {
    expect(bucketIndexHesapla(BUGUN, BUGUN)).toBe(0);
    expect(bucketIndexHesapla(BUGUN, "2026-10-13")).toBe(1);
    expect(bucketIndexHesapla(BUGUN, "2026-08-25")).toBeNull();
    expect(bucketIndexHesapla(BUGUN, "2026-10-21")).toBeNull();
  });

  test("soru serisi deneme türünden bağımsız ve soru girmeyen öğrenciyi saymaz", () => {
    const v = anaSayfaSerileriHesapla(BUGUN, ogrenciler(3), [], [
      { studentId: "o0", tarih: "2026-10-19", dogru: 10, yanlis: 5 },
      { studentId: "o1", tarih: "2026-10-19", dogru: 0, yanlis: 0 },
    ]);
    const s = v.soru.genel.at(-1)!;
    expect(s.soruSayisi).toBe(15);
    expect(s.soruOgrenci).toBe(1);
  });
});
