"use server";

import { createClient } from "@/lib/supabase/server";
import { GECME_NOTU, yuzlugeCevir } from "@/lib/yazili-rapor-hesap";

export interface YaziliSinavOzeti {
  id: string;
  ad: string;
  tarih: string;
  ders: string;
  sinifAdi: string;
  ogrenciSayisi: number;
  maxToplam: number;
  ortalama: number | null;
  basariYuzdesi: number | null;
}

// Kullanıcı bulgusu (11.09.2026): "kaydedildi ama nerede olduğunu göremedim"
// — kaydedilen yazılılar hiçbir ekranda listelenmiyordu. Öğretmenin KENDİ
// oluşturduğu sınavlar; okuma RLS'e tabi normal client ile (yazılı tabloları
// yalnızca o sınıfın o dersine kayıtlı öğretmene açık).
export async function yaziliSinavlariniListele(): Promise<{ error: string | null; sinavlar: YaziliSinavOzeti[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturum bulunamadı.", sinavlar: [] };

  const { data: sinavlar, error } = await supabase
    .from("yazili_sinavlar")
    .select("id, ad, tarih, ders, created_at, classes(seviye, sube)")
    .eq("ogretmen_id", user.id)
    .order("tarih", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return { error: "Kayıtlı yazılılar alınamadı.", sinavlar: [] };
  if (!sinavlar?.length) return { error: null, sinavlar: [] };

  const idler = sinavlar.map((s) => s.id);
  const [{ data: sorular }, { data: sonuclar }] = await Promise.all([
    supabase.from("yazili_sorular").select("yazili_sinav_id, max_puan").in("yazili_sinav_id", idler),
    supabase.from("yazili_ogrenci_sonuclari").select("yazili_sinav_id, toplam_puan").in("yazili_sinav_id", idler),
  ]);

  const maxlar = new Map<string, number>();
  for (const s of sorular ?? []) maxlar.set(s.yazili_sinav_id, (maxlar.get(s.yazili_sinav_id) ?? 0) + s.max_puan);
  const toplamlar = new Map<string, number[]>();
  for (const r of sonuclar ?? []) toplamlar.set(r.yazili_sinav_id, [...(toplamlar.get(r.yazili_sinav_id) ?? []), r.toplam_puan]);

  return {
    error: null,
    sinavlar: sinavlar.map((s) => {
      const sinifHam = s.classes as unknown as { seviye: string; sube: string } | { seviye: string; sube: string }[] | null;
      const sinif = Array.isArray(sinifHam) ? sinifHam[0] : sinifHam;
      const maxToplam = maxlar.get(s.id) ?? 0;
      const puanlar = toplamlar.get(s.id) ?? [];
      const n = puanlar.length;
      return {
        id: s.id,
        ad: s.ad,
        tarih: s.tarih,
        ders: s.ders,
        sinifAdi: sinif ? `${sinif.seviye}-${sinif.sube}` : "-",
        ogrenciSayisi: n,
        maxToplam,
        ortalama: n ? puanlar.reduce((t, p) => t + p, 0) / n : null,
        basariYuzdesi: n ? (puanlar.filter((p) => yuzlugeCevir(p, maxToplam) >= GECME_NOTU).length / n) * 100 : null,
      };
    }),
  };
}
