import { unstable_cache } from "next/cache";
import { anonSunucuOkuyucu } from "@/lib/supabase/anon-server";
import { SITE_TEMA_ANAHTAR, temaRengiGecerliMi, VARSAYILAN_TEMA_RENGI } from "@/lib/site-tema";

// app_ayarlari genel amaçlı key/value ayar tablosu — select herkese açık
// (RLS: using (true)), yazma sadece admin (service-role, bkz.
// src/app/yonetici/actions.ts). Server component'lerden (ör. signup
// sayfası) doğrudan çağrılabilir, "use server" gerekmiyor çünkü bir action
// değil, salt okuma yapan bir yardımcı fonksiyon.
//
// Performans (2026-09-04): ayarlar nadiren değiştiğinden okuma 60 saniyelik
// unstable_cache ile sarılı — sayfa başına tekrarlanan DB çağrıları pratikte
// sıfırlanır. Admin kaydetme action'ları revalidateTag("app-ayarlari")
// çağırarak anında tazeler (etiket ismi aşağıdakiyle aynı kalmalı).
export const APP_AYARLARI_ONBELLEK_ETIKETI = "app-ayarlari";

const onbellekliAyarOku = unstable_cache(
  async (anahtar: string): Promise<string | null> => {
    const { data } = await anonSunucuOkuyucu()
      .from("app_ayarlari")
      .select("deger")
      .eq("anahtar", anahtar)
      .maybeSingle();
    return data?.deger ?? null;
  },
  ["app-ayarlari-oku"],
  { revalidate: 60, tags: [APP_AYARLARI_ONBELLEK_ETIKETI] },
);

export async function appAyariGetir(anahtar: string): Promise<string | null> {
  return onbellekliAyarOku(anahtar);
}

// Site ana temasının zemin rengi (admin paneli → Site ayarları). Palet
// ve varsayılan src/lib/site-tema.ts'te; okuma burada çünkü site-tema.ts
// istemci bileşenleri tarafından da paylaşılıyor.
export async function siteTemaRengiGetir(): Promise<string> {
  const deger = await appAyariGetir(SITE_TEMA_ANAHTAR);
  return deger && temaRengiGecerliMi(deger) ? deger : VARSAYILAN_TEMA_RENGI;
}
