"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { KURUM_MODULLERI, type KurumModulu, type KurumModulYetkileri } from "@/lib/kurum-yetkileri";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function adminBaglami() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profil?.role !== "admin") return null;
  return { admin: createAdminClient(), actorId: user.id };
}

export async function kurumPaketiUygula(schoolId: string, paketId: string): Promise<{ error: string | null }> {
  const baglam = await adminBaglami();
  if (!baglam) return { error: "Yönetici yetkisi gerekiyor." };
  if (!UUID.test(schoolId)) return { error: "Geçersiz kurum." };
  const { data: paket, error: paketHatasi } = await baglam.admin.from("kurum_paketleri")
    .select("ad, modul_yetkileri").eq("id", paketId).eq("aktif", true).maybeSingle();
  if (paketHatasi || !paket) return { error: "Paket bulunamadı." };
  const { error } = await baglam.admin.from("schools").update({
    paket_adi: paket.ad, modul_yetkileri: paket.modul_yetkileri,
  }).eq("id", schoolId).is("grup_kapasitesi", null);
  if (error) return { error: error.message };
  await baglam.admin.from("admin_audit_log").insert({ actor_id: baglam.actorId, eylem: "kurum_paketi_uygula", detay: { school_id: schoolId, paket_id: paketId } });
  revalidatePath("/yonetici");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function kurumModuluDegistir(schoolId: string, modul: KurumModulu, acik: boolean): Promise<{ error: string | null }> {
  const baglam = await adminBaglami();
  if (!baglam) return { error: "Yönetici yetkisi gerekiyor." };
  if (!UUID.test(schoolId) || !KURUM_MODULLERI.some((m) => m.key === modul) || typeof acik !== "boolean") return { error: "Geçersiz modül ayarı." };
  const { data: okul, error: okumaHatasi } = await baglam.admin.from("schools")
    .select("modul_yetkileri").eq("id", schoolId).is("grup_kapasitesi", null).maybeSingle();
  if (okumaHatasi || !okul) return { error: "Kurum bulunamadı." };
  const yetkiler = { ...((okul.modul_yetkileri as KurumModulYetkileri | null) ?? {}), [modul]: acik };
  const { error } = await baglam.admin.from("schools").update({ modul_yetkileri: yetkiler, paket_adi: "Özel" }).eq("id", schoolId);
  if (error) return { error: error.message };
  await baglam.admin.from("admin_audit_log").insert({ actor_id: baglam.actorId, eylem: "kurum_modulu_degistir", detay: { school_id: schoolId, modul, acik } });
  revalidatePath("/yonetici");
  revalidatePath("/dashboard");
  return { error: null };
}
