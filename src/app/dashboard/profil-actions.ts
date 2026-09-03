"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { teslimEdilebilirEpostaMi } from "@/lib/validators";

// Supabase/Postgres ham hatalarini kullaniciya gosterilebilir Turkce
// mesaja cevirir. Bos veya "{}" gelen govdeler de burada yakalanir.
function epostaHatasiniCevir(mesaj: string | null | undefined): string {
  const m = (mesaj ?? "").trim().toLowerCase();
  if (!m || m === "{}" || m.includes("already been registered") || m.includes("already registered")
    || m.includes("duplicate key") || m.includes("unique constraint")) {
    return "Bu e-posta adresi başka bir hesapta kayıtlı. Farklı bir adres girin.";
  }
  if (m.includes("invalid format") || m.includes("validate email")) {
    return "E-posta adresi geçersiz görünüyor (örnek: adiniz@ornek.com).";
  }
  if (m.includes("rate limit")) {
    return "Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.";
  }
  return "E-posta kaydedilemedi. Adresi kontrol edip tekrar deneyin.";
}

export async function ogretmenEpostasiniTeyitEt(yeniEmail?: string): Promise<{ error: string | null; email: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı.", email: null };

  const admin = createAdminClient();
  // Kullanıcı isteği (30.08.2026): müdürler de şifre sıfırlamayı e-posta
  // üzerinden yapıyor (giriş ekranında okul koduyla giriyor ama sıfırlama
  // bağlantısı gerçek adresine gidiyor — bkz. LoginForm resolve_mudur_email),
  // bu yüzden teyit akışı müdürü de kapsıyor.
  const { data: profil } = await admin.from("profiles").select("email, role").eq("id", user.id).maybeSingle();
  if (!profil || (profil.role !== "ogretmen" && profil.role !== "mudur")) {
    return { error: "Bu işlem yalnızca öğretmen ve müdür hesapları içindir.", email: null };
  }

  const email = (yeniEmail?.trim() || profil.email || "").toLowerCase();
  if (!teslimEdilebilirEpostaMi(email)) {
    return { error: "Geçerli bir e-posta adresi girin (örnek: adiniz@ornek.com).", email: null };
  }

  if (email !== profil.email?.toLowerCase()) {
    // Kullanıcı bulgusu (02.09.2026): adres BAŞKA bir hesapta kayıtlıysa
    // Supabase 500 + boş gövde döndürüyor, SDK bunu message="{}" yapıyor ve
    // ekranda kırmızı bir "{}" görünüyordu. Çakışmayı önce burada yakalayıp
    // anlaşılır bir mesaj veriyoruz; yine de kaçan hatalar aşağıda Türkçeye
    // çevriliyor — ham/boş mesaj kullanıcıya asla gösterilmiyor.
    const { data: cakisanProfil } = await admin
      .from("profiles").select("id").ilike("email", email).neq("id", user.id).maybeSingle();
    if (cakisanProfil) {
      return { error: "Bu e-posta adresi başka bir hesapta kayıtlı. Farklı bir adres girin.", email: null };
    }

    const { error: authError } = await admin.auth.admin.updateUserById(user.id, { email, email_confirm: true });
    if (authError) return { error: epostaHatasiniCevir(authError.message), email: null };
    const { error: profilError } = await admin.from("profiles").update({ email }).eq("id", user.id);
    if (profilError) {
      if (profil.email) await admin.auth.admin.updateUserById(user.id, { email: profil.email, email_confirm: true });
      return { error: epostaHatasiniCevir(profilError.message), email: null };
    }
  }

  const { data: authKaydi, error: authOkumaHatasi } = await admin.auth.admin.getUserById(user.id);
  if (authOkumaHatasi || !authKaydi.user) return { error: "E-posta teyidi kaydedilemedi.", email: null };
  const { error: teyitHatasi } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...(authKaydi.user.user_metadata ?? {}),
      sifre_eposta_teyit_email: email,
      sifre_eposta_teyit_at: new Date().toISOString(),
    },
  });
  if (teyitHatasi) return { error: teyitHatasi.message, email: null };

  await admin.from("admin_audit_log").insert({
    actor_id: user.id,
    eylem: "ogretmen_eposta_teyit",
    detay: { email_degisti: email !== profil.email?.toLowerCase() },
  });
  return { error: null, email };
}
