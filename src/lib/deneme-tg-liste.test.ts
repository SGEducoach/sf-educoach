import { describe, expect, test } from "vitest";
import type { GenisMetin } from "./deneme-sinif-listesi";
import { kurumListesiBasligiVarMi, kurumListesiniCoz } from "./deneme-kurum-liste";
import { karneleriListeyeEsle, sonucBelgeleriniCoz, type SonucBelgesi } from "./deneme-sonuc-belgesi";
import { tgSonuclariniBirlestir } from "./deneme-tg-liste";

// Konumlar gerçek "TG DENEME" çıktısından alındı; öğrenci adları UYDURMA.

const oge = (str: string, x: number, y: number, w = Math.max(5, str.length * 5.5)): GenisMetin => ({ str, x, y, w });
/** Merkezi `m` olan değer: x = m − w/2. */
const degerOgesi = (str: string, m: number, y: number): GenisMetin => {
  const w = Math.max(5, str.length * 5.5);
  return { str, x: m - w / 2, y, w };
};

// ——— Kurum sıralı liste ———
const HARF_X = [157, 192, 226, 260, 295, 329, 364, 399, 433, 467, 502, 536, 571, 606, 640];
const MERKEZ = HARF_X.map((x) => x + 3);

interface ListeSatiri {
  sira: number; birlesikSira?: boolean; no: number; ad: string; sinif: string;
  /** Türkçe, Sosyal, Matematik, Fen: [D, Y]; net sütunu D−Y/4. */
  dersler: [number, number][];
  netBozuk?: boolean;
  puan: number;
}
const net = (d: number, y: number) => (d - y / 4).toFixed(2);

function listeSayfasi(satirlar: ListeSatiri[], baslik = "ÖĞRENCİ LİSTESİ - KURUM - 9-10.SINIF SIRALI"): GenisMetin[] {
  const o: GenisMetin[] = [
    oge(baslik, 294, 564),
    oge("SINAV ADI", 583, 531), oge("İL", 64, 531),
    oge("GENEL", 731, 522),
    oge("9.SINIF TG DENEME-1", 570, 500), oge("517", 735, 500), oge("119", 761, 500),
    oge("TÜRK DİLİ", 179, 477), oge("SOSYAL BİLİMLER", 271, 477), oge("MATEMATİK", 383, 477), oge("FEN BİLİMLERİ", 483, 477), oge("Toplam", 597, 477),
    oge("Ögr.Bilgileri", 53, 469),
  ];
  HARF_X.forEach((x, i) => o.push(oge("DYN"[i % 3], x, 460, 6)));
  o.push(oge("Puan", 687, 460, 22));
  o.push(oge("Genel Ortalama", 55, 443), oge("14.42", 151, 443));
  satirlar.forEach((s, i) => {
    const y = 409 - i * 23;
    if (s.birlesikSira) o.push(oge(`${s.sira} ${s.no} - ${s.ad}`, 15, y));
    else { o.push(oge(String(s.sira), 17, y)); o.push(oge(`${s.no} - ${s.ad}`, 26, y)); }
    o.push(oge(s.sinif, 123, y));
    let tD = 0, tY = 0;
    s.dersler.forEach(([d, yy], k) => {
      tD += d; tY += yy;
      o.push(degerOgesi(String(d), MERKEZ[k * 3], y), degerOgesi(String(yy), MERKEZ[k * 3 + 1], y));
      o.push(degerOgesi(s.netBozuk && k === 0 ? "99.00" : net(d, yy), MERKEZ[k * 3 + 2], y));
    });
    o.push(degerOgesi(`${tD}.00`, MERKEZ[12], y), degerOgesi(`${tY}.00`, MERKEZ[13], y), degerOgesi(net(tD, tY), MERKEZ[14], y));
    o.push(degerOgesi(s.puan.toFixed(3), 700, y));
    // Sıralama sütunları satırın dışında kalmalı:
    o.push(oge(String(s.sira), 731, y + 4), oge("%0", 743, y));
  });
  return o;
}

const S1: ListeSatiri = { sira: 1, no: 25, ad: "ÖĞRENCİ BİR", sinif: "9 / B", dersler: [[26, 4], [28, 2], [27, 3], [30, 0]], puan: 462.5 };
const S2: ListeSatiri = { sira: 10, birlesikSira: true, no: 40, ad: "ÖĞRENCİ İKİ", sinif: "9 / A", dersler: [[20, 5], [18, 4], [15, 5], [22, 2]], puan: 300.5 };
const S3: ListeSatiri = { sira: 11, no: 33, ad: "ÖĞRENCİ ÜÇ", sinif: "0 / 0", dersler: [[10, 10], [12, 8], [9, 11], [14, 6]], puan: 150.25 };

describe("kurumListesiniCoz", () => {
  test("başlığı tanır; sınav adı, kapsam, birleşik sıra+numara ve boş sınıf doğru okunur", () => {
    const sayfa = listeSayfasi([S1, S2, S3]);
    expect(kurumListesiBasligiVarMi([sayfa])).toBe(true);
    const r = kurumListesiniCoz([sayfa]);
    expect(r.basarili).toBe(true);
    expect(r.kapsam).toBe("kurum");
    expect(r.sinavAdi).toBe("9.SINIF TG DENEME-1");
    expect(r.genelKatilim).toBe(517);
    expect(r.okunamayanSatirlar).toEqual([]);
    expect(r.ogrenciler.map((o) => [o.sira, o.ogrenciNo, o.isimHam, o.sinif])).toEqual([
      [1, 25, "ÖĞRENCİ BİR", "9-B"],
      [10, 40, "ÖĞRENCİ İKİ", "9-A"],
      [11, 33, "ÖĞRENCİ ÜÇ", ""],
    ]);
    expect(r.ogrenciler[0].dersSonuclari).toEqual([
      { ders: "TYT Türkçe", dogru: 26, yanlis: 4, net: 25 },
      { ders: "TYT Sosyal", dogru: 28, yanlis: 2, net: 27.5 },
      { ders: "TYT Matematik", dogru: 27, yanlis: 3, net: 26.25 },
      { ders: "TYT Fen", dogru: 30, yanlis: 0, net: 30 },
    ]);
    expect(r.ogrenciler[0].toplam).toEqual({ dogru: 111, yanlis: 9, net: 108.75 });
    expect(r.ogrenciler[0].puan).toBe(462.5);
  });

  test("ŞUBE başlığı da tanınır ve aynı öğrenci iki kez eklenmez", () => {
    const r = kurumListesiniCoz([listeSayfasi([S1], "ÖĞRENCİ LİSTESİ - ŞUBE - 9-10.SINIF SIRALI"), listeSayfasi([S1])]);
    expect(r.kapsam).toBe("sube");
    expect(r.ogrenciler).toHaveLength(1);
  });

  test("net sütunu D−Y/4 ile tutmayan satır sessizce atılmaz, okunamayan olarak döner", () => {
    const r = kurumListesiniCoz([listeSayfasi([S1, { ...S2, netBozuk: true }])]);
    expect(r.ogrenciler.map((o) => o.ogrenciNo)).toEqual([25]);
    expect(r.okunamayanSatirlar).toHaveLength(1);
    expect(r.okunamayanSatirlar[0].isimHam).toBe("ÖĞRENCİ İKİ");
    expect(r.okunamayanSatirlar[0].neden).toMatch(/net/);
  });

  test("tanınmayan belge başarısız döner (yapay zekâya düşme kararı çağırana ait)", () => {
    const r = kurumListesiniCoz([[oge("OKUL TYT NET LİSTESİ", 10, 500)]]);
    expect(r.basarili).toBe(false);
    expect(kurumListesiBasligiVarMi([[oge("OKUL TYT NET LİSTESİ", 10, 500)]])).toBe(false);
  });
});

// ——— Karne (öğrenci sınav sonuç belgesi) ———
interface KarneDers { ad: string; soru: number; d: number; y: number; b: number }
interface KarneGirdisi {
  ad: string; sinifNo: string; puan: number; sol: KarneDers[]; sag: KarneDers[];
  toplam: { soru: number; d: number; y: number; b: number };
}

function karneSayfasi(k: KarneGirdisi): GenisMetin[] {
  const o: GenisMetin[] = [
    oge("ÖĞRENCİ SINAV", 52, 813), oge("SONUÇ BELGESİ", 52, 790), oge("10.SINIF TG DENEME-1", 433, 790),
    oge("SORU SAYISI", 315, 752, 34), oge("DOĞRU", 368, 752, 20), oge("YANLIŞ", 419, 752, 19), oge("BOŞ", 466, 752, 11), oge("NET", 523, 752, 11),
    oge(k.ad, 96, 726), oge(String(k.toplam.soru), 321, 726, 24), oge(String(k.toplam.d), 371, 726, 16), oge(String(k.toplam.y), 422, 726, 16),
    oge(String(k.toplam.b), 464, 726, 16), oge((k.toplam.d - k.toplam.y / 4).toFixed(0), 521, 726, 16),
    oge(k.sinifNo, 96, 714), oge("ELBİSTAN İMKB FEN LİSESİ", 96, 702),
    oge("PUAN", 407, 675, 37), oge(k.puan.toFixed(3), 376, 648, 98),
    oge("ŞUBE", 116, 618), oge("ORTALAMA", 37, 558), oge("320.000", 102, 558),
  ];
  const blok = (liste: KarneDers[], sol: boolean) => {
    const dx = sol ? 0 : 265;
    let y = 531;
    for (const d of liste) {
      o.push(oge("Soru Sayısı", 80 + dx, y, 30), oge("Doğru", 130 + dx, y, 17), oge("Yanlış", 174 + dx, y, 16), oge("Boş", 221 + dx, y, 10), oge("Net", 264 + dx, y, 9));
      o.push(oge(String(d.soru), 89 + dx, y - 18, 11), oge(String(d.d), 135 + dx, y - 18, 6), oge(String(d.y), 179 + dx, y - 18, 6), oge(String(d.b), 222 + dx, y - 18, 6), oge((d.d - d.y / 4).toFixed(2), 259 + dx, y - 18, 20));
      o.push(oge(d.ad, (sol ? 58 : 323), y - 56, 50), oge("Başarı : %", 84 + dx, y - 60, 29));
      y -= 85;
    }
  };
  blok(k.sol, true);
  blok(k.sag, false);
  return o;
}

const ikinciSayfa = (): GenisMetin[] => [oge("ÖĞRENCİ SINAV", 52, 813), oge("SONUÇ BELGESİ", 52, 790), oge("Sınav Karşılaştırma Grafiği(%)", 45, 637), oge("MAT.10.4.1. Dik üçgende", 62, 595)];

const KARNE_S1: KarneGirdisi = {
  ad: "****** ****", sinifNo: "9/B -", puan: 462.5, toplam: { soru: 120, d: 111, y: 9, b: 0 },
  sol: [
    { ad: "TÜRK DİLİ", soru: 30, d: 26, y: 4, b: 0 }, { ad: "TARİH", soru: 10, d: 9, y: 1, b: 0 },
    { ad: "COĞRAFYA", soru: 10, d: 9, y: 1, b: 0 }, { ad: "FELSEFE", soru: 5, d: 5, y: 0, b: 0 }, { ad: "DİN KÜLTÜR", soru: 5, d: 5, y: 0, b: 0 },
  ],
  sag: [
    { ad: "MATEMATİK", soru: 30, d: 27, y: 3, b: 0 }, { ad: "FİZİK", soru: 10, d: 10, y: 0, b: 0 },
    { ad: "KİMYA", soru: 10, d: 10, y: 0, b: 0 }, { ad: "BİYOLOJİ", soru: 10, d: 10, y: 0, b: 0 },
  ],
};
const KARNE_S2: KarneGirdisi = {
  ad: "ÖĞRENCİ İK", sinifNo: "9/A - 40", puan: 300.5, toplam: { soru: 120, d: 75, y: 16, b: 29 },
  sol: [
    { ad: "TÜRK DİLİ", soru: 30, d: 20, y: 5, b: 5 }, { ad: "TARİH", soru: 10, d: 6, y: 1, b: 3 },
    { ad: "COĞRAFYA", soru: 10, d: 6, y: 2, b: 2 }, { ad: "FELSEFE", soru: 5, d: 3, y: 1, b: 1 }, { ad: "DİN KÜLTÜR", soru: 5, d: 3, y: 0, b: 2 },
  ],
  sag: [
    { ad: "MATEMATİK", soru: 30, d: 15, y: 5, b: 10 }, { ad: "FİZİK", soru: 10, d: 8, y: 1, b: 1 },
    { ad: "KİMYA", soru: 10, d: 7, y: 0, b: 3 }, { ad: "BİYOLOJİ", soru: 10, d: 7, y: 1, b: 2 },
  ],
};
const KARNE_YABANCI: KarneGirdisi = { ...KARNE_S2, ad: "BAŞKA KİŞİ", sinifNo: "9/D - 99", puan: 111.111, toplam: { soru: 120, d: 60, y: 10, b: 50 } };

describe("sonucBelgeleriniCoz", () => {
  test("ilk sayfayı okur, ders adını bloğun ALTINDAN eşler, ikinci sayfayı atlar", () => {
    const r = sonucBelgeleriniCoz([karneSayfasi(KARNE_S1), ikinciSayfa(), karneSayfasi(KARNE_S2), ikinciSayfa()]);
    expect(r.okunamayanSayfalar).toEqual([]);
    expect(r.belgeler).toHaveLength(2);
    const b = r.belgeler[0];
    expect(b.dersHatasi).toBeNull();
    expect(b.sinavAdi).toBe("10.SINIF TG DENEME-1");
    expect(b.puan).toBe(462.5);
    expect(b.toplam).toMatchObject({ soru: 120, dogru: 111, yanlis: 9, bos: 0 });
    expect(b.sinif).toBe("9-B");
    expect(b.ogrenciNo).toBeNull(); // "9/B -" numara yok
    expect(b.dersler.map((d) => [d.ders, d.dogru, d.yanlis])).toEqual([
      ["Türkçe", 26, 4], ["Tarih", 9, 1], ["Coğrafya", 9, 1], ["Felsefe", 5, 0], ["Din Kültürü", 5, 0],
      ["Matematik", 27, 3], ["Fizik", 10, 0], ["Kimya", 10, 0], ["Biyoloji", 10, 0],
    ]);
    expect(r.belgeler[1].ogrenciNo).toBe(40);
  });

  test("ders toplamları karne toplamıyla tutmuyorsa granüler veri KULLANILMAZ", () => {
    const bozuk = { ...KARNE_S1, toplam: { ...KARNE_S1.toplam, d: 110, y: 10 } };
    const r = sonucBelgeleriniCoz([karneSayfasi(bozuk)]);
    expect(r.belgeler[0].dersler).toEqual([]);
    expect(r.belgeler[0].dersHatasi).toMatch(/tutmuyor/);
  });

  test("bilinmeyen ders adı granüler veriyi reddeder", () => {
    const yabanci = { ...KARNE_S1, sol: [{ ...KARNE_S1.sol[0], ad: "ASTRONOMİ" }, ...KARNE_S1.sol.slice(1)] };
    const r = sonucBelgeleriniCoz([karneSayfasi(yabanci)]);
    expect(r.belgeler[0].dersler).toEqual([]);
    expect(r.belgeler[0].dersHatasi).toMatch(/bilinmeyen ders/);
  });
});

describe("tgSonuclariniBirlestir", () => {
  const liste = () => kurumListesiniCoz([listeSayfasi([S1, S2, S3])]);
  const belgeler = () => sonucBelgeleriniCoz([karneSayfasi(KARNE_S1), karneSayfasi(KARNE_S2), karneSayfasi(KARNE_YABANCI)]).belgeler;

  test("karneyle toplam D/Y/puan üçlüsü tutan öğrenci granüler, kalanı birleşik dersle gelir", () => {
    const h = tgSonuclariniBirlestir(liste(), belgeler());
    expect(h.basarili).toBe(true);
    expect(h.ozet).toMatchObject({ toplam: 3, granuler: 2, birlesik: 1, karneSayisi: 3 });
    const [a, b, c] = h.ogrenciler;
    expect([a.granuler, b.granuler, c.granuler]).toEqual([true, true, false]);
    // Dokuz ders: Türkçe, Tarih, Coğrafya, Felsefe, Din Kültürü, Matematik, Fizik, Kimya, Biyoloji.
    expect(a.ders_sonuclari.map((d) => d.ders)).toEqual([
      "Türkçe", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü", "Matematik", "Fizik", "Kimya", "Biyoloji",
    ]);
  });

  test("granüler dersler toplamı listenin toplamıyla birebir aynıdır (çapraz doğrulama)", () => {
    const h = tgSonuclariniBirlestir(liste(), belgeler());
    for (const o of h.ogrenciler.filter((x) => x.granuler)) {
      const l = liste().ogrenciler.find((x) => x.ogrenciNo === o.ogrenci_no)!;
      expect(o.ders_sonuclari.reduce((t, d) => t + d.dogru, 0)).toBe(l.toplam.dogru);
      expect(o.ders_sonuclari.reduce((t, d) => t + d.yanlis, 0)).toBe(l.toplam.yanlis);
    }
  });

  test("karnesi olmayan öğrenci atılmaz: dört birleşik ders ve sınıf bilgisiyle kalır", () => {
    const h = tgSonuclariniBirlestir(liste(), belgeler());
    const c = h.ogrenciler[2];
    expect(c.granuler).toBe(false);
    expect(c.ders_sonuclari.map((d) => d.ders)).toEqual(["TYT Türkçe", "TYT Sosyal", "TYT Matematik", "TYT Fen"]);
    expect(c.sinif).toBe("");
    expect(h.ozet.karneNotlari["karne bulunamadı"]).toBe(1);
  });

  test("hiç karne verilmezse herkes birleşik derslerle kaydedilir", () => {
    const h = tgSonuclariniBirlestir(liste(), []);
    expect(h.ozet).toMatchObject({ toplam: 3, granuler: 0, birlesik: 3, karneSayisi: 0 });
    expect(h.ogrenciler.every((o) => o.ders_sonuclari.length === 4)).toBe(true);
  });

  test("liste okunamazsa hata taşır", () => {
    const h = tgSonuclariniBirlestir(kurumListesiniCoz([[oge("başka belge", 10, 10)]]), []);
    expect(h.basarili).toBe(false);
    expect(h.hata).toBeTruthy();
  });
});

describe("karneleriListeyeEsle — belirsizlik", () => {
  const liste = () => kurumListesiniCoz([listeSayfasi([
    { ...S1, no: 1, ad: "AHMET YILMAZ" },
    { ...S1, sira: 2, no: 2, ad: "MEHMET KAYA", sinif: "9 / C" },
  ])]).ogrenciler;
  const belge = (ad: string, ogrenciNo: number | null): SonucBelgesi => ({
    sayfa: 1, sinavAdi: null, adHam: ad, sinif: "", ogrenciNo,
    toplam: { soru: 120, dogru: 111, yanlis: 9, bos: 0, net: 108.75 }, puan: 462.5,
    dersler: [{ ders: "Türkçe", soru: 120, dogru: 111, yanlis: 9, bos: 0, net: 108.75 }], dersHatasi: null,
  });

  test("aynı toplam/puana sahip iki öğrenci numarayla ayrılır", () => {
    const e = karneleriListeyeEsle(liste(), [belge("MEHMET K", 2), belge("AHMET Y", 1)]);
    expect(e.map((x) => x.belge?.ogrenciNo)).toEqual([1, 2]);
  });

  test("numara yoksa kesilmiş ad ile ayrılır", () => {
    const e = karneleriListeyeEsle(liste(), [belge("MEHMET", null), belge("AHMET", null)]);
    expect(e.map((x) => x.belge?.adHam)).toEqual(["AHMET", "MEHMET"]);
  });

  test("ayrılamıyorsa yanlış öğrenciye yazılmaz (maskeli ad, numara yok)", () => {
    const e = karneleriListeyeEsle(liste(), [belge("****** ****", null), belge("****** ***", null)]);
    expect(e.every((x) => x.granuler === null)).toBe(true);
    expect(e[0].not).toMatch(/ayrılamadı/);
  });

  test("aynı karne iki öğrenciye gitmez", () => {
    const e = karneleriListeyeEsle(liste(), [belge("AHMET", 1)]);
    expect(e.filter((x) => x.granuler !== null)).toHaveLength(1);
  });
});
