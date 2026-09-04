import { createClient } from "@/lib/supabase/server";
import { SITE_TEMA_ANAHTAR, temaRengiGecerliMi, VARSAYILAN_TEMA_RENGI } from "@/lib/site-tema";

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

// Site ana temasının zemin rengi (admin paneli → Site ayarları). Palet
// ve varsayılan src/lib/site-tema.ts'te; okuma burada çünkü site-tema.ts
// istemci bileşenleri tarafından da paylaşılıyor.
export async function siteTemaRengiGetir(): Promise<string> {
  const deger = await appAyariGetir(SITE_TEMA_ANAHTAR);
  return deger && temaRengiGecerliMi(deger) ? deger : VARSAYILAN_TEMA_RENGI;
}
