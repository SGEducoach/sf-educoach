"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rastgeleSifre } from "@/lib/validators";
import type { UserRole } from "@/lib/types";

export interface ModeratorKullanici {
  id: string;
  ad: string;
  role: UserRole;
  aktif: boolean;
  detay: string;
  kategori: "ogrenci" | "ogretmen" | "veli";
  sinif: string | null;
}

// targetSchoolId: admin'in /yonetici → "Moderatörler" listesinden bir okula
// tıklayıp o okulun moderatör panelini GÖRÜNTÜLEMESİ için (bkz. /moderator
// ?okul=...). Sadece gerçekten admin olan çağıran için onurlandırılır —
// admin değilse bu parametre yok sayılır ve normal akış (kendi
// school_moderators satırı) çalışır, yani sahte bir okul id'si göndermek
// yetki yükseltmeye yaramaz.
async function requireModerator(targetSchoolId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (targetSchoolId) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "admin") {
      const admin = createAdminClient();
      const { data: okul } = await admin.from("schools").select("ad").eq("id", targetSchoolId).maybeSingle();
      if (!okul) redirect("/yonetici");
      return { user, admin, schoolId: targetSchoolId, okulAdi: okul.ad };
    }
  }
  const { data: yetki } = await supabase.from("school_moderators").select("school_id, schools(ad)").eq("profile_id", user.id).maybeSingle();
  if (!yetki) redirect("/dashboard");
  const okul = yetki.schools as unknown as { ad: string } | null;
  return { user, admin: createAdminClient(), schoolId: yetki.school_id, okulAdi: okul?.ad ?? "Okul" };
}

async function hedefOkuldaMi(admin: ReturnType<typeof createAdminClient>, schoolId: string, targetId: string) {
  const [{ data: student }, { data: teacher }, { data: parent }] = await Promise.all([
    admin.from("students").select("id").eq("id", targetId).eq("school_id", schoolId).maybeSingle(),
    admin.from("teachers").select("id").eq("id", targetId).eq("school_id", schoolId).maybeSingle(),
    admin.from("parent_students").select("parent_id, students!inner(school_id)").eq("parent_id", targetId).eq("students.school_id", schoolId).limit(1),
  ]);
  return !!student || !!teacher || !!parent?.length;
}

export async function moderatorKullanicilariGetir(targetSchoolId?: string): Promise<{ okulAdi: string; kullanicilar: ModeratorKullanici[] }> {
  const { admin, schoolId, okulAdi } = await requireModerator(targetSchoolId);
  const [{ data: students }, { data: teachers }, { data: parents }] = await Promise.all([
    admin.from("students").select("id, okul_no, classes(seviye, sube)").eq("school_id", schoolId),
    admin.from("teachers").select("id, brans, classes(seviye, sube)").eq("school_id", schoolId),
    admin.from("parent_students").select("parent_id, students!inner(school_id)").eq("students.school_id", schoolId),
  ]);
  const ids = [...new Set([...(students ?? []).map(x => x.id), ...(teachers ?? []).map(x => x.id), ...(parents ?? []).map(x => x.parent_id)])];
  if (!ids.length) return { okulAdi, kullanicilar: [] };
  const { data: profiles } = await admin.from("profiles").select("id, ad, role, aktif").in("id", ids).neq("role", "admin");
  const studentMap = new Map((students ?? []).map(s => [s.id, s]));
  const teacherMap = new Map((teachers ?? []).map(t => [t.id, t]));
  return {
    okulAdi,
    kullanicilar: ((profiles ?? []) as { id: string; ad: string; role: UserRole; aktif: boolean }[]).map(p => {
      const s = studentMap.get(p.id) as { okul_no: string; classes: { seviye: string; sube: string } | null } | undefined;
      const t = teacherMap.get(p.id) as { brans: string; classes: { seviye: string; sube: string } | null } | undefined;
      const sinif = s?.classes ? `${s.classes.seviye}-${s.classes.sube}` : t?.classes ? `${t.classes.seviye}-${t.classes.sube}` : null;
      return {
        id: p.id, ad: p.ad, role: p.role, aktif: p.aktif, sinif,
        kategori: s ? "ogrenci" as const : t ? "ogretmen" as const : "veli" as const,
        detay: s ? `Öğrenci · #${s.okul_no}${sinif ? ` · ${sinif}` : ""}` : t ? `${p.role === "mudur" ? "Müdür" : "Öğretmen"} · ${t.brans}${sinif ? ` · ${sinif}` : ""}` : "Veli",
      };
    }).sort((a, b) => a.ad.localeCompare(b.ad, "tr")),
  };
}

export async function moderatorAktiflikDegistir(targetId: string, aktif: boolean, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  if (targetId === user.id || !(await hedefOkuldaMi(admin, schoolId, targetId))) return { error: "Bu kullanıcı için yetkiniz yok." };
  const { error } = await admin.auth.admin.updateUserById(targetId, { ban_duration: aktif ? "none" : "87600h" });
  if (error) return { error: error.message };
  await admin.from("profiles").update({ aktif }).eq("id", targetId).neq("role", "admin");
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: aktif ? "moderator_hesap_aktiflestir" : "moderator_hesap_pasiflestir", detay: { hedef_id: targetId, school_id: schoolId } });
  revalidatePath("/moderator");
  return { error: null };
}

export async function moderatorSifreSifirla(targetId: string, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  if (targetId === user.id || !(await hedefOkuldaMi(admin, schoolId, targetId))) return { error: "Bu kullanıcı için yetkiniz yok.", sifre: null };
  const sifre = rastgeleSifre();
  const { error } = await admin.auth.admin.updateUserById(targetId, { password: sifre });
  if (error) return { error: error.message, sifre: null };
  await admin.from("profiles").update({ gecici_sifre: true }).eq("id", targetId).neq("role", "admin");
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderator_sifre_sifirla", detay: { hedef_id: targetId, school_id: schoolId } });
  return { error: null, sifre };
}

export async function moderatorHesapSil(targetId: string, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  if (targetId === user.id || !(await hedefOkuldaMi(admin, schoolId, targetId))) return { error: "Bu kullanıcı için yetkiniz yok." };
  const { data: profil } = await admin.from("profiles").select("role").eq("id", targetId).maybeSingle();
  if (!profil || profil.role === "admin") return { error: "Bu hesap silinemez." };
  if (profil.role === "veli") {
    const { data: digerOkulBaglantisi } = await admin
      .from("parent_students")
      .select("parent_id, students!inner(school_id)")
      .eq("parent_id", targetId)
      .neq("students.school_id", schoolId)
      .limit(1);
    if (digerOkulBaglantisi?.length) return { error: "Bu veli başka bir okuldaki öğrenciye de bağlı olduğu için okul moderatörü tarafından silinemez." };
  }
  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) return { error: error.message };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderator_hesap_sil", detay: { hedef_id: targetId, school_id: schoolId } });
  revalidatePath("/moderator");
  return { error: null };
}
