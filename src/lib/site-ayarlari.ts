import type { SupabaseClient } from "@supabase/supabase-js";

// Site bakım modu (2026-08-26 kullanıcı isteği, bkz. migration 0072) —
// deneme-suresi.ts'teki desenin aynısı: anon dahil herkes okuyabilir
// (middleware kimlik doğrulamadan önce de bu bayrağı bilmeli).
export async function siteKapaliMi(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase.from("platform_ayarlari").select("site_kapali").eq("id", 1).maybeSingle();
  return !!data?.site_kapali;
}
