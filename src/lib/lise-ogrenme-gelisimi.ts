// Konu Durumu'nun salt okunur öğretmen görünümü. Yeni bir hâkimiyet puanı
// üretmez; mevcut kaynakları ayrı gösterir ve öğretmenin kendi ödevlerini
// aynı öğrencinin, aynı konu ve deneme türündeki ölçümleriyle izler.
import { denemeKonusu, serbestKonuCozucu, tabanDers } from "./konu-durumu";
import type { KdAdlandirma, KdBeyanSatiri, KdDenemeSatiri, KdOgrenci, KdOturumSatiri, KdSoruSatiri } from "./konu-durumu";
import { konuAdAnahtari } from "./konu-ad-eslesmesi";
import type { GorevDurumu, HedefeYakinlik } from "./types";

export const GELISIM_TAKIP_GUNU = 30;
const MIN_CEVAP = 10;

export interface GelisimGorevi {
  id: string; studentId: string; ders: string; konu: string | null;
  tur: "konu" | "soru"; durum: GorevDurumu;
  tarih: string; sonTarih: string; atamaTarihi: string;
  hedefSoru: number | null; hedefDakika: number | null;
}

export interface GelisimOlcumu {
  tarih: string; etiket: string; tur: string; dogru: number; yanlis: number; bos: number;
}

export interface GelisimKonusu {
  ders: string; konu: string; ustKonu: string | null;
  deneme: { dogru: number; yanlis: number; bos: number; kayit: number } | null;
  soru: { dogru: number; yanlis: number } | null;
  beyan: { seviye: HedefeYakinlik; tarih: string | null } | null;
  oturum: number;
}

export interface GelisimOgrencisi {
  id: string; ad: string; sinif: string | null; classId: string | null; konular: GelisimKonusu[];
}

export interface GorevOlcumTakibi {
  tur: string;
  once: { dogru: number; yanlis: number; bos: number; kayit: number } | null;
  sonra: { dogru: number; yanlis: number; bos: number; kayit: number };
  fark: number | null;
}

export interface GelisimTakibi extends GelisimGorevi {
  ogrenciAdi: string; sinif: string | null;
  referansTarihi: string;
  gecikti: boolean;
  olcum: GorevOlcumTakibi | null;
}

export interface LiseOgrenmeGelisimi {
  bugun: string;
  ogrenciler: GelisimOgrencisi[];
  takipler: GelisimTakibi[];
  takipHatasi: boolean;
}

const bosOlcum = () => ({ dogru: 0, yanlis: 0, bos: 0, kayit: 0 });
function olcumTopla(liste: GelisimOlcumu[]) {
  return liste.reduce((t, o) => ({ dogru: t.dogru + o.dogru, yanlis: t.yanlis + o.yanlis, bos: t.bos + o.bos, kayit: t.kayit + 1 }), bosOlcum());
}

// Gün hassasiyetinde veri var: görevle aynı günkü deneme "sonra" sayılmaz.
// Deneme türleri karışmaz; iki tarafta da en az iki deneme ve 10 cevap
// yoksa yön/puan farkı üretilmez. Boşlar gösterilir, süre yorumu yapılmaz.
export function gorevOlcumunuBul(olcumler: GelisimOlcumu[], referans: string): GorevOlcumTakibi | null {
  const sonraki = olcumler.filter((o) => o.tarih > referans)
    .sort((a, b) => b.tarih.localeCompare(a.tarih) || a.tur.localeCompare(b.tur, "tr") || a.etiket.localeCompare(b.etiket, "tr"));
  if (!sonraki.length) return null;
  const tur = sonraki[0].tur;
  const sonra = olcumTopla(sonraki.filter((o) => o.tur === tur).slice(0, 2));
  const onceki = olcumler.filter((o) => o.tarih < referans && o.tur === tur)
    .sort((a, b) => b.tarih.localeCompare(a.tarih) || a.etiket.localeCompare(b.etiket, "tr")).slice(0, 2);
  const once = onceki.length ? olcumTopla(onceki) : null;
  const yeterli = once && once.kayit >= 2 && sonra.kayit >= 2
    && once.dogru + once.yanlis >= MIN_CEVAP && sonra.dogru + sonra.yanlis >= MIN_CEVAP;
  const fark = yeterli ? Math.round(100 * sonra.dogru / (sonra.dogru + sonra.yanlis))
    - Math.round(100 * once.dogru / (once.dogru + once.yanlis)) : null;
  return { tur, once, sonra, fark };
}

export function liseOgrenmeGelisimiHesapla(girdi: {
  ogrenciler: KdOgrenci[]; denemeler: KdDenemeSatiri[]; sorular: KdSoruSatiri[];
  beyanlar: KdBeyanSatiri[]; oturumlar: KdOturumSatiri[];
  adlandirma: KdAdlandirma; gorevler: GelisimGorevi[]; bugun: string; takipHatasi?: boolean;
}): LiseOgrenmeGelisimi {
  // Karma kurumda ilkokul/ortaokul raporuna yeni lise davranışı taşınmaz.
  const ogrenciler = girdi.ogrenciler.filter((o) => /^(9|10|11|12)-/.test(o.sinif ?? ""));
  const ogrenciMap = new Map(ogrenciler.map((o) => [o.id, o]));
  const gorunur = (id: string, ders: string) => {
    const o = ogrenciMap.get(id);
    return !!o && ders !== "Türkçe (Maarif)" && (o.dersler === null || o.dersler.includes(tabanDers(ders)));
  };
  const coz = serbestKonuCozucu(girdi.adlandirma);
  const ustKonular = new Map<string, string>();
  for (const h of girdi.adlandirma.hedefler) {
    const key = konuAdAnahtari(h.ders, h.konu);
    if (!ustKonular.has(key)) ustKonular.set(key, h.ustKonu);
  }
  const konular = new Map<string, Map<string, GelisimKonusu>>();
  const olcumler = new Map<string, Map<string, GelisimOlcumu>>();
  function konu(id: string, k: { ders: string; konu: string; mufredat: boolean }) {
    const key = konuAdAnahtari(k.ders, k.konu);
    const liste = konular.get(id) ?? new Map<string, GelisimKonusu>();
    let satir = liste.get(key);
    if (!satir) {
      satir = { ders: k.ders, konu: k.konu, ustKonu: k.mufredat ? ustKonular.get(key) ?? null : null,
        deneme: null, soru: null, beyan: null, oturum: 0 };
      liste.set(key, satir); konular.set(id, liste);
    }
    return satir;
  }
  for (const d of girdi.denemeler) {
    if (d.tarih > girdi.bugun) continue;
    const k = denemeKonusu(d.ders, d.kazanimMetni, girdi.adlandirma);
    if (!gorunur(d.studentId, k.ders) || (/\(Se[çc]meli\)$/.test(d.ders.trim()) && d.dogru + d.yanlis === 0)) continue;
    const satir = konu(d.studentId, k);
    const o = satir.deneme ?? bosOlcum();
    o.dogru += d.dogru; o.yanlis += d.yanlis; o.bos += Math.max(0, d.soru - d.dogru - d.yanlis);
    const key = `${d.studentId}|${konuAdAnahtari(k.ders, k.konu)}`;
    const liste = olcumler.get(key) ?? new Map<string, GelisimOlcumu>();
    const denemeId = d.denemeId ?? d.denemeAnahtari;
    const mevcut = liste.get(denemeId);
    if (!mevcut) o.kayit++;
    liste.set(denemeId, { tarih: d.tarih, etiket: d.denemeEtiketi, tur: d.denemeAnahtari.split("|")[1] ?? "Belirsiz",
      dogru: (mevcut?.dogru ?? 0) + d.dogru, yanlis: (mevcut?.yanlis ?? 0) + d.yanlis,
      bos: (mevcut?.bos ?? 0) + Math.max(0, d.soru - d.dogru - d.yanlis) });
    olcumler.set(key, liste); satir.deneme = o;
  }
  for (const s of girdi.sorular) {
    const k = coz(s.ders, s.konu);
    if (!gorunur(s.studentId, k.ders) || s.dogru + s.yanlis === 0) continue;
    const satir = konu(s.studentId, k), once = satir.soru;
    satir.soru = { dogru: (once?.dogru ?? 0) + s.dogru, yanlis: (once?.yanlis ?? 0) + s.yanlis };
  }
  for (const b of girdi.beyanlar) {
    const k = coz(b.ders, b.konu);
    if (!gorunur(b.studentId, k.ders)) continue;
    const satir = konu(b.studentId, k);
    if (!satir.beyan || (b.guncellenme ?? "") >= (satir.beyan.tarih ?? "")) satir.beyan = { seviye: b.seviye, tarih: b.guncellenme };
  }
  for (const o of girdi.oturumlar) {
    const k = coz(o.ders, o.konu);
    if (gorunur(o.studentId, k.ders)) konu(o.studentId, k).oturum++;
  }
  const takipler: GelisimTakibi[] = [];
  const eklenen = new Set<string>();
  for (const g of girdi.gorevler) {
    if (!gorunur(g.studentId, g.ders) || eklenen.has(g.id)) continue;
    eklenen.add(g.id);
    const ogrenci = ogrenciMap.get(g.studentId)!;
    // Atama sonradan yapıldıysa geçmiş görev tarihi, henüz verilmemiş
    // ödevin önceki denemelerini yanlışlıkla "sonraki" yapmasın.
    const referansTarihi = g.atamaTarihi > g.tarih ? g.atamaTarihi : g.tarih;
    const k = g.konu ? coz(g.ders, g.konu) : null;
    const liste = k ? olcumler.get(`${g.studentId}|${konuAdAnahtari(k.ders, k.konu)}`) : null;
    takipler.push({ ...g, ogrenciAdi: ogrenci.ad, sinif: ogrenci.sinif, referansTarihi,
      gecikti: g.durum !== "tamamlandi" && g.sonTarih < girdi.bugun,
      olcum: liste ? gorevOlcumunuBul([...liste.values()], referansTarihi) : null });
  }
  return { bugun: girdi.bugun, takipHatasi: girdi.takipHatasi ?? false,
    ogrenciler: ogrenciler.map((o) => ({ id: o.id, ad: o.ad, sinif: o.sinif, classId: o.classId,
      konular: [...(konular.get(o.id)?.values() ?? [])].sort((a, b) => a.ders.localeCompare(b.ders, "tr") || a.konu.localeCompare(b.konu, "tr")) }))
      .sort((a, b) => a.ad.localeCompare(b.ad, "tr")),
    takipler: takipler.sort((a, b) => Number(b.gecikti) - Number(a.gecikti) || b.atamaTarihi.localeCompare(a.atamaTarihi) || a.ogrenciAdi.localeCompare(b.ogrenciAdi, "tr")) };
}

export function gelisimTakipOzeti(takipler: GelisimTakibi[]) {
  return { toplam: takipler.length, tamamlanan: takipler.filter((g) => g.durum === "tamamlandi").length,
    geciken: takipler.filter((g) => g.gecikti).length,
    olcumGelen: takipler.filter((g) => g.olcum !== null).length };
}
