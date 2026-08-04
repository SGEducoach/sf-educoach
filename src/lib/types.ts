export type UserRole = "ogrenci" | "veli" | "koc";

export type NotificationType = "basari" | "uyari" | "bilgi";

export interface Profile {
  id: string;
  ad: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Student {
  id: string;
  hedef_puan: number;
  hedef_bolum: string;
  sinif: string | null;
  yks_yili: number | null;
  created_at: string;
}

export interface StudentWithProfile extends Student {
  profiles: Pick<Profile, "ad" | "email">;
}

export interface Exam {
  id: string;
  student_id: string;
  tarih: string;
  tyt_net: number;
  ayt_net: number;
  puan: number;
  created_at: string;
}

export interface StudySession {
  id: string;
  student_id: string;
  tarih: string;
  ders: string;
  dakika: number;
  created_at: string;
}

export interface Notification {
  id: string;
  student_id: string;
  author_id: string | null;
  tarih: string;
  tip: NotificationType;
  mesaj: string;
  created_at: string;
}

export const DERS_LISTESI = [
  "Matematik",
  "Fizik",
  "Kimya",
  "Biyoloji",
  "Türkçe",
  "Tarih",
] as const;
