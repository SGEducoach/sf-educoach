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
}
