"use server";

// Admin'in /yonetici panelindeki "Moderatörler" bölümü — hangi okulun
// moderatörü kim, listeler; bir okula tıklanınca /moderator?okul=... ile
// o okulun moderatör paneli açılır (bkz. moderator/page.tsx, moderator/
// actions.ts requireModerator). Ayrı dosyada tutuluyor (yonetici/actions.ts
// zaten büyük ve bu oturumda eşzamanlı düzenlenebiliyor) — requireAdmin()
// burada kasıtlı olarak yeniden tanımlı (bkz. pdf-eslesme-actions.ts'teki
// aynı desen ve gerekçe).
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/yonetici");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return { user, admin: createAdminClient() };
}

export interface OkulModeratorGrubu {
  schoolId: string;
  okulAdi: string;
  moderatorler: { id: string; ad: string }[];
}

export interface OkulOgretmeni {
  id: string;
  ad: string;
  brans: string;
  mudurMu: boolean;
  moderatorMu: boolean;
}

// 2026-08-26 kullanıcı isteği: "Admin panelinde moderatörler kısmında admin
// istediği öğretmen hesabına moderatörlük yetkisi verip alabilecek. Şu an
// moderatörleri sadece görebiliyor, müdahale edemiyor." — okul seçilince o
// okulun tüm öğretmen/müdürleri (mevcut moderatörlük durumuyla) listelenir.
export async function okulOgretmenleriModeratorlukGetir(schoolId: string): Promise<{ error: string | null; ogretmenler: OkulOgretmeni[] }> {
  const { admin } = await requireAdmin();
  const { data: ogretmenler, error } = await admin
    .from("teachers")
    .select("id, brans, profiles!teachers_id_fkey(ad, role)")
    .eq("school_id", schoolId);
  if (error) return { error: error.message, ogretmenler: [] };
  const { data: moderatorler } = await admin.from("school_moderators").select("profile_id").eq("school_id", schoolId);
  const moderatorSet = new Set((moderatorler ?? []).map((m) => m.profile_id));
  type Row = { id: string; brans: string; profiles: { ad: string; role: string } | null };
  const liste = ((ogretmenler as unknown as Row[]) ?? []).map((o) => ({
    id: o.id, ad: o.profiles?.ad ?? "İsimsiz", brans: o.brans,
    mudurMu: o.profiles?.role === "mudur", moderatorMu: moderatorSet.has(o.id),
  })).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  return { error: null, ogretmenler: liste };
}

export async function moderatorYetkisiVer(profileId: string, schoolId: string): Promise<{ error: string | null }> {
  const { user, admin } = await requireAdmin();
  const { data: ogretmen } = await admin.from("teachers").select("school_id").eq("id", profileId).maybeSingle();
  if (!ogretmen || ogretmen.school_id !== schoolId) return { error: "Bu kullanıcı bu okulun öğretmeni değil." };
  const { error } = await admin.from("school_moderators").upsert({ profile_id: profileId, school_id: schoolId }, { onConflict: "profile_id" });
  if (error) return { error: error.message };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderatorluk_ver", detay: { hedef_id: profileId, school_id: schoolId } });
  return { error: null };
}

export async function moderatorYetkisiAl(profileId: string): Promise<{ error: string | null }> {
  const { user, admin } = await requireAdmin();
  const { error } = await admin.from("school_moderators").delete().eq("profile_id", profileId);
  if (error) return { error: error.message };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderatorluk_al", detay: { hedef_id: profileId } });
  return { error: null };
}

export async function moderatorluOkullarGetir(): Promise<{ error: string | null; okullar: OkulModeratorGrubu[] }> {
  const { admin } = await requireAdmin();
  // school_moderators'ın profiles'a İKİ ayrı foreign key'i var (profile_id
  // VE created_by) — PostgREST hangisini kullanacağını tek başına
  // çıkaramıyor (PGRST201, "more than one relationship"), bu yüzden embed
  // ismi açıkça belirtiliyor.
  const { data, error } = await admin
    .from("school_moderators")
    .select("profile_id, school_id, schools(ad), profiles!school_moderators_profile_id_fkey(ad)");
  if (error) return { error: error.message, okullar: [] };

  type Row = { profile_id: string; school_id: string; schools: { ad: string } | null; profiles: { ad: string } | null };
  const gruplar = new Map<string, OkulModeratorGrubu>();
  for (const r of (data ?? []) as unknown as Row[]) {
    if (!gruplar.has(r.school_id)) {
      gruplar.set(r.school_id, { schoolId: r.school_id, okulAdi: r.schools?.ad ?? "Bilinmiyor", moderatorler: [] });
    }
    gruplar.get(r.school_id)!.moderatorler.push({ id: r.profile_id, ad: r.profiles?.ad ?? "İsimsiz" });
  }
  return { error: null, okullar: [...gruplar.values()].sort((a, b) => a.okulAdi.localeCompare(b.okulAdi, "tr")) };
}
