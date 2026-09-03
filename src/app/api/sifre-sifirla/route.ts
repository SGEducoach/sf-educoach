import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { geciciSifreMetadata, guvenliGeciciSifre } from "@/lib/gecici-sifre";

type SifirlamaRolu = "ogrenci" | "ogretmen" | "veli" | "mudur";
type Govde = { role?: SifirlamaRolu; email?: string; okulNo?: string };

const PENCERE_MS = 15 * 60 * 1000;
const GECICI_SIFRE_OMRU_MS = 30 * 60 * 1000;
const GENEL_MESAJ = "Hesap bilgileri eşleşiyorsa geçici şifre kayıtlı e-posta adresine gönderildi.";

function istemciIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "bilinmeyen";
}

function guvenliMetin(value: string) {
  return value.replace(/[&<>"']/g, (karakter) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;",
  })[karakter] ?? karakter);
}

export async function POST(request: NextRequest) {
  let body: Govde;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 }); }

  if (!body.role || !["ogrenci", "ogretmen", "veli", "mudur"].includes(body.role)) {
    return NextResponse.json({ error: "Geçersiz kullanıcı türü." }, { status: 400 });
  }

  const tanimlayici = body.role === "mudur"
    ? body.okulNo?.trim().toLocaleLowerCase("tr-TR")
    : body.email?.trim().toLocaleLowerCase("tr-TR");
  if (!tanimlayici) return NextResponse.json({ error: "Bilgiler eksik." }, { status: 400 });

  const admin = createAdminClient();
  const attemptKey = `reset:${createHash("sha256").update(`${istemciIp(request)}|${body.role}|${tanimlayici}`).digest("hex")}`;
  const { data: limit } = await admin.from("login_attempt_limits")
    .select("failed_count, window_started_at").eq("attempt_key", attemptKey).maybeSingle();
  const pencereBaslangici = limit?.window_started_at ? new Date(limit.window_started_at).getTime() : 0;
  const ayniPencere = Date.now() - pencereBaslangici < PENCERE_MS;
  const istekSayisi = ayniPencere ? (limit?.failed_count ?? 0) : 0;
  if (istekSayisi >= 2) {
    return NextResponse.json({ error: "Çok fazla istek gönderildi. 15 dakika sonra tekrar deneyin." }, { status: 429 });
  }
  await admin.from("login_attempt_limits").upsert({
    attempt_key: attemptKey,
    failed_count: istekSayisi + 1,
    window_started_at: ayniPencere && limit?.window_started_at ? limit.window_started_at : new Date().toISOString(),
    blocked_until: null,
    block_count: 0,
    updated_at: new Date().toISOString(),
  });

  let hedefEmail = body.email?.trim().toLocaleLowerCase("tr-TR") ?? "";
  if (body.role === "mudur") {
    const { data } = await admin.rpc("resolve_mudur_email", { p_okul_kodu: body.okulNo?.trim() });
    hedefEmail = typeof data === "string" ? data.toLocaleLowerCase("tr-TR") : "";
  }

  const { data: profil } = hedefEmail
    ? await admin.from("profiles").select("id, ad, email, role, aktif").eq("email", hedefEmail).eq("role", body.role).maybeSingle()
    : { data: null };

  // Hesap varlığını dışarı sızdırmamak için bulunamayan hesaplarda da aynı
  // genel yanıt döner. .internal hesaplarda teslim edilebilir kayıtlı e-posta yoktur.
  if (!profil || profil.aktif === false || !profil.email || profil.email.endsWith(".internal")) {
    return NextResponse.json({ ok: true, message: GENEL_MESAJ });
  }

  const geciciSifre = guvenliGeciciSifre();
  const sonKullanma = new Date(Date.now() + GECICI_SIFRE_OMRU_MS);
  const { data: authKaydi, error: authOkumaHatasi } = await admin.auth.admin.getUserById(profil.id);
  if (authOkumaHatasi || !authKaydi.user) {
    return NextResponse.json({ error: "Şifre sıfırlama şu anda tamamlanamadı." }, { status: 500 });
  }

  const mevcutMetadata = authKaydi.user.user_metadata ?? {};
  const { error: metadataHatasi } = await admin.auth.admin.updateUserById(profil.id, {
    user_metadata: { ...mevcutMetadata, ...geciciSifreMetadata(geciciSifre, sonKullanma) },
  });
  if (metadataHatasi) return NextResponse.json({ error: "Şifre sıfırlama şu anda tamamlanamadı." }, { status: 500 });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: epostaHatasi } = await resend.emails.send({
    from: "SeFu Koç <bildirim@sefukoc.com>",
    to: profil.email,
    subject: "SeFu Koç geçici şifreniz",
    html: `<div style="font-family:Arial,sans-serif;color:#17343c;line-height:1.6;max-width:560px;margin:auto">
      <h2 style="color:#087f8c">SeFu Koç</h2>
      <p>Merhaba ${guvenliMetin(profil.ad)},</p>
      <p>Geçici şifreniz:</p>
      <p style="font-size:22px;font-weight:700;letter-spacing:2px;background:#eef9f8;padding:14px 18px;border-radius:10px;display:inline-block">${guvenliMetin(geciciSifre)}</p>
      <p>Bu şifre <strong>30 dakika</strong> geçerlidir. Geçici şifreyle giriş yaptığınızda yeni bir şifre belirlemeniz istenecektir.</p>
      <p>Bu işlemi siz istemediyseniz mevcut şifreniz çalışmaya devam eder; bu e-postayı yok sayabilirsiniz.</p>
    </div>`,
  });

  if (epostaHatasi) {
    await admin.auth.admin.updateUserById(profil.id, { user_metadata: mevcutMetadata });
    return NextResponse.json({ error: "E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin." }, { status: 502 });
  }

  await admin.from("admin_audit_log").insert({
    actor_id: profil.id,
    eylem: "kullanici_gecici_sifre_istedi",
    detay: { hedef_id: profil.id, rol: profil.role },
  });
  return NextResponse.json({ ok: true, message: GENEL_MESAJ });
}
