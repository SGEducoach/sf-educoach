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
// Kaynak okul öğrenci listesi (migration 0105, kullanıcı kararı 13.09.2026:
// "kayıtlı olsun olmasın bütün sınıf yer alsın") — hesabı olmayan öğrenciler
// de listede. Öğrenci kimliği hesabın değil LİSTE satırının id'si; yazılı
// sonuçları (liste_ogrenci_id) ve kayıt RPC'si bu kimliği kullanır.
export async function sinifOgrencileriniGetir(
  supabase: SupabaseSunucu,
  sinifId: string,
): Promise<{ error: string | null; sinifAdi: string | null; ogrenciler: YaziliSinifOgrencisi[] }> {
  const [{ data: sinif }, { data, error }] = await Promise.all([
    supabase.from("classes").select("seviye, sube").eq("id", sinifId).maybeSingle(),
    supabase.from("okul_ogrenci_listesi").select("id, okul_no, ad_soyad").eq("class_id", sinifId),
  ]);
  if (error) return { error: error.message, sinifAdi: null, ogrenciler: [] };

  type Satir = { id: string; okul_no: string | null; ad_soyad: string | null };
  const ogrenciler = ((data ?? []) as Satir[])
    .map((o) => ({ id: o.id, ad: o.ad_soyad?.trim() || "İsimsiz öğrenci", okulNo: (o.okul_no ?? "").trim() }))
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
