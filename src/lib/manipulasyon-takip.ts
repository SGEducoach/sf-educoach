import type { SupabaseClient } from "@supabase/supabase-js";

// Faz F (2026-08-25 kullanıcı isteği) — "sistemi manipüle etme
// girişimlerine 4.de uyarı 5'te ban" (öğrenci/veli). "Girişim" = bir
// veri girişi server action'ının server-side validasyonu REDDETTİĞİ
// istek (ör. SORU_SAYISI_UST_SINIR aşımı, dersSoruSayisi aşımı, negatif
// değer) — bkz. veri-actions.ts'teki çağrı noktaları. Sayaç KALICI
// (hiç sıfırlanmıyor) — kullanıcının isteğindeki "ban kaldırma
// moderatörde ve adminde olsun" ifadesi zaten var olan aktif/pasif
// toggle'ıyla (moderatorAktiflikDegistir/hesapAktiflikDegistir)
// karşılanıyor; bu fonksiyon SADECE sayacı artırıp gerekince
// profiles.aktif=false yapıyor, kaldırma ayrı (mevcut) bir akış.
const UYARI_ESIGI = 4;
const BAN_ESIGI = 5;

export interface ManipulasyonSonucu {
  uyariGoster: boolean; // sayaç TAM 4'e ulaştıysa (bu istekte) — bir kereye mahsus uyarı göster
  banlandi: boolean; // sayaç 5+ oldu — hesap az önce (ya da daha önce) askıya alındı
  sayac: number;
}

// admin: service-role client ZORUNLU — bu fonksiyon profiles.aktif'i
// (kullanıcının kendi RLS'iyle asla yazamayacağı bir alanı) güncelliyor.
export async function manipulasyonGirisimiKaydet(
  admin: SupabaseClient,
  userId: string,
  detay: string,
): Promise<ManipulasyonSonucu> {
  const { data: profil } = await admin.from("profiles").select("manipulasyon_sayaci").eq("id", userId).maybeSingle();
  const yeniSayac = (profil?.manipulasyon_sayaci ?? 0) + 1;

  const guncelleme: Record<string, unknown> = { manipulasyon_sayaci: yeniSayac };
  if (yeniSayac >= BAN_ESIGI) guncelleme.aktif = false;
  await admin.from("profiles").update(guncelleme).eq("id", userId);
  await admin.from("manipulasyon_loglari").insert({ user_id: userId, detay });

  return { uyariGoster: yeniSayac === UYARI_ESIGI, banlandi: yeniSayac >= BAN_ESIGI, sayac: yeniSayac };
}
