import { createHash, randomBytes } from "node:crypto";
import { CodeChallengeMethod } from "google-auth-library";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { driveBiletImzala, driveSirCoz, driveSirSifrele } from "@/lib/whatsapp-drive-crypto";
import {
  DRIVE_COOKIE, DRIVE_SCOPE, DriveHatasi, driveBaglantisiOku, driveEksikAyarlar, driveErisimAnahtari, driveKayit,
  driveKlasoruDogrula, driveKullanicisi, driveOAuth, driveSiteAdresi, driveTokenOnbelleginiSil, driveYuklemeBaslat, driveYuklemeTamamla,
} from "@/lib/whatsapp-drive-sunucu";

export const runtime = "nodejs";
export const maxDuration = 60;
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
function hata(e: unknown) { return json({ error: e instanceof DriveHatasi || (e instanceof Error && /^(Geçerli|PDF,|Dosya |Geçersiz Drive|Drive işleminin)/.test(e.message)) ? e.message : "Drive işlemi tamamlanamadı. Yeniden deneyin." }, e instanceof DriveHatasi ? e.status : 400); }
async function girdiOku(request: NextRequest): Promise<Record<string, unknown>> {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new DriveHatasi("İsteği bu siteden gönderin.", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new DriveHatasi("Geçersiz istek.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new DriveHatasi("İstek boş.");
  const parcalar: Uint8Array[] = []; let boyut = 0;
  try {
    while (true) { const r = await reader.read(); if (r.done) break; boyut += r.value.byteLength; if (boyut > 8192) { await reader.cancel(); throw new DriveHatasi("İstek çok büyük.", 413); } parcalar.push(r.value); }
  } finally { reader.releaseLock(); }
  const data = JSON.parse(Buffer.concat(parcalar).toString("utf8"));
  if (!data || Array.isArray(data) || typeof data !== "object") throw new DriveHatasi("Geçersiz istek.");
  return data;
}
export async function GET() {
  try {
    const k = await driveKullanicisi(); const eksikler = driveEksikAyarlar();
    let b = null, tabloHazir = true;
    try { b = await driveBaglantisiOku(); } catch { tabloHazir = false; }
    return json({ hazir: tabloHazir && !eksikler.length && !!b?.klasor_id, bagli: !!b, klasorAdi: b?.klasor_adi ?? null,
      ...(k.adminMi ? { kurulumHazir: !eksikler.length, eksikler, tabloHazir } : {}) });
  } catch (e) { return hata(e); }
}
export async function POST(request: NextRequest) {
  try {
    const data = await girdiOku(request);
    const adminIslemi = ["baglan", "picker", "klasor", "ayir"].includes(String(data.islem));
    const k = await driveKullanicisi(adminIslemi);
    if (data.islem === "baglan") {
      if (new URL(request.url).origin !== driveSiteAdresi()) throw new DriveHatasi("Google bağlantısını ayarlanan ana site adresinden başlatın.");
      await driveBaglantisiOku(); // migration yoksa Google'a göndermeden açıkça bildir.
      const oauth = driveOAuth(), verifier = randomBytes(32).toString("base64url");
      const state = driveBiletImzala("oauth", { aktor: k.id, nonce: randomBytes(24).toString("base64url"), exp: Date.now() + 10 * 60_000 });
      const adres = oauth.generateAuthUrl({ scope: [DRIVE_SCOPE], access_type: "offline", prompt: "consent", state,
        code_challenge: createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: CodeChallengeMethod.S256 });
      const r = json({ adres });
      r.cookies.set(DRIVE_COOKIE, driveSirSifrele(JSON.stringify({ state, verifier })), { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", maxAge: 600, path: "/api/whatsapp-drive" });
      return r;
    }
    const b = await driveBaglantisiOku();
    if (!b) throw new DriveHatasi("Admin Google Drive hesabını henüz bağlamadı.", 503);
    if (data.islem === "picker") return json({ token: await driveErisimAnahtari(b), key: process.env.GOOGLE_DRIVE_PICKER_KEY, appId: process.env.GOOGLE_DRIVE_PROJECT_NUMBER });
    if (data.islem === "klasor") {
      if (typeof data.id !== "string") throw new DriveHatasi("Klasör seçin.");
      const klasor = await driveKlasoruDogrula(await driveErisimAnahtari(b), data.id);
      const { error } = await createAdminClient().from("whatsapp_drive_baglantisi").update({ klasor_id: klasor.id, klasor_adi: klasor.ad, updated_at: new Date().toISOString() }).eq("id", 1);
      if (error) throw new DriveHatasi("Klasör kaydedilemedi.", 503);
      await driveKayit(k, "whatsapp_drive_klasor", { klasor_id: klasor.id });
      return json({ tamam: true });
    }
    if (data.islem === "ayir") {
      const { error } = await createAdminClient().from("whatsapp_drive_baglantisi").delete().eq("id", 1);
      if (error) throw new DriveHatasi("Bağlantı kaldırılamadı.", 503);
      driveTokenOnbelleginiSil();
      // Site bağlantısı önce kapanır. Google iznini iptal etme hatası eski dosyaları etkilemez.
      try { await driveOAuth().revokeToken(driveSirCoz(b.refresh_token_sifreli)); } catch { /* Kullanıcı Google Hesabı > Güvenlik'ten de iptal edebilir. */ }
      await driveKayit(k, "whatsapp_drive_ayir", {});
      return json({ tamam: true });
    }
    if (data.islem === "baslat") return json(await driveYuklemeBaslat(k, b, { ad: data.ad, boyut: data.boyut }));
    if (data.islem === "tamamla" && typeof data.bilet === "string") return json(await driveYuklemeTamamla(k, b, data.bilet));
    throw new DriveHatasi("Geçersiz Drive işlemi.");
  } catch (e) { return hata(e); }
}
