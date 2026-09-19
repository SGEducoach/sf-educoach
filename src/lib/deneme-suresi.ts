import type { SupabaseClient } from "@supabase/supabase-js";
import type { KurumTuru, UserRole } from "@/lib/types";

// Dershane modülü 1 haftalık deneme süresi (2026-08-25 kullanıcı isteği,
// bkz. migration 0065). Süre dolunca dershane rolleri "deneme süreniz
// sona erdi" ekranıyla karşılanır — okul tarafı hiç etkilenmez.

export const DENEME_SURESI_SONA_ERDI_MESAJI =
  "Deneme süreniz sona erdi. Hata kontrolleri yapılıp çalışmayan sistemler aktif hâle getirilecektir.";

// anon dahil herkes okuyabilir (login sayfası kimlik doğrulamadan önce de
// bu tarihi bilmeli) — bkz. migration 0065 RLS.
export async function dershaneDenemeBitisGetir(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.from("platform_ayarlari").select("dershane_deneme_bitis").eq("id", 1).maybeSingle();
  return (data?.dershane_deneme_bitis as string | null) ?? null;
}

export function suresiDolduMu(bitisTarihi: string | null): boolean {
  if (!bitisTarihi) return false;
  return new Date(bitisTarihi).getTime() < Date.now();
}

// Bir kullanıcının bağlı olduğu kurumun türünü (okul/dershane) role göre
// çözer — dashboard/page.tsx ÖNCEDEN bunu SADECE müdür için yapıyordu
// (kendi menüsü kurum türüne göre değiştiği için); deneme süresi
// kontrolü için artık TÜM rollerde gerekiyor.
export interface KullaniciKurumu {
  tur: KurumTuru;
  // Grup Koçluk (18.09.2026): grup, dershanenin alt türü; kendi bitiş
  // tarihi olduğu için platform geneli dershane deneme süresinden muaf.
  grupMu: boolean;
  // Yönetici grubu dondurduğunda false (schools.aktif) — grup üyeleri girişte
  // ve panelde durdurulur; öğrencilerin kendi hesap durumu değişmez.
  aktif: boolean;
  // Grup bitiş tarihi geçtiyse true: grup salt okunur (Faz 8, migration 0119).
  suresiDoldu: boolean;
}

export const GRUP_SALT_OKUNUR_MESAJI =
  "Grubunun süresi doldu; grup salt okunur. Verilerini görebilirsin ama yeni kayıt yapamazsın. Devam etmek için koçunla görüş.";

export const GRUP_DONDURULDU_MESAJI =
  "Bu grup şu an dondurulmuş durumda. Bilgi için koçunuzla ya da SeFu Koç yönetimiyle iletişime geçin.";

async function okulBilgisi(supabase: SupabaseClient, schoolId: string | null | undefined): Promise<KullaniciKurumu | undefined> {
  if (!schoolId) return undefined;
  const { data: s } = await supabase.from("schools").select("tur, grup_kapasitesi, grup_bitis_tarihi, aktif").eq("id", schoolId).maybeSingle();
  if (!s) return undefined;
  const bugun = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
  const grupMu = s.grup_kapasitesi !== null;
  return {
    tur: s.tur as KurumTuru, grupMu, aktif: s.aktif !== false,
    suresiDoldu: grupMu && !!s.grup_bitis_tarihi && (s.grup_bitis_tarihi as string) < bugun,
  };
}

export async function kullaniciKurumuGetir(
  supabase: SupabaseClient, userId: string, role: UserRole,
): Promise<KullaniciKurumu | undefined> {
  if (role === "ogretmen" || role === "mudur") {
    const { data: t } = await supabase.from("teachers").select("school_id").eq("id", userId).maybeSingle();
    return okulBilgisi(supabase, t?.school_id);
  }
  if (role === "ogrenci") {
    const { data: st } = await supabase.from("students").select("school_id").eq("id", userId).maybeSingle();
    return okulBilgisi(supabase, st?.school_id);
  }
  if (role === "veli") {
    const { data: ps } = await supabase.from("parent_students").select("student_id").eq("parent_id", userId).limit(1).maybeSingle();
    if (!ps) return undefined;
    const { data: st } = await supabase.from("students").select("school_id").eq("id", ps.student_id).maybeSingle();
    return okulBilgisi(supabase, st?.school_id);
  }
  return undefined; // admin — kurum kavramına bağlı değil
}

export async function kurumTuruGetir(
  supabase: SupabaseClient, userId: string, role: UserRole,
): Promise<KurumTuru | undefined> {
  return (await kullaniciKurumuGetir(supabase, userId, role))?.tur;
}

// Platform geneli dershane deneme süresi yalnızca gerçek dershanelere
// uygulanır; gruplar kendi bitiş tarihine tabidir (Faz 8: salt okunur).
export function denemeSuresiUygulanir(kurum: KullaniciKurumu | undefined): boolean {
  return kurum?.tur === "dershane" && !kurum.grupMu;
}

export function grupDondurulmus(kurum: KullaniciKurumu | undefined): boolean {
  return !!kurum?.grupMu && !kurum.aktif;
}
