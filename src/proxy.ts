import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// SG EduCoach -> SF EduCoach marka değişikliği sırasında Vercel projesi
// yeniden adlandırıldı (sg-educoach -> sf-educoach). Eski otomatik
// vercel.app adresleri hâlâ bu projeye alias'lı olduğu için, kayıtlı
// kullanıcıların eski kısayolları/bookmarkları kırılmasın diye kalıcı
// (308) yönlendirme yapıyoruz. (Not: bu yönlendirme önce projenin SSO
// deployment protection'ı "all except custom domains" iken denenmiş ve
// sf-educoach.vercel.app'in korumaya takılıp gerçek kullanıcıları Vercel
// giriş ekranına düşürdüğü görülmüştü — SSO koruması kapatıldıktan sonra
// tekrar etkinleştirildi.)
const ESKI_VERCEL_DOMAINLERI = new Set([
  "sg-educoach.vercel.app",
  "sg-educoach-sg-educoach.vercel.app",
  "sg-educoach-git-main-sg-educoach.vercel.app",
]);
const YENI_DOMAIN = "sf-educoach.vercel.app";

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  if (host && ESKI_VERCEL_DOMAINLERI.has(host)) {
    const hedefUrl = new URL(request.url);
    hedefUrl.protocol = "https:";
    hedefUrl.host = YENI_DOMAIN;
    hedefUrl.port = "";
    return NextResponse.redirect(hedefUrl, 308);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
