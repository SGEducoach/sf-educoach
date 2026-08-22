import type { createClient } from "@/lib/supabase/server";
import { netHesapla } from "@/lib/types";
import type { HedefeYakinlik, VerimlilikDuzeyi } from "@/lib/types";

export type RaporDonemi = "haftalik" | "aylik" | "tum";

export const RAPOR_DONEMI_ETIKET: Record<RaporDonemi, string> = {
  haftalik: "Haftalık",
  aylik: "Aylık",
  tum: "Tüm Zamanlar",
};

export interface AnalizVerisi {
  denemeTrend: { tarih: string; net: number; tur: "TYT" | "AYT"; sureDakika: number }[];
  konuCalismaGunluk: { tarih: string; dakika: number }[];
  soruCozumuGunluk: { tarih: string; soru: number }[];
  denemeSureleri: { tarih: string; dakika: number; tur: "TYT" | "AYT" }[];
  dersNetOrtalama: { ders: string; net: number }[];
  // Ders bazlı, tarihe göre sıralı net listesi — Analiz panelindeki ders
  // seçim dropdown'u bir ders seçince (§1) o dersin trendini göstermek için.
  dersGunlukNet: Record<string, { tarih: string; net: number }[]>;
  hedefeYakinlikDagilimi: Record<HedefeYakinlik, number>;
  haftalikVerimlilik: { tarih: string; puan: number; duzey: VerimlilikDuzeyi }[];
  sonDenemeNet: number | null;
  buHaftaKonuDakika: number;
  buHaftaSoru: number;
  buHaftaDenemeDakika: number;
  donem: RaporDonemi;
  donemBaslangic: string | null;
}

const VERIMLILIK_PUAN: Record<VerimlilikDuzeyi, number> = {
  cok_dusuk: 1, dusuk: 2, orta: 3, iyi: 4, cok_iyi: 5,
};

function donemBaslangicHesapla(donem: RaporDonemi): string | null {
  if (donem === "tum") return null;
  const gunSayisi = donem === "haftalik" ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() - gunSayisi);
  return d.toISOString().slice(0, 10);
}

export async function analizVerisiGetir(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  donem: RaporDonemi = "tum",
): Promise<AnalizVerisi> {
  const baslangic = donemBaslangicHesapla(donem);

  let denemeQuery = supabase.from("denemeler").select("id, tarih, tur, sure_dakika, hedefe_yakinlik, deneme_ders_sonuclari(dogru, yanlis)").eq("student_id", studentId).order("tarih");
  let konuQuery = supabase.from("konu_calismalar").select("tarih, sure_dakika, hedefe_yakinlik").eq("student_id", studentId);
  let soruQuery = supabase.from("soru_cozumleri").select("tarih, sure_dakika, ders, dogru, yanlis").eq("student_id", studentId);
  let verimlilikQuery = supabase.from("haftalik_verimlilikler").select("created_at, duzey").eq("student_id", studentId).order("created_at");

  if (baslangic) {
    denemeQuery = denemeQuery.gte("tarih", baslangic);
    konuQuery = konuQuery.gte("tarih", baslangic);
    soruQuery = soruQuery.gte("tarih", baslangic);
    verimlilikQuery = verimlilikQuery.gte("created_at", baslangic);
  }

  const [
    { data: denemeler },
    { data: konular },
    { data: sorular },
    { data: verimlilikler },
  ] = await Promise.all([denemeQuery, konuQuery, soruQuery, verimlilikQuery]);

  type DenemeRow = { id: string; tarih: string; tur: "TYT" | "AYT"; sure_dakika: number; hedefe_yakinlik: HedefeYakinlik; deneme_ders_sonuclari: { dogru: number; yanlis: number }[] };
  type KonuRow = { tarih: string; sure_dakika: number; hedefe_yakinlik: HedefeYakinlik };
  type SoruRow = { tarih: string; sure_dakika: number; ders: string; dogru: number; yanlis: number };

  const denemeListesi = (denemeler as unknown as DenemeRow[]) ?? [];
  const konuListesi = (konular as unknown as KonuRow[]) ?? [];
  const soruListesi = (sorular as unknown as SoruRow[]) ?? [];
  const verimlilikListesi = (verimlilikler as unknown as { created_at: string; duzey: VerimlilikDuzeyi }[]) ?? [];

  const denemeTrend = denemeListesi.map((d) => ({
    tarih: d.tarih,
    tur: d.tur,
    sureDakika: d.sure_dakika,
    net: Math.round(d.deneme_ders_sonuclari.reduce((t, s) => t + netHesapla(s.dogru, s.yanlis), 0) * 100) / 100,
  }));

  // Rozet kategorileriyle aynı sınırlar korunur: konu, soru ve deneme
  // birbirine eklenmez; her biri kendi doğal birimiyle raporlanır.
  const konuGunMap = new Map<string, number>();
  for (const k of konuListesi) konuGunMap.set(k.tarih, (konuGunMap.get(k.tarih) ?? 0) + k.sure_dakika);
  const konuCalismaGunluk = Array.from(konuGunMap.entries())
    .map(([tarih, dakika]) => ({ tarih, dakika }))
    .sort((a, b) => a.tarih.localeCompare(b.tarih));

  const soruGunMap = new Map<string, number>();
  for (const s of soruListesi) soruGunMap.set(s.tarih, (soruGunMap.get(s.tarih) ?? 0) + s.dogru + s.yanlis);
  const soruCozumuGunluk = Array.from(soruGunMap.entries())
    .map(([tarih, soru]) => ({ tarih, soru }))
    .sort((a, b) => a.tarih.localeCompare(b.tarih));

  const denemeSureleri = denemeListesi.map((d) => ({ tarih: d.tarih, dakika: d.sure_dakika, tur: d.tur }));

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

  // Ders bazlı günlük net — Analiz panelinde tekil ders seçilince gösterilen
  // trend grafiği için (bkz. AnalizPaneli ders dropdown'u).
  const dersGunlukNet: Record<string, { tarih: string; net: number }[]> = {};
  for (const s of soruListesi) {
    (dersGunlukNet[s.ders] ??= []).push({ tarih: s.tarih, net: netHesapla(s.dogru, s.yanlis) });
  }
  for (const ders of Object.keys(dersGunlukNet)) dersGunlukNet[ders].sort((a, b) => a.tarih.localeCompare(b.tarih));

  // Hedefe yakınlık dağılımı — sadece konu çalışma ve deneme'den (soru
  // çözümünde "Az/Orta/Çok" self-rating kaldırıldı, migration 0044).
  const hedefeYakinlikDagilimi: Record<HedefeYakinlik, number> = { yakin: 0, belirsiz: 0, uzak: 0 };
  for (const d of denemeListesi) hedefeYakinlikDagilimi[d.hedefe_yakinlik]++;
  for (const k of konuListesi) hedefeYakinlikDagilimi[k.hedefe_yakinlik]++;

  const haftalikVerimlilik = verimlilikListesi.map((v) => ({
    tarih: v.created_at, duzey: v.duzey, puan: VERIMLILIK_PUAN[v.duzey],
  }));

  const bugun = new Date();
  const buHaftaBaslangic = new Date(bugun);
  buHaftaBaslangic.setDate(bugun.getDate() - 6);
  buHaftaBaslangic.setHours(0, 0, 0, 0);
  const buHaftaKonuDakika = konuCalismaGunluk
    .filter((c) => new Date(c.tarih) >= buHaftaBaslangic)
    .reduce((t, c) => t + c.dakika, 0);
  const buHaftaSoru = soruCozumuGunluk
    .filter((c) => new Date(c.tarih) >= buHaftaBaslangic)
    .reduce((t, c) => t + c.soru, 0);
  const buHaftaDenemeDakika = denemeSureleri
    .filter((c) => new Date(c.tarih) >= buHaftaBaslangic)
    .reduce((t, c) => t + c.dakika, 0);

  return {
    denemeTrend,
    konuCalismaGunluk,
    soruCozumuGunluk,
    denemeSureleri,
    dersNetOrtalama,
    dersGunlukNet,
    hedefeYakinlikDagilimi,
    haftalikVerimlilik,
    sonDenemeNet: denemeTrend.length > 0 ? denemeTrend[denemeTrend.length - 1].net : null,
    buHaftaKonuDakika,
    buHaftaSoru,
    buHaftaDenemeDakika,
    donem,
    donemBaslangic: baslangic,
  };
}
