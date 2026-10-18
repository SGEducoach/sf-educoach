"use server";

// Müdür yardımcısı atamaları (kullanıcı kararı 18.10.2026, migration 0163).
// Atamayı admin (herhangi bir kurum için) ve kurumun müdürü ya da moderatörü
// yapar. Müdür yardımcısı kurumdaki bir öğretmendir; sorumluluğu sınıf
// düzeyleri ve — yurtlu okulda — yurttur. Her kurum türünde olur.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SINIF_SEVIYELERI } from "@/lib/types";

type Uye = { id: string; ad: string; seviyeler: string[]; yurt: boolean };
type Aday = { id: string; ad: string; brans: string };
export type MudurYardimcisiListesi = { error: string | null; seviyeler: string[]; yurtlu: boolean; uyeler: Uye[]; adaylar: Aday[] };

async function yonetimYetkisi(istenenOkulId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profil } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  let schoolId: string | null = null;
  if (profil?.role === "admin") schoolId = istenenOkulId ?? null;
  else {
    const [{ data: moderator }, { data: ogretmen }] = await Promise.all([
      admin.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle(),
      profil?.role === "mudur" ? admin.from("teachers").select("school_id").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    schoolId = (ogretmen as { school_id: string } | null)?.school_id ?? moderator?.school_id ?? null;
    if (istenenOkulId && istenenOkulId !== schoolId) return null;
  }
  if (!schoolId) return null;
  const { data: okul } = await admin.from("schools").select("id, yurtlu").eq("id", schoolId).is("grup_kapasitesi", null).maybeSingle();
  if (!okul) return null;
  return { admin, schoolId: okul.id as string, yurtlu: okul.yurtlu === true, userId: user.id };
}

function yenile() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/moderator", "layout");
  revalidatePath("/yonetici", "layout");
}

export async function mudurYardimcilariGetir(istenenOkulId?: string): Promise<MudurYardimcisiListesi> {
  const bos = { seviyeler: [], yurtlu: false, uyeler: [], adaylar: [] };
  const yetki = await yonetimYetkisi(istenenOkulId);
  if (!yetki) return { error: "Bu kurum için yönetim yetkiniz yok.", ...bos };
  const [{ data: siniflar }, { data: uyeler, error: uyeHatasi }, { data: ogretmenler }] = await Promise.all([
    yetki.admin.from("classes").select("seviye").eq("school_id", yetki.schoolId),
    yetki.admin.from("mudur_yardimcilari").select("profile_id, sinif_duzeyleri, yurt").eq("school_id", yetki.schoolId),
    yetki.admin.from("teachers").select("id, brans, profiles!teachers_id_fkey(ad, role, aktif)").eq("school_id", yetki.schoolId),
  ]);
  if (uyeHatasi) return { error: "Müdür yardımcısı altyapısı henüz kurulmadı (veritabanı güncellemesi bekleniyor).", ...bos };
  const seviyeSeti = new Set((siniflar ?? []).map((s) => s.seviye));
  type OgretmenRow = { id: string; brans: string | null; profiles: { ad: string; role: string; aktif: boolean | null } | { ad: string; role: string; aktif: boolean | null }[] | null };
  const ogretmenHaritasi = new Map(((ogretmenler ?? []) as unknown as OgretmenRow[]).map((o) => {
    const p = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
    return [o.id, { ad: p?.ad ?? "İsimsiz", brans: o.brans ?? "—", role: p?.role, aktif: p?.aktif }];
  }));
  type UyeRow = { profile_id: string; sinif_duzeyleri: string[] | null; yurt: boolean };
  const uyeListesi = ((uyeler ?? []) as UyeRow[]).map((u) => ({
    id: u.profile_id, ad: ogretmenHaritasi.get(u.profile_id)?.ad ?? "İsimsiz", seviyeler: u.sinif_duzeyleri ?? [], yurt: u.yurt,
  })).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  const uyeSeti = new Set(uyeListesi.map((u) => u.id));
  const adaylar = [...ogretmenHaritasi.entries()]
    .filter(([id, o]) => !uyeSeti.has(id) && o.role === "ogretmen" && o.aktif !== false)
    .map(([id, o]) => ({ id, ad: o.ad, brans: o.brans }))
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  return { error: null, seviyeler: SINIF_SEVIYELERI.filter((s) => seviyeSeti.has(s)), yurtlu: yetki.yurtlu, uyeler: uyeListesi, adaylar };
}

export async function mudurYardimcisiAta(teacherId: string, istenenOkulId?: string): Promise<{ error: string | null }> {
  const yetki = await yonetimYetkisi(istenenOkulId);
  if (!yetki) return { error: "Bu kurum için yönetim yetkiniz yok." };
  const { data: ogretmen } = await yetki.admin.from("teachers").select("id").eq("id", teacherId).eq("school_id", yetki.schoolId).maybeSingle();
  if (!ogretmen) return { error: "Öğretmen bu kurumda bulunamadı." };
  const { error } = await yetki.admin.from("mudur_yardimcilari")
    .upsert({ profile_id: teacherId, school_id: yetki.schoolId, atayan_id: yetki.userId }, { onConflict: "profile_id" });
  if (error) return { error: error.message };
  await yetki.admin.from("admin_audit_log").insert({ actor_id: yetki.userId, eylem: "mudur_yardimcisi_ata", detay: { school_id: yetki.schoolId, teacher_id: teacherId } });
  yenile();
  return { error: null };
}

export async function mudurYardimcisiKaydet(teacherId: string, seviyeler: string[], yurt: boolean, istenenOkulId?: string): Promise<{ error: string | null }> {
  const yetki = await yonetimYetkisi(istenenOkulId);
  if (!yetki) return { error: "Bu kurum için yönetim yetkiniz yok." };
  const secilen = [...new Set(Array.isArray(seviyeler) ? seviyeler : [])];
  if (secilen.some((s) => !SINIF_SEVIYELERI.includes(s as (typeof SINIF_SEVIYELERI)[number]))) return { error: "Sınıf düzeyi seçimi geçersiz." };
  const { data: siniflar } = await yetki.admin.from("classes").select("seviye").eq("school_id", yetki.schoolId);
  const mevcut = new Set((siniflar ?? []).map((s) => s.seviye));
  if (secilen.some((s) => !mevcut.has(s))) return { error: "Seçilen düzey bu kurumda bulunmuyor." };
  if (yurt && !yetki.yurtlu) return { error: "Bu kurum yurtlu değil." };
  const { data, error } = await yetki.admin.from("mudur_yardimcilari").update({ sinif_duzeyleri: secilen, yurt })
    .eq("profile_id", teacherId).eq("school_id", yetki.schoolId).select("profile_id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Müdür yardımcısı bu kurumda bulunamadı." };
  await yetki.admin.from("admin_audit_log").insert({ actor_id: yetki.userId, eylem: "mudur_yardimcisi_sorumluluk", detay: { school_id: yetki.schoolId, teacher_id: teacherId, seviyeler: secilen, yurt } });
  yenile();
  return { error: null };
}

export async function mudurYardimcisiKaldir(teacherId: string, istenenOkulId?: string): Promise<{ error: string | null }> {
  const yetki = await yonetimYetkisi(istenenOkulId);
  if (!yetki) return { error: "Bu kurum için yönetim yetkiniz yok." };
  const { error } = await yetki.admin.from("mudur_yardimcilari").delete().eq("profile_id", teacherId).eq("school_id", yetki.schoolId);
  if (error) return { error: error.message };
  await yetki.admin.from("admin_audit_log").insert({ actor_id: yetki.userId, eylem: "mudur_yardimcisi_kaldir", detay: { school_id: yetki.schoolId, teacher_id: teacherId } });
  yenile();
  return { error: null };
}
