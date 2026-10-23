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
  /** Görev akıbeti panelinde üç durum ayrı gösteriliyor. */
  gorevBekleyen: number;
  gorevTamamlanmayan: number;
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

// ——— DENEME TÜRÜ (denetim 20.10.2026) ———
// "Deneme Net Sırası" eskiden varsayılan olarak TÜM denemelerin (TYT, AYT,
// branş, LGS) ortalamasını sıralıyordu; kart açıklaması ise "seçilen denemede
// toplam net" diyordu. TYT 120 soru, AYT alanına göre ~80 soru, branş tek
// ders: karma ortalama hiçbir ölçüye karşılık gelmez. Artık sıralama ya TEK
// bir denemeye ya da YALNIZ seçili türün kişisel ortalamasına dayanır.

/**
 * Aynı denemenin yayınevi yazımı kayıtlarda değişiyor ("Paraf"/"PARAF"/"paraf",
 * "limit"/"Limit"). Canlı veride (20.10.2026) 570 denemede 40+ ayrı yazım
 * var; anahtar yazımla ayrışırsa aynı deneme birden çok seçenek olur ve
 * ortak-deneme karşılaştırması kaçar. Büyük/küçük harf ve baştaki/sondaki
 * boşluk yok sayılır; imla farkları ("Mikroorjinal"/"Mikroorijinal") çözülmez.
 */
export function yayineviAnahtari(yayinevi: string | null | undefined): string {
  const t = (yayinevi ?? "").trim().toLocaleUpperCase("tr-TR");
  return t === "" ? "—" : t;
}

export interface DenemeSecenegiOzeti { anahtar: string; tarih: string; tur: string; katilan: number }

export const TUR_ETIKETLERI: Record<string, string> = {
  TYT: "TYT", AYT: "AYT", BRANS: "Branş", LGS: "LGS",
};
// Seçici sırası: lise ana türleri önce, sonra branş, en sonda ortaokul (LGS).
const TUR_SIRASI = ["TYT", "AYT", "BRANS", "LGS"];

export function turEtiketi(tur: string): string {
  return TUR_ETIKETLERI[tur] ?? tur;
}

/** "yayinevi|tarih|tur" anahtarından tür. Yayınevi "|" içerse bile son parça tür. */
export function anahtardanTur(anahtar: string): string {
  const i = anahtar.lastIndexOf("|");
  return i < 0 ? "" : anahtar.slice(i + 1);
}

/** Seçeneklerde bulunan türler — sabit sırayla; bilinmeyen türler sona. */
export function denemeTurleri(secenekler: DenemeSecenegiOzeti[]): string[] {
  const bulunan = [...new Set(secenekler.map((d) => d.tur))];
  const sira = (t: string) => { const i = TUR_SIRASI.indexOf(t); return i < 0 ? TUR_SIRASI.length : i; };
  return bulunan.sort((a, b) => sira(a) - sira(b) || a.localeCompare(b, "tr"));
}

/**
 * Bir türün VARSAYILAN denemesi: en yeni ORTAK deneme. "Ortak" = katılımı o
 * türdeki en yüksek katılımın en az yarısı olan deneme — tek kişinin girdiği
 * yeni bir deneme, sınıfın girdiği biraz eski denemenin önüne geçmesin.
 * Sonuç, tarihe göre yeni olandır; tarih eşitse katılımı yüksek olan.
 */
export function varsayilanDeneme(secenekler: DenemeSecenegiOzeti[], tur: string): DenemeSecenegiOzeti | null {
  const aday = secenekler.filter((d) => d.tur === tur);
  if (aday.length === 0) return null;
  const enYuksek = Math.max(...aday.map((d) => d.katilan));
  const ortak = aday.filter((d) => d.katilan * 2 >= enYuksek);
  return [...ortak].sort((a, b) => b.tarih.localeCompare(a.tarih) || b.katilan - a.katilan)[0] ?? null;
}

/**
 * Açılışta seçili tür: en yeni ortak denemesi olan tür (LGS ve branş, lise
 * ana türleri varken öne geçmesin diye eşitlikte sabit sıra kazanır).
 */
export function varsayilanTur(secenekler: DenemeSecenegiOzeti[]): string | null {
  let secilen: { tur: string; tarih: string } | null = null;
  for (const tur of denemeTurleri(secenekler)) {
    const d = varsayilanDeneme(secenekler, tur);
    if (d && (secilen === null || d.tarih > secilen.tarih)) secilen = { tur, tarih: d.tarih };
  }
  return secilen?.tur ?? null;
}

/** Öğrencinin net haritasından yalnız seçili türün denemeleri. */
export function turNetleri(denemeNetleri: Record<string, number>, tur: string): Record<string, number> {
  const sonuc: Record<string, number> = {};
  for (const [anahtar, net] of Object.entries(denemeNetleri)) {
    if (anahtardanTur(anahtar) === tur) sonuc[anahtar] = net;
  }
  return sonuc;
}

/** Deneme ders sonuçlarından toplam net — kademeye göre yanlış katsayısı. */
export function denemeToplamNeti(
  dersler: { dogru: number; yanlis: number }[],
  kademe: NetKademesi,
): number {
  return Math.round(dersler.reduce((t, d) => t + netHesapla(d.dogru, d.yanlis, kademe), 0) * 100) / 100;
}


// ——— ÖLÇÜM PANELLERİ (kullanıcı isteği 09.10.2026) ———
// Bölümün ruhu: sayıyı GEREKÇESİYLE göster, uydurma. Paneller de aynı
// kurala uyuyor — her biri tek bir ham gerçeği gösteriyor, birleşik bir
// "başarı puanı" üretmiyor.

export interface SinifAktifligi { sinifAdi: string; mevcut: number; aktif: number }

/**
 * 1 — EN AKTİF SINIF. Kullanıcı önerisiydi; canlı veride ayırt ettiği
 * ölçülerek doğrulandı (09.10.2026: en aktif sınıf 11 kişi, sınıf
 * ortalaması 2,5 — tek sınıf gerçekten ayrışıyor).
 */
export function sinifAktiflikSiralamasi(ogrenciler: AnalizOgrencisi[], kac = 5): SinifAktifligi[] {
  const sayac = new Map<string, { mevcut: number; aktif: number }>();
  for (const o of ogrenciler) {
    const s = sayac.get(o.sinifAdi) ?? { mevcut: 0, aktif: 0 };
    s.mevcut += 1;
    if (o.aktiflik > 0) s.aktif += 1;
    sayac.set(o.sinifAdi, s);
  }
  return [...sayac.entries()]
    .map(([sinifAdi, s]) => ({ sinifAdi, ...s }))
    .sort((a, b) => (b.aktif - a.aktif) || a.sinifAdi.localeCompare(b.sinifAdi, "tr"))
    .slice(0, kac);
}

export interface KatilimDilimi { kod: "aktif" | "eski" | "yok"; etiket: string; sayi: number }

/**
 * 2 — KATILIM. Üç kova ve TOPLAMLARI öğrenci sayısına eşit; "veri yok"
 * sessizce düşen bir dilim bırakmıyor.
 */
export function katilimDagilimi(ogrenciler: AnalizOgrencisi[]): KatilimDilimi[] {
  let aktif = 0, eski = 0, yok = 0;
  for (const o of ogrenciler) {
    if (o.aktiflik > 0) aktif += 1;
    else if (o.verisiVarMi) eski += 1;
    else yok += 1;
  }
  return [
    { kod: "aktif", etiket: `Son ${AKTIFLIK_PENCERESI} günde giren`, sayi: aktif },
    { kod: "eski", etiket: "Eski verisi var", sayi: eski },
    { kod: "yok", etiket: "Hiç giriş yok", sayi: yok },
  ];
}

export interface GorevAkibeti { tamamlandi: number; bekliyor: number; tamamlanmadi: number; toplam: number; oran: number | null }

/** 3 — GÖREV AKIBETİ. Görev yoksa oran null; sıfır göstermek yanıltıcı olur. */
export function gorevAkibeti(ogrenciler: AnalizOgrencisi[]): GorevAkibeti {
  let tamamlandi = 0, bekliyor = 0, tamamlanmadi = 0;
  for (const o of ogrenciler) {
    tamamlandi += o.gorevTamamlanan;
    bekliyor += o.gorevBekleyen;
    tamamlanmadi += o.gorevTamamlanmayan;
  }
  const toplam = tamamlandi + bekliyor + tamamlanmadi;
  return { tamamlandi, bekliyor, tamamlanmadi, toplam, oran: toplam > 0 ? tamamlandi / toplam : null };
}
