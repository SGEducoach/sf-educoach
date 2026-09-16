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

  // Kabul edilmiş Beden Eğitimi/Müzik çalışmaları da öğrencinin programını
  // kapatır. Böylece öğrenci daha sonra aynı saate kişisel plan ekleyemez.
  const { data: etkinlikler, error: etkinlikHatasi } = await supabase
    .from("etkinlik_calisma_atamalari")
    .select("etkinlik_calismalari!inner(tarih,baslangic_saat,bitis_saat)")
    .eq("student_id", studentId).eq("durum", "kabul")
    .in("etkinlik_calismalari.tarih", [tarihEkle(tarih, -1), tarih, tarihEkle(tarih, 1)]);
  if (etkinlikHatasi) return { error: etkinlikHatasi.message, cakisiyor: false };
  type Etkinlik = { etkinlik_calismalari: { tarih: string; baslangic_saat: string; bitis_saat: string } | { tarih: string; baslangic_saat: string; bitis_saat: string }[] | null };
  const etkinlikCakisiyor = ((etkinlikler ?? []) as unknown as Etkinlik[]).some((satir) => {
    const kayit = Array.isArray(satir.etkinlik_calismalari) ? satir.etkinlik_calismalari[0] : satir.etkinlik_calismalari;
    return !!kayit && tarihliSaatAraliklariCakisiyor(kayit.tarih, kayit.baslangic_saat, kayit.bitis_saat, tarih, baslangicSaat, bitisSaat);
  });
  return { error: null, cakisiyor: etkinlikCakisiyor };
}
