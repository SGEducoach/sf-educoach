// Grup Koçluk (kullanıcı isteği ve kararları 18.09.2026) — saf yardımcılar.
// Grup = dershanenin alt türü (schools.grup_kapasitesi dolu), tek koç,
// 5/10/15/20 aktif öğrenci. Bkz. migration 0114 ve grup-actions.ts.

export const GRUP_KAPASITELERI = [5, 10, 15, 20] as const;
export type GrupKapasitesi = (typeof GRUP_KAPASITELERI)[number];

export function grupKapasitesiMi(n: number): n is GrupKapasitesi {
  return (GRUP_KAPASITELERI as readonly number[]).includes(n);
}

// Grup kodu öğrencinin giriş bilgisinin parçası; elle yazılacağı için
// birbirine karışan harfler (I/1, O/0, Q, W, X) kullanılmıyor.
const KOD_HARFLERI = "ABCDEFGHJKLMNPRSTUVYZ23456789";

export function grupKoduUret(rastgele: () => number = Math.random): string {
  let kod = "G";
  for (let i = 0; i < 5; i++) kod += KOD_HARFLERI[Math.floor(rastgele() * KOD_HARFLERI.length)];
  return kod;
}

// Bitiş tarihine kalan gün (bitiş günü dahil kullanılabilir; ertesi gün
// salt okunur). Negatifse süre dolmuş demektir.
export function kalanGun(bitisTarihi: string, bugun: string): number {
  const gun = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(`${bitisTarihi}T00:00:00Z`) - Date.parse(`${bugun}T00:00:00Z`)) / gun);
}

export interface GrupGirdisi {
  grupAdi: string;
  kocAd: string;
  kocEmail: string;
  kocTelefon: string;
  kapasite: number;
  bitisTarihi: string;
  taahhut: boolean;
}

export function grupGirdisiHatasi(g: GrupGirdisi, bugun: string): string | null {
  if (g.grupAdi.trim().length < 3) return "Grup adı en az 3 karakter olmalı.";
  if (g.kocAd.trim().split(/\s+/).length < 2) return "Koçun adını ve soyadını yazın.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(g.kocEmail.trim())) return "Geçerli bir e-posta girin.";
  if (!/^[0-9]{10,11}$/.test(g.kocTelefon.trim())) return "Telefon numarası 10-11 rakam olmalı (boşluksuz).";
  if (!grupKapasitesiMi(g.kapasite)) return "Kapasite 5, 10, 15 ya da 20 olmalı.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(g.bitisTarihi)) return "Bitiş tarihi seçin.";
  if (g.bitisTarihi < bugun) return "Bitiş tarihi bugünden önce olamaz.";
  if (!g.taahhut) return "Koçun veri işleme taahhüdünü onaylayın.";
  return null;
}
