"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SINIF_SEVIYELERI } from "@/lib/types";

// Rehberlik Servisi atamaları (migration 0144). "Rehber öğretmen ... okuldaki
// sayılarına göre kademeleri aralarında paylaşabiliyorlar" (kullanıcı kararı
// 07.10.2026) — paylaşımın yapıldığı yer burası.
//
// 0143'te kapsam yalnız lise (9-12) ve kimlik teachers.brans idi; artık
// kimlik rehberlik_servisi üyeliği ve düzeyler kurumun GERÇEK sınıf
// seviyelerinden geliyor (ortaokul 5-8 dahil), çünkü ortaokul+lise bir
// okulda doğal paylaşım kademe paylaşımıdır.

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
    const { data: okul } = await admin.from("schools").select("id, tur").eq("id", istenenOkulId).is("grup_kapasitesi", null).maybeSingle();
    if (okul?.tur !== "okul") return null;
    return { admin, schoolId: okul.id as string, userId: user.id };
  }
  const { data: moderator } = await admin.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle();
  if (!moderator || (istenenOkulId && istenenOkulId !== moderator.school_id)) return null;
  // Grup filtresi SORGUDA (admin dalıyla aynı desen) — alanı okuyup
  // `!== null` karşılaştırmak, alan seçilmediğinde undefined'a düşüp
  // yetkiyi yanlışlıkla reddediyordu.
  const { data: okul } = await admin.from("schools").select("tur").eq("id", moderator.school_id).is("grup_kapasitesi", null).maybeSingle();
  if (okul?.tur !== "okul") return null;
  return { admin, schoolId: moderator.school_id as string, userId: user.id };
}

export async function rehberSinifAtamalariGetir(istenenOkulId?: string): Promise<AtamaListesi> {
  const yetki = await yonetimYetkisi(istenenOkulId);
  if (!yetki) return { error: "Bu kurum için yönetim yetkiniz yok.", seviyeler: [], rehberler: [] };
  const [{ data: siniflar, error: sinifHatasi }, { data: uyeler, error: uyeHatasi }] = await Promise.all([
    yetki.admin.from("classes").select("seviye").eq("school_id", yetki.schoolId),
    yetki.admin.from("rehberlik_servisi")
      .select("profile_id, sinif_duzeyleri, profiles!rehberlik_servisi_profile_id_fkey(ad)")
      .eq("school_id", yetki.schoolId),
  ]);
  const error = sinifHatasi ?? uyeHatasi;
  if (error) return { error: error.message, seviyeler: [], rehberler: [] };
  const seviyeSeti = new Set((siniflar ?? []).map((s) => s.seviye));
  // Kurumun GERÇEKTEN açtığı düzeyler (ortaokul 5-8 dahil).
  const seviyeler = SINIF_SEVIYELERI.filter((seviye) => seviyeSeti.has(seviye));
  type Uye = { profile_id: string; sinif_duzeyleri: string[] | null; profiles: { ad: string } | { ad: string }[] | null };
  const rehberler = ((uyeler ?? []) as unknown as Uye[]).map((u) => ({
    id: u.profile_id,
    // Gömülü ilişki çalışma anında NESNE döner, tipte dizi görünür (proje notu).
    ad: (Array.isArray(u.profiles) ? u.profiles[0]?.ad : u.profiles?.ad) ?? "İsimsiz",
    seviyeler: u.sinif_duzeyleri ?? [],
  })).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  return { error: null, seviyeler, rehberler };
}

export async function rehberSinifAtamasiKaydet(teacherId: string, seviyeler: string[], istenenOkulId?: string): Promise<{ error: string | null }> {
  const yetki = await yonetimYetkisi(istenenOkulId);
  if (!yetki) return { error: "Bu kurum için yönetim yetkiniz yok." };
  if (!Array.isArray(seviyeler)) return { error: "Sınıf düzeyi seçimi geçersiz." };
  const secilen = [...new Set(seviyeler)];
  if (secilen.some((s) => !SINIF_SEVIYELERI.includes(s as (typeof SINIF_SEVIYELERI)[number]))) {
    return { error: "Sınıf düzeyi seçimi geçersiz." };
  }
  const { data: uye } = await yetki.admin.from("rehberlik_servisi").select("profile_id")
    .eq("profile_id", teacherId).eq("school_id", yetki.schoolId).maybeSingle();
  if (!uye) return { error: "Rehber öğretmen bu kurumun Rehberlik Servisi'nde bulunamadı." };
  const { data: siniflar, error: sinifHatasi } = await yetki.admin.from("classes").select("seviye").eq("school_id", yetki.schoolId);
  if (sinifHatasi) return { error: "Kurumun sınıf düzeyleri doğrulanamadı." };
  const mevcut = new Set((siniflar ?? []).map((s) => s.seviye));
  if (secilen.some((s) => !mevcut.has(s))) return { error: "Seçilen düzey bu kurumda bulunmuyor." };
  const { error } = await yetki.admin.from("rehberlik_servisi").update({ sinif_duzeyleri: secilen })
    .eq("profile_id", teacherId).eq("school_id", yetki.schoolId);
  if (error) return { error: error.message };
  await yetki.admin.from("admin_audit_log").insert({ actor_id: yetki.userId, eylem: "rehber_sinif_atamasi", detay: { school_id: yetki.schoolId, teacher_id: teacherId, seviyeler: secilen } });
  revalidatePath("/dashboard", "layout");
  revalidatePath("/moderator", "layout");
  revalidatePath("/yonetici", "layout");
  return { error: null };
}

// Servise üye ekleme/çıkarma. Rehberlik okulda artık bir BRANŞ olmadığı için
// (branş listelerinden kalktı) rehber yapmanın tek yolu burası.
export async function rehberlikServisineEkle(teacherId: string, istenenOkulId?: string): Promise<{ error: string | null }> {
  const yetki = await yonetimYetkisi(istenenOkulId);
  if (!yetki) return { error: "Bu kurum için yönetim yetkiniz yok." };
  const { data: ogretmen } = await yetki.admin.from("teachers").select("id")
    .eq("id", teacherId).eq("school_id", yetki.schoolId).maybeSingle();
  if (!ogretmen) return { error: "Öğretmen bu kurumda bulunamadı." };
  const { error } = await yetki.admin.from("rehberlik_servisi")
    .upsert({ profile_id: teacherId, school_id: yetki.schoolId }, { onConflict: "profile_id" });
  if (error) return { error: error.message };
  await yetki.admin.from("admin_audit_log").insert({ actor_id: yetki.userId, eylem: "rehberlik_servisine_ekle", detay: { school_id: yetki.schoolId, teacher_id: teacherId } });
  revalidatePath("/dashboard", "layout");
  revalidatePath("/moderator", "layout");
  revalidatePath("/yonetici", "layout");
  return { error: null };
}

export async function rehberlikServisindenCikar(teacherId: string, istenenOkulId?: string): Promise<{ error: string | null }> {
  const yetki = await yonetimYetkisi(istenenOkulId);
  if (!yetki) return { error: "Bu kurum için yönetim yetkiniz yok." };
  const { error } = await yetki.admin.from("rehberlik_servisi").delete()
    .eq("profile_id", teacherId).eq("school_id", yetki.schoolId);
  if (error) return { error: error.message };
  await yetki.admin.from("admin_audit_log").insert({ actor_id: yetki.userId, eylem: "rehberlik_servisinden_cikar", detay: { school_id: yetki.schoolId, teacher_id: teacherId } });
  revalidatePath("/dashboard", "layout");
  revalidatePath("/moderator", "layout");
  revalidatePath("/yonetici", "layout");
  return { error: null };
}

// Servise eklenebilecek öğretmenler (kurumun öğretmenleri, zaten üye olanlar
// hariç). Rehberlik Servisi ekranındaki "Servise ekle" listesi.
export async function rehberlikServisiAdaylariGetir(istenenOkulId?: string): Promise<{ error: string | null; adaylar: { id: string; ad: string; brans: string }[] }> {
  const yetki = await yonetimYetkisi(istenenOkulId);
  if (!yetki) return { error: "Bu kurum için yönetim yetkiniz yok.", adaylar: [] };
  const [{ data: ogretmenler, error: ogretmenHatasi }, { data: uyeler }] = await Promise.all([
    yetki.admin.from("teachers").select("id, brans, profiles!teachers_id_fkey(ad, role, aktif)").eq("school_id", yetki.schoolId),
    yetki.admin.from("rehberlik_servisi").select("profile_id").eq("school_id", yetki.schoolId),
  ]);
  if (ogretmenHatasi) return { error: ogretmenHatasi.message, adaylar: [] };
  const uyeSeti = new Set(((uyeler ?? []) as { profile_id: string }[]).map((u) => u.profile_id));
  type OgretmenRow = { id: string; brans: string | null; profiles: { ad: string; role: string; aktif: boolean | null } | { ad: string; role: string; aktif: boolean | null }[] | null };
  const adaylar = ((ogretmenler ?? []) as unknown as OgretmenRow[])
    .map((o) => {
      const p = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
      return { id: o.id, ad: p?.ad ?? "İsimsiz", brans: o.brans ?? "—", role: p?.role, aktif: p?.aktif };
    })
    // Müdür servise alınmaz (kendi birimi var); askıya alınmış hesap da çıkmaz.
    .filter((o) => !uyeSeti.has(o.id) && o.role === "ogretmen" && o.aktif !== false)
    .map(({ id, ad, brans }) => ({ id, ad, brans }))
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  return { error: null, adaylar };
}
