"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rastgeleSifre } from "@/lib/validators";
import type { UserRole } from "@/lib/types";

// /yonetici'ye özel (admin-only) server action'lar. dashboard/actions.ts'teki
// requireAdmin ile aynı desen: service-role client'a güvenmeden önce burada
// da açıkça role==='admin' doğrulanıyor.
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/yonetici");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return { supabase, user, admin: createAdminClient() };
}

async function auditLogYaz(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  eylem: string,
  detay: Record<string, unknown>,
) {
  const { error } = await supabase.from("admin_audit_log").insert({ actor_id: actorId, eylem, detay });
  if (error) console.error("audit log yazılamadı:", error.message);
}

export interface KullaniciSonuc {
  id: string;
  ad: string;
  email: string | null;
  telefon: string | null;
  role: UserRole;
  aktif: boolean;
  okulAdi: string | null;
  okulId: string | null;
  sinifAdi: string | null;
  sinifId: string | null;
  okulNo: string | null;
  brans: string | null;
}

// Okul/sınıf sınırı olmadan tüm öğrenci/öğretmen/veli/müdür hesaplarında
// ad veya e-posta üzerinden arama. Admin dışındaki roller RLS'te zaten
// is_ogretmen() üzerinden admin'e tam okuma izni veriyor (bkz. migration
// 0014); burada ekstra bir RLS gerekmiyor.
export async function kullaniciAra(sorgu: string, rolFiltre: UserRole | "hepsi"): Promise<{ error: string | null; sonuclar: KullaniciSonuc[] }> {
  const { supabase } = await requireAdmin();
  const q = sorgu.trim();
  if (q.length < 2) return { error: null, sonuclar: [] };

  let query = supabase
    .from("profiles")
    .select("id, ad, email, telefon, role, aktif")
    .neq("role", "admin")
    .or(`ad.ilike.%${q}%,email.ilike.%${q}%`)
    .order("ad")
    .limit(40);
  if (rolFiltre !== "hepsi") query = query.eq("role", rolFiltre);

  const { data: profiller, error } = await query;
  if (error) return { error: error.message, sonuclar: [] };

  const satirlar = (profiller ?? []) as { id: string; ad: string; email: string | null; telefon: string | null; role: UserRole; aktif: boolean }[];
  const ogrenciIdleri = satirlar.filter((s) => s.role === "ogrenci").map((s) => s.id);
  const ogretmenIdleri = satirlar.filter((s) => s.role === "ogretmen" || s.role === "mudur").map((s) => s.id);

  const [ogrenciDetay, ogretmenDetay] = await Promise.all([
    ogrenciIdleri.length
      ? supabase.from("students").select("id, okul_no, school_id, class_id, schools(ad), classes(seviye, sube)").in("id", ogrenciIdleri)
      : Promise.resolve({ data: [] }),
    ogretmenIdleri.length
      ? supabase.from("teachers").select("id, brans, school_id, schools(ad)").in("id", ogretmenIdleri)
      : Promise.resolve({ data: [] }),
  ]);

  type OgrenciRow = { id: string; okul_no: string; school_id: string; class_id: string; schools: { ad: string } | null; classes: { seviye: string; sube: string } | null };
  type OgretmenRow = { id: string; brans: string; school_id: string; schools: { ad: string } | null };
  const ogrenciMap = new Map(((ogrenciDetay.data as unknown as OgrenciRow[]) ?? []).map((o) => [o.id, o]));
  const ogretmenMap = new Map(((ogretmenDetay.data as unknown as OgretmenRow[]) ?? []).map((o) => [o.id, o]));

  const sonuclar: KullaniciSonuc[] = satirlar.map((s) => {
    const o = ogrenciMap.get(s.id);
    const t = ogretmenMap.get(s.id);
    return {
      id: s.id, ad: s.ad, email: s.email, telefon: s.telefon, role: s.role, aktif: s.aktif,
      okulAdi: o?.schools?.ad ?? t?.schools?.ad ?? null,
      okulId: o?.school_id ?? t?.school_id ?? null,
      sinifAdi: o?.classes ? `${o.classes.seviye}-${o.classes.sube}` : null,
      sinifId: o?.class_id ?? null,
      okulNo: o?.okul_no ?? null,
      brans: t?.brans ?? null,
    };
  });

  return { error: null, sonuclar };
}

// ============ Şifre sıfırlama ============
// Herhangi bir hesabın şifresini tek tuşla resetleyip yeni geçici şifre
// üretir — "şifremi unuttum" destek talepleri için (öğrenci/veli/öğretmen
// şifresini kendi başına sıfırlayamıyor, bu akış admin üzerinden çözülüyor).
export async function sifreSifirla(userId: string): Promise<{ error: string | null; sifre: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const sifre = rastgeleSifre();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: sifre });
  if (error) return { error: error.message, sifre: null };
  await auditLogYaz(supabase, user.id, "sifre_sifirla", { hedef_id: userId });
  return { error: null, sifre };
}

// ============ Hesap pasifleştirme/aktifleştirme (soft-delete) ============
// Hard-delete değil: profiles.aktif bayrağı sadece görüntüleme/filtreleme
// için, gerçek giriş engeli Supabase Auth'un ban_duration'ı ile uygulanıyor
// — böylece pasifleştirilen kullanıcı giriş yapamaz ama veri kaybı olmaz,
// istenirse tekrar aktifleştirilebilir.
export async function hesapAktiflikDegistir(userId: string, aktif: boolean): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: aktif ? "none" : "87600h",
  });
  if (banError) return { error: banError.message };

  const { error: profileError } = await admin.from("profiles").update({ aktif }).eq("id", userId);
  if (profileError) return { error: profileError.message };

  await auditLogYaz(supabase, user.id, aktif ? "hesap_aktiflestir" : "hesap_pasiflestir", { hedef_id: userId });
  return { error: null };
}

// ============ Sınıf/öğretmen/öğrenci düzenleme ============

// classes_select_all RLS policy'si zaten herkese açık (using (true)) —
// service-role client'a gerek yok.
export async function okulSiniflari(schoolId: string): Promise<{ error: string | null; siniflar: { id: string; seviye: string; sube: string }[] }> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("classes").select("id, seviye, sube").eq("school_id", schoolId).order("seviye").order("sube");
  if (error) return { error: error.message, siniflar: [] };
  return { error: null, siniflar: data ?? [] };
}

// FK kısıtı (students.class_id / teachers.class_id "not null references",
// ON DELETE belirtilmemiş → RESTRICT) sınıfta öğrenci/öğretmen varken
// silinmesini zaten engelliyor — burada sadece daha anlaşılır bir hata
// mesajına çeviriyoruz.
export async function sinifSil(classId: string): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const { error } = await admin.from("classes").delete().eq("id", classId);
  if (error) {
    if (error.code === "23503") return { error: "Bu sınıfta öğrenci veya öğretmen var, önce onları başka sınıfa taşıyın." };
    return { error: error.message };
  }
  await auditLogYaz(supabase, user.id, "sinif_sil", { class_id: classId });
  revalidatePath("/yonetici");
  return { error: null };
}

export async function ogrenciSinifTasi(studentId: string, classId: string): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const { error } = await admin.from("students").update({ class_id: classId }).eq("id", studentId);
  if (error) return { error: error.message };
  await auditLogYaz(supabase, user.id, "ogrenci_sinif_tasi", { student_id: studentId, class_id: classId });
  revalidatePath("/yonetici");
  return { error: null };
}

export async function ogretmenBransDegistir(teacherId: string, brans: string): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const { error } = await admin.from("teachers").update({ brans }).eq("id", teacherId);
  if (error) return { error: error.message };
  await auditLogYaz(supabase, user.id, "ogretmen_brans_degistir", { teacher_id: teacherId, brans });
  revalidatePath("/yonetici");
  return { error: null };
}
