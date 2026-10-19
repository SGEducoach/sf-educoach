import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { bugununTarihiTR } from "@/lib/tarih";
import { kullaniciKurumuGetir, kurumDenemeSuresiDolduMu, DENEME_SURESI_SONA_ERDI_MESAJI } from "@/lib/deneme-suresi";
import { kurumBolumuAcikMi, kurumErisimiKapaliMi, moderatorBolumuAcikMi, KURUM_BAGLANTI_HATASI } from "@/lib/kurum-yetkileri";
import type { DashboardBolumu } from "@/lib/dashboard-navigation";
import type { UserRole } from "@/lib/types";
import type { KurumModulYetkileri } from "@/lib/kurum-yetkileri";

const AKTIF_GUN_CEREZI = "sfec_aktif_gun";

// Bakım modu kontrolü ("/dashboard", "/moderator", "/login", "/signup"
// istekleri) HER seferinde platform_ayarlari'na gitmesin diye 45sn'lik
// kısa bir bellek-içi önbellek (27.08.2026, harici performans önerisi).
// ÖNEMLİ SINIR: bu modül-seviyesi değişken sunucusuz/edge ortamda İŞLEM
// (instance) BAŞINA — Vercel aynı anda birden çok instance çalıştırıyorsa
// her biri kendi ayrı önbelleğine sahip olur, tek bir global önbellek
// DEĞİLDİR. Yine de sıcak bir instance üzerinde art arda gelen istekler
// için DB okumasını gerçek anlamda azaltır; bakım açma/kapama sonrası en
// kötü ihtimalle ~45sn gecikmeli yansır (kabul edilebilir — saniyelik
// güncellik gerekmiyor).
let siteKapaliOnbellek: { deger: boolean; sonKontrolMs: number } | null = null;
const SITE_KAPALI_ONBELLEK_SURESI_MS = 45_000;

async function siteKapaliMiGetir(supabase: ReturnType<typeof createServerClient>): Promise<boolean> {
  const simdi = Date.now();
  if (siteKapaliOnbellek && simdi - siteKapaliOnbellek.sonKontrolMs < SITE_KAPALI_ONBELLEK_SURESI_MS) {
    return siteKapaliOnbellek.deger;
  }
  const { data } = await supabase.from("platform_ayarlari").select("site_kapali").eq("id", 1).maybeSingle();
  const deger = !!data?.site_kapali;
  siteKapaliOnbellek = { deger, sonKontrolMs: simdi };
  return deger;
}

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
  const { pathname } = request.nextUrl;

  // Server Action'lar sayfa çiziminden önce çalışır. Kapatılmış kurumu ve
  // modülü POST aşamasında da durdur; sadece menüyü gizlemek yeterli değil.
  const kurumIstekMi = pathname === "/dashboard" || pathname.startsWith("/dashboard/")
    || pathname === "/moderator" || pathname.startsWith("/moderator/")
    || (pathname.startsWith("/api/") && pathname !== "/api/giris");
  const moderatorIstekMi = pathname === "/moderator" || pathname.startsWith("/moderator/");
  if (user && ((request.method === "POST" && kurumIstekMi) || moderatorIstekMi)) {
    const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profil && profil.role !== "admin") {
      let kurum: { aktif: boolean; manuelAktif: boolean; kullanimBitisTarihi: string | null; denemeBitisTarihi: string | null; grupMu: boolean; modulYetkileri: KurumModulYetkileri } | undefined;
      if (moderatorIstekMi) {
        const { data: yetki } = await supabase.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle();
        if (!yetki) {
          if (request.method === "GET") return NextResponse.redirect(new URL("/dashboard", request.url));
          return NextResponse.json({ error: "Moderatör yetkisi gerekiyor." }, { status: 403 });
        }
        const { data: okul } = await supabase.from("schools").select("aktif, manuel_aktif, kullanim_bitis_tarihi, deneme_bitis_tarihi, grup_kapasitesi, modul_yetkileri").eq("id", yetki.school_id).maybeSingle();
        if (okul) kurum = {
          aktif: okul.aktif !== false, manuelAktif: okul.manuel_aktif !== false,
          kullanimBitisTarihi: okul.kullanim_bitis_tarihi as string | null,
          denemeBitisTarihi: okul.deneme_bitis_tarihi as string | null,
          grupMu: okul.grup_kapasitesi !== null,
          modulYetkileri: (okul.modul_yetkileri as KurumModulYetkileri | null) ?? {},
        };
      } else {
        kurum = await kullaniciKurumuGetir(supabase, user.id, profil.role as UserRole);
      }
      if (kurumErisimiKapaliMi(kurum)) {
        if (request.method === "GET" && moderatorIstekMi) return NextResponse.redirect(new URL("/dashboard", request.url));
        return NextResponse.json({ error: KURUM_BAGLANTI_HATASI }, { status: 403 });
      }
      if (kurumDenemeSuresiDolduMu(kurum)) {
        if (request.method === "GET" && moderatorIstekMi) return NextResponse.redirect(new URL("/dashboard", request.url));
        return NextResponse.json({ error: DENEME_SURESI_SONA_ERDI_MESAJI }, { status: 403 });
      }
      const bolum = pathname.startsWith("/dashboard")
        ? (pathname.split("/")[2] || request.nextUrl.searchParams.get("bolum") || "ozet") as DashboardBolumu
        : null;
      if (bolum && !kurumBolumuAcikMi(kurum?.modulYetkileri, bolum)) {
        return NextResponse.json({ error: "Bu modül kurumunuz için kapalı." }, { status: 403 });
      }
      if (moderatorIstekMi) {
        const moderatorBolumu = pathname.split("/")[2] || request.nextUrl.searchParams.get("bolum") || "ogrenciler";
        if (!moderatorBolumuAcikMi(kurum?.modulYetkileri, moderatorBolumu)) {
          if (request.method === "GET") return NextResponse.redirect(new URL("/moderator/profil", request.url));
          return NextResponse.json({ error: "Bu modül kurumunuz için kapalı." }, { status: 403 });
        }
      }
    }
  }

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

    // Aktif gün sayacı (kullanıcı isteği 26.09.2026, migration 0124) — admin
    // "Öğrenci Aktivitesi"ndeki "en çok giriş yapan" kartı. Günde bir kez
    // yazılsın diye son kaydedilen gün çerezde tutulur; her istekte ek sorgu
    // gitmez. Migration uygulanmamışsa RPC hata verir, çerez yine yazılır ki
    // gün içinde tekrar denenmesin.
    const bugun = bugununTarihiTR();
    if (request.cookies.get(AKTIF_GUN_CEREZI)?.value !== bugun) {
      await supabase.rpc("aktif_gun_kaydet");
      supabaseResponse.cookies.set(AKTIF_GUN_CEREZI, bugun, { maxAge: 60 * 60 * 36, httpOnly: true, sameSite: "lax", path: "/" });
    }
  }

  // Site bakım modu (2026-08-26 kullanıcı isteği, bkz. migration 0072/bugünkü
  // güncelleme) — /dashboard, /moderator, /login VE /signup kapsanıyor:
  // kullanıcı daha giriş yapmadan bakımda olduğu uyarısını görsün, giriş/
  // kayıt sayfası hiç açılmasın. /yonetici (admin'in ayrı, gizli girişi)
  // BİLİNÇLİ OLARAK kapsam dışı — aksi halde admin siteyi geri açamazdı.
  // 27.08.2026: "sitenin kapalı olma durumu ana sayfayı da kapsayacak" —
  // "/" TAM EŞLEŞME ile eklendi (startsWith değil — her yol "/" ile
  // başladığı için startsWith kullansaydık /yonetici dahil HER rota
  // bakıma girerdi).
  const bakimKapsaminda = pathname === "/" || ["/dashboard", "/moderator", "/login", "/signup", "/belletmen-kayit"].some((p) => pathname.startsWith(p));
  if (bakimKapsaminda) {
    const siteKapaliMi = await siteKapaliMiGetir(supabase);
    if (siteKapaliMi) {
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
