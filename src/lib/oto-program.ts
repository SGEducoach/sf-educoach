import { saatiDakikayaCevir, saatAraligiSuresi } from "./saat-araligi";

// SeFu Oto Program (kullanıcı isteği 13.09.2026) — öğrencinin seçtiği günler,
// zaman aralıkları ve derslerle programı otomatik kurar. Saf fonksiyonlar:
// istemcide önizlemeyi üretir, sunucuda kayıt öncesi aynı kurallarla doğrular
// (bkz. oto-program-veri.ts, dashboard/oto-program-actions.ts).
// Kullanıcı kararları: hafta içi / hafta sonu ayrı aralık seti (en fazla 3),
// saatler 15 dakikalık adımla, 40 dk çalışma + 10 dk mola, önce konu
// çalışması ardından aynı konunun soru çözümü, konular zayıflık önceliğine
// göre, aylıkta haftalık iskelet aynı konular ilerler, okul öğrencisinde hafta
// içi 07.00–16.00 kapalı (dershane öğrencisinde açık).

export type DersAgirligi = "agirlikli" | "orta" | "hafif";
export type ProgramKapsami = "haftalik" | "aylik";
export type BlokTuru = "konu" | "soru";

export const DERS_AGIRLIGI_ETIKET: Record<DersAgirligi, string> = { agirlikli: "Ağırlıklı", orta: "Orta", hafif: "Hafif" };
export const KAPSAM_HAFTA_SAYISI: Record<ProgramKapsami, number> = { haftalik: 1, aylik: 4 };
const AGIRLIK_PAYI: Record<DersAgirligi, number> = { agirlikli: 3, orta: 2, hafif: 1 };

export const BLOK_DAKIKA = 40;
export const MOLA_DAKIKA = 10;
// Kullanıcı isteği (24.09.2026): gün içinde parçalı çalışanlar için 3 aralık
// yetmiyordu, sınır 8'e çıkarıldı.
export const EN_FAZLA_PERIYOT = 8;
export const EN_UZUN_BLOK_DAKIKA = 120;
export const OKUL_SAATI = { baslangic: 7 * 60, bitis: 16 * 60 };
// 22.00 sonrası yeni konu yerine soru çözümü (dikkat düşük).
const GECE_SINIRI = 22 * 60;
// Aynı ders bir günde en fazla bir konu + soru eşi; alternatif ders yoksa esner.
const GUNLUK_DERS_BLOK_SINIRI = 2;

export const GUN_ADLARI = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export interface Periyot { baslangic: string; bitis: string }
export interface OtoProgramDersi { ders: string; agirlik: DersAgirligi }
export interface OtoProgramAyari {
  gunler: number[]; // 0 = Pazartesi … 6 = Pazar
  haftaIciPeriyotlari: Periyot[];
  haftaSonuPeriyotlari: Periyot[];
  dersler: OtoProgramDersi[]; // sıra = önem sırası
  // Kullanıcı isteği (24.09.2026): öğrenci konuları SeFu'ya seçtirmek
  // zorunda değil. false ise program kalemleri konusuz üretilir; öğrenci
  // çalışmayı tamamlarken (onay anında) konuyu kendisi seçer. Eski
  // kayıtlarda alan yok — tanımsızsa eski davranış (SeFu seçer) geçerli.
  konulariSefuSecsin?: boolean;
}
export interface DoluAralik { tarih: string; baslangic: string; bitis: string }
// Öğretmenin saat vermediği, programa henüz eklenmemiş ödev.
export interface SabitGorev { atamaId: string; tur: BlokTuru; ders: string; konu: string | null; tarih: string; sonTarih: string }
export interface ProgramBlogu {
  anahtar: string;
  tarih: string;
  baslangic: string;
  bitis: string;
  tur: BlokTuru;
  ders: string;
  konu: string | null;
  atamaId: string | null;
}

export interface OtoProgramVerisi {
  bugun: string;
  baslangicTarihi: string; // pazartesi
  haftaSayisi: number;
  okulOgrencisi: boolean;
  dersListesi: string[];
  konuKuyruklari: Record<string, string[]>;
  doluAraliklar: DoluAralik[];
  sabitGorevler: SabitGorev[];
  degisecekKalemSayisi: number;
  sonProgram: { ayar: OtoProgramAyari; baslangicTarihi: string; bitisTarihi: string; kapsam: ProgramKapsami } | null;
}

export function dakikayiSaateCevir(dakika: number): string {
  const normalize = ((dakika % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(normalize / 60)).padStart(2, "0")}:${String(normalize % 60).padStart(2, "0")}`;
}

export const CEYREK_SAATLER: string[] = Array.from({ length: 96 }, (_, i) => dakikayiSaateCevir(i * 15));

export function gunEkle(tarih: string, gun: number): string {
  const d = new Date(`${tarih}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + gun);
  return d.toISOString().slice(0, 10);
}

// 0 = Pazartesi … 6 = Pazar
export function haftaninGunu(tarih: string): number {
  return (new Date(`${tarih}T12:00:00Z`).getUTCDay() + 6) % 7;
}

export function haftaninPazartesisi(tarih: string): string {
  return gunEkle(tarih, -haftaninGunu(tarih));
}

function okulSaatiyleCakisir(baslangic: number, bitis: number): boolean {
  return baslangic < OKUL_SAATI.bitis && bitis > OKUL_SAATI.baslangic;
}

// Kullanıcı isteği (24.09.2026): "açılan her periyot otomatik birer saatlik
// sırayla açılsın" — yeni periyot, mevcut en geç bitişten başlayıp 1 saat
// sürer; okul saatine (07.00–16.00) denk gelirse 16.00'ya kayar. Gün içinde
// yer kalmadıysa null döner (düğme kapanır).
export const VARSAYILAN_PERIYOT_DAKIKA = 60;
const GUN_SONU = 24 * 60;

export function sonrakiPeriyot(periyotlar: Periyot[], okulSaatiKapali: boolean): Periyot | null {
  const bitisler = periyotlar
    .map((p) => {
      const baslangic = saatiDakikayaCevir(p?.baslangic);
      const sure = saatAraligiSuresi(p?.baslangic, p?.bitis);
      return baslangic === null || sure === null ? null : baslangic + sure;
    })
    .filter((d): d is number => d !== null);

  let baslangic = bitisler.length > 0
    ? Math.max(...bitisler)
    : (okulSaatiKapali ? OKUL_SAATI.bitis : 9 * 60);

  // Gece yarısını aşan bir aralıktan sonra (bitiş 24.00'ı geçmiş) gün doludur.
  if (baslangic >= GUN_SONU) return null;
  if (okulSaatiKapali && okulSaatiyleCakisir(baslangic, baslangic + VARSAYILAN_PERIYOT_DAKIKA)) {
    baslangic = OKUL_SAATI.bitis;
  }
  if (baslangic + VARSAYILAN_PERIYOT_DAKIKA > GUN_SONU) return null;

  return { baslangic: dakikayiSaateCevir(baslangic), bitis: dakikayiSaateCevir(baslangic + VARSAYILAN_PERIYOT_DAKIKA) };
}

export function periyotHatasi(periyotlar: Periyot[], okulSaatiKapali: boolean, etiket: string): string | null {
  if (periyotlar.length > EN_FAZLA_PERIYOT) return `${etiket} için en fazla ${EN_FAZLA_PERIYOT} zaman aralığı girilebilir.`;
  const araliklar: [number, number][] = [];
  for (const [i, p] of periyotlar.entries()) {
    const baslangic = saatiDakikayaCevir(p?.baslangic);
    const bitis = saatiDakikayaCevir(p?.bitis);
    if (baslangic === null || bitis === null || baslangic % 15 !== 0 || bitis % 15 !== 0) {
      return `${etiket} ${i + 1}. aralığın saatleri 15 dakikalık adımlarla seçilmeli.`;
    }
    const sure = saatAraligiSuresi(p.baslangic, p.bitis);
    if (sure === null || sure < BLOK_DAKIKA) return `${etiket} ${i + 1}. aralık en az ${BLOK_DAKIKA} dakika olmalı.`;
    const gercekBitis = baslangic + sure;
    if (okulSaatiKapali && okulSaatiyleCakisir(baslangic, gercekBitis)) return `${etiket} ${i + 1}. aralık okul saatine (07.00–16.00) denk geliyor.`;
    araliklar.push([baslangic, gercekBitis]);
  }
  araliklar.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < araliklar.length; i++) {
    if (araliklar[i][0] < araliklar[i - 1][1]) return `${etiket} aralıkları birbiriyle çakışıyor.`;
  }
  return null;
}

export function ayarHatasi(ayar: OtoProgramAyari, okulOgrencisi: boolean, dersListesi: string[]): string | null {
  if (!ayar || !Array.isArray(ayar.gunler) || !Array.isArray(ayar.dersler)
    || !Array.isArray(ayar.haftaIciPeriyotlari) || !Array.isArray(ayar.haftaSonuPeriyotlari)) {
    return "Program ayarları eksik.";
  }
  if (ayar.gunler.length === 0 || ayar.gunler.some((g) => !Number.isInteger(g) || g < 0 || g > 6)) return "Çalışacağınız günleri seçin.";
  if (ayar.gunler.some((g) => g < 5) && ayar.haftaIciPeriyotlari.length === 0) return "Hafta içi için en az bir zaman aralığı girin.";
  if (ayar.gunler.some((g) => g >= 5) && ayar.haftaSonuPeriyotlari.length === 0) return "Hafta sonu için en az bir zaman aralığı girin.";
  const periyotSorunu = periyotHatasi(ayar.haftaIciPeriyotlari, okulOgrencisi, "Hafta içi")
    ?? periyotHatasi(ayar.haftaSonuPeriyotlari, false, "Hafta sonu");
  if (periyotSorunu) return periyotSorunu;
  if (ayar.dersler.length === 0) return "En az bir ders seçin.";
  if (new Set(ayar.dersler.map((d) => d?.ders)).size !== ayar.dersler.length) return "Bir ders birden fazla kez seçilmiş.";
  if (ayar.dersler.some((d) => !dersListesi.includes(d?.ders) || !(d?.agirlik in AGIRLIK_PAYI))) return "Ders seçimi geçersiz.";
  return null;
}

// Toplam blok sayısını ağırlık paylarına göre (3/2/1) en büyük kalan
// yöntemiyle böler; eşitlikte seçim sırası önde.
export function paylastir(toplam: number, dersler: OtoProgramDersi[]): number[] {
  const paylar = dersler.map((d) => AGIRLIK_PAYI[d.agirlik] ?? 0);
  const payToplami = paylar.reduce((t, p) => t + p, 0);
  if (toplam <= 0 || payToplami === 0) return dersler.map(() => 0);
  const ham = paylar.map((p) => (toplam * p) / payToplami);
  const sonuc = ham.map(Math.floor);
  let kalan = toplam - sonuc.reduce((t, v) => t + v, 0);
  const sira = ham.map((v, i) => ({ i, artik: v - Math.floor(v) })).sort((a, b) => b.artik - a.artik || a.i - b.i);
  for (const { i } of sira) {
    if (kalan <= 0) break;
    sonuc[i] += 1;
    kalan -= 1;
  }
  return sonuc;
}

interface Slot { tarih: string; hafta: number; periyot: number; baslangic: number; bitis: number; blok: ProgramBlogu | null }

function araliklariTopla(araliklar: DoluAralik[]): Map<string, [number, number][]> {
  const harita = new Map<string, [number, number][]>();
  for (const a of araliklar) {
    const baslangic = saatiDakikayaCevir(a.baslangic);
    const bitis = saatiDakikayaCevir(a.bitis);
    const sure = saatAraligiSuresi(a.baslangic, a.bitis);
    if (baslangic === null || bitis === null || !sure) continue;
    const liste = harita.get(a.tarih) ?? [];
    liste.push([baslangic, baslangic + sure]);
    harita.set(a.tarih, liste);
  }
  return harita;
}

function slotlariUret(veri: OtoProgramVerisi, ayar: OtoProgramAyari): Slot[] {
  const dolu = araliklariTopla(veri.doluAraliklar);
  const gunler = [...new Set(ayar.gunler)].filter((g) => g >= 0 && g <= 6).sort((a, b) => a - b);
  const slotlar: Slot[] = [];
  for (let hafta = 0; hafta < veri.haftaSayisi; hafta++) {
    for (const gun of gunler) {
      const tarih = gunEkle(veri.baslangicTarihi, hafta * 7 + gun);
      if (tarih < veri.bugun) continue;
      const engeller = [...(dolu.get(tarih) ?? [])];
      if (veri.okulOgrencisi && gun < 5) engeller.push([OKUL_SAATI.baslangic, OKUL_SAATI.bitis]);
      const periyotlar = (gun < 5 ? ayar.haftaIciPeriyotlari : ayar.haftaSonuPeriyotlari)
        .map((p) => { const bas = saatiDakikayaCevir(p.baslangic); const sure = saatAraligiSuresi(p.baslangic, p.bitis); return [bas, bas === null || !sure ? null : bas + sure] as const; })
        .filter((p): p is readonly [number, number] => p[0] !== null && p[1] !== null)
        .sort((a, b) => a[0] - b[0]);
      periyotlar.forEach(([periyotBaslangic, periyotBitis], periyot) => {
        let t = periyotBaslangic;
        while (t + BLOK_DAKIKA <= periyotBitis) {
          const engel = engeller.find(([eb, es]) => t < es && t + BLOK_DAKIKA > eb);
          if (engel) {
            t = Math.ceil(engel[1] / 15) * 15;
            continue;
          }
          slotlar.push({ tarih, hafta, periyot, baslangic: t, bitis: t + BLOK_DAKIKA, blok: null });
          t += BLOK_DAKIKA + MOLA_DAKIKA;
        }
      });
    }
  }
  return slotlar;
}

export function otoProgramOlustur(veri: OtoProgramVerisi, ayar: OtoProgramAyari): ProgramBlogu[] {
  // Konuyu öğrenci sonra seçecekse üretimde hiç konu yazılmaz (öğretmen
  // ödevleri hariç — onların konusu öğretmenden gelir).
  const konusuz = ayar.konulariSefuSecsin === false;
  const slotlar = slotlariUret(veri, ayar);
  const bloklar: ProgramBlogu[] = [];
  let sayac = 0;
  const yerlestir = (slot: Slot, tur: BlokTuru, ders: string, konu: string | null, atamaId: string | null) => {
    const blok: ProgramBlogu = {
      anahtar: `blok-${++sayac}`, tarih: slot.tarih,
      baslangic: dakikayiSaateCevir(slot.baslangic), bitis: dakikayiSaateCevir(slot.bitis),
      tur, ders, konu: konusuz && !atamaId ? null : konu, atamaId,
    };
    slot.blok = blok;
    bloklar.push(blok);
    return blok;
  };

  // 1) Saatsiz öğretmen ödevleri: kendi tarih aralığındaki ilk boş bloğa (son tarihi yakın olan önce).
  for (const gorev of [...veri.sabitGorevler].sort((a, b) => a.sonTarih.localeCompare(b.sonTarih))) {
    const slot = slotlar.find((s) => !s.blok && s.tarih >= gorev.tarih && s.tarih <= gorev.sonTarih);
    if (slot) yerlestir(slot, gorev.tur, gorev.ders, gorev.konu, gorev.atamaId);
  }

  // 2) Seçilen dersler: her hafta ağırlık paylarıyla; konular haftalar boyunca ilerler.
  const dersler = ayar.dersler;
  if (dersler.length > 0) {
    const kuyruklar = new Map(dersler.map((d) => [d.ders, [...(veri.konuKuyruklari[d.ders] ?? [])]]));
    const bekleyenSoru = new Map<string, string | null>();
    const sonKonu = new Map<string, string | null>();
    const sonGun = new Map<string, string>();

    for (let hafta = 0; hafta < veri.haftaSayisi; hafta++) {
      const haftaSlotlari = slotlar.filter((s) => s.hafta === hafta && !s.blok);
      const hedef = paylastir(haftaSlotlari.length, dersler);
      const kalan = new Map(dersler.map((d, i) => [d.ders, hedef[i]]));
      const gunluk = new Map<string, number>();
      let onceki: Slot | null = null;

      for (const slot of haftaSlotlari) {
        const gunlukSayi = (ders: string) => gunluk.get(`${slot.tarih}|${ders}`) ?? 0;
        const gununIlkBlogu = !onceki || onceki.tarih !== slot.tarih;
        const periyottakiOnceki = onceki && onceki.tarih === slot.tarih && onceki.periyot === slot.periyot ? onceki.blok : null;

        let secilen: OtoProgramDersi | undefined;
        // Aynı aralıkta hemen önceki konu bloğunun soru eşi.
        if (periyottakiOnceki && periyottakiOnceki.tur === "konu" && !periyottakiOnceki.atamaId) {
          const d = dersler.find((x) => x.ders === periyottakiOnceki.ders);
          if (d && (kalan.get(d.ders) ?? 0) > 0 && gunlukSayi(d.ders) < GUNLUK_DERS_BLOK_SINIRI) secilen = d;
        }
        if (!secilen) {
          const adaylar = dersler.filter((d) => (kalan.get(d.ders) ?? 0) > 0);
          if (adaylar.length === 0) {
            onceki = slot;
            continue;
          }
          const sinirIcinde = adaylar.filter((d) => gunlukSayi(d.ders) < GUNLUK_DERS_BLOK_SINIRI);
          const havuz = sinirIcinde.length > 0 ? sinirIcinde : adaylar;
          const dun = gunEkle(slot.tarih, -1);
          const puan = (d: OtoProgramDersi) => {
            const sira = dersler.indexOf(d);
            let p = (kalan.get(d.ders) ?? 0) / Math.max(1, hedef[sira]);
            if (gununIlkBlogu) p += ((dersler.length - sira) / dersler.length) * 0.5;
            if (d.agirlik === "agirlikli" && sonGun.get(d.ders) === dun) p -= 0.25;
            if (sonGun.get(d.ders) === slot.tarih) p -= 0.3;
            return p - sira * 0.001;
          };
          secilen = havuz.reduce((en, d) => (puan(d) > puan(en) ? d : en));
        }

        const ders = secilen.ders;
        let tur: BlokTuru;
        let konu: string | null;
        if (bekleyenSoru.has(ders)) {
          tur = "soru";
          konu = bekleyenSoru.get(ders) ?? null;
          bekleyenSoru.delete(ders);
        } else if (slot.baslangic >= GECE_SINIRI) {
          tur = "soru";
          konu = sonKonu.get(ders) ?? null;
        } else {
          tur = "konu";
          konu = kuyruklar.get(ders)?.shift() ?? null;
          bekleyenSoru.set(ders, konu);
        }
        yerlestir(slot, tur, ders, konu, null);
        kalan.set(ders, (kalan.get(ders) ?? 0) - 1);
        gunluk.set(`${slot.tarih}|${ders}`, gunlukSayi(ders) + 1);
        sonGun.set(ders, slot.tarih);
        if (konu) sonKonu.set(ders, konu);
        onceki = slot;
      }
    }
  }

  return bloklar.sort((a, b) => a.tarih.localeCompare(b.tarih) || a.baslangic.localeCompare(b.baslangic));
}

export function blokDakikasi(blok: Pick<ProgramBlogu, "baslangic" | "bitis">): number {
  const baslangic = saatiDakikayaCevir(blok.baslangic);
  const bitis = saatiDakikayaCevir(blok.bitis);
  return baslangic === null || bitis === null ? 0 : (saatAraligiSuresi(blok.baslangic, blok.bitis) ?? 0);
}

// Günlük yük göstergesi: hafta içi okul öğrencisinde 4 saat, diğerlerinde 8 saat üstü uyarı.
export function gunlukYukUyarisi(tarih: string, dakika: number, okulOgrencisi: boolean): string | null {
  const sinir = haftaninGunu(tarih) < 5 && okulOgrencisi ? 240 : 480;
  if (dakika <= sinir) return null;
  return `Günlük ${sinir / 60} saati aşıyor; verim düşebilir, bir aralığı kısaltmayı düşünün.`;
}

// Kayıt öncesi (sunucu) ve elle düzeltmede (istemci) aynı kurallar.
export function bloklariDogrula(bloklar: ProgramBlogu[], veri: OtoProgramVerisi): string | null {
  if (!Array.isArray(bloklar) || bloklar.length === 0) return "Programda hiç kalem yok.";
  if (bloklar.length > 600) return "Program çok büyük; daha kısa aralıklar seçin.";
  const donemSonu = gunEkle(veri.baslangicTarihi, veri.haftaSayisi * 7 - 1);
  const sabitler = new Map(veri.sabitGorevler.map((s) => [s.atamaId, s]));
  const kullanilanAtamalar = new Set<string>();
  const dolu = araliklariTopla(veri.doluAraliklar);
  const gunBloklari = new Map<string, [number, number][]>();

  for (const b of bloklar) {
    if (!b || typeof b.tarih !== "string" || typeof b.baslangic !== "string" || typeof b.bitis !== "string" || typeof b.ders !== "string") {
      return "Program kalemleri geçersiz.";
    }
    const etiket = `${b.tarih} ${b.baslangic}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.tarih) || b.tarih < veri.baslangicTarihi || b.tarih > donemSonu) return `${etiket}: tarih program dönemi dışında.`;
    if (b.tarih < veri.bugun) return `${etiket}: geçmiş bir güne kalem eklenemez.`;
    const baslangic = saatiDakikayaCevir(b.baslangic);
    const bitis = saatiDakikayaCevir(b.bitis);
    const sure = saatAraligiSuresi(b.baslangic, b.bitis);
    if (baslangic === null || bitis === null || !sure) return `${etiket}: saat aralığı geçersiz.`;
    const gercekBitis = baslangic + sure;
    if (sure > EN_UZUN_BLOK_DAKIKA) return `${etiket}: bir kalem en fazla ${EN_UZUN_BLOK_DAKIKA} dakika olabilir.`;
    if (veri.okulOgrencisi && haftaninGunu(b.tarih) < 5 && okulSaatiyleCakisir(baslangic, gercekBitis)) {
      return `${etiket}: hafta içi 07.00–16.00 okul saatine denk geliyor.`;
    }
    if (b.tur !== "konu" && b.tur !== "soru") return `${etiket}: geçersiz kalem türü.`;
    if (b.konu !== null && (typeof b.konu !== "string" || b.konu.length > 200)) return `${etiket}: konu geçersiz.`;
    if (b.atamaId) {
      const sabit = sabitler.get(b.atamaId);
      if (!sabit || kullanilanAtamalar.has(b.atamaId)) return `${etiket}: öğretmen ödevi bulunamadı.`;
      if (b.tarih < sabit.tarih || b.tarih > sabit.sonTarih) return `${etiket}: öğretmen ödevi kendi tarih aralığının dışına konamaz.`;
      kullanilanAtamalar.add(b.atamaId);
    } else if (!veri.dersListesi.includes(b.ders)) {
      return `${etiket}: ${b.ders} ders listenizde yok.`;
    }
    if ((dolu.get(b.tarih) ?? []).some(([db, ds]) => baslangic < ds && gercekBitis > db)) return `${etiket}: bu saatte programınızda başka bir iş var.`;
    const oncekiler = gunBloklari.get(b.tarih) ?? [];
    if (oncekiler.some(([ob, os]) => baslangic < os && gercekBitis > ob)) return `${etiket}: aynı saate iki kalem denk geliyor.`;
    oncekiler.push([baslangic, gercekBitis]);
    gunBloklari.set(b.tarih, oncekiler);
  }
  return null;
}
