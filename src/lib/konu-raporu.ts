// Öğrencinin KENDİ zayıf konuları (Faz K3; eski ZayifKonular.tsx'in mantığı,
// 23 Ağustos'ta sökülmüş ölü koddan taşındı). Sınıf/kurum geneli rapor
// (konu_zayiflik_raporu RPC'si) 17.10.2026'da Konu Durumu'na geçti — bkz.
// konu-durumu.ts; RPC veritabanında duruyor, uygulama artık çağırmıyor.
import type { createClient } from "@/lib/supabase/server";
import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";

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
