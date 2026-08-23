import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
