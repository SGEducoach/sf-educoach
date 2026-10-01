import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gorevGruplari, haftaMesaji, haftaPlani } from "@/lib/ortaokul-gorevler";
import type { GorevGrubu, PlanGunu } from "@/lib/ortaokul-gorevler";
import { ortaokulGorevleriniGetir } from "@/lib/ortaokul-gorev-verisi";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";

// "Görevlerim" ve "Planım" ekranlarının verisi. Pencereler bilinçli farklı:
// Görevlerim ileriye daha uzak bakar (ileri tarihli ödev de listede olmalı),
// Planım yalnız seçili haftayı gösterir.

export interface GorevlerimVerisi {
  gruplar: GorevGrubu[];
  bugun: string;
}

export async function ortaokulGorevlerimGetir(
  supabase: SupabaseClient,
  studentId: string,
): Promise<GorevlerimVerisi> {
  const bugun = bugununTarihiTR();
  // Geriye bir hafta: gecikmişler ve son bir haftada bitirilenler. İleriye
  // bir ay: ileri tarihli proje/ödev de görünsün.
  const gorevler = await ortaokulGorevleriniGetir(supabase, studentId, tarihEkle(bugun, -7), tarihEkle(bugun, 30));
  return { gruplar: gorevGruplari(gorevler, bugun), bugun };
}

export interface PlanimVerisi {
  gunler: PlanGunu[];
  mesaj: string;
  haftaBaslangic: string;
  bugun: string;
}

export async function ortaokulPlanimGetir(
  supabase: SupabaseClient,
  studentId: string,
  haftaBaslangic: string,
  sinifSeviyesi: string | null,
): Promise<PlanimVerisi> {
  const bugun = bugununTarihiTR();
  // Pencere haftadan GENİŞ: görev erken verilip son tarihi bu haftaya düşmüş
  // olabilir, haftaPlani son tarihe göre yerleştiriyor. Sadece haftayı
  // sorgulasak o görev plandan düşerdi.
  const gorevler = await ortaokulGorevleriniGetir(
    supabase, studentId, tarihEkle(haftaBaslangic, -30), tarihEkle(haftaBaslangic, 6),
  );
  const gunler = haftaPlani(gorevler, haftaBaslangic, bugun, sinifSeviyesi);
  return { gunler, mesaj: haftaMesaji(gunler), haftaBaslangic, bugun };
}
