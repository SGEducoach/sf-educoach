import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Grup Koçluk: gruplar kurum listelerinde görünmez; öğrenci ve veli kurumu
// koçun verdiği grup koduyla (schools.okul_kodu) belirtir. Kod yalnızca
// sunucuda kuruma çevrilir. Bulunamazsa null.
export async function grupKodundanKurumId(admin: SupabaseClient, kod: unknown): Promise<string | null> {
  const temiz = String(kod ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{3,12}$/.test(temiz)) return null;
  const { data } = await admin.from("schools").select("id").eq("okul_kodu", temiz).not("grup_kapasitesi", "is", null).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
