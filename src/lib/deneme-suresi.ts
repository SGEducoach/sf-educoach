import type { SupabaseClient } from "@supabase/supabase-js";
import type { KurumKademesi, KurumTuru, UserRole } from "@/lib/types";
import type { KurumModulYetkileri } from "@/lib/kurum-yetkileri";

// Deneme süresi kuruma özeldir (migration 0170). Tarih girilmemiş kurumlarda
// deneme sınırı uygulanmaz; Grup Koçluk kendi süre kurallarını kullanır.

export const DENEME_SURESI_SONA_ERDI_MESAJI =
  "Kurumunuzun deneme süresi sona erdi. Devam etmek için kurum yetkilinizle görüşün.";

export function suresiDolduMu(bitisTarihi: string | null): boolean {
  if (!bitisTarihi) return false;
  return new Date(bitisTarihi).getTime() < Date.now();
}

// Bir kullanıcının bağlı olduğu kurumun türünü (okul/dershane) role göre
// çözer — dashboard/page.tsx ÖNCEDEN bunu SADECE müdür için yapıyordu
// (kendi menüsü kurum türüne göre değiştiği için); deneme süresi
// kontrolü için artık TÜM rollerde gerekiyor.
export interface KullaniciKurumu {
  // Kurumun kimliği — Pano kuruma bağlı olduğu için gerekli (migration 0134).
  id: string;
  tur: KurumTuru;
  // Grup Koçluk (18.09.2026): grup, dershanenin alt türü; kendi bitiş
  // tarihi olduğu için platform geneli dershane deneme süresinden muaf.
  grupMu: boolean;
  // Yönetici grubu dondurduğunda false (schools.aktif) — grup üyeleri girişte
  // ve panelde durdurulur; öğrencilerin kendi hesap durumu değişmez.
  aktif: boolean;
  manuelAktif: boolean;
  kullanimBitisTarihi: string | null;
  denemeBitisTarihi: string | null;
  modulYetkileri: KurumModulYetkileri;
  // Grup bitiş tarihi geçtiyse true: grup salt okunur (Faz 8, migration 0119).
  suresiDoldu: boolean;
  // Kurumun kademesi (migration 0128). Ortaokul öğretmeninin menüsü buna
  // göre değişiyor (Konu Yeterliliği), eski kayıtlarda null olabilir.
  kademe: KurumKademesi | null;
  // Yurdu var mı (migration 0133). false ise yurt arayüzleri hiç çizilmiyor.
  yurtlu: boolean;
}

export const GRUP_SALT_OKUNUR_MESAJI =
  "Grubunun süresi doldu; grup salt okunur. Verilerini görebilirsin ama yeni kayıt yapamazsın. Devam etmek için koçunla görüş.";

export const GRUP_DONDURULDU_MESAJI =
  "Bu grup şu an dondurulmuş durumda. Bilgi için koçunuzla ya da SeFu Koç yönetimiyle iletişime geçin.";

async function okulBilgisi(supabase: SupabaseClient, schoolId: string | null | undefined): Promise<KullaniciKurumu | undefined> {
  if (!schoolId) return undefined;
  const { data: s } = await supabase.from("schools").select("tur, kademe, yurtlu, grup_kapasitesi, grup_bitis_tarihi, aktif, manuel_aktif, kullanim_bitis_tarihi, deneme_bitis_tarihi, modul_yetkileri").eq("id", schoolId).maybeSingle();
  if (!s) return undefined;
  const bugun = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
  const grupMu = s.grup_kapasitesi !== null;
  return {
    id: schoolId,
    tur: s.tur as KurumTuru, grupMu, aktif: s.aktif !== false,
    manuelAktif: s.manuel_aktif !== false,
    kullanimBitisTarihi: (s.kullanim_bitis_tarihi as string | null) ?? null,
    denemeBitisTarihi: (s.deneme_bitis_tarihi as string | null) ?? null,
    modulYetkileri: (s.modul_yetkileri as KurumModulYetkileri | null) ?? {},
    kademe: (s.kademe as KurumKademesi | null) ?? null,
    yurtlu: s.yurtlu === true,
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

// Grup Koçluk gruplarının ayrı bitiş kuralı vardır.
export function kurumDenemeSuresiDolduMu(kurum: Pick<KullaniciKurumu, "grupMu" | "denemeBitisTarihi"> | undefined): boolean {
  return !!kurum && !kurum.grupMu && suresiDolduMu(kurum.denemeBitisTarihi);
}

export function grupDondurulmus(kurum: KullaniciKurumu | undefined): boolean {
  return !!kurum?.grupMu && !kurum.aktif;
}
