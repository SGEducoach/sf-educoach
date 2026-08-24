import type { createClient } from "@/lib/supabase/server";
import { netHesapla } from "@/lib/types";
import type { HedefeYakinlik, VerimlilikDuzeyi } from "@/lib/types";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";
import { trendHesapla, hizDogrulukKategorisiBelirle, hedefProjeksiyonuHesapla } from "@/lib/analiz-motoru";
import type { TrendSonucu, HizDogrulukKategorisi, RegresyonNoktasi, HedefProjeksiyonuSonucu } from "@/lib/analiz-motoru";

// Analiz Motoru Faz A2 — iki "tarih" string'i (YYYY-MM-DD) arasındaki gün
// farkı; regresyon noktalarının x eksenini (gunOffset) üretmek için.
function tarihGunFarki(tarih: string, referansTarih: string): number {
  return (new Date(tarih).getTime() - new Date(referansTarih).getTime()) / (1000 * 3600 * 24);
}

export type RaporDonemi = "haftalik" | "aylik" | "tum";

export const RAPOR_DONEMI_ETIKET: Record<RaporDonemi, string> = {
  haftalik: "Haftalık",
  aylik: "Aylık",
  tum: "Tüm Zamanlar",
};

export interface AnalizVerisi {
  denemeTrend: { tarih: string; net: number; tur: "TYT" | "AYT" }[];
  konuCalismaGunluk: { tarih: string; dakika: number }[];
  soruCozumuGunluk: { tarih: string; soru: number }[];
  dersNetOrtalama: { ders: string; net: number }[];
  // Ders bazlı, tarihe göre sıralı net listesi — Analiz panelindeki ders
  // seçim dropdown'u bir ders seçince (§1) o dersin trendini göstermek için.
  dersGunlukNet: Record<string, { tarih: string; net: number }[]>;
  hedefeYakinlikDagilimi: Record<HedefeYakinlik, number>;
  haftalikVerimlilik: { tarih: string; puan: number; duzey: VerimlilikDuzeyi }[];
  sonDenemeNet: number | null;
  buHaftaKonuDakika: number;
  buHaftaSoru: number;
  donem: RaporDonemi;
  donemBaslangic: string | null;
  // Analiz Motoru Faz A2 — Katman 3: doğrusal regresyonla yorumlanmış net
  // trendi (genel + ders bazlı). Katman 4: ders bazlı hız-doğruluk matrisi.
  // Bkz. src/lib/analiz-motoru.ts.
  denemeTrendYonu: TrendSonucu;
  dersTrendYonu: Record<string, TrendSonucu>;
  dersHizDogruluk: { ders: string; ortSureDakika: number; dogrulukOrani: number; kategori: HizDogrulukKategorisi }[];
  // Analiz Motoru Faz A4 — Katman 5: hedefe uzaklık/projeksiyon. TYT/AYT
  // ayrı trend (denemeTrendYonu'nun TYT+AYT'yi KARIŞTIRAN hâlinden farklı
  // olarak, sadece o türün kendi denemeleri) + öğrencinin (varsa) kendi
  // belirlediği hedef net'ten türetilen projeksiyon.
  denemeTrendYonuTur: Record<"TYT" | "AYT", TrendSonucu>;
  hedefNetTyt: number | null;
  hedefNetAyt: number | null;
  hedefProjeksiyonlari: { tur: "TYT" | "AYT"; sonuc: HedefProjeksiyonuSonucu }[];
}

const VERIMLILIK_PUAN: Record<VerimlilikDuzeyi, number> = {
  cok_dusuk: 1, dusuk: 2, orta: 3, iyi: 4, cok_iyi: 5,
};

function donemBaslangicHesapla(donem: RaporDonemi): string | null {
  if (donem === "tum") return null;
  const gunSayisi = donem === "haftalik" ? 7 : 30;
  return tarihEkle(bugununTarihiTR(), -gunSayisi);
}

export async function analizVerisiGetir(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  donem: RaporDonemi = "tum",
): Promise<AnalizVerisi> {
  const baslangic = donemBaslangicHesapla(donem);

  let denemeQuery = supabase.from("denemeler").select("id, tarih, tur, hedefe_yakinlik, deneme_ders_sonuclari(dogru, yanlis)").eq("student_id", studentId).order("tarih");
  let konuQuery = supabase.from("konu_calismalar").select("tarih, sure_dakika, hedefe_yakinlik").eq("student_id", studentId);
  let soruQuery = supabase.from("soru_cozumleri").select("tarih, sure_dakika, ders, dogru, yanlis").eq("student_id", studentId);
  let verimlilikQuery = supabase.from("haftalik_verimlilikler").select("created_at, duzey").eq("student_id", studentId).order("created_at");
  // Faz A4 — hedef net, tarih aralığı filtresi UYGULANMAZ (profil alanı,
  // aktivite kaydı değil).
  const hedefQuery = supabase.from("students").select("hedef_net_tyt, hedef_net_ayt").eq("id", studentId).single();

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
    { data: hedefSatiri },
  ] = await Promise.all([denemeQuery, konuQuery, soruQuery, verimlilikQuery, hedefQuery]);

  type DenemeRow = { id: string; tarih: string; tur: "TYT" | "AYT"; hedefe_yakinlik: HedefeYakinlik; deneme_ders_sonuclari: { dogru: number; yanlis: number }[] };
  type KonuRow = { tarih: string; sure_dakika: number; hedefe_yakinlik: HedefeYakinlik };
  type SoruRow = { tarih: string; sure_dakika: number; ders: string; dogru: number; yanlis: number };

  const denemeListesi = (denemeler as unknown as DenemeRow[]) ?? [];
  const konuListesi = (konular as unknown as KonuRow[]) ?? [];
  const soruListesi = (sorular as unknown as SoruRow[]) ?? [];
  const verimlilikListesi = (verimlilikler as unknown as { created_at: string; duzey: VerimlilikDuzeyi }[]) ?? [];
  const hedefRow = hedefSatiri as { hedef_net_tyt: number | null; hedef_net_ayt: number | null } | null;
  const hedefNetTyt = hedefRow?.hedef_net_tyt ?? null;
  const hedefNetAyt = hedefRow?.hedef_net_ayt ?? null;

  const denemeTrend = denemeListesi.map((d) => ({
    tarih: d.tarih,
    tur: d.tur,
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

  // Faz A2, Katman 3 — genel deneme net trendi. denemeTrend zaten tarih'e
  // göre artan sıralı (denemeQuery .order("tarih")) — ilk kayıt referans.
  const denemeTrendNoktalari: RegresyonNoktasi[] = denemeTrend.map((d) => ({
    gunOffset: tarihGunFarki(d.tarih, denemeTrend[0]?.tarih ?? d.tarih),
    deger: d.net,
  }));
  const denemeTrendYonu = trendHesapla(denemeTrendNoktalari);

  // Ders bazlı net trendi — dersGunlukNet zaten tarih'e göre artan sıralı.
  const dersTrendYonu: Record<string, TrendSonucu> = {};
  for (const [ders, liste] of Object.entries(dersGunlukNet)) {
    if (liste.length === 0) continue;
    const noktalar: RegresyonNoktasi[] = liste.map((d) => ({
      gunOffset: tarihGunFarki(d.tarih, liste[0].tarih),
      deger: d.net,
    }));
    dersTrendYonu[ders] = trendHesapla(noktalar);
  }

  // Faz A4, Katman 5 — TYT/AYT AYRI trend (denemeTrendYonu'nun aksine,
  // ikisini KARIŞTIRMAZ) — hedef projeksiyonu için şart, farklı türlerin
  // netleri farklı ölçekte.
  const denemeTrendYonuTur = { TYT: { yon: null, haftalikDegisim: null } as TrendSonucu, AYT: { yon: null, haftalikDegisim: null } as TrendSonucu };
  const sonNetTur: Record<"TYT" | "AYT", number | null> = { TYT: null, AYT: null };
  for (const tur of ["TYT", "AYT"] as const) {
    const turListesi = denemeTrend.filter((d) => d.tur === tur);
    if (turListesi.length === 0) continue;
    sonNetTur[tur] = turListesi[turListesi.length - 1].net;
    const noktalar: RegresyonNoktasi[] = turListesi.map((d) => ({
      gunOffset: tarihGunFarki(d.tarih, turListesi[0].tarih),
      deger: d.net,
    }));
    denemeTrendYonuTur[tur] = trendHesapla(noktalar);
  }

  const hedefProjeksiyonlari: AnalizVerisi["hedefProjeksiyonlari"] = [];
  if (hedefNetTyt !== null) {
    hedefProjeksiyonlari.push({
      tur: "TYT",
      sonuc: hedefProjeksiyonuHesapla({ guncelNet: sonNetTur.TYT, hedefNet: hedefNetTyt, haftalikEgim: denemeTrendYonuTur.TYT.haftalikDegisim }),
    });
  }
  if (hedefNetAyt !== null) {
    hedefProjeksiyonlari.push({
      tur: "AYT",
      sonuc: hedefProjeksiyonuHesapla({ guncelNet: sonNetTur.AYT, hedefNet: hedefNetAyt, haftalikEgim: denemeTrendYonuTur.AYT.haftalikDegisim }),
    });
  }

  // Faz A2, Katman 4 — ders bazlı hız-doğruluk matrisi. Referans "genel
  // ortalama süre/soru", öğrencinin TÜM derslerdeki toplamından çıkarılır.
  const dersSureMap = new Map<string, { toplamSure: number; toplamDogru: number; toplamYanlis: number }>();
  for (const s of soruListesi) {
    const mevcut = dersSureMap.get(s.ders) ?? { toplamSure: 0, toplamDogru: 0, toplamYanlis: 0 };
    mevcut.toplamSure += s.sure_dakika;
    mevcut.toplamDogru += s.dogru;
    mevcut.toplamYanlis += s.yanlis;
    dersSureMap.set(s.ders, mevcut);
  }
  let genelToplamSure = 0;
  let genelToplamCevaplanan = 0;
  for (const v of dersSureMap.values()) {
    genelToplamSure += v.toplamSure;
    genelToplamCevaplanan += v.toplamDogru + v.toplamYanlis;
  }
  const genelOrtSureDakika = genelToplamCevaplanan > 0 ? genelToplamSure / genelToplamCevaplanan : 0;

  const dersHizDogruluk: AnalizVerisi["dersHizDogruluk"] = [];
  for (const [ders, v] of dersSureMap.entries()) {
    const cevaplanan = v.toplamDogru + v.toplamYanlis;
    if (cevaplanan === 0) continue; // hep "boş" geçilmişse kategori anlamsız
    const ortSureDakika = v.toplamSure / cevaplanan;
    const dogrulukOrani = v.toplamDogru / cevaplanan;
    dersHizDogruluk.push({
      ders,
      ortSureDakika: Math.round(ortSureDakika * 100) / 100,
      dogrulukOrani: Math.round(dogrulukOrani * 100) / 100,
      kategori: hizDogrulukKategorisiBelirle({ ortSureDakika, dogrulukOrani, genelOrtSureDakika }),
    });
  }

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

  return {
    denemeTrend,
    konuCalismaGunluk,
    soruCozumuGunluk,
    dersNetOrtalama,
    dersGunlukNet,
    hedefeYakinlikDagilimi,
    haftalikVerimlilik,
    sonDenemeNet: denemeTrend.length > 0 ? denemeTrend[denemeTrend.length - 1].net : null,
    buHaftaKonuDakika,
    buHaftaSoru,
    donem,
    donemBaslangic: baslangic,
    denemeTrendYonu,
    dersTrendYonu,
    dersHizDogruluk,
    denemeTrendYonuTur,
    hedefNetTyt,
    hedefNetAyt,
    hedefProjeksiyonlari,
  };
}
