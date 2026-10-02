// Ortaokul "Görevlerim" ve "Planım" ekranlarının SAF şekillendirme mantığı
// (tasarım belgesi §8 görev sistemi, §9 planlama).
//
// "Bugün" ekranı (ortaokul-bugun.ts) en fazla ÜÇ iş gösterir; burası tam
// listedir. İkisi aynı veriyi okur, farklı soruyu yanıtlar: Bugün "şimdi ne
// yapmalıyım", Görevlerim "elimde neler var", Planım "haftam nasıl duruyor".
//
// Sunucuya bağlı değil — sorgular ortaokul-gorevler-sorgu.ts'te.

import { GUN_ETIKET } from "@/lib/ders-programi";
import type { DersProgramiGunu } from "@/lib/ders-programi";
import { sureEtiketi, zamanEtiketi } from "@/lib/ortaokul-bugun";
import type { BugunGorevi } from "@/lib/ortaokul-bugun";
import { tarihEkle } from "@/lib/tarih";

// Date.getUTCDay() sırası (0 = Pazar).
const HAFTA_SLUGLARI: DersProgramiGunu[] = ["pazar", "pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi"];

// §21.2 durum semantiği. Akademik eksikte KIRMIZI YOK: "gecikti" nötr koyu
// tonla gösterilir, öğrencinin kimlik etiketi değil görevin durumudur (§8.3).
export type GorevDurumu = "tamamlandi" | "bugun" | "gecikti" | "yarin" | "yaklasan";

export interface OrtaokulGorevKarti {
  atamaId: string;
  durum: GorevDurumu;
  baslik: string;
  ders: string;
  zamanEtiketi: string;
  sureEtiketi: string | null;
  ogretmenAdi: string | null;
  // Öğretmenin konu altına yazdığı alt başlık/not.
  aciklama: string | null;
  eylem: string | null;      // tamamlanmış görevde eylem yok
  tahminiDakika: number | null;
}

export interface GorevGrubu {
  anahtar: "bugun" | "gecikti" | "yarin" | "bu-hafta" | "sonra" | "tamamlandi";
  baslik: string;
  // Grubun ne olduğunu tek cümleyle söyler; boş grup hiç çizilmez.
  aciklama: string | null;
  gorevler: OrtaokulGorevKarti[];
}

const EYLEM: Record<Exclude<GorevDurumu, "tamamlandi">, string> = {
  bugun: "Başla",
  gecikti: "Şimdi yap",
  yarin: "Hazırlan",
  yaklasan: "Göz at",
};

export function gunFarki(tarih: string, bugun: string): number {
  const a = Date.parse(`${tarih}T00:00:00Z`);
  const b = Date.parse(`${bugun}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((a - b) / 86400000);
}

// Görevin tahmini dakikası: öğretmen yazdıysa o, yazmadıysa soru sayısından
// (soru başına ~2 dk — veri girişi üst sınırıyla aynı ilke).
export function tahminiDakika(g: Pick<BugunGorevi, "hedefDakika" | "hedefSoruSayisi">): number | null {
  if (g.hedefDakika && g.hedefDakika > 0) return g.hedefDakika;
  if (g.hedefSoruSayisi && g.hedefSoruSayisi > 0) return g.hedefSoruSayisi * 2;
  return null;
}

function durumBul(fark: number, tamamlandi: boolean): GorevDurumu {
  if (tamamlandi) return "tamamlandi";
  if (fark < 0) return "gecikti";
  if (fark === 0) return "bugun";
  if (fark === 1) return "yarin";
  return "yaklasan";
}

function karta(g: BugunGorevi, bugun: string): { fark: number; kart: OrtaokulGorevKarti } {
  const fark = gunFarki(g.sonTarih ?? g.tarih, bugun);
  const durum = durumBul(fark, g.tamamlandi);
  return {
    fark,
    kart: {
      atamaId: g.atamaId,
      durum,
      baslik: g.konu?.trim() ? g.konu.trim() : g.tur,
      ders: g.ders,
      zamanEtiketi: durum === "tamamlandi" ? "Tamamlandı" : zamanEtiketi(fark),
      sureEtiketi: sureEtiketi(g.hedefDakika, g.hedefSoruSayisi),
      ogretmenAdi: g.ogretmenAdi,
      aciklama: g.aciklama?.trim() ? g.aciklama.trim() : null,
      eylem: durum === "tamamlandi" ? null : EYLEM[durum],
      tahminiDakika: tahminiDakika(g),
    },
  };
}

// Grup sırası: BUGÜN en üstte. Gecikmişler ikinci — gizlenmiyor ama öğrenciyi
// borç listesiyle karşılamıyor (ortaokul-bugun.ts'teki aynı karar).
const GRUP_TANIMI: { anahtar: GorevGrubu["anahtar"]; baslik: string; aciklama: string | null }[] = [
  { anahtar: "bugun", baslik: "Bugün", aciklama: null },
  { anahtar: "gecikti", baslik: "Geçmiş günlerden kalanlar", aciklama: "Tarihi geçti ama hâlâ yapabilirsin." },
  { anahtar: "yarin", baslik: "Yarın", aciklama: null },
  { anahtar: "bu-hafta", baslik: "Bu hafta", aciklama: null },
  { anahtar: "sonra", baslik: "Sonraki günler", aciklama: null },
  { anahtar: "tamamlandi", baslik: "Tamamladıkların", aciklama: "Son yedi günde bitirdiklerin." },
];

function grubuBul(fark: number, durum: GorevDurumu): GorevGrubu["anahtar"] {
  if (durum === "tamamlandi") return "tamamlandi";
  if (durum === "gecikti") return "gecikti";
  if (durum === "bugun") return "bugun";
  if (durum === "yarin") return "yarin";
  return fark <= 7 ? "bu-hafta" : "sonra";
}

// Tam görev listesi, gruplanmış. BOŞ GRUP DÖNMEZ: ekranda "0 görev" yazan
// kutular bilişsel yük (§2.2), hiç çizilmesin.
export function gorevGruplari(gorevler: BugunGorevi[], bugun: string): GorevGrubu[] {
  const kovalar = new Map<GorevGrubu["anahtar"], { fark: number; kart: OrtaokulGorevKarti }[]>();
  for (const g of gorevler) {
    const { fark, kart } = karta(g, bugun);
    // Tamamlanmış görevlerin tamamı değil, son bir haftalık dilim gösterilir.
    if (kart.durum === "tamamlandi" && (fark < -7 || fark > 0)) continue;
    const anahtar = grubuBul(fark, kart.durum);
    const liste = kovalar.get(anahtar) ?? [];
    liste.push({ fark, kart });
    kovalar.set(anahtar, liste);
  }

  const gruplar: GorevGrubu[] = [];
  for (const tanim of GRUP_TANIMI) {
    const liste = kovalar.get(tanim.anahtar);
    if (!liste || liste.length === 0) continue;
    // Gecikmişlerde en ESKİ önce (en uzun bekleyen), diğerlerinde en yakın
    // tarih önce. Tamamlananlarda en yeni önce.
    liste.sort((a, b) => (tanim.anahtar === "tamamlandi" ? b.fark - a.fark : a.fark - b.fark));
    gruplar.push({ ...tanim, gorevler: liste.map((x) => x.kart) });
  }
  return gruplar;
}

// ---- Planım ----

// §8.3 iş yükü koruması: günlük önerilen odak süresi. Kurum ayarı henüz yok;
// sınıfa göre varsayılan kullanılıyor (küçük sınıfta daha kısa).
export const GUNLUK_ODAK_DAKIKA: Record<string, number> = { "5": 60, "6": 60, "7": 80, "8": 100 };
export const GUNLUK_ODAK_VARSAYILAN = 80;

export function gunlukOdakSiniri(sinifSeviyesi: string | null | undefined): number {
  const s = String(sinifSeviyesi ?? "").trim();
  return GUNLUK_ODAK_DAKIKA[s] ?? GUNLUK_ODAK_VARSAYILAN;
}

export interface PlanGunu {
  tarih: string;
  gunAdi: string;
  bugunMu: boolean;
  gecmisMi: boolean;
  gorevler: OrtaokulGorevKarti[];
  toplamDakika: number;
  // Günün işleri önerilen odak süresini aşıyor. Suçlayıcı değil bilgilendirici:
  // öğretmene de aynı sinyal gösterilecek (§8.3).
  yogunMu: boolean;
  // Süresi bilinmeyen görev varsa toplam dakika EKSİK demektir; ekranda
  // "yoğun" damgası basmadan önce bunu söylemek gerekir.
  suresiBilinmeyen: number;
}

export function haftaPlani(
  gorevler: BugunGorevi[],
  haftaBaslangic: string,
  bugun: string,
  sinifSeviyesi: string | null | undefined,
): PlanGunu[] {
  const sinir = gunlukOdakSiniri(sinifSeviyesi);
  const gunler: PlanGunu[] = [];
  for (let i = 0; i < 7; i += 1) {
    const tarih = tarihEkle(haftaBaslangic, i);
    const gunIndeksi = new Date(`${tarih}T00:00:00Z`).getUTCDay();
    const gununleri = gorevler
      .filter((g) => (g.sonTarih ?? g.tarih) === tarih)
      .map((g) => karta(g, bugun).kart);
    const toplamDakika = gununleri.reduce((t, k) => t + (k.tahminiDakika ?? 0), 0);
    const suresiBilinmeyen = gununleri.filter((k) => k.tahminiDakika === null).length;
    gunler.push({
      tarih,
      gunAdi: GUN_ETIKET[HAFTA_SLUGLARI[gunIndeksi]],
      bugunMu: tarih === bugun,
      gecmisMi: gunFarki(tarih, bugun) < 0,
      gorevler: gununleri,
      toplamDakika,
      yogunMu: toplamDakika > sinir,
      suresiBilinmeyen,
    });
  }
  return gunler;
}

// Haftanın tek cümlelik özeti. Sayı verir, hüküm vermez (§2.1).
export function haftaMesaji(gunler: PlanGunu[]): string {
  const toplam = gunler.reduce((t, g) => t + g.gorevler.length, 0);
  if (toplam === 0) return "Bu hafta için planlanmış bir işin yok.";
  const yogun = gunler.filter((g) => g.yogunMu);
  const bitmis = gunler.reduce((t, g) => t + g.gorevler.filter((k) => k.durum === "tamamlandi").length, 0);
  const parcalar = [`Bu hafta ${toplam} işin var`];
  if (bitmis > 0) parcalar.push(`${bitmis} tanesini bitirdin`);
  if (yogun.length === 1) parcalar.push(`${yogun[0].gunAdi} günü yoğun görünüyor`);
  else if (yogun.length > 1) parcalar.push(`${yogun.length} gün yoğun görünüyor`);
  return `${parcalar.join(", ")}.`;
}
