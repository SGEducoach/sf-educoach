export type UserRole = "ogrenci" | "ogretmen" | "veli" | "mudur";
export type KurumTuru = "okul" | "dershane";
export type AytAlan = "SAY" | "EA" | "SOZ";
export type VeriGirisSikligi = "gunluk" | "3gunluk" | "haftalik";
export type VeliTalepDurum = "bekliyor" | "onaylandi" | "reddedildi" | "kullanildi";
export type HedefeYakinlik = "yakin" | "belirsiz" | "uzak";
export type VerimlilikDuzeyi = "cok_dusuk" | "dusuk" | "orta" | "iyi" | "cok_iyi";
export type DenemeTuru = "TYT" | "AYT";

export interface Profile {
  id: string;
  ad: string;
  email: string | null;
  telefon: string | null;
  role: UserRole;
  created_at: string;
}

export interface School {
  id: string;
  ad: string;
  tur: KurumTuru;
  created_at: string;
}

export interface SchoolClass {
  id: string;
  school_id: string;
  seviye: "11" | "12";
  sube: string;
  created_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  class_id: string;
  okul_no: string;
  ayt_alan: AytAlan;
  hedef_bolum: string;
  veri_giris_sikligi: VeriGirisSikligi;
  created_at: string;
}

export interface Teacher {
  id: string;
  school_id: string;
  class_id: string | null;
  brans: string;
  created_at: string;
}

export interface VeliLinkRequest {
  id: string;
  student_id: string;
  veli_ad: string;
  veli_telefon: string;
  durum: VeliTalepDurum;
  kod: string | null;
  onaylayan_ogretmen_id: string | null;
  created_at: string;
  onaylanma_at: string | null;
}

export interface KonuCalisma {
  id: string;
  student_id: string;
  tarih: string;
  ders: string;
  konu: string;
  sure_dakika: number;
  hedefe_yakinlik: HedefeYakinlik;
  created_at: string;
}

export interface SoruCozumu {
  id: string;
  student_id: string;
  tarih: string;
  ders: string;
  dogru: number;
  yanlis: number;
  sure_dakika: number;
  hedefe_yakinlik: HedefeYakinlik;
  created_at: string;
}

export interface DenemeDersSonucu {
  ders: string;
  dogru: number;
  yanlis: number;
}

export interface Deneme {
  id: string;
  student_id: string;
  tarih: string;
  tur: DenemeTuru;
  sure_dakika: number;
  hedefe_yakinlik: HedefeYakinlik;
  kaynak: "ogrenci" | "ogretmen";
  created_at: string;
  deneme_ders_sonuclari?: DenemeDersSonucu[];
}

export interface HaftalikVerimlilik {
  id: string;
  student_id: string;
  duzey: VerimlilikDuzeyi;
  created_at: string;
}

export const HEDEFE_YAKINLIK_ETIKET: Record<HedefeYakinlik, string> = {
  yakin: "Yakın",
  belirsiz: "Belirsiz",
  uzak: "Uzak",
};

export const VERIMLILIK_ETIKET: Record<VerimlilikDuzeyi, string> = {
  cok_dusuk: "Çok Düşük",
  dusuk: "Düşük",
  orta: "Orta",
  iyi: "İyi",
  cok_iyi: "Çok İyi",
};

export const VERI_GIRIS_SIKLIGI_ETIKET: Record<VeriGirisSikligi, string> = {
  gunluk: "Günlük",
  "3gunluk": "3 Günde Bir",
  haftalik: "Haftalık",
};

export function netHesapla(dogru: number, yanlis: number): number {
  return Math.round((dogru - yanlis / 4) * 100) / 100;
}

export const AYT_ALAN_ETIKET: Record<AytAlan, string> = {
  SAY: "Sayısal (SAY)",
  EA: "Eşit Ağırlık (EA)",
  SOZ: "Sözel (SÖZ)",
};

export const BRANS_LISTESI = [
  "Matematik",
  "Fizik",
  "Kimya",
  "Biyoloji",
  "Türkçe",
  "Edebiyat",
  "Tarih",
  "Coğrafya",
  "Felsefe",
  "Din Kültürü",
  "İngilizce",
  "Diğer",
] as const;

// Alan türüne göre "konu çalışma" / "soru çözümü" ders listeleri (TYT her zaman
// mevcut; AYT dersleri öğrencinin ayt_alan'ına göre değişir).
export const TYT_DERSLERI = [
  "Türkçe", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü",
] as const;

export const AYT_DERSLERI: Record<AytAlan, readonly string[]> = {
  SAY: ["Matematik", "Fizik", "Kimya", "Biyoloji"],
  EA: ["Matematik", "Edebiyat", "Tarih", "Coğrafya"],
  SOZ: ["Edebiyat", "Tarih-1", "Coğrafya-1", "Tarih-2", "Coğrafya-2", "Felsefe Grubu", "Din Kültürü"],
};
