"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REHBER_BRANSI } from "@/lib/rehberlik";
import { SINIF_SEVIYELERI } from "@/lib/types";

type RehberSatiri = { id: string; ad: string; seviyeler: string[] };
type AtamaListesi = { error: string | null; seviyeler: string[]; rehberler: RehberSatiri[] };

async function yonetimYetkisi(istenenOkulId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profil } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profil?.role === "admin") {
    if (!istenenOkulId) return null;
    const { data: okul } = await admin.from("schools").select("id, tur, kademe").eq("id", istenenOkulId).is("grup_kapasitesi", null).maybeSingle();
    if (okul?.tur !== "okul" || !["lise", "ikisi"].includes(okul.kademe)) return null;
    return okul ? { admin, schoolId: okul.id, userId: user.id } : null;
  }
  const { data: moderator } = await admin.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle();
  if (!moderator || (istenenOkulId && istenenOkulId !== moderator.school_id)) return null;
  const { data: okul } = await admin.from("schools").select("tur, kademe").eq("id", moderator.school_id).maybeSingle();
  if (okul?.tur !== "okul" || !["lise", "ikisi"].includes(okul.kademe)) return null;
  return { admin, schoolId: moderator.school_id as string, userId: user.id };
}

export async function rehberSinifAtamalariGetir(istenenOkulId?: string): Promise<AtamaListesi> {
  const yetki = await yonetimYetkisi(istenenOkulId);
  if (!yetki) return { error: "Bu kurum için yönetim yetkiniz yok.", seviyeler: [], rehberler: [] };
  const [{ data: siniflar, error: sinifHatasi }, { data: ogretmenler, error: ogretmenHatasi }] = await Promise.all([
    yetki.admin.from("classes").select("seviye").eq("school_id", yetki.schoolId),
    yetki.admin.from("teachers")
      .select("id, rehber_sinif_duzeyleri, profiles!teachers_id_fkey(ad)")
      .eq("school_id", yetki.schoolId).eq("brans", REHBER_BRANSI),
  ]);
  const error = sinifHatasi ?? ogretmenHatasi;
  if (error) return { error: error.message, seviyeler: [], rehberler: [] };
  const seviyeSeti = new Set((siniflar ?? []).map((s) => s.seviye));
  const seviyeler = SINIF_SEVIYELERI.filter((seviye) => Number(seviye) >= 9 && seviyeSeti.has(seviye));
  type Ogretmen = { id: string; rehber_sinif_duzeyleri: string[]; profiles: { ad: string } | { ad: string }[] | null };
  const rehberler = ((ogretmenler ?? []) as unknown as Ogretmen[]).map((o) => ({
    id: o.id,
    ad: (Array.isArray(o.profiles) ? o.profiles[0]?.ad : o.profiles?.ad) ?? "İsimsiz öğretmen",
    seviyeler: o.rehber_sinif_duzeyleri ?? [],
  })).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  return { error: null, seviyeler, rehberler };
}

export async function rehberSinifAtamasiKaydet(teacherId: string, seviyeler: string[], istenenOkulId?: string): Promise<{ error: string | null }> {
  const yetki = await yonetimYetkisi(istenenOkulId);
  if (!yetki) return { error: "Bu kurum için yönetim yetkiniz yok." };
  if (!Array.isArray(seviyeler)) return { error: "Sınıf düzeyi seçimi geçersiz." };
  const secilen = [...new Set(seviyeler)];
  if (secilen.some((s) => !["9", "10", "11", "12"].includes(s))) {
    return { error: "Sınıf düzeyi seçimi geçersiz." };
  }
  const { data: rehber } = await yetki.admin.from("teachers").select("id").eq("id", teacherId)
    .eq("school_id", yetki.schoolId).eq("brans", REHBER_BRANSI).maybeSingle();
  if (!rehber) return { error: "Rehber öğretmen bu kurumda bulunamadı." };
  const { data: siniflar, error: sinifHatasi } = await yetki.admin.from("classes").select("seviye").eq("school_id", yetki.schoolId);
  if (sinifHatasi) return { error: "Kurumun sınıf düzeyleri doğrulanamadı." };
  const mevcut = new Set((siniflar ?? []).map((s) => s.seviye));
  if (secilen.some((s) => !mevcut.has(s))) return { error: "Seçilen düzey bu kurumda bulunmuyor." };
  const { error } = await yetki.admin.from("teachers").update({ rehber_sinif_duzeyleri: secilen })
    .eq("id", teacherId).eq("school_id", yetki.schoolId).eq("brans", REHBER_BRANSI);
  if (error) return { error: error.message };
  await yetki.admin.from("admin_audit_log").insert({ actor_id: yetki.userId, eylem: "rehber_sinif_atamasi", detay: { school_id: yetki.schoolId, teacher_id: teacherId, seviyeler: secilen } });
  revalidatePath("/dashboard", "layout");
  revalidatePath("/moderator", "layout");
  revalidatePath("/yonetici", "layout");
  return { error: null };
}
