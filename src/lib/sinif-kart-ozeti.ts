// Öğretmen panelindeki "Sınıflarım" kartlarının sınıf başına özeti
// (kullanıcı kararı 18.10.2026, "Nabız + Seviye tonu" harmanı):
//  - öğrenci sayısı
//  - son 7 günde kendi verisini giren öğrenci (konu çalışma, soru çözümü ya
//    da öğrencinin kendi girdiği deneme; okulun yüklediği deneme sayılmaz)
//  - bu öğretmenin onayını bekleyen soru çözümü (Onaylar sekmesindeki kural:
//    derse branş öğretmeni atanmışsa yalnız o, yoksa sınıf öğretmeni)
// "Bu hafta" yerine son 7 gün: pazartesi sabahı bütün halkalar boş görünmesin.
import type { SupabaseClient } from "@supabase/supabase-js";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";

export interface SinifKartOzeti { ogrenci: number; aktif: number; onay: number }

const PARCA = 150;
const parcalar = (l: string[]) => Array.from({ length: Math.ceil(l.length / PARCA) }, (_, i) => l.slice(i * PARCA, (i + 1) * PARCA));

export async function sinifKartOzetleriGetir(
  admin: SupabaseClient,
  girdi: { sinifIdleri: string[]; ogretmenId: string; ogretmenSinifId: string | null },
): Promise<Record<string, SinifKartOzeti>> {
  const sonuc: Record<string, SinifKartOzeti> = {};
  for (const id of girdi.sinifIdleri) sonuc[id] = { ogrenci: 0, aktif: 0, onay: 0 };
  if (girdi.sinifIdleri.length === 0) return sonuc;
  try {
    const { data: ogrenciler } = await admin.from("students").select("id, class_id").in("class_id", girdi.sinifIdleri);
    const ogrenciSinifi = new Map(((ogrenciler ?? []) as { id: string; class_id: string }[]).map((o) => [o.id, o.class_id]));
    for (const sinif of ogrenciSinifi.values()) if (sonuc[sinif]) sonuc[sinif].ogrenci++;
    const idler = [...ogrenciSinifi.keys()];
    if (idler.length === 0) return sonuc;

    const baslangic = tarihEkle(bugununTarihiTR(), -6);
    const aktifler = new Set<string>();
    const onaylar: { student_id: string; ders: string }[] = [];
    await Promise.all(parcalar(idler).map(async (p) => {
      const [konu, soru, deneme, bekleyen] = await Promise.all([
        admin.from("konu_calismalar").select("student_id").in("student_id", p).gte("tarih", baslangic),
        admin.from("soru_cozumleri").select("student_id").in("student_id", p).gte("tarih", baslangic),
        admin.from("denemeler").select("student_id").in("student_id", p).gte("tarih", baslangic).neq("kaynak", "ogretmen"),
        admin.from("soru_cozumleri").select("student_id, ders").in("student_id", p).eq("kaynak", "ogrenci").eq("onaylandi_mi", false),
      ]);
      for (const r of [...(konu.data ?? []), ...(soru.data ?? []), ...(deneme.data ?? [])] as { student_id: string }[]) aktifler.add(r.student_id);
      onaylar.push(...((bekleyen.data ?? []) as { student_id: string; ders: string }[]));
    }));
    for (const id of aktifler) { const s = ogrenciSinifi.get(id); if (s && sonuc[s]) sonuc[s].aktif++; }

    if (onaylar.length > 0) {
      const { data: atamalar } = await admin.from("ogretmen_dersleri").select("teacher_id, class_id, ders").in("class_id", girdi.sinifIdleri);
      const anahtar = (d: string) => d.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
      const atamaListesi = (atamalar ?? []) as { teacher_id: string; class_id: string; ders: string }[];
      for (const o of onaylar) {
        const sinif = ogrenciSinifi.get(o.student_id);
        if (!sinif || !sonuc[sinif]) continue;
        const dersinOgretmenleri = atamaListesi.filter((a) => a.class_id === sinif && anahtar(a.ders) === anahtar(o.ders));
        const yetkili = dersinOgretmenleri.length > 0
          ? dersinOgretmenleri.some((a) => a.teacher_id === girdi.ogretmenId)
          : girdi.ogretmenSinifId === sinif;
        if (yetkili) sonuc[sinif].onay++;
      }
    }
  } catch (e) {
    // Özet yardımcı bilgi: alınamazsa kartlar yalnız sınıf adıyla çizilir.
    console.warn("[sinif-kart-ozeti] alınamadı:", e instanceof Error ? e.message : e);
  }
  return sonuc;
}
