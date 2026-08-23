"use server";

// DERSHANE MODU (Faz D5) — admin'in (site yöneticisi) PDF deneme eşleştirme
// inceleme kuyruğu. Ayrı bir dosyada tutuluyor (yonetici/actions.ts zaten
// büyük ve bu oturumda eşzamanlı düzenleniyor) — requireAdmin() burada
// kasıtlı olarak yeniden tanımlı (yonetici/actions.ts'teki aynı desen,
// bkz. oradaki gerekçe: service-role client RLS'i bypass ettiğinden bu
// kontrol olmadan herhangi bir oturum açmış kullanıcı admin API'sini
// tetikleyebilirdi).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ogretmenDenemeSonucuKaydet } from "@/lib/deneme-sonucu-kaydet";
import type { DenemeTuru } from "@/lib/types";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/yonetici");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return { supabase, user, admin: createAdminClient() };
}

export interface PdfEslesmeBekleyeni {
  id: string;
  adSoyadHam: string;
  dersSonuclari: { ders: string; dogru: number; yanlis: number }[];
  yayinevi: string;
  tarih: string;
  tur: string;
  okulAdi: string;
  schoolId: string;
  createdAt: string;
}

export async function pdfEslesmeBekleyenleriGetir(): Promise<{ error: string | null; bekleyenler: PdfEslesmeBekleyeni[] }> {
  const { admin } = await requireAdmin();
  const { data, error } = await admin
    .from("pdf_deneme_eslesme_bekleyenler")
    .select("id, ad_soyad_ham, ders_sonuclari, yayinevi, tarih, tur, school_id, created_at, schools(ad)")
    .eq("durum", "bekliyor")
    .order("created_at", { ascending: false });
  if (error) return { error: error.message, bekleyenler: [] };

  type Row = {
    id: string; ad_soyad_ham: string; ders_sonuclari: { ders: string; dogru: number; yanlis: number }[];
    yayinevi: string; tarih: string; tur: string; school_id: string; created_at: string;
    schools: { ad: string } | null;
  };
  const bekleyenler = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id, adSoyadHam: r.ad_soyad_ham, dersSonuclari: r.ders_sonuclari, yayinevi: r.yayinevi,
    tarih: r.tarih, tur: r.tur, schoolId: r.school_id, okulAdi: r.schools?.ad ?? "Bilinmiyor", createdAt: r.created_at,
  }));
  return { error: null, bekleyenler };
}

// Bekleyen satırın kurumundaki öğrencileri (isim ara-seç için) getirir.
export async function pdfEslesmeOgrencileriGetir(schoolId: string): Promise<{ error: string | null; ogrenciler: { id: string; ad: string }[] }> {
  const { admin } = await requireAdmin();
  const { data, error } = await admin.from("students").select("id, profiles!students_id_fkey(ad)").eq("school_id", schoolId);
  if (error) return { error: error.message, ogrenciler: [] };
  type Row = { id: string; profiles: { ad: string } | null };
  const ogrenciler = ((data ?? []) as unknown as Row[])
    .filter((o) => o.profiles)
    .map((o) => ({ id: o.id, ad: o.profiles!.ad }))
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  return { error: null, ogrenciler };
}

export async function pdfEslesmeAta(id: string, studentId: string): Promise<{ error: string | null }> {
  const { user, admin } = await requireAdmin();
  const { data: bekleyen, error: bulmaHatasi } = await admin
    .from("pdf_deneme_eslesme_bekleyenler")
    .select("*")
    .eq("id", id).eq("durum", "bekliyor")
    .maybeSingle();
  if (bulmaHatasi) return { error: bulmaHatasi.message };
  if (!bekleyen) return { error: "Kayıt bulunamadı veya zaten işlenmiş." };

  const { data: hedefOgrenci, error: ogrenciHatasi } = await admin.from("students")
    .select("id, school_id").eq("id", studentId).maybeSingle();
  if (ogrenciHatasi) return { error: ogrenciHatasi.message };
  if (!hedefOgrenci || hedefOgrenci.school_id !== bekleyen.school_id) {
    return { error: "Seçilen öğrenci bu kurumda değil." };
  }

  const kayit = await ogretmenDenemeSonucuKaydet(admin, {
    studentId,
    tarih: bekleyen.tarih,
    tur: bekleyen.tur as DenemeTuru,
    yayinevi: bekleyen.yayinevi,
    dersSonuclari: bekleyen.ders_sonuclari as { ders: string; dogru: number; yanlis: number }[],
  });
  if (kayit.error) return { error: kayit.error };

  const { error: guncellemeHatasi } = await admin.from("pdf_deneme_eslesme_bekleyenler")
    .update({ durum: "atandi", atanan_student_id: studentId }).eq("id", id);
  if (guncellemeHatasi) return { error: guncellemeHatasi.message };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "pdf_deneme_eslesme_ata", detay: { bekleyen_id: id, student_id: studentId } });
  revalidatePath("/yonetici");
  return { error: null };
}

export async function pdfEslesmeReddet(id: string): Promise<{ error: string | null }> {
  const { user, admin } = await requireAdmin();
  const { error } = await admin.from("pdf_deneme_eslesme_bekleyenler").update({ durum: "reddedildi" }).eq("id", id).eq("durum", "bekliyor");
  if (error) return { error: error.message };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "pdf_deneme_eslesme_reddet", detay: { bekleyen_id: id } });
  revalidatePath("/yonetici");
  return { error: null };
}
