"use server";

// Admin'in KENDİ hesabını yönettiği "Profilim" bölümü — ad/e-posta/telefon
// düzenleme. Kasıtlı olarak userId hiçbir yerden parametre olarak
// alınmıyor, her zaman oturumdaki kullanıcının kendi id'si kullanılıyor —
// aksi halde bu action'lar herhangi bir kullanıcıyı düzenlemek için
// kötüye kullanılabilirdi. Ayrı bir dosyada (yonetici/actions.ts zaten
// büyük ve bu depoda eşzamanlı düzenlenebiliyor) — requireAdmin() burada
// kasıtlı olarak yeniden tanımlı (bkz. pdf-eslesme-actions.ts'teki aynı desen).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adNormalize, telefonGecerliMi } from "@/lib/validators";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/yonetici");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return { user, admin: createAdminClient() };
}

export async function adminKendiBilgileriniGetir(): Promise<{ error: string | null; ad: string; email: string; telefon: string }> {
  const { user, admin } = await requireAdmin();
  const { data, error } = await admin.from("profiles").select("ad, email, telefon").eq("id", user.id).maybeSingle();
  if (error || !data) return { error: error?.message ?? "Profil bulunamadı.", ad: "", email: "", telefon: "" };
  return { error: null, ad: data.ad, email: data.email ?? "", telefon: data.telefon ?? "" };
}

export async function adminKendiBilgileriniGuncelle(input: { ad: string; email: string; telefon: string }): Promise<{ error: string | null }> {
  const { user, admin } = await requireAdmin();
  const ad = adNormalize(input.ad);
  const email = input.email.trim().toLowerCase();
  const telefon = input.telefon.trim();
  if (!ad) return { error: "Ad soyad gerekli." };
  if (!email || !email.includes("@")) return { error: "Geçerli bir e-posta girin." };
  if (telefon && !telefonGecerliMi(telefon)) return { error: "Telefon 10-11 rakam olmalı." };

  const { data: mevcut } = await admin.from("profiles").select("email").eq("id", user.id).maybeSingle();

  const { error: authError } = await admin.auth.admin.updateUserById(user.id, { email, email_confirm: true });
  if (authError) return { error: authError.message };
  const { error: profileError } = await admin.from("profiles").update({ ad, email, telefon: telefon || null }).eq("id", user.id);
  if (profileError) {
    if (mevcut?.email) await admin.auth.admin.updateUserById(user.id, { email: mevcut.email, email_confirm: true });
    return { error: profileError.message };
  }
  revalidatePath("/yonetici");
  return { error: null };
}
