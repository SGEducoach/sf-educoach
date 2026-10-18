import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IDARE_CEREZI, mudurYardimcisiUyeligiGetir } from "@/lib/mudur-yardimcisi";

// Öğretmen paneli ↔ müdür yardımcısı paneli geçişi (migration 0163). Tercih
// çerezde tutulur; yetki yine sunucuda üyelikten doğrulanır. İdare girişi
// de (Faz 2) oturum açınca buraya yönlenir.
export async function GET(request: NextRequest) {
  const mod = request.nextUrl.searchParams.get("mod");
  const hedef = new URL("/dashboard", request.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const yanit = NextResponse.redirect(hedef);
  if (mod === "idare" && await mudurYardimcisiUyeligiGetir(supabase, user.id)) {
    yanit.cookies.set(IDARE_CEREZI, "idare", { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
  } else {
    yanit.cookies.delete(IDARE_CEREZI);
  }
  return yanit;
}
