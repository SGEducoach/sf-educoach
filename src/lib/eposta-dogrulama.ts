import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import type { createAdminClient } from "@/lib/supabase/admin";
import { SITE_ADRESI, ogretmenBildirimEpostasi } from "@/lib/ogretmen-bildirim-sablon";

// Kullanıcının kendi eklediği e-postanın doğrulanması (Grup Koçluk Faz 5,
// bkz. migration 0116). Bağlantı tek kullanımlık, 48 saat geçerli; belirtecin
// yalnızca özeti saklanır. Doğrulanınca hem Auth hem profiles e-postası
// güncellenir (öğrenci girişi e-postayı profiles'tan çözer).

type Admin = ReturnType<typeof createAdminClient>;
const GECERLILIK_SAAT = 48;

const ozet = (token: string) => createHash("sha256").update(token).digest("hex");

export async function epostaDogrulamaGonder(admin: Admin, profileId: string, ad: string, email: string): Promise<{ error: string | null }> {
  if (!process.env.RESEND_API_KEY) return { error: "E-posta gönderimi şu an kullanılamıyor." };
  const token = randomBytes(32).toString("hex");
  // Önceki bekleyen doğrulamalar geçersiz olur; yalnızca son eklenen adres doğrulanabilir.
  await admin.from("eposta_dogrulamalari").delete().eq("profile_id", profileId);
  const { error } = await admin.from("eposta_dogrulamalari").insert({
    profile_id: profileId, email, token_ozeti: ozet(token),
    son_gecerlilik: new Date(Date.now() + GECERLILIK_SAAT * 60 * 60 * 1000).toISOString(),
  });
  if (error) return { error: error.message };

  const baglanti = `${SITE_ADRESI}/eposta-dogrula?t=${token}`;
  const { subject, html } = ogretmenBildirimEpostasi(
    ad, "E-posta adresini doğrula",
    `SeFu Koç hesabına bu e-posta adresini ekledin. Doğrulamak için aşağıdaki bağlantıya tıkla. Bağlantı ${GECERLILIK_SAAT} saat geçerli. Bu işlemi sen yapmadıysan bu e-postayı yok sayabilirsin.`,
    baglanti,
  );
  const { error: gonderimHatasi } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: "SeFu Koç <bildirim@sefukoc.com>", to: email, subject, html,
  });
  if (gonderimHatasi) {
    console.error("doğrulama e-postası gönderilemedi:", gonderimHatasi.message);
    return { error: "Doğrulama e-postası gönderilemedi." };
  }
  return { error: null };
}

export async function epostaDogrula(admin: Admin, token: string): Promise<{ error: string | null; email: string | null }> {
  if (!/^[0-9a-f]{64}$/.test(token)) return { error: "Bağlantı geçersiz.", email: null };
  const { data: kayit } = await admin.from("eposta_dogrulamalari")
    .select("id, profile_id, email, son_gecerlilik").eq("token_ozeti", ozet(token)).maybeSingle();
  if (!kayit) return { error: "Bağlantı geçersiz ya da daha önce kullanılmış.", email: null };
  if (new Date(kayit.son_gecerlilik).getTime() < Date.now()) {
    await admin.from("eposta_dogrulamalari").delete().eq("id", kayit.id);
    return { error: "Bağlantının süresi dolmuş. Hesabından e-postanı yeniden ekleyebilirsin.", email: null };
  }

  const { data: mevcut } = await admin.from("profiles").select("email").eq("id", kayit.profile_id).maybeSingle();
  const { error: authHatasi } = await admin.auth.admin.updateUserById(kayit.profile_id, { email: kayit.email, email_confirm: true });
  if (authHatasi) {
    const kullanimda = authHatasi.message.toLowerCase().includes("already");
    return { error: kullanimda ? "Bu e-posta adresi başka bir hesapta kullanılıyor." : authHatasi.message, email: null };
  }
  const { error: profilHatasi } = await admin.from("profiles").update({ email: kayit.email }).eq("id", kayit.profile_id);
  if (profilHatasi) {
    // Girişin çözdüğü iki adres ayrışmasın: Auth tarafını geri al.
    if (mevcut?.email) await admin.auth.admin.updateUserById(kayit.profile_id, { email: mevcut.email, email_confirm: true });
    return { error: profilHatasi.message, email: null };
  }
  await admin.from("eposta_dogrulamalari").delete().eq("profile_id", kayit.profile_id);
  return { error: null, email: kayit.email as string };
}
