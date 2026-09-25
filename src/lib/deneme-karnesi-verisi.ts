import type { SupabaseClient } from "@supabase/supabase-js";
import type { KarneDersOrtalamasi, KarnePuani, KarneTestCevaplari } from "@/lib/karne-birinci-sayfa";

// Öğrencinin karneli denemelerinin 1. sayfa özeti (deneme_karne_ozetleri,
// migration 0123) — kullanıcı isteği 25.09.2026.
export interface DenemeKarnesi {
  denemeId: string;
  tarih: string;
  tur: string;
  yayinevi: string;
  puanlar: KarnePuani[];
  dersler: KarneDersOrtalamasi[];
  testler: KarneTestCevaplari[];
}

type Row = {
  id: string; tarih: string; tur: string; yayinevi: string | null;
  deneme_karne_ozetleri: { puanlar: KarnePuani[]; ders_ortalamalari: KarneDersOrtalamasi[]; cevaplar: KarneTestCevaplari[] }
    | { puanlar: KarnePuani[]; ders_ortalamalari: KarneDersOrtalamasi[]; cevaplar: KarneTestCevaplari[] }[] | null;
};

export async function denemeKarneleriGetir(supabase: SupabaseClient, studentId: string, adet = 8): Promise<DenemeKarnesi[]> {
  const { data, error } = await supabase.from("denemeler")
    .select("id, tarih, tur, yayinevi, deneme_karne_ozetleri!inner(puanlar, ders_ortalamalari, cevaplar)")
    .eq("student_id", studentId)
    .order("tarih", { ascending: false })
    .limit(adet);
  // Migration 0123 henüz uygulanmadıysa tablo/ilişki yok — kart gizlenir.
  if (error) return [];
  return ((data ?? []) as unknown as Row[]).flatMap((r) => {
    const k = Array.isArray(r.deneme_karne_ozetleri) ? r.deneme_karne_ozetleri[0] : r.deneme_karne_ozetleri;
    if (!k) return [];
    return [{
      denemeId: r.id, tarih: r.tarih, tur: r.tur, yayinevi: r.yayinevi ?? "",
      puanlar: k.puanlar ?? [], dersler: k.ders_ortalamalari ?? [], testler: k.cevaplar ?? [],
    }];
  });
}
