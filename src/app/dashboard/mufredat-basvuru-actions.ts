"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mufredatBasvuruMesaji, mufredatBasvurusuDogrula } from "@/lib/mufredat-basvurusu";

export async function mufredatBasvurusuGonder(girdi: unknown, sayfa?: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Başvuru için oturum açın." };
  const { data: profil, error: profilHatasi } = await supabase.from("profiles")
    .select("role, aktif").eq("id", user.id).maybeSingle();
  if (profilHatasi || !profil || profil.role !== "ogretmen" || profil.aktif === false)
    return { error: "Müfredat başvurusu yalnız aktif öğretmen hesaplarına açıktır." };
  const kontrol = mufredatBasvurusuDogrula(girdi);
  if (kontrol.error !== null) return { error: kontrol.error };
  const admin = createAdminClient();
  const { data: ogretmen, error: ogretmenHatasi } = await admin.from("teachers")
    .select("school_id").eq("id", user.id).maybeSingle();
  if (ogretmenHatasi || !ogretmen?.school_id) return { error: "Öğretmen kurum kaydınız bulunamadı." };
  const { data: kurum, error: kurumHatasi } = await admin.from("schools")
    .select("ad").eq("id", ogretmen.school_id).maybeSingle();
  if (kurumHatasi || !kurum) return { error: "Kurum bilgisi okunamadı. Tekrar deneyin." };
  const mesaj = mufredatBasvuruMesaji(kontrol.veri, ogretmen.school_id, kurum.ad ?? "Kurum");
  if (mesaj.length > 2000) return { error: "Başvuru çok uzun; tespit, öneri veya kaynak metnini kısaltın." };
  // Kimlik, rol ve kurum istemciden alınmaz. Yeni tablo veya müfredat yazması yok.
  const { error } = await admin.from("hata_bildirimleri").insert({
    bildiren_id: user.id, bildiren_rol: profil.role, mesaj,
    sayfa: typeof sayfa === "string" && sayfa.startsWith("/dashboard") ? sayfa.slice(0, 200) : "/dashboard",
  });
  if (error) return { error: "Başvuru kaydedilemedi. Bilgilerinizi koruyarak tekrar deneyin." };
  revalidatePath("/yonetici/hata-bildirimleri");
  revalidatePath("/yonetici");
  return { error: null };
}
