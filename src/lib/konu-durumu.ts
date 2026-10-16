// Konu Durumu (kullanıcı isteği 17.10.2026) — öğretmen/müdür/rehberin
// "sınıfım hangi konularda zorlanıyor, kimler, ne yapayım" ekranının saf
// hesabı. Eski Konu Haritası yalnız konu çalışma girişlerine bakıyordu ve
// çoğu sınıfta boş kalıyordu; burada öğrencinin kendi Konu Hakimiyeti
// puanıyla AYNI formül (bilesikMasterySkoruHesapla) dört kaynaktan
// beslenir: deneme karnesi kazanımları ve soru çözümü (ölçüm), öğrencinin
// kalıcı beyanı, konu çalışma oturumları.
//
// Konu adı: müfredat yaprağına eşlenebiliyorsa müfredat adı; deneme
// kazanımı eşlenmemişse yayınevinin konu adı (kendi satırı olarak). Branş
// denemesi kazanımları müfredata hiç bağlanmaz, "Türkçe (Branş)" gibi kendi
// ders başlığında görünür (bkz. kazanim-konu-oneri.ts).
import { bilesikMasterySkoruHesapla, dogrulukOraniHesapla, oturumOrtalamasiHesapla } from "@/lib/analiz-motoru";
import { BRANS_KAZANIM_EKI, bransKazanimBasligiMi, kazanimDersiniKanoniklestir } from "@/lib/kazanim-konu-oneri";
import { dersGosterimAdi, konuGosterimAdi } from "@/lib/deneme-konu-analizi";
import { konuAdAnahtari, type KonuAdEslesmesi, type KonuHedefi } from "@/lib/konu-ad-eslesmesi";
import type { HedefeYakinlik } from "@/lib/types";

// Bu puanın altı "zorlanıyor" sayılır (0-100).
export const ZORLANMA_ESIGI = 50;
const ONCELIKLI_KONU_SAYISI = 8;
const GIDISAT_ESIGI = 5;

export interface KdOgrenci {
  id: string;
  ad: string;
  sinif: string | null;
  classId: string | null;
  // Bu öğrencide görülebilecek dersler; null = hepsi (ör. sınıf öğretmeni).
  dersler: string[] | null;
}

export interface KdDenemeSatiri {
  studentId: string;
  denemeAnahtari: string; // tarih + tür + yayınevi
  denemeEtiketi: string;
  tarih: string;
  ders: string; // karnenin ham ders adı
  kazanimMetni: string;
  soru: number;
  dogru: number;
  yanlis: number;
}

export interface KdKonuSatiri { studentId: string; ders: string; konu: string }
export interface KdSoruSatiri extends KdKonuSatiri { dogru: number; yanlis: number }
export interface KdBeyanSatiri extends KdKonuSatiri { seviye: HedefeYakinlik; guncellenme: string | null }
export interface KdOturumSatiri extends KdKonuSatiri { seviye: HedefeYakinlik }

export interface KdAdlandirma {
  // "<müfredat dersi>|<kazanım metni>" → müfredat konusu (yönetici eşleştirmesi)
  kazanimKonusu: Map<string, string>;
  hedefler: readonly KonuHedefi[];
  adEslesmeleri: readonly KonuAdEslesmesi[];
}

// Karnenin soru soru cevaplarından çıkarılan "bu kazanım hangi sorular"
// bilgisi (kazanim-soru-cikarimi.ts). ders: deneme_kazanim_sonuclari'ndeki
// hâliyle (Branş başlığı dahil) — konu çözümü denemeKonusu ile aynı.
export interface KdSoruBilgisi {
  denemeEtiketi: string;
  tarih: string;
  ders: string;
  kazanimMetni: string;
  test: string;
  kitapcik: string | null;
  sorular: number[];
  kesin: boolean;
}

export interface KdKonuSorusu { denemeEtiketi: string; tarih: string; test: string; kitapcik: string | null; sorular: number[]; kesin: boolean }

export interface KdOgrenciSkoru { id: string; ad: string; sinif: string | null; classId: string | null; skor: number }

export interface KdKonu {
  anahtar: string;
  ders: string;
  konu: string;
  ogrenciSayisi: number;
  ortalama: number;
  zorlananlar: KdOgrenciSkoru[];
  deneme: { soru: number; dogru: number; yanlis: number; bos: number; basari: number; denemeSayisi: number } | null;
  soruCozumu: { dogru: number; yanlis: number; basari: number } | null;
  beyan: { uzak: number; belirsiz: number; yakin: number } | null;
  oturumSayisi: number;
  gidisat: { ilk: number; son: number; ilkTarih: string; sonTarih: string } | null;
  // Son denemelerde bu konuya düşen sorular (en yeni önce); yoksa boş.
  sorular: KdKonuSorusu[];
}

export interface KdDers { ders: string; ortalama: number; konuSayisi: number; zayifKonuSayisi: number; ogrenciSayisi: number }

export interface KonuDurumuVerisi {
  konular: KdKonu[];
  oncelikliler: KdKonu[];
  dersler: KdDers[];
  ogrenciSayisi: number;
  veriliOgrenciSayisi: number;
  sonDeneme: { tarih: string; etiket: string } | null;
}

// "Türkçe (Branş)" → "Türkçe" (öğretmenin ders yetkisi taban derse bakar).
export function tabanDers(ders: string): string {
  return ders.replace(/ \(Branş\)$/, "");
}

function denemeKonusu(ders: string, metin: string, ad: KdAdlandirma): { ders: string; konu: string; mufredat: boolean } {
  if (bransKazanimBasligiMi(ders)) {
    return { ders: `${ders.trim().slice(0, -BRANS_KAZANIM_EKI.length)} (Branş)`, konu: konuGosterimAdi(metin), mufredat: false };
  }
  const kanonik = kazanimDersiniKanoniklestir(ders);
  if (!kanonik) return { ders: dersGosterimAdi(ders), konu: konuGosterimAdi(metin), mufredat: false };
  const eslesen = ad.kazanimKonusu.get(`${kanonik}|${metin}`);
  return eslesen ? { ders: kanonik, konu: eslesen, mufredat: true } : { ders: kanonik, konu: konuGosterimAdi(metin), mufredat: false };
}

// konuHedefiniBul ile aynı kural (önce doğrudan ad, sonra yönetici ad
// eşleştirmesi), ama sözlükle: okul genelinde binlerce satır × yüzlerce
// müfredat yaprağını her satırda yeniden taramak saniyeler sürüyordu.
function serbestKonuCozucu(ad: KdAdlandirma) {
  const hedefMap = new Map<string, KonuHedefi>();
  for (const h of ad.hedefler) {
    const anahtar = konuAdAnahtari(h.ders, h.konu);
    if (!hedefMap.has(anahtar)) hedefMap.set(anahtar, h);
  }
  const adMap = new Map<string, KonuAdEslesmesi>();
  for (const e of ad.adEslesmeleri) {
    const anahtar = konuAdAnahtari(e.ders, e.kaynak_konu);
    if (!adMap.has(anahtar)) adMap.set(anahtar, e);
  }
  const onbellek = new Map<string, { ders: string; konu: string; mufredat: boolean }>();
  return (ders: string, konu: string) => {
    const anahtar = konuAdAnahtari(ders, konu);
    const hazir = onbellek.get(anahtar);
    if (hazir) return hazir;
    const eslesme = adMap.get(anahtar);
    const hedef = hedefMap.get(anahtar) ?? (eslesme ? hedefMap.get(konuAdAnahtari(ders, eslesme.hedef_konu)) : undefined);
    const sonuc = hedef ? { ders: hedef.ders, konu: hedef.konu, mufredat: true } : { ders, konu: konu.trim(), mufredat: false };
    onbellek.set(anahtar, sonuc);
    return sonuc;
  };
}

// Artık kullanılmayan taslak ders (öğrencinin Konu Hakimiyeti'nde de yok).
const ESKI_TASLAK_DERSLER = new Set(["Türkçe (Maarif)"]);

function konuAnahtari(ders: string, konu: string): string {
  return `${ders}|${konu.trim().replace(/\s+/g, " ").toLocaleUpperCase("tr-TR")}`;
}

interface OgrenciKonuBirikimi { olcumD: number; olcumY: number; beyan: HedefeYakinlik | null; beyanTarih: string | null; oturum: HedefeYakinlik[] }

interface KonuBirikimi {
  ders: string;
  konu: string;
  mufredat: boolean;
  ogrenciler: Map<string, OgrenciKonuBirikimi>;
  deneme: { soru: number; dogru: number; yanlis: number; denemeler: Map<string, { tarih: string; soru: number; dogru: number }> };
  soru: { dogru: number; yanlis: number };
  beyan: { uzak: number; belirsiz: number; yakin: number };
  oturumSayisi: number;
}

export function konuDurumuHesapla(girdi: {
  ogrenciler: KdOgrenci[];
  denemeler: KdDenemeSatiri[];
  sorular: KdSoruSatiri[];
  beyanlar: KdBeyanSatiri[];
  oturumlar: KdOturumSatiri[];
  adlandirma: KdAdlandirma;
  soruBilgileri?: KdSoruBilgisi[];
  simdi?: number;
}): KonuDurumuVerisi {
  const ogrenciMap = new Map(girdi.ogrenciler.map((o) => [o.id, o]));
  const simdi = girdi.simdi ?? Date.now();
  const konular = new Map<string, KonuBirikimi>();
  const cozucu = serbestKonuCozucu(girdi.adlandirma);

  const dersGorunurMu = (studentId: string, ders: string) => {
    const o = ogrenciMap.get(studentId);
    if (!o || ESKI_TASLAK_DERSLER.has(ders)) return false;
    return o.dersler === null || o.dersler.includes(tabanDers(ders));
  };
  const birikim = (k: { ders: string; konu: string; mufredat: boolean }, studentId: string) => {
    const anahtar = konuAnahtari(k.ders, k.konu);
    let b = konular.get(anahtar);
    if (!b) {
      b = {
        ders: k.ders, konu: k.konu, mufredat: k.mufredat, ogrenciler: new Map(),
        deneme: { soru: 0, dogru: 0, yanlis: 0, denemeler: new Map() }, soru: { dogru: 0, yanlis: 0 },
        beyan: { uzak: 0, belirsiz: 0, yakin: 0 }, oturumSayisi: 0,
      };
      konular.set(anahtar, b);
    } else if (k.mufredat && !b.mufredat) {
      // Müfredat adı yayınevinin yazımından önce gelir.
      b.konu = k.konu; b.mufredat = true;
    }
    let o = b.ogrenciler.get(studentId);
    if (!o) { o = { olcumD: 0, olcumY: 0, beyan: null, beyanTarih: null, oturum: [] }; b.ogrenciler.set(studentId, o); }
    return { b, o };
  };

  let sonDeneme: KonuDurumuVerisi["sonDeneme"] = null;
  for (const r of girdi.denemeler) {
    const k = denemeKonusu(r.ders, r.kazanimMetni, girdi.adlandirma);
    if (!dersGorunurMu(r.studentId, k.ders)) continue;
    // Hiç çözülmemiş seçmeli test ("Felsefe (Seçmeli)" 0 D / 0 Y) başarıyı yapay düşürmesin.
    if (/\(Se[çc]meli\)$/.test(r.ders.trim()) && r.dogru + r.yanlis === 0) continue;
    const { b, o } = birikim(k, r.studentId);
    o.olcumD += r.dogru; o.olcumY += r.yanlis;
    b.deneme.soru += r.soru; b.deneme.dogru += r.dogru; b.deneme.yanlis += r.yanlis;
    const d = b.deneme.denemeler.get(r.denemeAnahtari) ?? { tarih: r.tarih, soru: 0, dogru: 0 };
    d.soru += r.soru; d.dogru += r.dogru;
    b.deneme.denemeler.set(r.denemeAnahtari, d);
    if (!sonDeneme || r.tarih > sonDeneme.tarih) sonDeneme = { tarih: r.tarih, etiket: r.denemeEtiketi };
  }
  for (const r of girdi.sorular) {
    const k = cozucu(r.ders, r.konu);
    if (!dersGorunurMu(r.studentId, k.ders) || r.dogru + r.yanlis === 0) continue;
    const { b, o } = birikim(k, r.studentId);
    o.olcumD += r.dogru; o.olcumY += r.yanlis;
    b.soru.dogru += r.dogru; b.soru.yanlis += r.yanlis;
  }
  for (const r of girdi.beyanlar) {
    const k = cozucu(r.ders, r.konu);
    if (!dersGorunurMu(r.studentId, k.ders)) continue;
    const { b, o } = birikim(k, r.studentId);
    if (o.beyanTarih === null || (r.guncellenme ?? "") > o.beyanTarih) { o.beyan = r.seviye; o.beyanTarih = r.guncellenme ?? ""; }
    b.beyan[r.seviye]++;
  }
  for (const r of girdi.oturumlar) {
    const k = cozucu(r.ders, r.konu);
    if (!dersGorunurMu(r.studentId, k.ders)) continue;
    const { b, o } = birikim(k, r.studentId);
    o.oturum.push(r.seviye);
    b.oturumSayisi++;
  }

  const konuSorulari = new Map<string, KdKonuSorusu[]>();
  for (const s of girdi.soruBilgileri ?? []) {
    const k = denemeKonusu(s.ders, s.kazanimMetni, girdi.adlandirma);
    const anahtar = konuAnahtari(k.ders, k.konu);
    if (!konular.has(anahtar)) continue;
    const liste = konuSorulari.get(anahtar) ?? [];
    const ayni = liste.find((x) => x.denemeEtiketi === s.denemeEtiketi && x.test === s.test && x.kitapcik === s.kitapcik);
    // Aynı konuya eşlenen birden çok kazanım aynı testte: sorular birleşir.
    if (ayni) { ayni.sorular = [...new Set([...ayni.sorular, ...s.sorular])].sort((a, c) => a - c); ayni.kesin = ayni.kesin && s.kesin; }
    else liste.push({ denemeEtiketi: s.denemeEtiketi, tarih: s.tarih, test: s.test, kitapcik: s.kitapcik, sorular: [...s.sorular], kesin: s.kesin });
    konuSorulari.set(anahtar, liste);
  }

  const veriliOgrenciler = new Set<string>();
  const sonuclar: KdKonu[] = [];
  const dersSkorlari = new Map<string, Map<string, number[]>>();
  for (const [anahtar, b] of konular) {
    const skorlar: KdOgrenciSkoru[] = [];
    for (const [studentId, o] of b.ogrenciler) {
      const gunFarki = o.beyanTarih ? (simdi - new Date(o.beyanTarih).getTime()) / (1000 * 3600 * 24) : null;
      const { skor } = bilesikMasterySkoruHesapla({
        olcumDogrulukOrani: dogrulukOraniHesapla(o.olcumD, o.olcumY),
        kaliciBeyan: o.beyan,
        oturumOrtalamasi: oturumOrtalamasiHesapla(o.oturum),
        gunFarkiSonGuncelleme: gunFarki,
      });
      if (skor === null) continue;
      const ogr = ogrenciMap.get(studentId)!;
      skorlar.push({ id: ogr.id, ad: ogr.ad, sinif: ogr.sinif, classId: ogr.classId, skor });
      veriliOgrenciler.add(studentId);
    }
    if (skorlar.length === 0) continue;
    const ortalama = Math.round(skorlar.reduce((t, s) => t + s.skor, 0) / skorlar.length);
    const zorlananlar = skorlar.filter((s) => s.skor < ZORLANMA_ESIGI).sort((a, c) => a.skor - c.skor || a.ad.localeCompare(c.ad, "tr"));
    const denemeTarihleri = [...b.deneme.denemeler.values()].filter((d) => d.soru > 0).sort((a, c) => a.tarih.localeCompare(c.tarih));
    let gidisat: KdKonu["gidisat"] = null;
    if (denemeTarihleri.length >= 2) {
      const ilk = Math.round((denemeTarihleri[0].dogru / denemeTarihleri[0].soru) * 100);
      const sonD = denemeTarihleri[denemeTarihleri.length - 1];
      const son = Math.round((sonD.dogru / sonD.soru) * 100);
      if (Math.abs(son - ilk) >= GIDISAT_ESIGI) gidisat = { ilk, son, ilkTarih: denemeTarihleri[0].tarih, sonTarih: sonD.tarih };
    }
    const beyanToplam = b.beyan.uzak + b.beyan.belirsiz + b.beyan.yakin;
    const soruToplam = b.soru.dogru + b.soru.yanlis;
    sonuclar.push({
      anahtar, ders: b.ders, konu: b.konu, ogrenciSayisi: skorlar.length, ortalama, zorlananlar,
      deneme: b.deneme.soru > 0 ? {
        soru: b.deneme.soru, dogru: b.deneme.dogru, yanlis: b.deneme.yanlis,
        bos: Math.max(0, b.deneme.soru - b.deneme.dogru - b.deneme.yanlis),
        basari: Math.round((b.deneme.dogru / b.deneme.soru) * 100), denemeSayisi: b.deneme.denemeler.size,
      } : null,
      soruCozumu: soruToplam > 0 ? { ...b.soru, basari: Math.round((b.soru.dogru / soruToplam) * 100) } : null,
      beyan: beyanToplam > 0 ? b.beyan : null,
      oturumSayisi: b.oturumSayisi,
      gidisat,
      sorular: (konuSorulari.get(anahtar) ?? []).sort((a, c) => c.tarih.localeCompare(a.tarih) || (a.kitapcik ?? "").localeCompare(c.kitapcik ?? "")),
    });
    const dersOgrencileri = dersSkorlari.get(b.ders) ?? new Map<string, number[]>();
    for (const s of skorlar) dersOgrencileri.set(s.id, [...(dersOgrencileri.get(s.id) ?? []), s.skor]);
    dersSkorlari.set(b.ders, dersOgrencileri);
  }

  const oncelikliler = oncelikliKonular(sonuclar, veriliOgrenciler.size);

  // Ders puanı öğrenci başına eşit ağırlıklı: önce her öğrencinin o dersteki
  // konu ortalaması, sonra bunların ortalaması. Yoksa 36 konuya tek tek
  // "yetersiz" diyen tek bir öğrenci dersin puanını belirlerdi.
  const dersler: KdDers[] = [...dersSkorlari.entries()].map(([ders, ogrenciler]) => {
    const dersKonulari = sonuclar.filter((k) => k.ders === ders);
    const ogrenciOrtalamalari = [...ogrenciler.values()].map((l) => l.reduce((t, s) => t + s, 0) / l.length);
    return {
      ders,
      ortalama: Math.round(ogrenciOrtalamalari.reduce((t, s) => t + s, 0) / ogrenciOrtalamalari.length),
      konuSayisi: dersKonulari.length,
      zayifKonuSayisi: dersKonulari.filter((k) => k.ortalama < ZORLANMA_ESIGI).length,
      ogrenciSayisi: ogrenciler.size,
    };
  }).sort((a, c) => a.ders.localeCompare(c.ders, "tr"));

  sonuclar.sort((a, c) => a.ders.localeCompare(c.ders, "tr") || a.ortalama - c.ortalama || c.ogrenciSayisi - a.ogrenciSayisi);
  return {
    konular: sonuclar, oncelikliler, dersler,
    ogrenciSayisi: girdi.ogrenciler.length, veriliOgrenciSayisi: veriliOgrenciler.size, sonDeneme,
  };
}

// "Öncelikli" = en çok öğrencinin zorlandığı konular; eşitlikte ortalaması
// düşük olan önce. (Puan açığıyla çarpmak, verisi olan 2 öğrencinin ikisinin
// de zorlandığı konuyu 19 öğrenciden 4'ünün zorlandığı konunun önüne
// koyuyordu — öğretmene "kaç öğrenci" daha anlaşılır.) Küçük kapsamda
// (≤5 öğrenci) tek öğrencinin zorlandığı konu da girer; aksi hâlde en az iki.
export function oncelikliKonular(konular: KdKonu[], veriliOgrenciSayisi: number): KdKonu[] {
  const minZorlanan = veriliOgrenciSayisi <= 5 ? 1 : 2;
  return konular
    .filter((k) => k.zorlananlar.length >= minZorlanan)
    .sort((a, c) => c.zorlananlar.length - a.zorlananlar.length || a.ortalama - c.ortalama)
    .slice(0, ONCELIKLI_KONU_SAYISI);
}

// Branş / ders ataması adlarını müfredat derslerine çevirir. Müfredatta
// karşılığı olmayan branşlar (İngilizce, Beden Eğitimi …) boş döner.
const BRANS_DERSLERI: Record<string, string[]> = {
  "Türk Dili ve Edebiyatı": ["Türkçe", "Edebiyat"],
  "Edebiyat": ["Edebiyat"],
  "Türkçe": ["Türkçe"],
  "Matematik": ["Matematik"],
  "Geometri": ["Matematik"],
  "Fizik": ["Fizik"],
  "Kimya": ["Kimya"],
  "Biyoloji": ["Biyoloji"],
  "Tarih": ["Tarih"],
  "T.C. İnkılap Tarihi ve Atatürkçülük": ["Tarih"],
  "Coğrafya": ["Coğrafya"],
  "Felsefe": ["Felsefe"],
  "Din Kültürü": ["Din Kültürü"],
  "Din Kültürü ve Ahlak Bilgisi": ["Din Kültürü"],
};

export function bransinMufredatDersleri(brans: string | null | undefined): string[] {
  return brans ? (BRANS_DERSLERI[brans.trim()] ?? []) : [];
}
