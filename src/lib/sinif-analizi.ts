// Sınıf Analizi — toplu sınıf görünümü (kullanıcı kararı 09.10.2026).
//
// İLKE (rehber-bayrak.ts ile aynı): sayıyı GEREKÇESİYLE göster, yeterli veri
// yoksa uydurma. Burada da tek bir "başarı puanı" ÜRETİLMİYOR; her liste
// kendi ölçütünü ve o ölçütün sayısını taşır.
//
// EŞİKLER NEDEN BUNLAR (Elbistan, 191 öğrenci / 15 sınıf, 09.10.2026 ölçümü):
//   aktiflik 30 gün  -> son 30 günde soru giren 24, konu giren 33 kişi.
//                       14 gün denendiğinde sınıf başına 1'in altına düşüyor
//                       ve liste çoğu ekranda boş kalıyordu.
//   trend 14+14 gün  -> önceki 14 günde en az 3 kayıt girmiş olup son 14
//                       günde gerileyen 7 kişi. Taban 5'e çıkarıldığında da
//                       AYNI 7 kişi çıkıyor (ölçüldü), bu yüzden daha düşük
//                       ve GOREV_MIN_SAYI ile tutarlı olan 3 seçildi.
//   görev min 3      -> rehber-bayrak.ts'teki GOREV_MIN_SAYI ile aynı sebep:
//                       tek görevi olup yapan herkes %100 görünür (yanıltıcı).
//
// SAYFALAMA: sınıf başına ortalama 12,7 öğrenci var, yani SINIF SEÇİLİYKEN
// liste zaten tek sayfa. Sayfalama yalnızca kurum geneli görünümünde
// (müdür/rehber, sınıf filtresi "tümü") anlam taşıyor.
//
// KAYIP NESİL neden liste değil ÖZET: resmî listede hesabı olmayan 311/502
// kişi (%62). Herkese yanan şey sinyal değil gürültüdür (bkz. rehber-bayrak.ts'te
// elenen "veli bağlı değil" %98 adayı). Bu yüzden kurum genelinde SINIF
// KIRILIMLI SAYI, sınıf seçilince o sınıfın adları gösterilir.

import { netHesapla, type NetKademesi } from "./types";

export const AKTIFLIK_PENCERESI = 30;
export const TREND_PENCERESI = 14;
export const TREND_MIN_KAYIT = 3;
export const GOREV_MIN_SAYI = 3;
export const SAYFA_BOYU = 10;
export const KISA_LISTE = 5;

export interface AnalizOgrencisi {
  ogrenciId: string;
  ad: string;
  okulNo: string | null;
  sinifId: string | null;
  sinifAdi: string;
  kademe: NetKademesi;
  /**
   * Sıralamaya giren net: ya SEÇİLİ denemenin toplam neti ya da tüm
   * denemelerin ortalaması (kullanıcı isteği 09.10.2026). Hangisi olduğunu
   * çağıran taraf belirler; o denemeye girmediyse / hiç denemesi yoksa null.
   */
  secilenDenemeNeti: number | null;
  /** Öğrencinin toplam deneme sayısı — ortalamanın kaç denemeye dayandığı. */
  denemeSayisi: number;
  /** Son AKTIFLIK_PENCERESI gününde girilen soru + konu kaydı sayısı. */
  aktiflik: number;
  gorevToplam: number;
  gorevTamamlanan: number;
  /** Son TREND_PENCERESI günü ve ondan önceki TREND_PENCERESI günü. */
  sonDonem: number;
  oncekiDonem: number;
  girisYapmisMi: boolean;
  /** Hiçbir tabloda tek bir kaydı yok. */
  verisiVarMi: boolean;
}

export interface SiraliSatir<T> {
  sira: number;
  ogrenci: AnalizOgrencisi;
  deger: T;
}

// Ad "a" ile "b" eşit değerdeyse alfabetik — sıralama her açılışta aynı olsun.
function esitlikBozucu(a: AnalizOgrencisi, b: AnalizOgrencisi): number {
  return a.ad.localeCompare(b.ad, "tr");
}

function siralaYaz<T>(liste: { ogrenci: AnalizOgrencisi; deger: T }[]): SiraliSatir<T>[] {
  return liste.map((s, i) => ({ sira: i + 1, ...s }));
}

/** 1 — DENEME TOPLAM NET SIRASI. Yalnız seçili denemeye GİRENLER listelenir. */
export function netSiralamasi(ogrenciler: AnalizOgrencisi[]): SiraliSatir<number>[] {
  return siralaYaz(
    ogrenciler
      .filter((o) => o.secilenDenemeNeti !== null)
      .sort((a, b) => (b.secilenDenemeNeti! - a.secilenDenemeNeti!) || esitlikBozucu(a, b))
      .map((o) => ({ ogrenci: o, deger: o.secilenDenemeNeti! })),
  );
}

/** 2 — AKTİF KULLANICILAR (soru çözümü + konu çalışma kaydı sayısı). */
export function aktifKullanicilar(ogrenciler: AnalizOgrencisi[]): SiraliSatir<number>[] {
  return siralaYaz(
    ogrenciler
      .filter((o) => o.aktiflik > 0)
      .sort((a, b) => (b.aktiflik - a.aktiflik) || esitlikBozucu(a, b))
      .map((o) => ({ ogrenci: o, deger: o.aktiflik })),
  );
}

export interface GorevBasarisi { oran: number; tamamlanan: number; toplam: number }

/**
 * 3 — GÖREV ADAMLARI. En az GOREV_MIN_SAYI görevi olanlar arasında
 * tamamlama oranı en yüksek olanlar. Taban olmadan tek görevini yapan
 * herkes %100 görünür.
 */
export function gorevAdamlari(ogrenciler: AnalizOgrencisi[]): SiraliSatir<GorevBasarisi>[] {
  return siralaYaz(
    ogrenciler
      .filter((o) => o.gorevToplam >= GOREV_MIN_SAYI && o.gorevTamamlanan > 0)
      .map((o) => ({ ogrenci: o, deger: { oran: o.gorevTamamlanan / o.gorevToplam, tamamlanan: o.gorevTamamlanan, toplam: o.gorevToplam } }))
      // Oran eşitse çok görevi olan önde: 10/10, 3/3'ten zordur.
      .sort((a, b) => (b.deger.oran - a.deger.oran) || (b.deger.toplam - a.deger.toplam) || esitlikBozucu(a.ogrenci, b.ogrenci)),
  );
}

export interface Gerileme { dusus: number; sonDonem: number; oncekiDonem: number }

/**
 * 4 — SİSTEMDEN UZAKLAŞANLAR. Önceki dönemde en az TREND_MIN_KAYIT kaydı
 * olup son dönemde GERİLEYENLER. Taban şart: 1 kayıttan 0'a düşmek
 * "uzaklaşma" değil, gürültüdür.
 *
 * Bu liste bugünkü veriyle çoğu sınıfta BOŞ çıkar (kurum genelinde 7 kişi) —
 * bu bir arıza değil, ölçülmüş gerçek. Boşken sessiz kalır.
 */
export function uzaklasanlar(ogrenciler: AnalizOgrencisi[]): SiraliSatir<Gerileme>[] {
  return siralaYaz(
    ogrenciler
      .filter((o) => o.oncekiDonem >= TREND_MIN_KAYIT && o.sonDonem < o.oncekiDonem)
      .map((o) => ({ ogrenci: o, deger: { dusus: o.oncekiDonem - o.sonDonem, sonDonem: o.sonDonem, oncekiDonem: o.oncekiDonem } }))
      // Önce TAMAMEN bırakanlar (son dönem 0), sonra düşüş büyüklüğü.
      .sort((a, b) => {
        const aBirakti = a.deger.sonDonem === 0;
        const bBirakti = b.deger.sonDonem === 0;
        if (aBirakti !== bBirakti) return aBirakti ? -1 : 1;
        return (b.deger.dusus - a.deger.dusus) || esitlikBozucu(a.ogrenci, b.ogrenci);
      }),
  );
}

export type SessizlikSebebi = "hesap-acilmamis" | "hic-veri-yok";

/**
 * 5 — SESSİZLER. İki AYRI sebep tek listede ama karıştırılmadan:
 * hesabını hiç açmamış olmak ile açıp hiç veri girmemiş olmak farklı
 * müdahale gerektirir (bkz. rehber-bayrak.ts'teki aynı ayrım).
 */
export function sessizler(ogrenciler: AnalizOgrencisi[]): SiraliSatir<SessizlikSebebi>[] {
  return siralaYaz(
    ogrenciler
      .filter((o) => !o.girisYapmisMi || !o.verisiVarMi)
      .map((o) => ({ ogrenci: o, deger: (!o.girisYapmisMi ? "hesap-acilmamis" : "hic-veri-yok") as SessizlikSebebi }))
      // Hesabını hiç açmamış olanlar önce: erişim sorunu, çalışma sorunundan önce gelir.
      .sort((a, b) => (Number(b.deger === "hesap-acilmamis") - Number(a.deger === "hesap-acilmamis")) || esitlikBozucu(a.ogrenci, b.ogrenci)),
  );
}

export interface KayipNesilSatiri { sinifAdi: string; eksik: number; toplam: number }
export interface KayipKisi { adSoyad: string; okulNo: string | null; sinifAdi: string }

/**
 * 6 — KAYIP NESİL. Resmî listede olup hesabı açılmamış kişiler.
 * Kurum genelinde SINIF KIRILIMLI SAYI döner (311 kişilik düz liste eyleme
 * dönmüyor); adlar yalnızca sınıf seçiliyken gösterilir.
 */
export function kayipNesilOzeti(kayitlar: { sinifAdi: string; hesabiVarMi: boolean }[]): KayipNesilSatiri[] {
  const sayac = new Map<string, { eksik: number; toplam: number }>();
  for (const k of kayitlar) {
    const s = sayac.get(k.sinifAdi) ?? { eksik: 0, toplam: 0 };
    s.toplam += 1;
    if (!k.hesabiVarMi) s.eksik += 1;
    sayac.set(k.sinifAdi, s);
  }
  return [...sayac.entries()]
    .map(([sinifAdi, s]) => ({ sinifAdi, ...s }))
    .filter((s) => s.eksik > 0)
    .sort((a, b) => (b.eksik - a.eksik) || a.sinifAdi.localeCompare(b.sinifAdi, "tr"));
}

/** Kurum geneli görünümünde sayfalama; sınıf seçiliyken liste zaten kısa. */
export function sayfala<T>(liste: T[], sayfa: number, boy = SAYFA_BOYU): { satirlar: T[]; sayfaSayisi: number; sayfa: number } {
  const sayfaSayisi = Math.max(1, Math.ceil(liste.length / boy));
  const guvenli = Math.min(Math.max(1, sayfa), sayfaSayisi);
  return { satirlar: liste.slice((guvenli - 1) * boy, guvenli * boy), sayfaSayisi, sayfa: guvenli };
}

/**
 * Öğrencinin TÜM denemelerinin net ortalaması (kullanıcı isteği 09.10.2026).
 * Hiç denemesi yoksa null — sıfır DÖNMEZ, yoksa denemeye hiç girmemiş
 * öğrenci "0 net almış" gibi listenin dibinde görünür.
 *
 * DİKKAT: farklı yayınevi/zorluktaki denemelerin ortalaması alınıyor ve
 * öğrenciler farklı sayıda denemeye girmiş olabiliyor. Bu yüzden satırda
 * deneme SAYISI da gösteriliyor — okuyan, ortalamanın neye dayandığını
 * görebilsin.
 */
export function netOrtalamasi(denemeNetleri: Record<string, number>): number | null {
  const degerler = Object.values(denemeNetleri);
  if (degerler.length === 0) return null;
  return Math.round((degerler.reduce((t, n) => t + n, 0) / degerler.length) * 100) / 100;
}

/** Deneme ders sonuçlarından toplam net — kademeye göre yanlış katsayısı. */
export function denemeToplamNeti(
  dersler: { dogru: number; yanlis: number }[],
  kademe: NetKademesi,
): number {
  return Math.round(dersler.reduce((t, d) => t + netHesapla(d.dogru, d.yanlis, kademe), 0) * 100) / 100;
}
