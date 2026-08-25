import type { SupabaseClient } from "@supabase/supabase-js";
import type { KurumTuru, UserRole } from "@/lib/types";

// Dershane modülü 1 haftalık deneme süresi (2026-08-25 kullanıcı isteği,
// bkz. migration 0065). Süre dolunca dershane rolleri "deneme süreniz
// sona erdi" ekranıyla karşılanır — okul tarafı hiç etkilenmez.

export const DENEME_SURESI_SONA_ERDI_MESAJI =
  "Deneme süreniz sona erdi. Hata kontrolleri yapılıp çalışmayan sistemler aktif hâle getirilecektir.";

// anon dahil herkes okuyabilir (login sayfası kimlik doğrulamadan önce de
// bu tarihi bilmeli) — bkz. migration 0065 RLS.
export async function dershaneDenemeBitisGetir(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from("platform_ayarlari").select("dershane_deneme_bitis").eq("id", 1).maybeSingle();
  return (data?.dershane_deneme_bitis as string | null) ?? null;
}

export function suresiDolduMu(bitisTarihi: string | null): boolean {
  if (!bitisTarihi) return false;
  return new Date(bitisTarihi).getTime() < Date.now();
}

// Bir kullanıcının bağlı olduğu kurumun türünü (okul/dershane) role göre
// çözer — dashboard/page.tsx ÖNCEDEN bunu SADECE müdür için yapıyordu
// (kendi menüsü kurum türüne göre değiştiği için); deneme süresi
// kontrolü için artık TÜM rollerde gerekiyor.
export async function kurumTuruGetir(
  supabase: SupabaseClient, userId: string, role: UserRole,
): Promise<KurumTuru | undefined> {
  if (role === "ogretmen" || role === "mudur") {
    const { data: t } = await supabase.from("teachers").select("school_id").eq("id", userId).maybeSingle();
    if (!t) return undefined;
    const { data: s } = await supabase.from("schools").select("tur").eq("id", t.school_id).maybeSingle();
    return s?.tur as KurumTuru | undefined;
  }
  if (role === "ogrenci") {
    const { data: st } = await supabase.from("students").select("school_id").eq("id", userId).maybeSingle();
    if (!st) return undefined;
    const { data: s } = await supabase.from("schools").select("tur").eq("id", st.school_id).maybeSingle();
    return s?.tur as KurumTuru | undefined;
  }
  if (role === "veli") {
    const { data: ps } = await supabase.from("parent_students").select("student_id").eq("parent_id", userId).limit(1).maybeSingle();
    if (!ps) return undefined;
    const { data: st } = await supabase.from("students").select("school_id").eq("id", ps.student_id).maybeSingle();
    if (!st) return undefined;
    const { data: s } = await supabase.from("schools").select("tur").eq("id", st.school_id).maybeSingle();
    return s?.tur as KurumTuru | undefined;
  }
  return undefined; // admin — kurum kavramına bağlı değil
}
