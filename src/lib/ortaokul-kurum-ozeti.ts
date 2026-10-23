// Ortaokul kurumunun "Ana Sayfa / Kurum Performansı" özeti.
//
// Lise karşılığı (dershane-ana-sayfa.ts) deneme neti ve çözülen soru üzerine
// kurulu; ortaokulda deneme verisi neredeyse yok ve öğrenci soru_cozumleri
// yerine ortaokul_calismalar'a yazıyor (migration 0132). Aynı ekranı
// ortaokula göstermek tüm grafikleri boş bırakıyordu. Bu özet ortaokulun
// kendi ölçülerine bakar: kaç öğrenci çalıştı, ne kadar, görevler ne durumda,
// öğretmenler hangi yeterlilik kararlarını verdi, kaç yardım isteği açık.
//
// İLKE (sinif-analizi.ts ile aynı): tek bir "başarı puanı" ÜRETİLMEZ; her
// sayı kendi paydasıyla gelir. Akademik eksikte alarm dili yok — yeterlilik
// "başlamadı" bir hüküm değil, karar verilmemiş/başlanmamış demektir.
// İlkokul (1-4) çalışma kaydı girmez; Gelişim Raporu'ndan izlenir ve burada
// yalnız öğrenci sayısı olarak anılır.

import type { SupabaseClient } from "@supabase/supabase-js";
import { kademeBul } from "@/lib/kademe";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";

export const HAFTA_SAYISI = 8;
export const HAFTA_GUN = 7;
// Doğruluk yüzdesi bundan az cevaplanmış soruya dayanıyorsa gösterilmez:
// 6 soruluk %100, 600 soruluk %80'den "iyi" görünür.
export const DOGRULUK_MIN_SORU = 30;

export type YeterlilikDurumu = "baslamadi" | "ogreniyor" | "biraz_pratik" | "saglamlastirdi" | "tekrar_zamani";
export const YETERLILIK_SIRASI: YeterlilikDurumu[] = ["saglamlastirdi", "biraz_pratik", "ogreniyor", "tekrar_zamani", "baslamadi"];
export const YETERLILIK_ETIKET: Record<YeterlilikDurumu, string> = {
  saglamlastirdi: "Sağlamlaştırdı",
  biraz_pratik: "Biraz pratik",
  ogreniyor: "Öğreniyor",
  tekrar_zamani: "Tekrar zamanı",
  baslamadi: "Başlamadı",
};

export interface OzetOgrenci { id: string; seviye: string }
export interface OzetCalisma { studentId: string; tarih: string; dakika: number; dogru: number; yanlis: number; bos: number }
export interface OzetGorev { studentId: string; durum: string }
export interface OzetYeterlilik { studentId: string; durum: string }
export interface OzetYardim { studentId: string }

export interface OzetGirdisi {
  ogrenciler: OzetOgrenci[];
  ilkokulOgrenciSayisi: number;
  calismalar: OzetCalisma[];
  gorevler: OzetGorev[];
  yeterlilikler: OzetYeterlilik[];
  acikYardimlar: OzetYardim[];
}

export interface HaftaNoktasi {
  haftaBaslangic: string;
  aktifOgrenci: number;
  dakika: number;
  soru: number;
}

export interface SeviyeOzeti {
  seviye: string;
  ogrenciSayisi: number;
  buHaftaAktif: number;
  buHaftaDakika: number;
  buHaftaSoru: number;
  /** Son HAFTA_SAYISI haftada cevaplanan sorulara göre; yetersiz örnekte null. */
  dogrulukYuzde: number | null;
  cevaplananSoru: number;
  gorevTamamlanan: number;
  gorevToplam: number;
  yeterlilik: Record<YeterlilikDurumu, number>;
  acikYardim: number;
  noktalar: HaftaNoktasi[];
}

export interface OrtaokulKurumOzeti {
  ogrenciSayisi: number;
  ilkokulOgrenciSayisi: number;
  genel: HaftaNoktasi[];
  seviyeler: SeviyeOzeti[];
}

function gunFarki(bugun: string, tarih: string): number {
  return Math.round((new Date(`${bugun}T12:00:00Z`).getTime() - new Date(`${tarih}T12:00:00Z`).getTime()) / 86400000);
}

// 0 = en yeni (son 7 gün); pencere dışı ve gelecek tarih null.
export function haftaIndeksi(bugun: string, tarih: string): number | null {
  const fark = gunFarki(bugun, tarih);
  if (fark < 0) return null;
  const idx = Math.floor(fark / HAFTA_GUN);
  return idx < HAFTA_SAYISI ? idx : null;
}

function bosYeterlilik(): Record<YeterlilikDurumu, number> {
  return { saglamlastirdi: 0, biraz_pratik: 0, ogreniyor: 0, tekrar_zamani: 0, baslamadi: 0 };
}

function yeterlilikDurumuMu(x: string): x is YeterlilikDurumu {
  return (YETERLILIK_SIRASI as string[]).includes(x);
}

interface Kova { ogrenciler: Set<string>; dakika: number; soru: number }

function noktalar(bugun: string, kovalar: Map<number, Kova>): HaftaNoktasi[] {
  const sonuc: HaftaNoktasi[] = [];
  for (let idx = HAFTA_SAYISI - 1; idx >= 0; idx--) {
    const k = kovalar.get(idx);
    sonuc.push({
      haftaBaslangic: tarihEkle(bugun, -(idx * HAFTA_GUN + (HAFTA_GUN - 1))),
      aktifOgrenci: k?.ogrenciler.size ?? 0,
      dakika: k?.dakika ?? 0,
      soru: k?.soru ?? 0,
    });
  }
  return sonuc;
}

/** SAF hesap — sorgudan bağımsız, test edilebilir. */
export function ortaokulKurumOzetiHesapla(g: OzetGirdisi, bugun: string): OrtaokulKurumOzeti {
  const seviyeOf = new Map(g.ogrenciler.map((o) => [o.id, o.seviye]));
  const seviyeler = [...new Set(g.ogrenciler.map((o) => o.seviye))].sort();

  const genelKova = new Map<number, Kova>();
  const seviyeKova = new Map<string, Map<number, Kova>>(seviyeler.map((s) => [s, new Map()]));
  const dogru = new Map<string, number>();
  const yanlis = new Map<string, number>();
  const topla = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);

  for (const c of g.calismalar) {
    const seviye = seviyeOf.get(c.studentId);
    if (!seviye) continue;
    const idx = haftaIndeksi(bugun, c.tarih);
    if (idx === null) continue;
    const soru = c.dogru + c.yanlis + c.bos;
    for (const m of [genelKova, seviyeKova.get(seviye)!]) {
      const k = m.get(idx) ?? { ogrenciler: new Set<string>(), dakika: 0, soru: 0 };
      k.ogrenciler.add(c.studentId);
      k.dakika += c.dakika;
      k.soru += soru;
      m.set(idx, k);
    }
    topla(dogru, seviye, c.dogru);
    topla(yanlis, seviye, c.yanlis);
  }

  const gorevTam = new Map<string, number>();
  const gorevTop = new Map<string, number>();
  for (const gr of g.gorevler) {
    const seviye = seviyeOf.get(gr.studentId);
    if (!seviye) continue;
    topla(gorevTop, seviye, 1);
    if (gr.durum === "tamamlandi") topla(gorevTam, seviye, 1);
  }

  const yeterlilik = new Map<string, Record<YeterlilikDurumu, number>>();
  for (const y of g.yeterlilikler) {
    const seviye = seviyeOf.get(y.studentId);
    if (!seviye || !yeterlilikDurumuMu(y.durum)) continue;
    const r = yeterlilik.get(seviye) ?? bosYeterlilik();
    r[y.durum] += 1;
    yeterlilik.set(seviye, r);
  }

  const yardim = new Map<string, number>();
  for (const y of g.acikYardimlar) {
    const seviye = seviyeOf.get(y.studentId);
    if (seviye) topla(yardim, seviye, 1);
  }

  return {
    ogrenciSayisi: g.ogrenciler.length,
    ilkokulOgrenciSayisi: g.ilkokulOgrenciSayisi,
    genel: noktalar(bugun, genelKova),
    seviyeler: seviyeler.map((seviye) => {
      const kova = seviyeKova.get(seviye)!;
      const buHafta = kova.get(0);
      const d = dogru.get(seviye) ?? 0;
      const cevaplanan = d + (yanlis.get(seviye) ?? 0);
      return {
        seviye,
        ogrenciSayisi: g.ogrenciler.filter((o) => o.seviye === seviye).length,
        buHaftaAktif: buHafta?.ogrenciler.size ?? 0,
        buHaftaDakika: buHafta?.dakika ?? 0,
        buHaftaSoru: buHafta?.soru ?? 0,
        dogrulukYuzde: cevaplanan >= DOGRULUK_MIN_SORU ? Math.round((d / cevaplanan) * 100) : null,
        cevaplananSoru: cevaplanan,
        gorevTamamlanan: gorevTam.get(seviye) ?? 0,
        gorevToplam: gorevTop.get(seviye) ?? 0,
        yeterlilik: yeterlilik.get(seviye) ?? bosYeterlilik(),
        acikYardim: yardim.get(seviye) ?? 0,
        noktalar: noktalar(bugun, kova),
      };
    }),
  };
}

// createAdminClient() jenerik parametreleri `any` ile dönüyor (diğer veri modülleriyle aynı).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

export async function ortaokulKurumOzetiGetir(
  admin: Istemci,
  schoolId: string,
  izinliSeviyeler?: string[],
): Promise<OrtaokulKurumOzeti> {
  const bugun = bugununTarihiTR();
  const baslangic = tarihEkle(bugun, -(HAFTA_SAYISI * HAFTA_GUN - 1));

  const { data: ham } = await admin.from("students").select("id, classes(seviye)").eq("school_id", schoolId);
  // Gömülü ilişki çalışma anında NESNE döner, tipte dizi görünür.
  const satirlar = ((ham ?? []) as unknown as { id: string; classes: { seviye: string } | { seviye: string }[] | null }[])
    .map((o) => ({ id: o.id, seviye: (Array.isArray(o.classes) ? o.classes[0] : o.classes)?.seviye ?? null }))
    .filter((o) => !izinliSeviyeler || (o.seviye !== null && izinliSeviyeler.includes(o.seviye)));

  const ogrenciler = satirlar.filter((o): o is OzetOgrenci => kademeBul(o.seviye) === "ortaokul");
  const ilkokulOgrenciSayisi = satirlar.filter((o) => kademeBul(o.seviye) === "ilkokul").length;
  if (ogrenciler.length === 0) {
    return ortaokulKurumOzetiHesapla({ ogrenciler, ilkokulOgrenciSayisi, calismalar: [], gorevler: [], yeterlilikler: [], acikYardimlar: [] }, bugun);
  }

  const idler = ogrenciler.map((o) => o.id);
  const [calisma, gorev, yeterlilik, yardim] = await Promise.all([
    admin.from("ortaokul_calismalar").select("student_id, tarih, sure_dakika, dogru, yanlis, bos").in("student_id", idler).gte("tarih", baslangic),
    admin.from("gorev_atamalari").select("student_id, durum").in("student_id", idler),
    admin.from("ortaokul_konu_yeterlilikleri").select("student_id, durum").in("student_id", idler),
    admin.from("ortaokul_yardim_istekleri").select("student_id").in("student_id", idler).neq("durum", "cozuldu"),
  ]);

  return ortaokulKurumOzetiHesapla({
    ogrenciler,
    ilkokulOgrenciSayisi,
    calismalar: ((calisma.data ?? []) as { student_id: string; tarih: string; sure_dakika: number | null; dogru: number | null; yanlis: number | null; bos: number | null }[])
      .map((c) => ({ studentId: c.student_id, tarih: c.tarih, dakika: c.sure_dakika ?? 0, dogru: c.dogru ?? 0, yanlis: c.yanlis ?? 0, bos: c.bos ?? 0 })),
    gorevler: ((gorev.data ?? []) as { student_id: string; durum: string }[]).map((g) => ({ studentId: g.student_id, durum: g.durum })),
    yeterlilikler: ((yeterlilik.data ?? []) as { student_id: string; durum: string }[]).map((y) => ({ studentId: y.student_id, durum: y.durum })),
    acikYardimlar: ((yardim.data ?? []) as { student_id: string }[]).map((y) => ({ studentId: y.student_id })),
  }, bugun);
}
