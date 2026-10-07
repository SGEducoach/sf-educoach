import type { SupabaseClient } from "@supabase/supabase-js";

// Rehberlik Servisi = okulun ayrı bir BİRİMİ (kullanıcı kararı 07.10.2026,
// migration 0144). Rehber öğretmen bir branş öğretmeni değildir: kimliği
// artık teachers.brans = "Rehber Öğretmen" sihirli metni DEĞİL,
// rehberlik_servisi tablosundaki üyeliktir.
//
// Okuldaki rehberler sayılarına göre kademeleri aralarında paylaşır
// (sinif_duzeyleri). Boş dizi = henüz atama yapılmamış = hiçbir öğrenciyi
// görmez; bu DB tarafında da zorlanıyor (rehber_ogrenciyi_gorebilir ve
// students/profiles üzerindeki RESTRICTIVE politikalar, 0143 + 0144).
//
// KAPSAM: yalnız tur='okul'. Dershane rehberliği (dershane-rehber.ts) ve
// Grup Koçluk koçu (grup-koc-auth.ts) kimliğini hâlâ REHBER_BRANSI'ndan
// alıyor — onlar farklı bir iş, bu modülün dışında.

export interface RehberlikUyeligi {
  schoolId: string;
  sinifDuzeyleri: string[];
  unvan: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

export async function rehberlikUyeligiGetir(
  supabase: Istemci,
  profileId: string,
): Promise<RehberlikUyeligi | null> {
  const { data } = await supabase
    .from("rehberlik_servisi")
    .select("school_id, sinif_duzeyleri, unvan")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!data) return null;
  return {
    schoolId: data.school_id as string,
    sinifDuzeyleri: (data.sinif_duzeyleri as string[] | null) ?? [],
    unvan: (data.unvan as string | null) ?? "Rehber Öğretmen",
  };
}

export async function okulRehberiMi(supabase: Istemci, profileId: string): Promise<boolean> {
  return (await rehberlikUyeligiGetir(supabase, profileId)) !== null;
}

// Bir kurumun servis üyeleri (moderatör/yönetici ekranları ve branş
// öğretmeninin yardım isteğini doğru rehbere yönlendirmesi için).
export async function kurumRehberleriGetir(
  supabase: Istemci,
  schoolId: string,
): Promise<{ profileId: string; sinifDuzeyleri: string[] }[]> {
  const { data } = await supabase
    .from("rehberlik_servisi")
    .select("profile_id, sinif_duzeyleri")
    .eq("school_id", schoolId);
  return ((data ?? []) as { profile_id: string; sinif_duzeyleri: string[] | null }[]).map((s) => ({
    profileId: s.profile_id,
    sinifDuzeyleri: s.sinif_duzeyleri ?? [],
  }));
}

// Bir öğrencinin sınıf düzeyinden sorumlu rehberler — yardım isteği ve
// bildirim yönlendirmesi bunu kullanır (kademe paylaşımının karşılığı).
export async function duzeydenSorumluRehberler(
  supabase: Istemci,
  schoolId: string,
  sinifSeviyesi: string | null | undefined,
): Promise<string[]> {
  const uyeler = await kurumRehberleriGetir(supabase, schoolId);
  if (!sinifSeviyesi) return uyeler.map((u) => u.profileId);
  const sorumlu = uyeler.filter((u) => u.sinifDuzeyleri.includes(sinifSeviyesi));
  // Hiçbir rehbere o düzey atanmadıysa istek kaybolmasın: tüm servise gitsin.
  return (sorumlu.length > 0 ? sorumlu : uyeler).map((u) => u.profileId);
}
