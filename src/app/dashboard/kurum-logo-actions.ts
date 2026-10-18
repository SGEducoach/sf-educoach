"use server";

// Kurum logosu yükleme (kullanıcı kararı 18.10.2026, migration 0159). Yalnız
// kurumun müdürü yükler; dosya sunucuda service-role ile depoya yazılır,
// bu yüzden depoda istemciye açık bir yazma politikası yok.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const IZINLI = ["image/png", "image/jpeg", "image/webp"];
const EN_FAZLA = 1024 * 1024;

export async function kurumLogosuYukle(formData: FormData): Promise<{ error: string | null; logoAdresi: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profil }, { data: ogretmen }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("teachers").select("school_id").eq("id", user.id).maybeSingle(),
  ]);
  if (profil?.role !== "mudur" || !ogretmen?.school_id) return { error: "Kurum logosunu yalnız kurum müdürü değiştirebilir.", logoAdresi: null };

  const dosya = formData.get("logo");
  if (!(dosya instanceof File) || dosya.size === 0) return { error: "Bir logo dosyası seçin.", logoAdresi: null };
  if (!IZINLI.includes(dosya.type)) return { error: "Logo PNG, JPG ya da WEBP olmalı.", logoAdresi: null };
  if (dosya.size > EN_FAZLA) return { error: "Logo en fazla 1 MB olabilir.", logoAdresi: null };

  const admin = createAdminClient();
  const yol = `${ogretmen.school_id}/logo`;
  const { error: yuklemeHatasi } = await admin.storage.from("kurum-logolari")
    .upload(yol, Buffer.from(await dosya.arrayBuffer()), { contentType: dosya.type, upsert: true });
  if (yuklemeHatasi) return { error: `Logo yüklenemedi: ${yuklemeHatasi.message}`, logoAdresi: null };

  // Adres her yüklemede değişir ki tarayıcı önbelleği eski logoyu göstermesin.
  const logoAdresi = `/api/kurum-logo?okul=${ogretmen.school_id}&v=${Date.now()}`;
  const { error } = await admin.from("schools").update({ logo_url: logoAdresi }).eq("id", ogretmen.school_id);
  if (error) return { error: `Logo kaydedilemedi: ${error.message}`, logoAdresi: null };
  await supabase.from("admin_audit_log").insert({ actor_id: user.id, eylem: "kurum_logosu_yukle", detay: { school_id: ogretmen.school_id } });
  revalidatePath("/dashboard");
  return { error: null, logoAdresi };
}
