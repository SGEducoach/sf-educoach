import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// NOT: sg-educoach.vercel.app -> sf-educoach.vercel.app yönlendirmesi
// BİLEREK devre dışı. sf-educoach.vercel.app, Vercel'in "all except
// custom domains" SSO korumasına takılıyor (yalnızca projenin özgün
// varsayılan domaini olan sg-educoach.vercel.app bu korumadan muaf) —
// yönlendirme açılırsa gerçek kullanıcılar Vercel giriş ekranına düşer.
// Kullanıcıyla SSO korumasını kapatma kararı netleşmeden bu satır geri
// açılmayacak.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
