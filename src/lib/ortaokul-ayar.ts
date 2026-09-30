import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { kademeBul } from "@/lib/kademe";
import type { Kademe } from "@/lib/kademe";

// Ortaokul panelinin özellik bayrağı (migration 0127).
//
// Varsayılan KAPALI. Kapalıyken ortaokul sınıfındaki bir öğrenci de mevcut
// (lise) panelini görür — yani bayrak açılmadan canlıdaki hiçbir kullanıcı
// için hiçbir şey değişmez. Açma kararı yöneticinindir.

export async function ortaokulAktifMi(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from("platform_ayarlari")
    .select("ortaokul_aktif")
    .eq("id", 1)
    .maybeSingle();
  return data?.ortaokul_aktif === true;
}

// Panelin hangi kademeye göre çizileceğini tek yerden belirler.
// Bayrak kapalıysa DAİMA null döner; çağıran taraf da menüyü değiştirmez.
export async function panelKademesi(
  supabase: SupabaseClient,
  role: string,
  sinifSeviyesi: string | null | undefined,
): Promise<Kademe | null> {
  if (role !== "ogrenci") return null;
  const kademe = kademeBul(sinifSeviyesi);
  if (kademe !== "ortaokul") return null;
  return (await ortaokulAktifMi(supabase)) ? "ortaokul" : null;
}
