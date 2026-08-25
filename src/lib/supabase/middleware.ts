import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Her istekte Supabase oturum çerezini tazeler. middleware.ts içinden çağrılır.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Oturumu tazelemek için gerekli — kaldırılmamalı.
  const { data: { user } } = await supabase.auth.getUser();

  // Site bakım modu (2026-08-26 kullanıcı isteği, bkz. migration 0072) —
  // sadece /dashboard ve /moderator kapsanıyor; /yonetici, /login, /signup
  // her zaman açık kalır ki admin siteyi geri açabilsin. Yalnızca bu iki
  // rota öneki için ekstra bir sorgu çalışır — site açıkken (çoğunlukla)
  // tek satırlık ucuz bir select, kapalıyken ek olarak rol kontrolü yapılır.
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/moderator")) {
    const { data: ayarlar } = await supabase.from("platform_ayarlari").select("site_kapali").eq("id", 1).maybeSingle();
    if (ayarlar?.site_kapali) {
      let adminMi = false;
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        adminMi = profile?.role === "admin";
      }
      if (!adminMi) {
        const url = request.nextUrl.clone();
        url.pathname = "/site-bakimda";
        const bakimResponse = NextResponse.rewrite(url);
        supabaseResponse.cookies.getAll().forEach((c) => bakimResponse.cookies.set(c));
        return bakimResponse;
      }
    }
  }

  return supabaseResponse;
}
