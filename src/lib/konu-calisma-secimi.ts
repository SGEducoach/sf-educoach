import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MUFREDAT_KONULARI, konuOgrenciyeUygunMu } from "@/lib/mufredat-konulari";
import type { AytAlan } from "@/lib/types";

// Konu çalışmasına yalnız resmî müfredat veya öğrencinin kurumunda tanımlı
// alt konu kaydedilir. Önceden serbest girişle üretilmiş konu anlatımları
// burada kaynak değildir; yanlış yazımlar listeye geri dönmemelidir.
export async function konuCalismaKonusuGecerliMi(
  client: SupabaseClient,
  schoolId: string,
  ders: string,
  konu: string,
  studentId: string,
): Promise<boolean> {
  const { data: ogrenci } = await client.from("students")
    .select("ayt_alan, classes(seviye)").eq("id", studentId).eq("school_id", schoolId).maybeSingle();
  if (!ogrenci) return false;
  const sinifSatiri = ogrenci.classes as { seviye: string } | { seviye: string }[] | null;
  const sinif = (Array.isArray(sinifSatiri) ? sinifSatiri[0] : sinifSatiri)?.seviye ?? null;
  const alan = ogrenci.ayt_alan as AytAlan;
  const uygunMu = (ustKonu: string) => MUFREDAT_KONULARI.some((k) =>
    k.ders === ders && k.konu === ustKonu && konuOgrenciyeUygunMu(k, sinif, alan));
  if (uygunMu(konu)) return true;

  const [genel, kurum] = await Promise.all([
    client.from("mufredat_alt_konular")
      .select("ust_konu").eq("ders", ders).eq("alt_baslik", konu),
    client.from("kurum_mufredat_alt_konulari")
      .select("ust_konu").eq("school_id", schoolId).eq("ders", ders).eq("alt_baslik", konu),
  ]);
  return [...(genel.data ?? []), ...(kurum.data ?? [])].some((k) => uygunMu(k.ust_konu));
}
