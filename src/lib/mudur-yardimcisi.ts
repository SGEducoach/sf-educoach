// Müdür yardımcısı (kullanıcı kararı 18.10.2026, migration 0163): kurumdaki
// bir öğretmen atanır. Aynı hesapla öğretmen girişinde öğretmen paneline,
// İdare girişinde müdür yardımcısı paneline girer; hangi panelde olduğu
// IDARE_CEREZI ile tutulur. Müdür yardımcısı rehber gibi seçilen sınıf
// düzeylerinden sorumludur; yurtlu okulda "yurt" sorumluluğu da alabilir.
//
// Kapsam yetkisi sunucuda yine üyelikten doğrulanır — çerez yalnız
// "hangi panel" tercihidir, yetki vermez.
import type { SupabaseClient } from "@supabase/supabase-js";

export const IDARE_CEREZI = "sfec_panel";
export const IDARE_UNVANI = "Müdür Yardımcısı";

export interface MudurYardimcisiUyeligi {
  schoolId: string;
  sinifDuzeyleri: string[];
  yurt: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

// Tablo yoksa (migration uygulanmadıysa) null: kimse müdür yardımcısı değil.
export async function mudurYardimcisiUyeligiGetir(supabase: Istemci, profileId: string): Promise<MudurYardimcisiUyeligi | null> {
  const { data, error } = await supabase.from("mudur_yardimcilari").select("school_id, sinif_duzeyleri, yurt").eq("profile_id", profileId).maybeSingle();
  if (error || !data) return null;
  return {
    schoolId: data.school_id as string,
    sinifDuzeyleri: (data.sinif_duzeyleri as string[] | null) ?? [],
    yurt: data.yurt === true,
  };
}

// Kişi şu an İdare panelinde mi? Çerez "idare" VE geçerli üyelik.
export async function idarePaneliUyeligi(supabase: Istemci, profileId: string, cerezDegeri: string | undefined): Promise<MudurYardimcisiUyeligi | null> {
  if (cerezDegeri !== "idare") return null;
  return mudurYardimcisiUyeligiGetir(supabase, profileId);
}

// Yurt sorumlusu müdür yardımcıları (Faz 3: yoklama bildirimleri).
export async function yurtSorumlulari(supabase: Istemci, schoolId: string): Promise<string[]> {
  const { data } = await supabase.from("mudur_yardimcilari").select("profile_id").eq("school_id", schoolId).eq("yurt", true);
  return ((data ?? []) as { profile_id: string }[]).map((r) => r.profile_id);
}
