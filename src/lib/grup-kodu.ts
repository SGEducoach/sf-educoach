import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { grupKoduNormalize } from "@/lib/grup-kocluk";

// Grup Koçluk: gruplar kurum listelerinde görünmez; öğrenci ve veli kurumu
// koçun verdiği grup koduyla (schools.okul_kodu) belirtir. Kod yalnızca
// sunucuda kuruma çevrilir. Bulunamazsa null.
export async function grupKodundanKurumId(admin: SupabaseClient, kod: unknown): Promise<string | null> {
  const temiz = grupKoduNormalize(String(kod ?? ""));
  if (!/^[\p{L}\p{N}]{3,64}$/u.test(temiz)) return null;
  // ilike eski büyük harfli rastgele grup kodlarını da çalışır tutar.
  const { data } = await admin.from("schools").select("id").ilike("okul_kodu", temiz).not("grup_kapasitesi", "is", null).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
