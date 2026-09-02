"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { teslimEdilebilirEpostaMi } from "@/lib/validators";

export async function ogretmenEpostasiniTeyitEt(yeniEmail?: string): Promise<{ error: string | null; email: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı.", email: null };

  const admin = createAdminClient();
  const { data: profil } = await admin.from("profiles").select("email, role").eq("id", user.id).maybeSingle();
  if (!profil || profil.role !== "ogretmen") return { error: "Bu işlem yalnızca öğretmen hesapları içindir.", email: null };

  const email = (yeniEmail?.trim() || profil.email || "").toLowerCase();
  if (!teslimEdilebilirEpostaMi(email)) return { error: "Geçerli, e-posta alabilen bir adres girin.", email: null };

  if (email !== profil.email?.toLowerCase()) {
    const { error: authError } = await admin.auth.admin.updateUserById(user.id, { email, email_confirm: true });
    if (authError) return { error: authError.message, email: null };
    const { error: profilError } = await admin.from("profiles").update({ email }).eq("id", user.id);
    if (profilError) {
      if (profil.email) await admin.auth.admin.updateUserById(user.id, { email: profil.email, email_confirm: true });
      return { error: profilError.message, email: null };
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
