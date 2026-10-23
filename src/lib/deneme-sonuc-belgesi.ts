// "ÖĞRENCİ SINAV SONUÇ BELGESİ" (kişisel karne) çözümleyicisi — kullanıcı isteği
// 23.10.2026 (Elbistan Fen Lisesi "TG DENEME" karneleri). SAF modül; PDF'ten
// metin çıkarma deneme-pdf-ayristirici.ts'te (pdfSayfaOgeleri).
//
// Bu karne, mevcut karne okuyucusunun ("Ders / Test" tablosu) biçiminden
// FARKLI: her öğrencinin ilk sayfasında toplam (soru/D/Y/B/Net) ve PUAN, onun
// altında iki sütun halinde dokuz dersin "Soru Sayısı / Doğru / Yanlış / Boş /
// Net" blokları var; ders adı BLOĞUN ALTINDA yazılıyor. İkinci sayfa grafik +
// kazanım dökümü (bu çözümleyici kazanımı okumaz).
//
// Karne ADI KESİLMİŞ ya da maskeli gelebiliyor ("MERVE İKRA", "****A* *****",
// "0/0 - 180" gibi sınıf/no satırı, bazen no boş). Bu yüzden karne, listedeki
// öğrenciyle AD'a değil (toplam D, toplam Y, puan) üçlüsüne göre eşlenir; ad
// ve numara yalnızca aynı üçlüyü paylaşan iki öğrenciyi ayırmak için kullanılır.
// Eşleşme belirsizse eşleştirilmez (yanlış öğrenciye yazmaktansa birleşik 4
// dersle kalmak tercih edildi).

import type { GenisMetin } from "@/lib/deneme-sinif-listesi";
import type { KurumListesiOgrencisi } from "@/lib/deneme-kurum-liste";

export interface SonucBelgesiDersi { ders: string; soru: number; dogru: number; yanlis: number; bos: number; net: number }

export interface SonucBelgesi {
  sayfa: number;
  sinavAdi: string | null;
  /** Karnedeki ad: kesilmiş ya da maskeli ("*") olabilir. */
  adHam: string;
  sinif: string;
  ogrenciNo: number | null;
  toplam: { soru: number; dogru: number; yanlis: number; bos: number; net: number };
  puan: number;
  /** Granüler dokuz ders; doğrulanamadıysa boş ve neden `dersHatasi`'nda. */
  dersler: SonucBelgesiDersi[];
  dersHatasi: string | null;
}

export interface SonucBelgesiSonucu {
  belgeler: SonucBelgesi[];
  /** İlk sayfası tanınan ama okunamayan karne sayfaları. */
  okunamayanSayfalar: { sayfa: number; neden: string }[];
}

const KARNE_DERSLERI: { desen: RegExp; ders: string }[] = [
  { desen: /^T[ÜU]RK\s*D[İI]L[İI]/i, ders: "Türkçe" },
  { desen: /^T[ÜU]RK[ÇC]E$/i, ders: "Türkçe" },
  { desen: /^MATEMAT[İI]K/i, ders: "Matematik" },
  { desen: /^GEOMETR[İI]/i, ders: "Matematik" },
  { desen: /^F[İI]Z[İI]K/i, ders: "Fizik" },
  { desen: /^K[İI]MYA/i, ders: "Kimya" },
  { desen: /^B[İI]YOLOJ[İI]/i, ders: "Biyoloji" },
  { desen: /^TAR[İI]H/i, ders: "Tarih" },
  { desen: /^CO[ĞG]RAFYA/i, ders: "Coğrafya" },
  { desen: /^FELSEFE/i, ders: "Felsefe" },
  { desen: /^D[İI]N\s*K[ÜU]LT[ÜU]R/i, ders: "Din Kültürü" },
];

const SAYI = /^-?\d+(?:[.,]\d+)?$/;
const sayiOku = (t: string): number | null => (SAYI.test(t.trim()) ? Number(t.trim().replace(",", ".")) : null);
const merkez = (o: GenisMetin) => o.x + o.w / 2;
const yuvarla2 = (n: number) => Math.round(n * 100) / 100;
const NET_TOLERANSI = 0.011;
const SUTUN_TOLERANSI = 14;

interface Satir { y: number; ogeler: GenisMetin[] }
function satirlaraGrupla(ogeler: GenisMetin[], tolerans = 2): Satir[] {
  const satirlar: Satir[] = [];
  for (const o of ogeler) {
    if (!o.str.trim()) continue;
    const s = satirlar.find((r) => Math.abs(r.y - o.y) <= tolerans);
    if (s) s.ogeler.push(o); else satirlar.push({ y: o.y, ogeler: [o] });
  }
  for (const s of satirlar) s.ogeler.sort((a, b) => a.x - b.x);
  return satirlar.sort((a, b) => b.y - a.y);
}

function enYakin(sayilar: { m: number; v: number }[], hedef: number): number | null {
  let en: { m: number; v: number } | null = null;
  for (const s of sayilar) {
    const fark = Math.abs(s.m - hedef);
    if (fark <= SUTUN_TOLERANSI && (en === null || fark < Math.abs(en.m - hedef))) en = s;
  }
  return en ? en.v : null;
}

/** Karnenin ilk sayfası mı: "SORU SAYISI / DOĞRU / YANLIŞ / BOŞ / NET" başlığı + "SONUÇ BELGESİ". */
function ilkSayfaMi(satirlar: Satir[]): boolean {
  const metin = satirlar.map((s) => s.ogeler.map((o) => o.str).join(" ")).join(" ").replace(/\s+/g, " ");
  return /SONUÇ\s+BELGES[İI]/i.test(metin) && /SORU\s+SAYISI/.test(metin) && /DOĞRU/.test(metin) && /BOŞ/.test(metin);
}

function blokluDersleriOku(satirlar: Satir[], altSinirY: number): { dersler: SonucBelgesiDersi[]; hata: string | null } {
  // Sütun: sol (x<300) / sağ (x>=300). Her sütunda yukarıdan aşağıya
  // "değer satırları" (5 sayı) ve "ders adları" ayrı toplanıp sırayla eşlenir:
  // ders adı bloğun ALTINDA olduğu için i. değer satırı i. ders adıdır.
  const sutunlar = [{ ad: "sol", min: 0, max: 300 }, { ad: "sağ", min: 300, max: 1000 }];
  const dersler: SonucBelgesiDersi[] = [];
  for (const sut of sutunlar) {
    const degerler: { y: number; v: number[] }[] = [];
    const adlar: { y: number; ders: string | null; ham: string }[] = [];
    for (const s of satirlar) {
      if (s.y > altSinirY) continue;
      const bolge = s.ogeler.filter((o) => o.x >= sut.min && o.x < sut.max);
      const sayilar = bolge.map((o) => sayiOku(o.str)).filter((v): v is number => v !== null);
      const sayiOgeleri = bolge.filter((o) => sayiOku(o.str) !== null);
      if (sayiOgeleri.length === 5 && sayiOgeleri.length === bolge.length) {
        degerler.push({ y: s.y, v: sayilar });
        continue;
      }
      for (const o of bolge) {
        const t = o.str.trim();
        if (/^Soru|^Doğru|^Yanlış|^Boş|^Net|^Başarı|^%/.test(t) || sayiOku(t) !== null || /^[%:\d\s]+$/.test(t)) continue;
        const k = KARNE_DERSLERI.find((d) => d.desen.test(t));
        adlar.push({ y: s.y, ders: k ? k.ders : null, ham: t });
      }
    }
    degerler.sort((a, b) => b.y - a.y);
    adlar.sort((a, b) => b.y - a.y);
    if (degerler.length !== adlar.length) {
      return { dersler: [], hata: `${sut.ad} sütunda ${degerler.length} değer bloğu / ${adlar.length} ders adı` };
    }
    for (let i = 0; i < degerler.length; i++) {
      const ad = adlar[i];
      if (!ad.ders) return { dersler: [], hata: `bilinmeyen ders adı: ${ad.ham}` };
      const [soru, dogru, yanlis, bos, net] = degerler[i].v;
      if (![soru, dogru, yanlis, bos].every(Number.isInteger)) return { dersler: [], hata: `${ad.ham} değerleri tamsayı değil` };
      if (dogru + yanlis + bos !== soru) return { dersler: [], hata: `${ad.ham}: D+Y+B soru sayısına eşit değil` };
      if (Math.abs(yuvarla2(dogru - yanlis / 4) - net) > NET_TOLERANSI) return { dersler: [], hata: `${ad.ham}: net D−Y/4 ile tutmuyor` };
      dersler.push({ ders: ad.ders, soru, dogru, yanlis, bos, net });
    }
  }
  return { dersler, hata: null };
}

function belgeCoz(sayfaNo: number, satirlar: Satir[]): SonucBelgesi | string {
  const baslik = satirlar.find((s) => s.ogeler.some((o) => /^SORU\s+SAYISI$/.test(o.str.trim())));
  if (!baslik) return "toplam başlığı yok";
  const sutun = (re: RegExp) => {
    const o = baslik.ogeler.find((x) => re.test(x.str.trim()));
    return o ? merkez(o) : null;
  };
  const cSoru = sutun(/^SORU\s+SAYISI$/), cD = sutun(/^DOĞRU$/), cY = sutun(/^YANLI[ŞS]$/), cB = sutun(/^BO[ŞS]$/), cN = sutun(/^NET$/);
  if ([cSoru, cD, cY, cB, cN].some((c) => c === null)) return "toplam sütun başlıkları eksik";

  // Toplam satırı: başlığın hemen altındaki satır (ad + 5 sayı).
  const alt = satirlar.filter((s) => s.y < baslik.y && s.y > baslik.y - 40);
  const toplamSatiri = alt.find((s) => s.ogeler.filter((o) => sayiOku(o.str) !== null).length >= 5);
  if (!toplamSatiri) return "toplam satırı yok";
  const sayilar = toplamSatiri.ogeler.filter((o) => o.x >= 300).map((o) => ({ m: merkez(o), v: sayiOku(o.str) })).filter((o): o is { m: number; v: number } => o.v !== null);
  const soru = enYakin(sayilar, cSoru!), dogru = enYakin(sayilar, cD!), yanlis = enYakin(sayilar, cY!), bos = enYakin(sayilar, cB!), net = enYakin(sayilar, cN!);
  if ([soru, dogru, yanlis, bos, net].some((v) => v === null)) return "toplam değerleri eksik";
  const adOgesi = toplamSatiri.ogeler.find((o) => o.x < 300);
  const adHam = adOgesi ? adOgesi.str.replace(/\s+/g, " ").trim() : "";

  // Sınıf/no satırı: ad satırının altındaki "10/D - 490" biçimli satır.
  let sinif = "";
  let ogrenciNo: number | null = null;
  for (const s of alt) {
    const o = s.ogeler.find((x) => x.x < 300 && /^\d{1,2}\s*\/\s*\S+\s*-/.test(x.str.trim()));
    if (!o) continue;
    const m = /^(\d{1,2})\s*\/\s*([A-ZÇĞİÖŞÜ0-9]+)\s*-\s*(\d+)?\s*$/.exec(o.str.trim());
    if (m) {
      sinif = m[1] === "0" || m[2] === "0" ? "" : `${m[1]}-${m[2]}`;
      ogrenciNo = m[3] ? Number(m[3]) : null;
    }
    break;
  }

  const sinavAdi = satirlar.flatMap((s) => s.ogeler).find((o) => o.x > 400 && /TG\s*DENEME|DENEME|SINAV/i.test(o.str) && !/SONUÇ|ÖĞRENC/i.test(o.str))?.str.trim() ?? null;

  const puanBaslik = satirlar.find((s) => s.ogeler.some((o) => /^PUAN$/.test(o.str.trim())));
  const puanSatiri = puanBaslik ? satirlar.find((s) => s.y < puanBaslik.y && s.y > puanBaslik.y - 40 && s.ogeler.some((o) => sayiOku(o.str) !== null)) : undefined;
  const puan = puanSatiri ? puanSatiri.ogeler.map((o) => sayiOku(o.str)).find((v): v is number => v !== null) : undefined;
  if (puan === undefined) return "puan okunamadı";

  // Ders blokları, ilk "Soru Sayısı | Doğru | Yanlış…" başlık satırından başlar
  // (üstündeki ŞUBE/KURUM/ORTALAMA tablosu bloklara karışmasın).
  const blokBasligi = satirlar.find((s) => s.ogeler.some((o) => /^Soru Sayısı$/.test(o.str.trim())));
  const altSinirY = blokBasligi ? blokBasligi.y + 2 : (puanBaslik ?? baslik).y - 100;
  const { dersler, hata } = blokluDersleriOku(satirlar, altSinirY);

  let dersHatasi = hata;
  if (!dersHatasi) {
    const sD = dersler.reduce((t, d) => t + d.dogru, 0), sY = dersler.reduce((t, d) => t + d.yanlis, 0), sS = dersler.reduce((t, d) => t + d.soru, 0);
    if (sD !== dogru || sY !== yanlis || sS !== soru) dersHatasi = `ders toplamları (${sS}/${sD}/${sY}) karne toplamıyla (${soru}/${dogru}/${yanlis}) tutmuyor`;
  }
  return {
    sayfa: sayfaNo, sinavAdi, adHam, sinif, ogrenciNo,
    toplam: { soru: soru!, dogru: dogru!, yanlis: yanlis!, bos: bos!, net: net! },
    puan,
    dersler: dersHatasi ? [] : dersler,
    dersHatasi,
  };
}

/** Sayfalar: her sayfa bir GenisMetin dizisi. Karne olmayan sayfalar sessizce atlanır. */
export function sonucBelgeleriniCoz(sayfalar: GenisMetin[][]): SonucBelgesiSonucu {
  const belgeler: SonucBelgesi[] = [];
  const okunamayanSayfalar: SonucBelgesiSonucu["okunamayanSayfalar"] = [];
  sayfalar.forEach((oge, i) => {
    const satirlar = satirlaraGrupla(oge);
    if (!ilkSayfaMi(satirlar)) return;
    const sonuc = belgeCoz(i + 1, satirlar);
    if (typeof sonuc === "string") okunamayanSayfalar.push({ sayfa: i + 1, neden: sonuc });
    else belgeler.push(sonuc);
  });
  return { belgeler, okunamayanSayfalar };
}

// ——— Karneyi listedeki öğrenciyle eşleme ———

const TR_HARF: Record<string, string> = { "İ": "I", "I": "I", "ı": "I", "i": "I", "Ş": "S", "ş": "S", "Ğ": "G", "ğ": "G", "Ü": "U", "ü": "U", "Ö": "O", "ö": "O", "Ç": "C", "ç": "C" };
function adSadelestir(ad: string): string {
  return ad.replace(/./g, (c) => TR_HARF[c] ?? c).toLocaleUpperCase("en-US").replace(/[^A-Z*]/g, "");
}

/** Karne adı kesilmiş ya da maskeli olabilir: maskeliyse ad karşılaştırılmaz. */
function adUyumlu(listeAdi: string, karneAdi: string): boolean | null {
  const k = adSadelestir(karneAdi);
  if (k === "" || k.includes("*")) return null; // bilgi yok
  const l = adSadelestir(listeAdi);
  return l.startsWith(k) || k.startsWith(l);
}

export interface EslesmisOgrenci {
  ogrenci: KurumListesiOgrencisi;
  /** Karneyle ÇAPRAZ DOĞRULANMIŞ granüler dersler; yoksa null (birleşik 4 ders kalır). */
  granuler: { ders: string; dogru: number; yanlis: number }[] | null;
  belge: SonucBelgesi | null;
  /** Belirsiz/yok neden — raporlama için. */
  not: string | null;
}

const ayniSayi = (a: number, b: number) => Math.abs(a - b) < 0.0015;

/**
 * Her liste öğrencisine (toplam D, toplam Y, puan) üçlüsü aynı olan karneyi bulur.
 * Bir karne yalnız BİR öğrenciye gider; aynı üçlüyü paylaşan birden çok
 * aday varsa önce numara, sonra ad ile ayrılır; ayrılamazsa eşleştirilmez.
 */
export function karneleriListeyeEsle(ogrenciler: KurumListesiOgrencisi[], belgeler: SonucBelgesi[]): EslesmisOgrenci[] {
  const kullanilan = new Set<SonucBelgesi>();
  return ogrenciler.map((ogrenci) => {
    const adaylar = belgeler.filter((b) =>
      !kullanilan.has(b) && b.toplam.dogru === ogrenci.toplam.dogru && b.toplam.yanlis === ogrenci.toplam.yanlis && ayniSayi(b.puan, ogrenci.puan));
    if (adaylar.length === 0) return { ogrenci, granuler: null, belge: null, not: "karne bulunamadı" };

    let secilen: SonucBelgesi | null = null;
    if (adaylar.length === 1) {
      secilen = adaylar[0];
      // Tek aday ama numara AÇIKÇA farklıysa (ikisi de dolu) güvenme.
      if (secilen.ogrenciNo !== null && ogrenci.ogrenciNo !== secilen.ogrenciNo) return { ogrenci, granuler: null, belge: null, not: "karne numarası listeyle çelişiyor" };
    } else {
      const numarali = adaylar.filter((b) => b.ogrenciNo === ogrenci.ogrenciNo);
      const adli = (liste: SonucBelgesi[]) => liste.filter((b) => adUyumlu(ogrenci.isimHam, b.adHam) !== false);
      const daraltilmis = numarali.length > 0 ? numarali : adli(adaylar);
      if (daraltilmis.length === 1) secilen = daraltilmis[0];
      else return { ogrenci, granuler: null, belge: null, not: "aynı toplam/puana sahip birden çok karne — ayrılamadı" };
    }

    kullanilan.add(secilen);
    if (secilen.dersler.length === 0) return { ogrenci, granuler: null, belge: secilen, not: secilen.dersHatasi ?? "karne dersleri okunamadı" };

    // Matematik+Geometri gibi aynı adı paylaşan satırlar toplanır.
    const toplam = new Map<string, { dogru: number; yanlis: number }>();
    for (const d of secilen.dersler) {
      const m = toplam.get(d.ders) ?? { dogru: 0, yanlis: 0 };
      m.dogru += d.dogru; m.yanlis += d.yanlis;
      toplam.set(d.ders, m);
    }
    return { ogrenci, granuler: [...toplam.entries()].map(([ders, v]) => ({ ders, ...v })), belge: secilen, not: null };
  });
}
