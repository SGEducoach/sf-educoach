import type { createClient } from "@/lib/supabase/server";
import { netHesapla } from "@/lib/types";
import type { HedefeYakinlik, VerimlilikDuzeyi } from "@/lib/types";

export interface AnalizVerisi {
  denemeTrend: { tarih: string; net: number; tur: "TYT" | "AYT" }[];
  calismaGunluk: { tarih: string; dakika: number }[];
  dersNetOrtalama: { ders: string; net: number }[];
  hedefeYakinlikDagilimi: Record<HedefeYakinlik, number>;
  haftalikVerimlilik: { tarih: string; puan: number; duzey: VerimlilikDuzeyi }[];
  sonDenemeNet: number | null;
  buHaftaDakika: number;
}

const VERIMLILIK_PUAN: Record<VerimlilikDuzeyi, number> = {
  cok_dusuk: 1, dusuk: 2, orta: 3, iyi: 4, cok_iyi: 5,
};

export async function analizVerisiGetir(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
): Promise<AnalizVerisi> {
  const [
    { data: denemeler },
    { data: konular },
    { data: sorular },
    { data: verimlilikler },
  ] = await Promise.all([
    supabase.from("denemeler").select("id, tarih, tur, hedefe_yakinlik, deneme_ders_sonuclari(dogru, yanlis)").eq("student_id", studentId).order("tarih"),
    supabase.from("konu_calismalar").select("tarih, sure_dakika, hedefe_yakinlik").eq("student_id", studentId),
    supabase.from("soru_cozumleri").select("tarih, sure_dakika, ders, dogru, yanlis, hedefe_yakinlik").eq("student_id", studentId),
    supabase.from("haftalik_verimlilikler").select("created_at, duzey").eq("student_id", studentId).order("created_at"),
  ]);

  type DenemeRow = { id: string; tarih: string; tur: "TYT" | "AYT"; hedefe_yakinlik: HedefeYakinlik; deneme_ders_sonuclari: { dogru: number; yanlis: number }[] };
  type KonuRow = { tarih: string; sure_dakika: number; hedefe_yakinlik: HedefeYakinlik };
  type SoruRow = { tarih: string; sure_dakika: number; ders: string; dogru: number; yanlis: number; hedefe_yakinlik: HedefeYakinlik };

  const denemeListesi = (denemeler as unknown as DenemeRow[]) ?? [];
  const konuListesi = (konular as unknown as KonuRow[]) ?? [];
  const soruListesi = (sorular as unknown as SoruRow[]) ?? [];
  const verimlilikListesi = (verimlilikler as unknown as { created_at: string; duzey: VerimlilikDuzeyi }[]) ?? [];

  const denemeTrend = denemeListesi.map((d) => ({
    tarih: d.tarih,
    tur: d.tur,
    net: Math.round(d.deneme_ders_sonuclari.reduce((t, s) => t + netHesapla(s.dogru, s.yanlis), 0) * 100) / 100,
  }));

  // Gün bazlı toplam çalışma süresi (konu + soru)
  const gunMap = new Map<string, number>();
  for (const k of konuListesi) gunMap.set(k.tarih, (gunMap.get(k.tarih) ?? 0) + k.sure_dakika);
  for (const s of soruListesi) gunMap.set(s.tarih, (gunMap.get(s.tarih) ?? 0) + s.sure_dakika);
  const calismaGunluk = Array.from(gunMap.entries())
    .map(([tarih, dakika]) => ({ tarih, dakika }))
    .sort((a, b) => a.tarih.localeCompare(b.tarih));

  // Ders bazlı ortalama net (sadece soru çözümlerinden)
  const dersMap = new Map<string, { toplam: number; adet: number }>();
  for (const s of soruListesi) {
    const mevcut = dersMap.get(s.ders) ?? { toplam: 0, adet: 0 };
    mevcut.toplam += netHesapla(s.dogru, s.yanlis);
    mevcut.adet += 1;
    dersMap.set(s.ders, mevcut);
  }
  const dersNetOrtalama = Array.from(dersMap.entries()).map(([ders, v]) => ({
    ders, net: Math.round((v.toplam / v.adet) * 100) / 100,
  }));

  // Hedefe yakınlık dağılımı (tüm giriş türlerinden)
  const hedefeYakinlikDagilimi: Record<HedefeYakinlik, number> = { yakin: 0, belirsiz: 0, uzak: 0 };
  for (const d of denemeListesi) hedefeYakinlikDagilimi[d.hedefe_yakinlik]++;
  for (const k of konuListesi) hedefeYakinlikDagilimi[k.hedefe_yakinlik]++;
  for (const s of soruListesi) hedefeYakinlikDagilimi[s.hedefe_yakinlik]++;

  const haftalikVerimlilik = verimlilikListesi.map((v) => ({
    tarih: v.created_at, duzey: v.duzey, puan: VERIMLILIK_PUAN[v.duzey],
  }));

  const bugun = new Date();
  const buHaftaBaslangic = new Date(bugun);
  buHaftaBaslangic.setDate(bugun.getDate() - 6);
  const buHaftaDakika = calismaGunluk
    .filter((c) => new Date(c.tarih) >= buHaftaBaslangic)
    .reduce((t, c) => t + c.dakika, 0);

  return {
    denemeTrend,
    calismaGunluk,
    dersNetOrtalama,
    hedefeYakinlikDagilimi,
    haftalikVerimlilik,
    sonDenemeNet: denemeTrend.length > 0 ? denemeTrend[denemeTrend.length - 1].net : null,
    buHaftaDakika,
  };
}
