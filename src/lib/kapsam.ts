// Kapsam dürüstlüğü (kullanıcı onayı 07.10.2026, Rehber Radarı Adım 1).
//
// SORUN: Kurum Performansı paneli "9. sınıf net ortalaması 42" diyordu; o
// sayı 20 öğrencinin 2'sinden geliyordu. Rehber bunu "9. sınıf düşük
// performanslı" diye okuyor, oysa gerçek şu: 9. sınıf ÖLÇÜLMEMİŞ. İkisi
// bambaşka şey ve rehberin yapacağı iş de bambaşka.
//
// Elbistan'daki gerçek dağılım (07.10.2026): 9. sınıf 20 öğrencinin 18'i
// hiç veri girmemiş, 10. sınıf 35'in 22'si; 11 ve 12 neredeyse tam dolu.
//
// Kapsam DAİMA nitelediği metriğin kaynağıyla aynı olmalı: net ortalaması
// yalnız denemelerden geliyor, bu yüzden onu kapatan kapsam "o pencerede
// EN AZ BİR denemesi olan ayrı öğrenci sayısı"dır — satır/kayıt sayısı
// değil, ÖĞRENCİ sayısı (bir öğrenci 5 deneme girerse kapsam 1'dir).

// Bu oranın altında ortalama SAYI OLARAK gösterilmez. Kullanıcı onayı
// 07.10.2026: 0.25. (Elbistan'da 9. sınıfı susturur; 10. sınıf 9/35 =
// %25,7 ile eşiğin hemen üstünde kalır. %30'a çekmek 10'u da susturur —
// değiştirilecek tek yer burası.)
export const KAPSAM_ESIGI = 0.25;

// null = toplam bilinmiyor/sıfır, oran hesaplanamaz (0 ile karıştırılmasın).
export function kapsamOrani(kapsam: number, toplam: number): number | null {
  if (!Number.isFinite(kapsam) || !Number.isFinite(toplam) || toplam <= 0) return null;
  return Math.min(Math.max(kapsam, 0), toplam) / toplam;
}

export function kapsamYeterliMi(kapsam: number, toplam: number): boolean {
  const oran = kapsamOrani(kapsam, toplam);
  return oran !== null && oran >= KAPSAM_ESIGI;
}

// "2/20 öğrenciden (%10)" — ortalamanın yanına düşen kapsam satırı.
export function kapsamEtiketi(kapsam: number, toplam: number): string {
  const oran = kapsamOrani(kapsam, toplam);
  if (oran === null) return "öğrenci yok";
  return `${kapsam}/${toplam} öğrenciden (%${Math.round(oran * 100)})`;
}

// Kapsam yetersizken ortalamanın YERİNE geçen açıklama. Sayı vermiyor —
// amaç rehberi "düşük performans" yanılgısından çıkarmak.
export function kapsamUyarisi(kapsam: number, toplam: number): string {
  if (toplam <= 0) return "Bu kapsamda kayıtlı öğrenci yok.";
  if (kapsam <= 0) return `Yetersiz veri — ${toplam} öğrencinin hiçbiri bu dönemde deneme girmemiş.`;
  return `Yetersiz veri — ${toplam} öğrencinin ${kapsam}'i deneme girmiş.`;
}

// Ortalama gösterilsin mi, yoksa uyarı mı? Bileşenler bu tek karara bakar.
export interface KapsamKarari {
  yeterli: boolean;
  etiket: string;
  uyari: string | null;
}

export function kapsamKarari(kapsam: number, toplam: number): KapsamKarari {
  const yeterli = kapsamYeterliMi(kapsam, toplam);
  return {
    yeterli,
    etiket: kapsamEtiketi(kapsam, toplam),
    uyari: yeterli ? null : kapsamUyarisi(kapsam, toplam),
  };
}
