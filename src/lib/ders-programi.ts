// Öğretmen Ders Programı — "Derslerim" sayfasına eklenen haftalık ders
// programı (2026-08-25 kullanıcı isteği). Format, kullanıcının paylaştığı
// gerçek MEB ders programı belgesinden alındı (bkz. dokumanlar/mufredat/
// öğretmen proğramı.pdf) — 8 sabit ders saati dilimi, kullanıcı onayı:
// "format hep bu şekilde". Boş şablon olarak kuruldu; veri admin/dershane
// müdürü tarafından zaman içinde elle girilecek ("geldikçe yüklersin").
import type { createClient } from "@/lib/supabase/server";

type SupabaseC = Awaited<ReturnType<typeof createClient>>;

export type DersProgramiGunu = "pazartesi" | "sali" | "carsamba" | "persembe" | "cuma" | "cumartesi" | "pazar";

export const GUN_ETIKET: Record<DersProgramiGunu, string> = {
  pazartesi: "Pazartesi",
  sali: "Salı",
  carsamba: "Çarşamba",
  persembe: "Perşembe",
  cuma: "Cuma",
  cumartesi: "Cumartesi",
  pazar: "Pazar",
};

// Okul haftası Pazartesi-Cuma; dershane kullanıcı isteğiyle (2026-08-25)
// hafta sonu da (Cumartesi-Pazar) programa açık.
const OKUL_GUNLERI: DersProgramiGunu[] = ["pazartesi", "sali", "carsamba", "persembe", "cuma"];
const DERSHANE_GUNLERI: DersProgramiGunu[] = [...OKUL_GUNLERI, "cumartesi", "pazar"];

export function programGunleri(dershaneMi: boolean): DersProgramiGunu[] {
  return dershaneMi ? DERSHANE_GUNLERI : OKUL_GUNLERI;
}

export interface DersSaatiDilimi {
  sira: number;
  baslangic: string;
  bitis: string;
}

// Sabit 8 ders saati dilimi — dokumanlar/mufredat/öğretmen proğramı.pdf'teki
// (1)-(8) sütunlarının aynısı (o belgede (9)-(10) sütunları da vardı ama
// hiç dolu değildi, kapsam dışı bırakıldı).
export const DERS_SAATI_DILIMLERI: DersSaatiDilimi[] = [
  { sira: 1, baslangic: "08:30", bitis: "09:10" },
  { sira: 2, baslangic: "09:25", bitis: "10:05" },
  { sira: 3, baslangic: "10:15", bitis: "10:55" },
  { sira: 4, baslangic: "11:05", bitis: "11:45" },
  { sira: 5, baslangic: "11:55", bitis: "12:35" },
  { sira: 6, baslangic: "13:25", bitis: "14:05" },
  { sira: 7, baslangic: "14:15", bitis: "14:55" },
  { sira: 8, baslangic: "15:05", bitis: "15:45" },
];

export interface DersProgramiSatiri {
  id: string;
  gun: DersProgramiGunu;
  dersSaatiSira: number;
  sinifAdi: string;
  ders: string;
}

// Yurt Nöbeti — sadece okul, basit 2 sütun × 6 bölümlük tarih defteri
// (bkz. migration 0066 yorumu).
export const YURT_NOBETI_SUTUN_SAYISI = 2;
export const YURT_NOBETI_SIRA_SAYISI = 6;

export interface YurtNobetiSatiri {
  id: string;
  sutun: number;
  sira: number;
  tarih: string | null;
}

export async function yurtNobetiGetir(supabase: SupabaseC, teacherId: string): Promise<YurtNobetiSatiri[]> {
  const { data } = await supabase
    .from("ogretmen_yurt_nobeti")
    .select("id, sutun, sira, tarih")
    .eq("teacher_id", teacherId);
  return (data as YurtNobetiSatiri[]) ?? [];
}

export async function ogretmenProgramiGetir(supabase: SupabaseC, teacherId: string): Promise<DersProgramiSatiri[]> {
  const { data } = await supabase
    .from("ogretmen_ders_programi")
    .select("id, gun, ders_saati_sira, ders, classes(seviye, sube)")
    .eq("teacher_id", teacherId);
  type Row = { id: string; gun: DersProgramiGunu; ders_saati_sira: number; ders: string; classes: { seviye: string; sube: string } | null };
  return ((data as unknown as Row[]) ?? []).map((r) => ({
    id: r.id,
    gun: r.gun,
    dersSaatiSira: r.ders_saati_sira,
    sinifAdi: r.classes ? `${r.classes.seviye}-${r.classes.sube}` : "—",
    ders: r.ders,
  }));
}
