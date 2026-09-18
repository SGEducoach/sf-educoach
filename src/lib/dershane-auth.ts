import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { grupKocuYazmaYetkisi } from "@/lib/grup-koc-auth";

// DERSHANE MODU: dershane müdürüne özel (service-role gerektiren) işlemler
// için ortak yetki kontrolü — admin'in requireAdmin() deseniyle aynı
// mantık (bkz. src/app/dashboard/actions.ts). Hem server action'lardan
// hem route handler'lardan (örn. roster şablonu indirme) çağrılabilsin
// diye ayrı bir dosyada (server action dosyaları sadece async action
// export edebiliyor).
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function requireDershaneMudur() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "mudur") return { supabase, user, admin: null, schoolId: null as string | null };
  const { data: teacher } = await supabase.from("teachers").select("school_id").eq("id", user.id).single();
  if (!teacher) return { supabase, user, admin: null, schoolId: null };
  const { data: school } = await supabase.from("schools").select("tur").eq("id", teacher.school_id).single();
  if (school?.tur !== "dershane") return { supabase, user, admin: null, schoolId: null };
  return { supabase, user, admin: createAdminClient(), schoolId: teacher.school_id as string };
}

// Admin hedef kurumu seçebilir; müdürün hedefi daima kendi kurumudur.
// Grup Koçluk koçu (Faz 3, 18.09.2026) da kendi grubu için yükleyebilir —
// dondurulmuş ya da süresi dolmuş (salt okunur) grupta yükleme reddedilir.
export async function requireDenemeYuklemeYetkisi(hedefSchoolId?: string) {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "ogretmen") {
    const koc = await grupKocuYazmaYetkisi();
    if (koc.error !== null) return { supabase, user, admin: null, schoolId: null as string | null };
    return { supabase, user, admin: koc.admin, schoolId: koc.grup.id as string | null };
  }
  if (profile?.role !== "admin") return requireDershaneMudur();
  if (!hedefSchoolId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hedefSchoolId)) {
    return { supabase, user, admin: null, schoolId: null };
  }
  const admin = createAdminClient();
  const { data: school } = await admin.from("schools").select("id").eq("id", hedefSchoolId).single();
  return { supabase, user, admin: school ? admin : null, schoolId: school?.id as string | undefined ?? null };
}
