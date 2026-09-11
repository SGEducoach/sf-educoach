import "server-only";
import type { createClient } from "@/lib/supabase/server";

type SupabaseSunucu = Awaited<ReturnType<typeof createClient>>;

export const UUID_DESENI = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface YaziliSinifOgrencisi {
  id: string;
  ad: string;
  okulNo: string;
}

// Yazılı analizi Excel şablonu (api/yazili-analizi/puan-sablonu) ve Excel
// yüklemesi (dashboard/yazili-puan-excel-actions.ts) için ORTAK kaynak:
// şablona yazılan liste ile yüklemede eşleştirilen liste aynı sorgudan
// gelsin. Okuma RLS'e tabi normal client ile — getSinifOgrencileri ile aynı
// kapsam; kullanıcının göremediği bir sınıf boş liste döner.
// `profiles` gömmesi: students↔profiles arasında birden fazla ilişki var,
// FK ipucu şart; bire-bir ilişki çalışma anında NESNE döner (tip dizi
// gösterse de) — bkz. yazili-analizi-actions.ts tekIliski.
export async function sinifOgrencileriniGetir(
  supabase: SupabaseSunucu,
  sinifId: string,
): Promise<{ error: string | null; sinifAdi: string | null; ogrenciler: YaziliSinifOgrencisi[] }> {
  const [{ data: sinif }, { data, error }] = await Promise.all([
    supabase.from("classes").select("seviye, sube").eq("id", sinifId).maybeSingle(),
    supabase.from("students").select("id, okul_no, profiles!students_id_fkey(ad)").eq("class_id", sinifId),
  ]);
  if (error) return { error: error.message, sinifAdi: null, ogrenciler: [] };

  type Satir = { id: string; okul_no: string | null; profiles: { ad: string | null } | { ad: string | null }[] | null };
  const ogrenciler = ((data ?? []) as unknown as Satir[])
    .map((o) => {
      const profil = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
      return { id: o.id, ad: profil?.ad?.trim() || "İsimsiz öğrenci", okulNo: (o.okul_no ?? "").trim() };
    })
    // Okul numarasına göre (sayısal); numarası sayı olmayanlar (dershane
    // kullanıcı adları) sona, kendi içinde ada göre.
    .sort((a, b) => (Number(a.okulNo) || Infinity) - (Number(b.okulNo) || Infinity) || a.ad.localeCompare(b.ad, "tr"));

  return { error: null, sinifAdi: sinif ? `${sinif.seviye}-${sinif.sube}` : null, ogrenciler };
}

// Kullanıcı kararı (11.09.2026): "sadece öğretmen girsin" — puan şablonunu
// indirme ve Excel'den yükleme YALNIZCA öğretmen rolüne açık (müdür dahil
// değil). Sihirbaz da zaten yalnızca öğretmen panelinde açılıyor
// (OgretmenPanel, role === "ogretmen").
export async function yaziliKullanicisi(supabase: SupabaseSunucu): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return profil?.role === "ogretmen" ? user.id : null;
}
