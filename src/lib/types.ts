export type UserRole = "ogrenci" | "ogretmen" | "veli";
export type KurumTuru = "okul" | "dershane";
export type AytAlan = "SAY" | "EA" | "SOZ";
export type VeriGirisSikligi = "gunluk" | "3gunluk" | "haftalik";
export type VeliTalepDurum = "bekliyor" | "onaylandi" | "reddedildi" | "kullanildi";

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
