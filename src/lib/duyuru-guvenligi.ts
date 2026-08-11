import type { SupabaseClient } from "@supabase/supabase-js";

export const DUYURU_MIN_UZUNLUK = 10;
export const DUYURU_BES_DAKIKA_LIMITI = 2;
export const DUYURU_GUNLUK_LIMITI = 10;

export async function duyuruGonderimIzniKontrol(
  admin: SupabaseClient,
  gonderenId: string,
): Promise<{ error: string | null; kalanGunlukHak: number }> {
  const simdi = Date.now();
  const besDakikaOnce = new Date(simdi - 5 * 60 * 1000).toISOString();
  const birGunOnce = new Date(simdi - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: yakinCount, error: yakinHata }, { count: gunlukCount, error: gunlukHata }] = await Promise.all([
    admin.from("duyurular").select("id", { count: "exact", head: true }).eq("gonderen_id", gonderenId).gte("created_at", besDakikaOnce),
    admin.from("duyurular").select("id", { count: "exact", head: true }).eq("gonderen_id", gonderenId).gte("created_at", birGunOnce),
  ]);
  if (yakinHata || gunlukHata) return { error: "Duyuru gönderim sınırı kontrol edilemedi. Lütfen tekrar deneyin.", kalanGunlukHak: 0 };

  const gunluk = gunlukCount ?? 0;
  if (gunluk >= DUYURU_GUNLUK_LIMITI) {
    return { error: "Son 24 saatteki 10 duyuru sınırına ulaştınız.", kalanGunlukHak: 0 };
  }
  if ((yakinCount ?? 0) >= DUYURU_BES_DAKIKA_LIMITI) {
    return { error: "Kısa sürede 2 duyuru gönderdiniz. 5 dakika dolduktan sonra tekrar deneyin.", kalanGunlukHak: Math.max(0, DUYURU_GUNLUK_LIMITI - gunluk) };
  }
  return { error: null, kalanGunlukHak: Math.max(0, DUYURU_GUNLUK_LIMITI - gunluk - 1) };
}
