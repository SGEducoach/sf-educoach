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

  // "Şu an aktif kullanıcı" göstergesi (2026-08-26 kullanıcı isteği, bkz.
  // migration 0073) — gerçek zamanlı websocket/presence yerine, her istekte
  // son_gorulme'yi güncelleyip admin panelinde "son 5 dakika içinde
  // güncellenen" sayısını gösteriyoruz. WHERE koşulu throttle görevi görüyor
  // (en fazla dakikada bir yazma) — RLS zaten kullanıcının SADECE kendi
  // satırını güncellemesine izin veriyor (profiles_update_own).
  if (user) {
    const birDakikaOnce = new Date(Date.now() - 60_000).toISOString();
    await supabase
      .from("profiles")
      .update({ son_gorulme: new Date().toISOString() })
      .eq("id", user.id)
      .or(`son_gorulme.is.null,son_gorulme.lt.${birDakikaOnce}`);
  }

  // Site bakım modu (2026-08-26 kullanıcı isteği, bkz. migration 0072/bugünkü
  // güncelleme) — /dashboard, /moderator, /login VE /signup kapsanıyor:
  // kullanıcı daha giriş yapmadan bakımda olduğu uyarısını görsün, giriş/
  // kayıt sayfası hiç açılmasın. /yonetici (admin'in ayrı, gizli girişi)
  // BİLİNÇLİ OLARAK kapsam dışı — aksi halde admin siteyi geri açamazdı.
  const { pathname } = request.nextUrl;
  const bakimKapsaminda = ["/dashboard", "/moderator", "/login", "/signup"].some((p) => pathname.startsWith(p));
  if (bakimKapsaminda) {
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
