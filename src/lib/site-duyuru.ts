import type { createClient } from "@/lib/supabase/server";

type SupabaseSunucu = Awaited<ReturnType<typeof createClient>>;

export interface AktifYoneticiDuyurusu {
  mesaj: string;
  bitis: string | null;
}

// Kullanıcı isteği (26.08.2026, Faz "Yönetici duyuru banner"): admin
// duyurusu artık sadece öğrenci/veli mesaj kutusuna değil, TÜM rollere
// sitenin üstünde sabit bir şerit olarak da gösteriliyor. Header (sunucu
// bileşeni) HER rolde bunu çağırır — platform_ayarlari zaten herkese açık
// select politikasına sahip (bkz. migration 0065), bu yüzden normal oturum
// client'ı yeterli, admin client gerekmiyor.
export async function aktifYoneticiDuyurusuGetir(supabase: SupabaseSunucu): Promise<AktifYoneticiDuyurusu | null> {
  const { data: ayar } = await supabase
    .from("platform_ayarlari")
    .select("aktif_duyuru_metni, aktif_duyuru_bitis, aktif_duyuru_kurum_id")
    .eq("id", 1)
    .maybeSingle();
  if (!ayar?.aktif_duyuru_metni) return null;
  if (ayar.aktif_duyuru_bitis && new Date(ayar.aktif_duyuru_bitis).getTime() < Date.now()) return null;

  if (ayar.aktif_duyuru_kurum_id) {
    const kendiKurumId = await kendiKurumIdGetir(supabase);
    if (kendiKurumId !== ayar.aktif_duyuru_kurum_id) return null;
  }
  return { mesaj: ayar.aktif_duyuru_metni, bitis: ayar.aktif_duyuru_bitis };
}

// Çağıranın kendi kurumu — rol'e göre farklı tablodan (students/teachers/
// parent_students) geliyor, admin'in kendi kurumu yok (null döner, yani
// admin sadece "Tümü" hedefli duyuruları görür).
async function kendiKurumIdGetir(supabase: SupabaseSunucu): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profil) return null;
  if (profil.role === "ogrenci") {
    const { data } = await supabase.from("students").select("school_id").eq("id", user.id).maybeSingle();
    return data?.school_id ?? null;
  }
  if (profil.role === "ogretmen" || profil.role === "mudur") {
    const { data } = await supabase.from("teachers").select("school_id").eq("id", user.id).maybeSingle();
    return data?.school_id ?? null;
  }
  if (profil.role === "veli") {
    const { data } = await supabase.from("parent_students").select("students(school_id)").eq("parent_id", user.id).limit(1).maybeSingle();
    return (data?.students as unknown as { school_id: string } | null)?.school_id ?? null;
  }
  return null;
}
