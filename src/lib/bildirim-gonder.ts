import type { SupabaseClient } from "@supabase/supabase-js";

// Kullanıcı isteği (26.08.2026, Bildirimler yeniden tasarımı — devam):
// gerçek sistem bildirimleri artık ayrı bir "bildirimler" tablosuna
// yazılıyor (bkz. migration 0079) — duyurular/duyuru_aliciler ("Mesajlarım")
// ile KARIŞTIRILMIYOR, o tablo öğretmen/müdür serbest metin mesajları için
// kalmaya devam ediyor. İlk kullanım: yanlış giriş denemesi uyarısı.
// "yoklama": yurt yoklaması müdür yardımcısına gönderildi (migration 0164).
export type BildirimTuru = "yanlis_giris" | "sistem" | "yoklama";

export async function bildirimGonder(
  admin: SupabaseClient,
  profileId: string,
  tur: BildirimTuru,
  baslik: string,
  mesaj: string,
) {
  const { error } = await admin.from("bildirimler").insert({ profile_id: profileId, tur, baslik, mesaj });
  // Tür kısıtı henüz güncellenmediyse bildirim kaybolmasın: genel türle yazılır.
  if (error && tur !== "sistem") await admin.from("bildirimler").insert({ profile_id: profileId, tur: "sistem", baslik, mesaj });
}
