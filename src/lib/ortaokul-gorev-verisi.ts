import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { BugunGorevi } from "@/lib/ortaokul-bugun";

// Ortaokul ekranlarının ORTAK görev sorgusu. Bugün / Görevlerim / Planım
// üçü de aynı veriyi okuyor, yalnız tarih penceresi ve şekillendirme farklı —
// sorgu üç yere kopyalanırsa öğretmen adı eşlemesi gibi ayrıntılar ayrışır.
//
// `gorevler` ORTAK tablo (paralel model kuralı: kimlik/sınıf/görev ortak,
// paralel olan müfredat-ilerleme-ölçme), bu yüzden burada ortaokula özel bir
// filtre yok; çağıran taraf zaten tek bir öğrencinin atamalarını istiyor.

interface AtamaSatiri {
  id: string;
  durum: string | null;
  gorevler: {
    tur: string; ders: string; konu: string | null; aciklama: string | null;
    tarih: string; son_tarih: string | null;
    hedef_soru_sayisi: number | null; hedef_dakika: number | null;
    olusturan_ogretmen_id: string | null;
  } | null;
}

export async function ortaokulGorevleriniGetir(
  supabase: SupabaseClient,
  studentId: string,
  baslangic: string,
  bitis: string,
): Promise<BugunGorevi[]> {
  const { data } = await supabase
    .from("gorev_atamalari")
    .select("id, durum, gorevler!inner(tur, ders, konu, aciklama, tarih, son_tarih, hedef_soru_sayisi, hedef_dakika, olusturan_ogretmen_id)")
    .eq("student_id", studentId)
    .gte("gorevler.tarih", baslangic)
    .lte("gorevler.tarih", bitis);

  const satirlar = (data ?? []) as unknown as AtamaSatiri[];

  // Öğretmen adları TEK sorguda: kartta "kim verdi" yazması öğrencinin işi
  // sahiplenmesine yardım ediyor (tasarım belgesi §6.2).
  const ogretmenIdleri = [...new Set(satirlar.map((s) => s.gorevler?.olusturan_ogretmen_id).filter((x): x is string => !!x))];
  const adlar = new Map<string, string>();
  if (ogretmenIdleri.length > 0) {
    const { data: profiller } = await supabase.from("profiles").select("id, ad").in("id", ogretmenIdleri);
    for (const p of ((profiller ?? []) as { id: string; ad: string | null }[])) {
      if (p.ad) adlar.set(p.id, p.ad);
    }
  }

  return satirlar.flatMap((s) => {
    const g = s.gorevler;
    if (!g) return [];
    return [{
      atamaId: s.id,
      tur: g.tur,
      ders: g.ders,
      konu: g.konu,
      aciklama: g.aciklama,
      tarih: g.tarih,
      sonTarih: g.son_tarih,
      hedefSoruSayisi: g.hedef_soru_sayisi,
      hedefDakika: g.hedef_dakika,
      ogretmenAdi: g.olusturan_ogretmen_id ? adlar.get(g.olusturan_ogretmen_id) ?? null : null,
      tamamlandi: s.durum === "tamamlandi",
    }];
  });
}
