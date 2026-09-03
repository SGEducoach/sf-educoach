import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Çerez KULLANMAYAN, anon anahtarlı istemci. Blog gibi herkese açık, oturum
// gerektirmeyen sayfalar için — server.ts'teki istemci cookies() okuduğu için
// generateStaticParams/sitemap gibi derleme anında çalışan yerlerde
// kullanılamıyor (Next.js: "used cookies() inside generateStaticParams").
// RLS aynen geçerli: blog_yazilari politikası anonim kullanıcıya yalnız
// yayında olan yazıları gösteriyor.
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
