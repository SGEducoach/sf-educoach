// Ders programı / nöbet yükleme sonuç tipleri — sunucu işlemi dosyası
// ("use server") yalnızca async fonksiyon dışa aktarabildiği için tipler
// burada duruyor; hem sunucu işlemleri hem yönetim arayüzü buradan okur.
import type { DersProgramiGunu } from "@/lib/ders-programi";

export interface ProgramYuklemeOzeti {
  ogretmen: number;
  eslesen: number;
  bekleyen: number;
  hucre: number;
  nobet: number;
  uyarilar: string[];
}

export interface YurtNobetiYuklemeOzeti {
  gorev: number;
  ogretmen: number;
  eslesen: number;
  ilkTarih: string | null;
  sonTarih: string | null;
  bildirilen: number;
  uyarilar: string[];
}

export interface NobetGorunumu {
  okulNobetleri: { id: string; adSoyad: string; gun: DersProgramiGunu; yer: string; bagli: boolean }[];
  yurtNobetleri: { id: string; adSoyad: string; tarih: string; bagli: boolean }[];
  // Aynı adda birden fazla hesap olduğunda otomatik eşleşme yapılmıyor;
  // yönetici doğru hesabı bu listeden seçer (17.09.2026).
  ogretmenler: { id: string; ad: string; brans: string; rol: string }[];
  bekleyenProgramlar: { adAnahtari: string; adSoyad: string; satir: number }[];
}
