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

// Bu oranın altında ortalama SAYI OLARAK gösterilmez.
//
// İlk onay 0.25'ti; 07.10.2026'da 0.30'a çekildi: 10. sınıf 9/35 = %25,7 ile
// eşiğin 0,7 puan üstünde kalıyordu ve 35 öğrencinin 9'undan gelen bir
// ortalama kesin bir sayı gibi gösterilmeye değmez. Artık Elbistan'da 9 ve
// 10 susar, 11 (%93) ve 12 (%98) gösterilir.
// Değiştirilecek tek yer burası — kapsam.test.ts eşiğe bağlı kararları
// kayda geçiriyor, oynatırsan hangi kademenin sustuğu testten görünür.
export const KAPSAM_ESIGI = 0.3;

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
// NOT: Türkçe sayı ekleri düzensiz (2'si, 3'ü, 9'u, 10'u, 20'si) — ek
// üretmek yerine ifade eki GEREKTİRMEYECEK şekilde kuruldu ("öğrenciden
// yalnızca 2 tanesi"). Buraya sayı+apostrof eki eklemeye çalışma.
export function kapsamUyarisi(kapsam: number, toplam: number): string {
  if (toplam <= 0) return "Bu kapsamda kayıtlı öğrenci yok.";
  if (kapsam <= 0) return `Yetersiz veri — ${toplam} öğrenciden hiçbiri bu dönemde deneme girmemiş.`;
  return `Yetersiz veri — ${toplam} öğrenciden yalnızca ${kapsam} tanesi deneme girmiş.`;
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
