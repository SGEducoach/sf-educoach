import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bugunKartlari, gunMesaji } from "@/lib/ortaokul-bugun";
import type { BugunKarti } from "@/lib/ortaokul-bugun";
import { ortaokulGorevleriniGetir } from "@/lib/ortaokul-gorev-verisi";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";

// Ortaokul "Bugün" ekranının verisi. Şekillendirme ve sıralama saf tarafta
// (ortaokul-bugun.ts), görev sorgusu ortak tarafta
// (ortaokul-gorev-verisi.ts) durduğu için burası yalnız pencereyi seçip
// sayıları çıkarıyor.

export interface BugunVerisi {
  kartlar: BugunKarti[];
  mesaj: string;
  bugunBekleyen: number;
  bugunTamamlanan: number;
}

export async function ortaokulBugunGetir(
  supabase: SupabaseClient,
  studentId: string,
): Promise<BugunVerisi> {
  const bugun = bugununTarihiTR();
  // Pencere: bir hafta geriye (gecikmişler görünsün) ve bir hafta ileriye.
  const gorevler = await ortaokulGorevleriniGetir(supabase, studentId, tarihEkle(bugun, -7), tarihEkle(bugun, 7));

  const bugunkuler = gorevler.filter((g) => (g.sonTarih ?? g.tarih) === bugun);
  const bugunTamamlanan = bugunkuler.filter((g) => g.tamamlandi).length;
  const bugunBekleyen = bugunkuler.length - bugunTamamlanan;

  return {
    kartlar: bugunKartlari(gorevler, bugun),
    mesaj: gunMesaji(bugunBekleyen, bugunTamamlanan),
    bugunBekleyen,
    bugunTamamlanan,
  };
}
