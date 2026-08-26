import type { SupabaseClient } from "@supabase/supabase-js";

// Kullanıcı isteği (26.08.2026, Bildirimler yeniden tasarımı — devam):
// gerçek sistem bildirimleri artık ayrı bir "bildirimler" tablosuna
// yazılıyor (bkz. migration 0079) — duyurular/duyuru_aliciler ("Mesajlarım")
// ile KARIŞTIRILMIYOR, o tablo öğretmen/müdür serbest metin mesajları için
// kalmaya devam ediyor. İlk kullanım: yanlış giriş denemesi uyarısı.
export type BildirimTuru = "yanlis_giris" | "sistem";

export async function bildirimGonder(
  admin: SupabaseClient,
  profileId: string,
  tur: BildirimTuru,
  baslik: string,
  mesaj: string,
) {
  await admin.from("bildirimler").insert({ profile_id: profileId, tur, baslik, mesaj });
}
