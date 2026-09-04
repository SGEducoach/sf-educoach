import { createClient as supabaseIstemci } from "@supabase/supabase-js";

// Çerezsiz, salt-okuma sunucu istemcisi — unstable_cache içinde
// kullanılabilmesi için cookies()/headers() ÇAĞIRMAMASI gerekir
// (Next.js, önbelleklenen fonksiyonun içinde dinamik API kullanımını
// yasaklar). Sadece RLS "select using (true)" olan herkese açık
// tablolarda (app_ayarlari, ana_sayfa_*, platform_ayarlari okuma)
// kullanılmalıdır; kişiselleştirilmiş veri bu istemciden GEÇMEMELİ.
export function anonSunucuOkuyucu() {
  return supabaseIstemci(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
