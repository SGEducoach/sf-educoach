import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { anonSunucuOkuyucu } from "@/lib/supabase/anon-server";
import { ANA_SAYFA_ONBELLEK_ETIKETI } from "@/lib/ana-sayfa";

export interface AnaSayfaDuyurusu { id: string; baslik: string; icerik: string; createdAt: string; updatedAt: string }

// Performans (2026-09-04): ana sayfa duyuruları da 60 sn önbellekte;
// admin kaydetme/silme action'ları revalidateTag("ana-sayfa") ile tazeler.
// supabase parametresi geriye dönük uyumluluk için kaldı (kullanılmıyor).
const duyurulariOku = unstable_cache(
  async (): Promise<AnaSayfaDuyurusu[]> => {
    const { data, error } = await anonSunucuOkuyucu().from("ana_sayfa_duyurulari")
      .select("id, baslik, icerik, created_at, updated_at").order("created_at", { ascending: false }).limit(6);
    if (error) { console.error("ana_sayfa_duyurulari okunamadı:", error.message); return []; }
    return (data ?? []).map((r) => ({ id: r.id, baslik: r.baslik, icerik: r.icerik, createdAt: r.created_at, updatedAt: r.updated_at }));
  },
  ["ana-sayfa-duyurulari"],
  { revalidate: 60, tags: [ANA_SAYFA_ONBELLEK_ETIKETI] },
);

export async function anaSayfaDuyurulariniGetir(_supabase?: SupabaseClient): Promise<AnaSayfaDuyurusu[]> {
  return duyurulariOku();
}
