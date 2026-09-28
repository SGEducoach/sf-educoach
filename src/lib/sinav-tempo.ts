import type { DenemeTuru } from "@/lib/types";
import { dersSoruSayisi } from "@/lib/types";

// ============ Sınav temposu: 165/180 dakikalık bütçenin ders dağılımı ============
//
// Kullanıcı isteği (28.09.2026): "normal bir öğrencinin 165 dakikayı kullanarak
// tüm soruları yetiştirdiği sistemde ders dakika ortalamaları".
//
// Buradaki sayılar bir HEDEF bütçesidir: resmî süre, soru tipine göre derslere
// paylaştırılıp optik kodlama ve kontrol için pay bırakılmıştır. Sınıflandırma
// eşiği DEĞİLDİR — serbest çalışma temposu sınav temposundan hızlıdır (canlı
// veride TYT'de öğrenci 120 sorunun ~92'sini işaretlerken serbest çalışmada
// soru başına ~1,1 dk harcıyor). Eşik için ders_hiz_referanslari (popülasyon
// medyanı) kullanılır; o yoksa bu bütçenin ÇALISMA_KATSAYISI katı.
//
// Matematik'teki 1,50 dk, kullanıcının daha önce verdiği "soru başına
// 1 dk 30 sn" kararıyla aynıdır — o karar bu tabloyla korunuyor.

export const SINAV_SURESI_DAKIKA: Record<DenemeTuru, number> = {
  TYT: 165,
  AYT: 180,
  // Branş denemesinin resmî bir süresi yok; 120 soruyla TYT yapısına en yakın.
  BRANS: 165,
};

const TYT_TEMPO: Record<string, number> = {
  "Türkçe": 1.2, "Matematik": 1.5,
  "Fizik": 1.6, "Kimya": 1.4, "Biyoloji": 1.1,
  "Tarih": 0.9, "Coğrafya": 0.9, "Felsefe": 1.0, "Din Kültürü": 0.7,
};

// AYT'de soru başına süre TYT'nin belirgin üstünde: 80 soru / 180 dakika.
// Tablo ders bazlı (alan bazlı değil) çünkü aynı ders farklı alanlarda AYNI
// soruyla çıkıyor — EA öğrencisinin Matematik'i SAY'ınkiyle aynı. Bunun
// yapısal bir sonucu var: en dar bütçe EA'da oluşuyor (Matematik + Edebiyat
// aynı sınavda), bu yüzden ortak sözel dersler EA'ya göre ölçüldü. SÖZ'de
// Matematik olmadığı için pay geniş kalıyor — bilinçli, sözel adayı gerçekten
// erken bitirir.
const AYT_TEMPO: Record<string, number> = {
  "Matematik": 2.4, "Fizik": 2.1, "Kimya": 1.8, "Biyoloji": 1.3,
  "Edebiyat": 2.1, "Felsefe Grubu": 2.2, "Din Kültürü": 1.2,
  "Tarih": 1.5, "Coğrafya": 1.5,
  "Tarih-1": 1.5, "Coğrafya-1": 1.5, "Tarih-2": 1.5, "Coğrafya-2": 1.5,
};

// Branş denemesi TYT oranlarını kullanır (120 soru, aynı ders listesi).
export function dersTempoButcesi(tur: DenemeTuru, ders: string): number | undefined {
  return tur === "AYT" ? AYT_TEMPO[ders] : TYT_TEMPO[ders];
}

// Serbest çalışma (soru_cozumleri) sınav koşulu değildir: konu sonu soruları
// daha tanıdık ve kolaydır. Referans tablosu henüz dolmamış bir ders için
// bütçe bu katsayıyla daraltılır.
export const CALISMA_KATSAYISI = 0.8;

// Öz beyan süre; bu bandın dışındaki kayıtlar analizi zehirliyor (canlı veride
// 450 kaydın 7'si 25 saniyenin altında "çözülmüş" görünüyor).
export const OLCUM_ALT_SINIR_DK = 0.4;
export const OLCUM_UST_SINIR_DK = 5;

export function olcumGecerliMi(dakikaBasinaSoru: number): boolean {
  return dakikaBasinaSoru >= OLCUM_ALT_SINIR_DK && dakikaBasinaSoru <= OLCUM_UST_SINIR_DK;
}

// Doğruluk eşiği moda göre ayrı: YKS net formülünde %60 "iyi" sınırıdır ve
// deneme için doğru eşiktir, ama serbest çalışmada doğruluk medyanı %92 —
// %60 eşiği hiç ısırmıyor, "hatalı" kategorisi boş kalıyordu.
export const DOGRULUK_ESIGI_SINAV = 0.6;
export const DOGRULUK_ESIGI_CALISMA = 0.85;

export interface TempoSatiri {
  ders: string;
  ortSureDakika: number;
  soru: number;
}

export interface SinavProjeksiyonu {
  tur: DenemeTuru;
  sureDakika: number;
  toplamSoru: number;
  // Öğrencinin kendi temposuyla tüm sınavı bitirmesi için gereken süre.
  gerekenDakika: number;
  // Artı ise süre artıyor, eksi ise açık veriyor.
  farkDakika: number;
  // Bu tempoda süre dolmadan kaç soru yetişir.
  yetisenSoru: number;
  // Tempo verisi olmayan dersler bütçe temposuyla sayıldı mı (kapsam bilgisi).
  olculenDers: number;
  toplamDers: number;
}

// Öğrencinin ders bazlı temposunu gerçek bir sınava yansıtır: "bu tempoyla
// 165 dakikada kaç soru yetişir, kaç dakika açık verirsin".
export function sinavProjeksiyonu(
  tur: DenemeTuru,
  dersler: readonly string[],
  tempo: TempoSatiri[],
): SinavProjeksiyonu | null {
  const tempoHaritasi = new Map(tempo.map((t) => [t.ders, t]));
  let gerekenDakika = 0;
  let toplamSoru = 0;
  let olculenDers = 0;
  let toplamDers = 0;

  for (const ders of dersler) {
    const soru = dersSoruSayisi(tur, ders);
    const butce = dersTempoButcesi(tur, ders);
    if (!soru || butce === undefined) continue;
    toplamDers++;
    toplamSoru += soru;
    const olculen = tempoHaritasi.get(ders);
    if (olculen && olcumGecerliMi(olculen.ortSureDakika)) {
      olculenDers++;
      gerekenDakika += soru * olculen.ortSureDakika;
    } else {
      gerekenDakika += soru * butce;
    }
  }
  if (toplamSoru === 0 || olculenDers === 0) return null;

  const sureDakika = SINAV_SURESI_DAKIKA[tur];
  const soruBasi = gerekenDakika / toplamSoru;
  return {
    tur,
    sureDakika,
    toplamSoru,
    gerekenDakika: Math.round(gerekenDakika),
    farkDakika: Math.round(sureDakika - gerekenDakika),
    yetisenSoru: Math.min(toplamSoru, Math.floor(sureDakika / soruBasi)),
    olculenDers,
    toplamDers,
  };
}
