"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function veliTalepOnayla(requestId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("veli_talep_onayla", { p_request_id: requestId });
  if (error) return { error: error.message, kod: null };
  revalidatePath("/dashboard");
  return { error: null, kod: data as string };
}

// Admin kontrol işlemlerini iz kaydına yazar. Log yazımı başarısız olsa bile
// asıl işlemi (sınıf ekleme, atama vb.) engellemez — sadece konsola düşer.
async function auditLogYaz(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  eylem: string,
  detay: Record<string, unknown>,
) {
  const { error } = await supabase.from("admin_audit_log").insert({ actor_id: actorId, eylem, detay });
  if (error) console.error("audit log yazılamadı:", error.message);
}

export async function sinifEkle(schoolId: string, seviye: "11" | "12", sube: string) {
  const { supabase, user } = await requireUser();
  const subeBuyuk = sube.trim().toUpperCase();
  const { error } = await supabase.from("classes").insert({
    school_id: schoolId, seviye, sube: subeBuyuk,
  });
  if (error) {
    if (error.code === "23505") return { error: "Bu sınıf/şube zaten var." };
    return { error: error.message };
  }
  await auditLogYaz(supabase, user.id, "sinif_ekle", { school_id: schoolId, seviye, sube: subeBuyuk });
  revalidatePath("/dashboard");
  return { error: null };
}

// Sınıf öğretmeni ataması — sadece admin çalıştırabilir, yetki kontrolü
// veritabanı tarafında (RLS + trigger, bkz. migration 0014) uygulanıyor.
// Buradaki kontrol yalnızca kullanıcıya daha anlaşılır bir hata göstermek için.
export async function sinifOgretmeniAta(ogretmenId: string, classId: string | null) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("teachers").update({ class_id: classId }).eq("id", ogretmenId);
  if (error) {
    if (error.code === "23505") return { error: "Bu sınıfın zaten bir sınıf öğretmeni var." };
    if (error.message?.includes("yönetici tarafından")) return { error: error.message };
    return { error: "Bu işlem için yönetici yetkisi gerekiyor." };
  }
  await auditLogYaz(supabase, user.id, classId ? "sinif_ogretmeni_ata" : "sinif_ogretmenliginden_cikar", { ogretmen_id: ogretmenId, class_id: classId });
  revalidatePath("/dashboard");
  return { error: null };
}
