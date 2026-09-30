import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bugunKartlari, gunMesaji } from "@/lib/ortaokul-bugun";
import type { BugunGorevi, BugunKarti } from "@/lib/ortaokul-bugun";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";

// Ortaokul "Bugün" ekranının verisi. Şekillendirme ve sıralama saf tarafta
// (ortaokul-bugun.ts) durduğu için burası yalnız sorgu + eşleme yapıyor.

export interface BugunVerisi {
  kartlar: BugunKarti[];
  mesaj: string;
  bugunBekleyen: number;
  bugunTamamlanan: number;
}

interface AtamaSatiri {
  id: string;
  durum: string | null;
  gorevler: {
    tur: string; ders: string; konu: string | null;
    tarih: string; son_tarih: string | null;
    hedef_soru_sayisi: number | null; hedef_dakika: number | null;
    olusturan_ogretmen_id: string | null;
  } | null;
}

export async function ortaokulBugunGetir(
  supabase: SupabaseClient,
  studentId: string,
): Promise<BugunVerisi> {
  const bugun = bugununTarihiTR();
  // Pencere: bir hafta geriye (gecikmişler görünsün) ve bir hafta ileriye.
  const { data } = await supabase
    .from("gorev_atamalari")
    .select("id, durum, gorevler!inner(tur, ders, konu, tarih, son_tarih, hedef_soru_sayisi, hedef_dakika, olusturan_ogretmen_id)")
    .eq("student_id", studentId)
    .gte("gorevler.tarih", tarihEkle(bugun, -7))
    .lte("gorevler.tarih", tarihEkle(bugun, 7));

  const satirlar = (data ?? []) as unknown as AtamaSatiri[];

  // Öğretmen adları tek sorguda; görev kartında "kim verdi" yazması
  // öğrencinin işi sahiplenmesine yardım ediyor (tasarım belgesi §6.2).
  const ogretmenIdleri = [...new Set(satirlar.map((s) => s.gorevler?.olusturan_ogretmen_id).filter((x): x is string => !!x))];
  const adlar = new Map<string, string>();
  if (ogretmenIdleri.length > 0) {
    const { data: profiller } = await supabase.from("profiles").select("id, ad").in("id", ogretmenIdleri);
    for (const p of ((profiller ?? []) as { id: string; ad: string | null }[])) {
      if (p.ad) adlar.set(p.id, p.ad);
    }
  }

  const gorevler: BugunGorevi[] = satirlar.flatMap((s) => {
    const g = s.gorevler;
    if (!g) return [];
    return [{
      atamaId: s.id,
      tur: g.tur,
      ders: g.ders,
      konu: g.konu,
      tarih: g.tarih,
      sonTarih: g.son_tarih,
      hedefSoruSayisi: g.hedef_soru_sayisi,
      hedefDakika: g.hedef_dakika,
      ogretmenAdi: g.olusturan_ogretmen_id ? adlar.get(g.olusturan_ogretmen_id) ?? null : null,
      tamamlandi: s.durum === "tamamlandi",
    }];
  });

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
