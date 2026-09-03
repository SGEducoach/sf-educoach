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

// Kullanıcının dashboard'da göreceği (herkese açık, tüm roller) aktif akış —
// en yeni AKTIF_LIMIT kayıt. RLS zaten "select using (true)" (bkz. migration
// 0082), bu yüzden hem admin/service-role hem normal (anon-key) client ile
// çağrılabilir.
export async function tgDenemeIlanlariGetir(supabase: SupabaseClient): Promise<TgDenemeIlani[]> {
  const { data, error } = await supabase
    .from("tg_deneme_ilanlari")
    .select("id, tarih, baslik, aciklama, dosya_yolu, dosya_tipi, genislik, yukseklik, created_at")
    .order("created_at", { ascending: false })
    .limit(AKTIF_LIMIT);
  if (error) { console.error("tg_deneme_ilanlari okunamadı:", error.message); return []; }
  return (data ?? []).map(satiriDonustur);
}

// Admin yönetim listesi: yayındaki ve arşivdeki ilanlar birlikte silinebilir.
export async function tgDenemeArsiviGetir(supabase: SupabaseClient): Promise<TgDenemeIlani[]> {
  const { data, error } = await supabase
    .from("tg_deneme_ilanlari")
    .select("id, tarih, baslik, aciklama, dosya_yolu, dosya_tipi, genislik, yukseklik, created_at")
    .order("created_at", { ascending: false })
    .range(0, AKTIF_LIMIT + 199); // Admin: yayındaki ve arşivdeki en yeni 220 ilan.
  if (error) { console.error("tg_deneme_ilanlari arşivi okunamadı:", error.message); return []; }
  return (data ?? []).map(satiriDonustur);
}

export function tgDenemeDosyaUrl(dosyaYolu: string): string {
  const taban = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${taban}/storage/v1/object/public/tg-denemeleri/${dosyaYolu}`;
}
