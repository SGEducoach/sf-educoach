import type { SupabaseClient } from "@supabase/supabase-js";

// TG Denemeleri — Google Drive bypass planı (27.08.2026 kullanıcı isteği):
// admin panelinden PDF/JPEG yükleyip yazdığı duyurular. Bilinçli olarak
// AYRI bir "durum" (aktif/arşiv) sütunu YOK — arşivleme tamamen SIRALAMA
// bazlı: en yeni AKTIF_LIMIT kayıt akışta, ondan sonrakiler (21. kayıttan
// itibaren) otomatik "arşiv" sayılıyor (bkz. arsivGetir). Bu, "21. haberden
// itibaren arşivlenecek" isteğini ekstra bir güncelleme adımı olmadan,
// sadece created_at sırasına göre offset ile karşılıyor.
export const AKTIF_LIMIT = 20;

export interface TgDenemeIlani {
  id: string;
  tarih: string;
  baslik: string;
  aciklama: string;
  dosyaYolu: string;
  dosyaTipi: "resim" | "pdf";
  genislik: number | null;
  yukseklik: number | null;
  createdAt: string;
}

interface TgDenemeIlaniRow {
  id: string;
  tarih: string;
  baslik: string;
  aciklama: string;
  dosya_yolu: string;
  dosya_tipi: "resim" | "pdf";
  genislik: number | null;
  yukseklik: number | null;
  created_at: string;
}

function satiriDonustur(r: TgDenemeIlaniRow): TgDenemeIlani {
  return {
    id: r.id, tarih: r.tarih, baslik: r.baslik, aciklama: r.aciklama, dosyaYolu: r.dosya_yolu, dosyaTipi: r.dosya_tipi,
    genislik: r.genislik, yukseklik: r.yukseklik, createdAt: r.created_at,
  };
}

export async function tgDenemeIlanlariGetir(
  supabase: SupabaseClient,
  schoolId: string | null | undefined,
): Promise<TgDenemeIlani[]> {
  if (!schoolId) return [];
  const { data, error } = await supabase
    .from("tg_deneme_ilanlari")
    .select("id, tarih, baslik, aciklama, dosya_yolu, dosya_tipi, genislik, yukseklik, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(AKTIF_LIMIT);
  if (error) { console.error("tg_deneme_ilanlari okunamadı:", error.message); return []; }
  return (data ?? []).map(satiriDonustur);
}
// Admin yönetim listesi: yayındaki ve arşivdeki ilanlar birlikte silinebilir.
export async function tgDenemeArsiviGetir(supabase: SupabaseClient, schoolId: string | null): Promise<TgDenemeIlani[]> {
  let sorgu = supabase
    .from("tg_deneme_ilanlari")
    .select("id, tarih, baslik, aciklama, dosya_yolu, dosya_tipi, genislik, yukseklik, created_at");
  sorgu = schoolId ? sorgu.eq("school_id", schoolId) : sorgu.is("school_id", null);
  const { data, error } = await sorgu
    .order("created_at", { ascending: false })
    .range(0, AKTIF_LIMIT + 199);
  if (error) { console.error("tg_deneme_ilanlari arşivi okunamadı:", error.message); return []; }
  return (data ?? []).map(satiriDonustur);
}

// PROXY URL GÜNCELLEMESİ (Supabase ismi yerine kendi sitemiz üzerinden görünür)
export function tgDenemeDosyaUrl(dosyaYolu: string): string {
  return `/api/dosya?yol=${encodeURIComponent(dosyaYolu)}`;
}
