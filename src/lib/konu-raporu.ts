// Konu bilme/bilmeme göstergesi — "Konu Haritası" (Faz K3). İki ayrı veri
// kaynağı var:
//  - Öğrencinin KENDİ zayıf konuları (eski ZayifKonular.tsx'in mantığı,
//    23 Ağustos'ta sökülmüş ölü koddan taşındı — dosya geri gelmiyor,
//    mantığı burada yaşıyor).
//  - Sınıf/kurum bazlı AGREGE rapor (öğretmen/müdür-moderatör/admin) —
//    migration 0054'teki konu_zayiflik_raporu RPC'sini sarmalıyor.
import type { createClient } from "@/lib/supabase/server";
import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";
import type { TakipCevabi } from "@/lib/types";

type SupabaseC = Awaited<ReturnType<typeof createClient>>;

export interface OgrenciZayifKonu {
  ders: string;
  konu: string;
  seviye: string | null;
}

// hedefe_yakinlik='uzak' işaretlenen konu_calismalar kayıtlarını (ders,konu)
// bazında tekilleştirip en güncel 10 tanesini döner.
export async function ogrencininZayifKonulariGetir(supabase: SupabaseC, studentId: string): Promise<OgrenciZayifKonu[]> {
  const { data } = await supabase
    .from("konu_calismalar")
    .select("ders, konu, tarih")
    .eq("student_id", studentId)
    .eq("hedefe_yakinlik", "uzak")
    .order("tarih", { ascending: false })
    .limit(50);

  type Row = { ders: string; konu: string; tarih: string };
  const gorulenler = new Set<string>();
  const zayifKonular: OgrenciZayifKonu[] = [];
  for (const r of (data as Row[]) ?? []) {
    const anahtar = `${r.ders}|${r.konu}`;
    if (gorulenler.has(anahtar)) continue;
    gorulenler.add(anahtar);
    const resmiEslesme = MUFREDAT_KONULARI.find((k) => k.ders === r.ders && k.konu === r.konu);
    zayifKonular.push({ ders: r.ders, konu: r.konu, seviye: resmiEslesme?.seviye ?? null });
    if (zayifKonular.length >= 10) break;
  }
  return zayifKonular;
}

export interface KonuHaritasiSatiri {
  ders: string;
  konu: string;
  ogrenciSayisi: number;
  uzakSayisi: number;
  belirsizSayisi: number;
  yakinSayisi: number;
  uzakOrani: number | null;
  enSikUzakTakipCevabi: TakipCevabi | null;
}

// Sınıf VEYA okul kapsamlı agrege rapor — yetki kontrolü RPC'nin
// içinde (SECURITY DEFINER, bkz. migration 0054): çağıran o sınıfın
// öğretmeni / o okulun moderatörü / admin değilse RPC hata döner.
export async function konuHaritasiGetir(
  supabase: SupabaseC,
  scope: { classId: string } | { schoolId: string },
): Promise<{ error: string | null; satirlar: KonuHaritasiSatiri[] }> {
  const { data, error } = await supabase.rpc("konu_zayiflik_raporu", {
    p_class_id: "classId" in scope ? scope.classId : null,
    p_school_id: "schoolId" in scope ? scope.schoolId : null,
  });
  if (error) return { error: error.message, satirlar: [] };

  type Row = {
    ders: string; konu: string; ogrenci_sayisi: number;
    uzak_sayisi: number; belirsiz_sayisi: number; yakin_sayisi: number;
    uzak_orani: number | null; en_sik_uzak_takip_cevabi: TakipCevabi | null;
  };
  const satirlar = ((data as Row[]) ?? []).map((r) => ({
    ders: r.ders, konu: r.konu, ogrenciSayisi: r.ogrenci_sayisi,
    uzakSayisi: r.uzak_sayisi, belirsizSayisi: r.belirsiz_sayisi, yakinSayisi: r.yakin_sayisi,
    uzakOrani: r.uzak_orani, enSikUzakTakipCevabi: r.en_sik_uzak_takip_cevabi,
  }));
  return { error: null, satirlar };
}
