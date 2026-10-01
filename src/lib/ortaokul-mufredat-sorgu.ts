import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { seviyeNormalize } from "@/lib/kademe";
import { dersleriOzetle, temalariDuzenle } from "@/lib/ortaokul-mufredat";
import type { HamTemaSatiri, OrtaokulDersi, OrtaokulTemasi } from "@/lib/ortaokul-mufredat";

// Ortaokul mufredat SORGULARI. Sekillendirme saf tarafta (ortaokul-mufredat.ts)
// durdugu icin burasi ince kaliyor ve test edilebilirlik korunuyor.
// Mufredat tablolari authenticated icin SALT OKUNUR; servis anahtari gerekmez.

async function aktifSurumId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from("ortaokul_mufredat_surumleri")
    .select("id")
    .eq("durum", "aktif")
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

// "Derslerim" ekranının listesi: sınıfın dersleri + tema/kazanım sayıları.
export async function ortaokulDersleriGetir(
  supabase: SupabaseClient,
  sinifSeviyesi: string | null | undefined,
): Promise<OrtaokulDersi[]> {
  const seviye = seviyeNormalize(sinifSeviyesi);
  if (!seviye) return [];
  const surumId = await aktifSurumId(supabase);
  if (!surumId) return [];

  const { data: dersler } = await supabase
    .from("ortaokul_mufredat_dersleri")
    .select("id, ders_kodu, ad, sira")
    .eq("surum_id", surumId)
    .eq("sinif_seviyesi", seviye);
  const dersListesi = (dersler ?? []) as { id: string; ders_kodu: string; ad: string; sira: number }[];
  if (dersListesi.length === 0) return [];

  const dersIdleri = dersListesi.map((d) => d.id);
  const { data: temalar } = await supabase
    .from("ortaokul_mufredat_temalari")
    .select("id, ders_id")
    .in("ders_id", dersIdleri);
  const temaListesi = (temalar ?? []) as { id: string; ders_id: string }[];

  // Kazanım sayıları tema başına: tek sorgu, satırlar JS'te sayılıyor
  // (PostgREST'te gruplu sayım yok).
  const kazanimSayilari = new Map<string, number>();
  if (temaListesi.length > 0) {
    const { data: kazanimlar } = await supabase
      .from("ortaokul_mufredat_kazanimlari")
      .select("tema_id")
      .in("tema_id", temaListesi.map((t) => t.id))
      .eq("aktif", true);
    for (const k of ((kazanimlar ?? []) as { tema_id: string }[])) {
      kazanimSayilari.set(k.tema_id, (kazanimSayilari.get(k.tema_id) ?? 0) + 1);
    }
  }

  return dersleriOzetle(dersListesi, temaListesi, kazanimSayilari);
}

// Tek dersin konu haritası: tema/ünite/beceri + altındaki öğrenme çıktıları.
export async function ortaokulDersHaritasiGetir(
  supabase: SupabaseClient,
  dersId: string,
): Promise<OrtaokulTemasi[]> {
  const { data } = await supabase
    .from("ortaokul_mufredat_temalari")
    .select("id, kod, ad, tur, ders_saati, alt_basliklar, sira, ortaokul_mufredat_kazanimlari(id, kod, metin, sira)")
    .eq("ders_id", dersId);
  return temalariDuzenle((data ?? []) as unknown as HamTemaSatiri[]);
}
