"use server";

// Faz G (2026-08-25 kullanıcı isteği) — "tüm kullanıcılara hata bildir
// bölümü hazırla ... hepsi için kayıt defteri oluşturulsun." Her rol
// (öğrenci/veli/öğretmen/müdür/admin) bu TEK action ile bildirim
// gönderebiliyor; bildiren_rol İSTEMCİDEN alınmıyor, sunucuda kendi
// profilinden türetiliyor (sahtecilik önlenir).
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MESAJ_MAKS_UZUNLUK = 2000;

export async function hataBildir(mesaj: string, sayfa?: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile) return { error: "Profiliniz bulunamadı." };

  const mesajTemiz = mesaj.trim();
  if (!mesajTemiz) return { error: "Lütfen yaşadığınız sorunu kısaca açıklayın." };
  if (mesajTemiz.length > MESAJ_MAKS_UZUNLUK) return { error: `En fazla ${MESAJ_MAKS_UZUNLUK} karakter yazabilirsiniz.` };

  const admin = createAdminClient();
  const { error } = await admin.from("hata_bildirimleri").insert({
    bildiren_id: user.id,
    bildiren_rol: profile.role,
    mesaj: mesajTemiz,
    sayfa: sayfa?.trim().slice(0, 200) || null,
  });
  if (error) return { error: error.message };
  return { error: null };
}
