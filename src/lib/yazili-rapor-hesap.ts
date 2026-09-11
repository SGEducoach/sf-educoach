// Yazılı analizi raporu — "Soru Analizi ve Sınav Başarı Değerlendirmesi".
// Kullanıcının örnek Excel şablonundaki sınav sayfasının (A4 çıktı) düzenine
// göre kuruldu (11.09.2026). Not sistemi kullanıcı kararıyla LİSE: şablon
// ortaokul aralıklarını (45/55/70/85) kullanıyordu; lisede 50/60/70/85
// (MEB Ortaöğretim Kurumları Yönetmeliği). Saf dosya — rapor sayfası,
// kayıtlı yazılılar listesi ve testler kullanır.

export type NotSonucu = "PEKİYİ" | "İYİ" | "ORTA" | "GEÇER" | "GEÇMEZ";

// Şablondaki sıra: en düşükten en yükseğe.
export const NOT_SIRASI: NotSonucu[] = ["GEÇMEZ", "GEÇER", "ORTA", "İYİ", "PEKİYİ"];

export const LISE_NOT_ARALIKLARI: { alt: number; sonuc: NotSonucu; etiket: string }[] = [
  { alt: 85, sonuc: "PEKİYİ", etiket: "85-100" },
  { alt: 70, sonuc: "İYİ", etiket: "70-84" },
  { alt: 60, sonuc: "ORTA", etiket: "60-69" },
  { alt: 50, sonuc: "GEÇER", etiket: "50-59" },
  { alt: 0, sonuc: "GEÇMEZ", etiket: "0-49" },
];

export const GECME_NOTU = 50;

// Şablondaki kural: sorunun başarısı %50'nin altındaysa kazanımı "başarının
// düşük olduğu konular" listesine girer.
export const DUSUK_BASARI_ESIGI = 50;

export function notSonucu(yuzlukPuan: number): NotSonucu {
  for (const aralik of LISE_NOT_ARALIKLARI) if (yuzlukPuan >= aralik.alt) return aralik.sonuc;
  return "GEÇMEZ";
}

// Sınavın toplamı 100 değilse not, puanın 100'lük karşılığına göre verilir.
export function yuzlugeCevir(puan: number, maxToplam: number): number {
  return maxToplam > 0 ? (puan * 100) / maxToplam : 0;
}

// Öğretim yılı Eylül'de başlar; 1. dönem Eylül–Ocak, 2. dönem Şubat–Ağustos.
export function ogretimYili(tarih: string): string {
  const [yil, ay] = tarih.split("-").map(Number);
  const baslangic = ay >= 9 ? yil : yil - 1;
  return `${baslangic}-${baslangic + 1}`;
}

export function donemNo(tarih: string): 1 | 2 {
  const ay = Number(tarih.split("-")[1]);
  return ay >= 9 || ay === 1 ? 1 : 2;
}

// Lisede dersin resmî adı; sınıf/ders listesi "Türkçe" diye tutuyor
// (bkz. YaziliSinavForm'daki aynı eşleme).
export function dersGorunenAd(ders: string): string {
  return ders === "Türkçe" ? "Türk Dili ve Edebiyatı" : ders;
}

export type RaporGirisYontemi = "tek-tek" | "temsili" | "otomatik";

export interface HamRaporVerisi {
  sinav: { id: string; ad: string; tarih: string; ders: string };
  sinifAdi: string;
  okulAdi: string;
  ogretmenAdi: string;
  ogretmenBransi: string | null;
  mudurAdi: string | null;
  sorular: { id: string; sira: number; maxPuan: number; kazanim: string }[];
  ogrenciler: { id: string; ad: string; okulNo: string; toplam: number }[];
  soruSonuclari: { ogrenciId: string; soruId: string; puan: number; kaynak: string; surum: string | null }[];
}

export interface RaporOgrencisi {
  id: string;
  sira: number;
  okulNo: string;
  ad: string;
  toplam: number;
  yuzluk: number;
  sonuc: NotSonucu;
  puanlar: (number | null)[];
  tahmini: boolean[];
}

export interface YaziliRapor {
  baslik: {
    sinavId: string;
    sinavAdi: string;
    tarih: string;
    ders: string;
    sinifAdi: string;
    okulAdi: string;
    ogretmenAdi: string;
    ogretmenBransi: string | null;
    mudurAdi: string | null;
    ogretimYili: string;
    donem: 1 | 2;
  };
  sorular: { sira: number; maxPuan: number; kazanim: string; basari: number | null }[];
  maxToplam: number;
  ogrenciler: RaporOgrencisi[];
  dagilim: Record<NotSonucu, number>;
  ortalama: number; // ham toplamların ortalaması
  basariYuzdesi: number; // 100'lük puanı geçme notu ve üzerinde olanların oranı (0-100)
  dusukKonular: { sira: number; kazanim: string; basari: number }[];
  yontem: RaporGirisYontemi;
  tahminiOgrenciSayisi: number;
}

// Şablondaki "sıra no" okul numarası sırasıyla; sayı olmayan numaralar sona.
function okulNoSirasi(a: { okulNo: string; ad: string }, b: { okulNo: string; ad: string }) {
  return (Number(a.okulNo) || Infinity) - (Number(b.okulNo) || Infinity) || a.ad.localeCompare(b.ad, "tr");
}

export function raporuOlustur(ham: HamRaporVerisi): YaziliRapor {
  const sorular = [...ham.sorular].sort((a, b) => a.sira - b.sira);
  const m = sorular.length;
  const sutun = new Map(sorular.map((s, j) => [s.id, j]));
  const maxToplam = sorular.reduce((t, s) => t + s.maxPuan, 0);

  const satirlar = new Map<string, { puanlar: (number | null)[]; tahmini: boolean[] }>();
  for (const o of ham.ogrenciler) {
    satirlar.set(o.id, { puanlar: new Array<number | null>(m).fill(null), tahmini: new Array<boolean>(m).fill(false) });
  }
  let tahminVar = false;
  let otomatikMi = false;
  for (const r of ham.soruSonuclari) {
    const j = sutun.get(r.soruId);
    const satir = satirlar.get(r.ogrenciId);
    if (j === undefined || !satir) continue;
    satir.puanlar[j] = r.puan;
    satir.tahmini[j] = r.kaynak === "estimated";
    if (r.kaynak === "estimated") tahminVar = true;
    if (r.surum === "oransal-v1") otomatikMi = true;
  }

  const ogrenciler: RaporOgrencisi[] = [...ham.ogrenciler].sort(okulNoSirasi).map((o, i) => {
    const yuzluk = yuzlugeCevir(o.toplam, maxToplam);
    const satir = satirlar.get(o.id)!;
    return {
      id: o.id, sira: i + 1, okulNo: o.okulNo, ad: o.ad, toplam: o.toplam, yuzluk,
      sonuc: notSonucu(yuzluk), puanlar: satir.puanlar, tahmini: satir.tahmini,
    };
  });

  const n = ogrenciler.length;
  const dagilim = Object.fromEntries(NOT_SIRASI.map((s) => [s, 0])) as Record<NotSonucu, number>;
  for (const o of ogrenciler) dagilim[o.sonuc] += 1;

  // Şablondaki formül: (sorudan alınan puanların ortalaması × 100) ÷ sorunun puanı.
  const soruSonuclari = sorular.map((s, j) => {
    const degerler = ogrenciler.map((o) => o.puanlar[j]).filter((v): v is number => v !== null);
    const basari = degerler.length && s.maxPuan > 0
      ? ((degerler.reduce((t, v) => t + v, 0) / degerler.length) * 100) / s.maxPuan
      : null;
    return { sira: s.sira, maxPuan: s.maxPuan, kazanim: s.kazanim, basari };
  });

  const dusukKonular = soruSonuclari
    .filter((s) => s.basari !== null && s.basari < DUSUK_BASARI_ESIGI)
    .map((s) => ({ sira: s.sira, kazanim: s.kazanim, basari: s.basari as number }));

  return {
    baslik: {
      sinavId: ham.sinav.id,
      sinavAdi: ham.sinav.ad,
      tarih: ham.sinav.tarih,
      ders: ham.sinav.ders,
      sinifAdi: ham.sinifAdi,
      okulAdi: ham.okulAdi,
      ogretmenAdi: ham.ogretmenAdi,
      ogretmenBransi: ham.ogretmenBransi,
      mudurAdi: ham.mudurAdi,
      ogretimYili: ogretimYili(ham.sinav.tarih),
      donem: donemNo(ham.sinav.tarih),
    },
    sorular: soruSonuclari,
    maxToplam,
    ogrenciler,
    dagilim,
    ortalama: n ? ogrenciler.reduce((t, o) => t + o.toplam, 0) / n : 0,
    basariYuzdesi: n ? (ogrenciler.filter((o) => o.yuzluk >= GECME_NOTU).length / n) * 100 : 0,
    dusukKonular,
    yontem: otomatikMi ? "otomatik" : tahminVar ? "temsili" : "tek-tek",
    tahminiOgrenciSayisi: ogrenciler.filter((o) => o.tahmini.some(Boolean)).length,
  };
}
