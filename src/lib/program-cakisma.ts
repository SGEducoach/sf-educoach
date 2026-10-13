import type { SupabaseClient } from "@supabase/supabase-js";
import { tarihliSaatAraliklariCakisiyor } from "@/lib/saat-araligi";

function tarihEkle(tarih: string, gun: number) {
  const d = new Date(`${tarih}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + gun);
  return d.toISOString().slice(0, 10);
}

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
    .select("ogrenci_tarih, ogrenci_baslangic_saat, ogrenci_bitis_saat")
    .eq("student_id", studentId)
    .eq("programa_eklendi_mi", true)
    .in("ogrenci_tarih", [tarihEkle(tarih, -1), tarih, tarihEkle(tarih, 1)]);
  if (haricAtamaId) sorgu = sorgu.neq("id", haricAtamaId);
  const { data, error } = await sorgu;
  if (error) return { error: error.message, cakisiyor: false };

  const gorevCakisiyor = ((data ?? []) as { ogrenci_tarih: string; ogrenci_baslangic_saat: string | null; ogrenci_bitis_saat: string | null }[]).some((r) =>
    !!r.ogrenci_baslangic_saat && !!r.ogrenci_bitis_saat &&
    tarihliSaatAraliklariCakisiyor(r.ogrenci_tarih, r.ogrenci_baslangic_saat, r.ogrenci_bitis_saat, tarih, baslangicSaat, bitisSaat),
  );
  if (gorevCakisiyor) return { error: null, cakisiyor: true };

  return { error: null, cakisiyor: false };
}
