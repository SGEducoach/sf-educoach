import type { SupabaseClient } from "@supabase/supabase-js";
import { saatAraliklariCakisiyor } from "@/lib/saat-araligi";

// Program Yap (27.08.2026) — bir öğrencinin PROGRAMA EKLENMİŞ (programa_eklendi_mi=true)
// tüm görev/planları kendi ogrenci_tarih/ogrenci_baslangic_saat/ogrenci_bitis_saat
// sütunlarında kendine yeterli duruyor (bkz. migration 0081) — planEkle,
// gorevProgramaEkle ve dershane rehberinin rehberProgramEkle'si AYNI bu
// fonksiyonla çakışma kontrolü yapıyor, tek yerden.
export async function programaCakisiyorMu(
  supabase: SupabaseClient,
  studentId: string,
  tarih: string,
  baslangicSaat: string,
  bitisSaat: string,
  haricAtamaId?: string,
): Promise<{ error: string | null; cakisiyor: boolean }> {
  let sorgu = supabase
    .from("gorev_atamalari")
    .select("ogrenci_baslangic_saat, ogrenci_bitis_saat")
    .eq("student_id", studentId)
    .eq("programa_eklendi_mi", true)
    .eq("ogrenci_tarih", tarih);
  if (haricAtamaId) sorgu = sorgu.neq("id", haricAtamaId);
  const { data, error } = await sorgu;
  if (error) return { error: error.message, cakisiyor: false };

  const gorevCakisiyor = ((data ?? []) as { ogrenci_baslangic_saat: string | null; ogrenci_bitis_saat: string | null }[]).some((r) =>
    !!r.ogrenci_baslangic_saat && !!r.ogrenci_bitis_saat &&
    saatAraliklariCakisiyor(r.ogrenci_baslangic_saat, r.ogrenci_bitis_saat, baslangicSaat, bitisSaat),
  );
  if (gorevCakisiyor) return { error: null, cakisiyor: true };

  // Kabul edilmiş Beden Eğitimi/Müzik çalışmaları da öğrencinin programını
  // kapatır. Böylece öğrenci daha sonra aynı saate kişisel plan ekleyemez.
  const { count: etkinlikSayisi, error: etkinlikHatasi } = await supabase
    .from("etkinlik_calisma_atamalari")
    .select("id,etkinlik_calismalari!inner(tarih,baslangic_saat,bitis_saat)", { count: "exact", head: true })
    .eq("student_id", studentId).eq("durum", "kabul")
    .eq("etkinlik_calismalari.tarih", tarih)
    .lt("etkinlik_calismalari.baslangic_saat", bitisSaat)
    .gt("etkinlik_calismalari.bitis_saat", baslangicSaat);
  if (etkinlikHatasi) return { error: etkinlikHatasi.message, cakisiyor: false };
  return { error: null, cakisiyor: (etkinlikSayisi ?? 0) > 0 };
}
