import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { driveBiletOku, driveSirCoz, driveSirSifrele } from "@/lib/whatsapp-drive-crypto";
import { DRIVE_COOKIE, DRIVE_DONUS, DRIVE_SCOPE, driveKullanicisi, driveOAuth, driveSiteAdresi, driveKayit, driveTokenOnbelleginiSil } from "@/lib/whatsapp-drive-sunucu";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  // Hata/başarı yalnız sabit bir kodla iletilir; Google token/yanıtı URL'ye veya loga yazılmaz.
  let sonuc = "hata";
  try {
    const k = await driveKullanicisi(true);
    const code = request.nextUrl.searchParams.get("code"), state = request.nextUrl.searchParams.get("state");
    const cerez = request.cookies.get(DRIVE_COOKIE)?.value;
    if (!code || code.length > 4096 || !state || !cerez || request.nextUrl.searchParams.has("error")) throw new Error("OAuth tamamlanmadı");
    const sakli = JSON.parse(driveSirCoz(cerez));
    if (state !== sakli.state || typeof sakli.verifier !== "string") throw new Error("State uyuşmadı");
    const veri = driveBiletOku("oauth", state);
    if (veri.aktor !== k.id) throw new Error("Aktör uyuşmadı");
    const { tokens } = await driveOAuth().getToken({ code, codeVerifier: sakli.verifier, redirect_uri: driveSiteAdresi() + DRIVE_DONUS });
    if (!tokens.refresh_token || !tokens.scope?.split(" ").includes(DRIVE_SCOPE)) throw new Error("Gerekli yetki verilmedi");
    const { error } = await createAdminClient().from("whatsapp_drive_baglantisi").upsert({ id: 1, refresh_token_sifreli: driveSirSifrele(tokens.refresh_token), klasor_id: null, klasor_adi: null, baglayan_id: k.id, updated_at: new Date().toISOString() });
    if (error) throw new Error("Kayıt başarısız");
    driveTokenOnbelleginiSil(); await driveKayit(k, "whatsapp_drive_bagla", {}); sonuc = "baglandi";
  } catch { /* Admin ekranı yeniden bağlanma yönergesini gösterir. */ }
  const response = NextResponse.redirect(new URL(`/yonetici/iletisim?sekme=whatsapp&drive=${sonuc}`, driveSiteAdresi()), 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.cookies.set(DRIVE_COOKIE, "", { maxAge: 0, path: "/api/whatsapp-drive" });
  return response;
}
