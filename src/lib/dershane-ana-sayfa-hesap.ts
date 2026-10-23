import { denemeNetKademesi, netHesapla } from "./types";
import { tarihEkle } from "./tarih";
import { kademeBul } from "./kademe";
import { kapsamKarari } from "./kapsam";

// Dershane / okul müdürü "Ana Sayfa" haftalık serilerinin SAF hesabı
// (veritabanı yok; dershane-ana-sayfa.ts veriyi çekip buraya verir).
//
// İKİ DOĞRULUK KURALI (kullanıcı onayı 20.10.2026 denetimi):
//  1) Net serileri DENEME TÜRÜNE göre ayrı üretilir. TYT (120 soru) ile AYT
//     (alanına göre 80 soru) aynı ortalamaya girerse karma bir sayı çıkar ve
//     kurumun "gerçekten" ne yaptığını söylemez. Karma ortalama ÜRETİLMEZ.
//     Branş denemesi tek dersliktir, LGS ortaokul kapsamıdır — ikisi de lise
//     net serisine GİRMEZ.
//  2) Bir haftanın ortalaması, o hafta deneme giren öğrenci sayısı kapsam
//     eşiğinin (kapsam.ts) altındaysa serilere HİÇ yazılmaz (netOrtalama
//     null). Ham değer çizgiye sızarsa 40 öğrencinin 3'ünden gelen sayı
//     normal bir eğilim noktası gibi okunur.

export const HAFTA_SAYISI = 8;
export const HAFTA_GUN = 7;

export type NetTuru = "TYT" | "AYT";
export const NET_TURLERI: readonly NetTuru[] = ["TYT", "AYT"];

export interface HaftalikNokta {
  haftaBaslangic: string; // YYYY-MM-DD, o 7 günlük pencerenin ilk günü
  haftaBitis: string; // pencerenin son günü
  /** Kapsam yetersizse (ya da deneme yoksa) null — HAM DEĞER SIZMAZ. */
  netOrtalama: number | null;
  denemeSayisi: number;
  /** Ortalamanın KAÇ ÖĞRENCİDEN geldiği (kayıt değil, ayrı öğrenci). */
  denemeOgrenci: number;
  /** Kapsamın PAYDASI: bu kapsamdaki (kurum/kademe/sınıf) öğrenci sayısı. */
  ogrenciSayisi: number;
  /** Kapsam eşiği geçildi mi (netOrtalama'nın dolu olma koşulu, deneme varsa). */
  kapsamYeterli: boolean;
}

export interface SoruNoktasi {
  haftaBaslangic: string;
  haftaBitis: string;
  soruSayisi: number; // dogru+yanlis toplamı — analiz.ts'teki buHaftaSoru ile AYNI formül
  soruOgrenci: number;
}

export interface NetSerileri {
  genel: HaftalikNokta[];
  kademeler: { seviye: string; ogrenciSayisi: number; noktalar: HaftalikNokta[] }[];
  siniflar: { id: string; ad: string; ogrenciSayisi: number; noktalar: HaftalikNokta[] }[];
  /** Bu türden pencerede girilen toplam deneme KAYDI. */
  denemeKaydi: number;
  /** Bu türden pencerede en az bir deneme giren AYRI öğrenci. */
  denemeOgrenci: number;
}

export interface SoruSerileri {
  genel: SoruNoktasi[];
  kademeler: { seviye: string; ogrenciSayisi: number; noktalar: SoruNoktasi[] }[];
}

export interface DershaneAnaSayfaVerisi {
  ogrenciSayisi: number;
  /** TYT ve AYT AYRI seriler — karma ortalama yok. */
  turler: Record<NetTuru, NetSerileri>;
  /** Grafikte hangi tür açılsın: o pencerede daha çok öğrencinin girdiği, eşitse TYT. */
  varsayilanTur: NetTuru;
  /** Net serisine girmeyen (branş) denemelerin sayısı — sessizce düşmesin. */
  digerDenemeKaydi: number;
  // Soru serileri tür bağımsızdır (soru_cozumleri).
  soru: SoruSerileri;
  // Pencerenin ilk ve son günü (grafik altı "tarih aralığı" için).
  tarihAraligi: { baslangic: string; bitis: string };
}

export interface OgrenciGirdisi {
  id: string;
  seviye: string | null;
  sinifId: string | null;
  sinifAd: string | null;
}
export interface DenemeGirdisi {
  studentId: string;
  tarih: string;
  tur: string;
  dersler: { dogru: number; yanlis: number }[];
}
export interface SoruGirdisi { studentId: string; tarih: string; dogru: number; yanlis: number }

function gunFarkiHesapla(bugun: string, tarih: string): number {
  const a = new Date(`${bugun}T12:00:00Z`).getTime();
  const b = new Date(`${tarih}T12:00:00Z`).getTime();
  return Math.round((a - b) / (1000 * 3600 * 24));
}

// bucketIndex 0 = en yeni (son 7 gün), HAFTA_SAYISI-1 = en eski.
export function bucketIndexHesapla(bugun: string, tarih: string): number | null {
  const fark = gunFarkiHesapla(bugun, tarih);
  if (fark < 0) return null; // gelecekteki bir tarih (saat dilimi kayması vb.) — yok say
  const idx = Math.floor(fark / HAFTA_GUN);
  return idx < HAFTA_SAYISI ? idx : null;
}

function haftaBaslangicOf(bugun: string, idx: number): string {
  return tarihEkle(bugun, -(idx * HAFTA_GUN + (HAFTA_GUN - 1)));
}

interface NetBiriken { netToplam: number; denemeSayisi: number; ogrenciler: Set<string> }
interface SoruBiriken { soruSayisi: number; ogrenciler: Set<string> }

function netNoktalari(bugun: string, kova: Map<number, NetBiriken>, ogrenciSayisi: number): HaftalikNokta[] {
  const noktalar: HaftalikNokta[] = [];
  for (let idx = HAFTA_SAYISI - 1; idx >= 0; idx--) {
    const haftaBaslangic = haftaBaslangicOf(bugun, idx);
    const b = kova.get(idx);
    const denemeOgrenci = b?.ogrenciler.size ?? 0;
    const karar = kapsamKarari(denemeOgrenci, ogrenciSayisi);
    const denemeVar = !!b && b.denemeSayisi > 0;
    noktalar.push({
      haftaBaslangic,
      haftaBitis: tarihEkle(haftaBaslangic, HAFTA_GUN - 1),
      netOrtalama: denemeVar && karar.yeterli ? Math.round((b!.netToplam / b!.denemeSayisi) * 100) / 100 : null,
      denemeSayisi: b?.denemeSayisi ?? 0,
      denemeOgrenci,
      ogrenciSayisi,
      kapsamYeterli: denemeVar && karar.yeterli,
    });
  }
  return noktalar;
}

function soruNoktalari(bugun: string, kova: Map<number, SoruBiriken>): SoruNoktasi[] {
  const noktalar: SoruNoktasi[] = [];
  for (let idx = HAFTA_SAYISI - 1; idx >= 0; idx--) {
    const haftaBaslangic = haftaBaslangicOf(bugun, idx);
    const b = kova.get(idx);
    noktalar.push({
      haftaBaslangic,
      haftaBitis: tarihEkle(haftaBaslangic, HAFTA_GUN - 1),
      soruSayisi: b?.soruSayisi ?? 0,
      soruOgrenci: b?.ogrenciler.size ?? 0,
    });
  }
  return noktalar;
}

/** Bir denemenin toplam neti — netin KADEMESİ deneme türünden gelir (TYT/AYT → lise). */
export function denemeToplamNeti(dersler: { dogru: number; yanlis: number }[], tur: string): number {
  const kademe = denemeNetKademesi(tur);
  return dersler.reduce((t, s) => t + netHesapla(s.dogru, s.yanlis, kademe), 0);
}

export function anaSayfaSerileriHesapla(
  bugun: string,
  tumOgrenciler: OgrenciGirdisi[],
  denemeler: DenemeGirdisi[],
  sorular: SoruGirdisi[],
): DershaneAnaSayfaVerisi {
  // Ortaokul/ilkokul öğrencileri lise özetine girmez: farklı net formülü ve
  // ayrı bir panelleri var (ortaokul-kurum-ozeti). Kademesi bilinmeyen (null)
  // öğrenci eskisi gibi sayılır.
  const ogrenciler = tumOgrenciler.filter((o) => {
    const k = kademeBul(o.seviye);
    return k !== "ortaokul" && k !== "ilkokul";
  });
  const izinli = new Set(ogrenciler.map((o) => o.id));
  const seviyeOf = new Map<string, string>();
  const sinifOf = new Map<string, { id: string; ad: string }>();
  for (const o of ogrenciler) {
    if (o.seviye) seviyeOf.set(o.id, o.seviye);
    if (o.sinifId && o.sinifAd) sinifOf.set(o.id, { id: o.sinifId, ad: o.sinifAd });
  }
  const gorulenSeviyeler = [...new Set(seviyeOf.values())].sort();
  const gorulenSiniflar = [...new Map([...sinifOf.values()].map((x) => [x.id, x])).values()]
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr", { numeric: true }));
  const seviyeSayisi = (s: string) => [...seviyeOf.values()].filter((v) => v === s).length;
  const sinifSayisi = (id: string) => [...sinifOf.values()].filter((v) => v.id === id).length;

  // — NET: tür başına ayrı kovalar —
  type Kovalar = { genel: Map<number, NetBiriken>; seviye: Map<string, Map<number, NetBiriken>>; sinif: Map<string, Map<number, NetBiriken>> };
  const kovalar: Record<NetTuru, Kovalar> = {
    TYT: { genel: new Map(), seviye: new Map(), sinif: new Map() },
    AYT: { genel: new Map(), seviye: new Map(), sinif: new Map() },
  };
  const turKaydi: Record<NetTuru, number> = { TYT: 0, AYT: 0 };
  const turOgrencileri: Record<NetTuru, Set<string>> = { TYT: new Set(), AYT: new Set() };
  let digerDenemeKaydi = 0;

  const ekle = (m: Map<number, NetBiriken>, idx: number, net: number, studentId: string) => {
    const b = m.get(idx) ?? { netToplam: 0, denemeSayisi: 0, ogrenciler: new Set<string>() };
    b.netToplam += net; b.denemeSayisi += 1; b.ogrenciler.add(studentId);
    m.set(idx, b);
  };
  const altKova = (h: Map<string, Map<number, NetBiriken>>, anahtar: string) => {
    let m = h.get(anahtar);
    if (!m) { m = new Map(); h.set(anahtar, m); }
    return m;
  };

  for (const d of denemeler) {
    if (!izinli.has(d.studentId)) continue;
    const idx = bucketIndexHesapla(bugun, d.tarih);
    if (idx === null) continue;
    // Ders sonucu girilmemiş deneme 0 net sayılmaz (uydurma sıfır ortalamayı çeker).
    if (d.dersler.length === 0) continue;
    if (d.tur === "LGS") continue; // ortaokul kapsamı — lise özetine girmez, "diğer" de sayılmaz
    if (d.tur !== "TYT" && d.tur !== "AYT") { digerDenemeKaydi += 1; continue; }
    const tur: NetTuru = d.tur;
    const net = denemeToplamNeti(d.dersler, tur);
    const k = kovalar[tur];
    ekle(k.genel, idx, net, d.studentId);
    const sv = seviyeOf.get(d.studentId);
    if (sv) ekle(altKova(k.seviye, sv), idx, net, d.studentId);
    const sn = sinifOf.get(d.studentId);
    if (sn) ekle(altKova(k.sinif, sn.id), idx, net, d.studentId);
    turKaydi[tur] += 1;
    turOgrencileri[tur].add(d.studentId);
  }

  const turSerisi = (tur: NetTuru): NetSerileri => {
    const k = kovalar[tur];
    return {
      genel: netNoktalari(bugun, k.genel, ogrenciler.length),
      kademeler: gorulenSeviyeler.map((seviye) => ({
        seviye,
        ogrenciSayisi: seviyeSayisi(seviye),
        noktalar: netNoktalari(bugun, k.seviye.get(seviye) ?? new Map(), seviyeSayisi(seviye)),
      })),
      siniflar: gorulenSiniflar.map((s) => ({
        id: s.id, ad: s.ad, ogrenciSayisi: sinifSayisi(s.id),
        noktalar: netNoktalari(bugun, k.sinif.get(s.id) ?? new Map(), sinifSayisi(s.id)),
      })),
      denemeKaydi: turKaydi[tur],
      denemeOgrenci: turOgrencileri[tur].size,
    };
  };

  // — SORU: tür bağımsız —
  const soruGenel = new Map<number, SoruBiriken>();
  const soruSeviye = new Map<string, Map<number, SoruBiriken>>();
  const soruEkle = (m: Map<number, SoruBiriken>, idx: number, soru: number, studentId: string) => {
    const b = m.get(idx) ?? { soruSayisi: 0, ogrenciler: new Set<string>() };
    b.soruSayisi += soru;
    if (soru > 0) b.ogrenciler.add(studentId);
    m.set(idx, b);
  };
  for (const s of sorular) {
    if (!izinli.has(s.studentId)) continue;
    const idx = bucketIndexHesapla(bugun, s.tarih);
    if (idx === null) continue;
    const soru = s.dogru + s.yanlis;
    soruEkle(soruGenel, idx, soru, s.studentId);
    const sv = seviyeOf.get(s.studentId);
    if (sv) {
      let m = soruSeviye.get(sv);
      if (!m) { m = new Map(); soruSeviye.set(sv, m); }
      soruEkle(m, idx, soru, s.studentId);
    }
  }

  const tyt = turSerisi("TYT");
  const ayt = turSerisi("AYT");
  const ilkHafta = haftaBaslangicOf(bugun, HAFTA_SAYISI - 1);

  return {
    ogrenciSayisi: ogrenciler.length,
    turler: { TYT: tyt, AYT: ayt },
    varsayilanTur: ayt.denemeOgrenci > tyt.denemeOgrenci ? "AYT" : "TYT",
    digerDenemeKaydi,
    soru: {
      genel: soruNoktalari(bugun, soruGenel),
      kademeler: gorulenSeviyeler.map((seviye) => ({
        seviye, ogrenciSayisi: seviyeSayisi(seviye),
        noktalar: soruNoktalari(bugun, soruSeviye.get(seviye) ?? new Map()),
      })),
    },
    tarihAraligi: { baslangic: ilkHafta, bitis: bugun },
  };
}

/**
 * Bir hafta noktasının tooltip/altyazı metni: sayı HER ZAMAN kendi payıyla
 * (n/toplam) gelir; kapsamı yetersiz hafta net DEĞİL gerekçesini taşır.
 */
export function noktaMetni(n: HaftalikNokta): string {
  if (n.denemeSayisi === 0) return "Bu haftada deneme yok";
  if (!n.kapsamYeterli || n.netOrtalama === null) return `Ortalama gösterilmiyor — ${kapsamUyarisiKisa(n)}`;
  return `${n.netOrtalama} net · ${n.denemeOgrenci}/${n.ogrenciSayisi} öğrenci`;
}

function kapsamUyarisiKisa(n: HaftalikNokta): string {
  return `${n.ogrenciSayisi} öğrenciden yalnızca ${n.denemeOgrenci} tanesi deneme girmiş`;
}
