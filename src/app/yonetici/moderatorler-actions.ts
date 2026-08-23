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
  return { admin: createAdminClient() };
}

export interface OkulModeratorGrubu {
  schoolId: string;
  okulAdi: string;
  moderatorler: { id: string; ad: string }[];
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
