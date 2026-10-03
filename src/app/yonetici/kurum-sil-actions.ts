"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function yetkili() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profil?.role === "admin" ? supabase : null;
}

export async function kurumSilmeOzeti(schoolId: string): Promise<{ error: string | null; ad: string; ogrenci: number; ogretmen: number; tur: string }> {
  if (!(await yetkili())) return { error: "Yönetici yetkisi gerekiyor.", ad: "", ogrenci: 0, ogretmen: 0, tur: "" };
  const admin = createAdminClient();
  const [kurum, ogrenciler, ogretmenler] = await Promise.all([
    admin.from("schools").select("ad, tur, grup_kapasitesi").eq("id", schoolId).maybeSingle(),
    admin.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    admin.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
  ]);
  const error = kurum.error ?? ogrenciler.error ?? ogretmenler.error;
  if (error || !kurum.data) return { error: error?.message ?? "Hesap bulunamadı.", ad: "", ogrenci: 0, ogretmen: 0, tur: "" };
  return {
    error: null, ad: kurum.data.ad, ogrenci: ogrenciler.count ?? 0, ogretmen: ogretmenler.count ?? 0,
    tur: kurum.data.grup_kapasitesi == null ? (kurum.data.tur === "dershane" ? "Dershane" : "Kurum") : "Koçluk grubu",
  };
}

export async function kurumKaliciSil(schoolId: string, kurumAdi: string): Promise<{ error: string | null }> {
  const supabase = await yetkili();
  if (!supabase) return { error: "Yönetici yetkisi gerekiyor." };
  const { error } = await supabase.rpc("admin_kurum_kalici_sil", { p_school_id: schoolId, p_ad: kurumAdi });
  if (error) return { error: error.message };
  revalidatePath("/yonetici");
  revalidatePath("/yonetici/okullar");
  revalidatePath("/yonetici/grup-kocluk");
  return { error: null };
}
