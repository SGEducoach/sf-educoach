import { createClient } from "@/lib/supabase/server";

// app_ayarlari genel amaçlı key/value ayar tablosu — select herkese açık
// (RLS: using (true)), yazma sadece admin (service-role, bkz.
// src/app/yonetici/actions.ts). Server component'lerden (ör. signup
// sayfası) doğrudan çağrılabilir, "use server" gerekmiyor çünkü bir action
// değil, salt okuma yapan bir yardımcı fonksiyon.
export async function appAyariGetir(anahtar: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_ayarlari").select("deger").eq("anahtar", anahtar).maybeSingle();
  return data?.deger ?? null;
}
