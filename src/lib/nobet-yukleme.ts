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

// Hesapla eşleşmeyen yurt nöbetleri ay bitiminde kaldırılır (kullanıcı isteği 30.10.2026:
// "ay bitiminde (ayın 25'i itibariyle) eşleşmeyince kaldırılsın"). Ayın 25'inden itibaren o
// ayın ve önceki ayların eşleşmeyen nöbetleri silinir; sonraki ayın erken yüklenen listesi
// korunur. Dönen tarih silme sınırıdır (bu tarihten ÖNCEKİLER silinir), "YYYY-AA-GG".
export const YURT_NOBETI_TEMIZLIK_GUNU = 25;

export function eslesmeyenYurtNobetiSiniri(bugun: string): string {
  const [yil, ay, gun] = bugun.split("-").map(Number);
  const sonrakiAy = gun >= YURT_NOBETI_TEMIZLIK_GUNU;
  const hedefYil = sonrakiAy && ay === 12 ? yil + 1 : yil;
  const hedefAy = sonrakiAy ? (ay === 12 ? 1 : ay + 1) : ay;
  return `${hedefYil}-${String(hedefAy).padStart(2, "0")}-01`;
}
