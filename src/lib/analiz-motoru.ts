// Analiz Motoru — Faz A1: Katman 1 (sinyal normalizasyonu) + Katman 2
// (bileşik konu hakimiyeti skoru). Bkz. "Analiz Motoru" raporu (24.08.2026,
// kullanıcıya artifact olarak sunuldu) — 9 katmanlı, tamamen deterministik
// bir analiz çerçevesinin ilk, en düşük riskli fazı. ÇALIŞMA ZAMANINDA
// HİÇBİR LLM ÇAĞRISI YOK — bu dosyadaki her fonksiyon saf/deterministiktir.
//
// Katman 2'nin amacı: bugün aynı konu için üç ayrı, hiç birleştirilmeyen
// sinyal var —
//   1. "ölçüm"  — soru_cozumleri'nden o konudaki GERÇEK doğruluk oranı
//   2. "kalıcı" — ogrenci_konu_hakimiyeti.hakimiyet_seviyesi (kalıcı beyan)
//   3. "oturum" — konu_calismalar.hedefe_yakinlik ortalaması (oturum bazlı öz-değerlendirme)
// Bunları ağırlıklı bir ortalamaya (0-100) indirger; ölçülen veri en
// güvenilir kabul edilir. Eksik sinyaller ağırlıklardan tamamen çıkarılır
// (kalan ağırlıklar aralarında yeniden normalize edilir) — örn. hiç soru
// çözümü yoksa sadece kalıcı+oturum kullanılır.
import type { HedefeYakinlik } from "@/lib/types";

// ============ Katman 1: sinyal normalizasyonu ============

// 3'lü ölçeği (Yetersiz/Orta/Yeterli) 0-1 aralığına indirger — hem
// konu_calismalar.hedefe_yakinlik hem ogrenci_konu_hakimiyeti.hakimiyet_seviyesi
// aynı enum'u paylaştığı için tek fonksiyon yeterli.
export function ucluSeviyeyiNormalize(seviye: HedefeYakinlik | null): number | null {
  if (seviye === null) return null;
  const harita: Record<HedefeYakinlik, number> = { uzak: 0, belirsiz: 0.5, yakin: 1 };
  return harita[seviye];
}

// Bir dizi hedefe_yakinlik değerinin (bir konudaki TÜM konu_calismalar
// oturumlarının) normalize edilmiş ortalaması — "oturum" sinyali budur.
export function oturumOrtalamasiHesapla(seviyeler: HedefeYakinlik[]): number | null {
  const normalizeler = seviyeler.map(ucluSeviyeyiNormalize).filter((n): n is number => n !== null);
  if (normalizeler.length === 0) return null;
  return normalizeler.reduce((t, n) => t + n, 0) / normalizeler.length;
}

// dogru/yanlis çiftinden 0-1 aralığında bir "doğruluk oranı" — "ölçüm"
// sinyali budur. "boş" bilerek DIŞARIDA: cevaplanmayan bir soru "yanlış
// bilindi" anlamına gelmez, sadece süre/hız katmanının (Faz A2, ayrı) ilgi
// alanı.
export function dogrulukOraniHesapla(dogru: number, yanlis: number): number | null {
  const cevaplanan = dogru + yanlis;
  if (cevaplanan <= 0) return null;
  return Math.max(0, Math.min(1, dogru / cevaplanan));
}

// ============ Katman 2: bileşik konu hakimiyeti skoru ============

// Kalıcı beyan 90+ gündür güncellenmediğinde (mevcut BAYATLAMA_GUN_SINIRI,
// bkz. konu-hakimiyeti.ts) skor üzerinde yumuşak bir ceza başlar — 90.
// günde 0, 180. günde tavan (20 puan) — sonrasında sabit kalır. Amaç:
// "bir zamanlar hakimdim ama aylardır tekrar etmedim" durumunu, aniden
// "hakim değilsin" demeden, kademeli olarak yansıtmak.
const BAYATLAMA_BASLANGIC_GUN = 90;
const BAYATLAMA_TAVAN_GUN = 180;
const BAYATLAMA_MAKS_CEZA = 20;

export function bayatlamaCezasiHesapla(gunFarki: number | null): number {
  if (gunFarki === null || gunFarki <= BAYATLAMA_BASLANGIC_GUN) return 0;
  const oran = Math.min(1, (gunFarki - BAYATLAMA_BASLANGIC_GUN) / (BAYATLAMA_TAVAN_GUN - BAYATLAMA_BASLANGIC_GUN));
  return oran * BAYATLAMA_MAKS_CEZA;
}

export type MasteryKaynagi = "olcum" | "kalici" | "oturum";

export interface MasterySkoruGirdisi {
  // soru_cozumleri'nden o (ders,konu) için toplam dogru/yanlis'tan hesaplanan oran.
  olcumDogrulukOrani: number | null;
  // ogrenci_konu_hakimiyeti.hakimiyet_seviyesi — kalıcı, öğrencinin bilinçli beyanı.
  kaliciBeyan: HedefeYakinlik | null;
  // konu_calismalar.hedefe_yakinlik'lerin (o konudaki tüm oturumlar) ortalaması.
  oturumOrtalamasi: number | null;
  // kaliciBeyan'ın en son güncellendiği tarihten bugüne gün farkı — SADECE
  // kaliciBeyan mevcutsa anlamlı; değilse null geçilmeli (ceza uygulanmaz).
  gunFarkiSonGuncelleme: number | null;
}

export interface MasterySkoruSonucu {
  // 0-100 arası bileşik skor; HİÇBİR sinyal yoksa null (öğrenci bu konuya
  // hiç dokunmamış — "0" ile "hiç veri yok" birbirine karıştırılmamalı).
  skor: number | null;
  // Hesaba katkı veren sinyaller — arayüzde "neye dayanıyor" şeffaflığı için.
  kaynaklar: MasteryKaynagi[];
}

// Sinyal mevcutsa kullanılan ağırlıklar. Ölçülen (gerçek) doğruluk en
// güvenilir kabul edilir; kalıcı beyan (bilinçli, düşünülmüş) oturum
// ortalamasından (hızlı, o anki izlenim) biraz daha güvenilir sayılır.
// Bir sinyal eksikse ağırlığı DİĞERLERİ ARASINDA orantılı yeniden dağıtılır
// (aşağıdaki toplamAgirlik'e bölme bunu otomatik yapar).
const AGIRLIK_OLCUM = 0.5;
const AGIRLIK_KALICI = 0.3;
const AGIRLIK_OTURUM = 0.2;

export function bilesikMasterySkoruHesapla(girdi: MasterySkoruGirdisi): MasterySkoruSonucu {
  const kaliciNormalize = ucluSeviyeyiNormalize(girdi.kaliciBeyan);

  const bilesenler: { deger: number; agirlik: number; kaynak: MasteryKaynagi }[] = [];
  if (girdi.olcumDogrulukOrani !== null) bilesenler.push({ deger: girdi.olcumDogrulukOrani, agirlik: AGIRLIK_OLCUM, kaynak: "olcum" });
  if (kaliciNormalize !== null) bilesenler.push({ deger: kaliciNormalize, agirlik: AGIRLIK_KALICI, kaynak: "kalici" });
  if (girdi.oturumOrtalamasi !== null) bilesenler.push({ deger: girdi.oturumOrtalamasi, agirlik: AGIRLIK_OTURUM, kaynak: "oturum" });

  if (bilesenler.length === 0) return { skor: null, kaynaklar: [] };

  const toplamAgirlik = bilesenler.reduce((t, b) => t + b.agirlik, 0);
  const agirlikliOrtalama = bilesenler.reduce((t, b) => t + b.deger * b.agirlik, 0) / toplamAgirlik;

  // Bayatlama cezası sadece kalıcı beyan varsa (gunFarkiSonGuncelleme
  // null değilse) devreye girer — sadece ölçüm/oturum verisi olan bir
  // konuda "bayatlama" kavramı henüz anlamlı değil.
  const ceza = girdi.kaliciBeyan !== null ? bayatlamaCezasiHesapla(girdi.gunFarkiSonGuncelleme) : 0;
  const skor = Math.max(0, Math.min(100, agirlikliOrtalama * 100 - ceza));

  return { skor: Math.round(skor), kaynaklar: bilesenler.map((b) => b.kaynak) };
}

// ============ Katman 3: trend ve momentum ============
//
// Faz A2 — Analiz Paneli'ndeki net trendleri bugüne kadar SADECE çizilir,
// hiç yorumlanmazdı. En küçük kareler (least-squares) doğrusal regresyonuyla
// "haftada +X net" gibi bir eğim çıkarılır; günler arası düzensiz aralıklar
// (her gün deneme girilmez) sorun değil çünkü x ekseni GÜN OFFSET'İ, sıra
// numarası değil.

export interface RegresyonNoktasi {
  gunOffset: number; // referans tarihten (genelde ilk kayıt) gün farkı
  deger: number;
}

// En küçük kareler yöntemiyle eğim (birim: deger/gün). En az 3 nokta
// isteniyor — 2 noktayla "regresyon" iki uç arasındaki düz çizgiden
// ibaret kalıyor ve tek bir sıra dışı ölçüme aşırı duyarlı oluyor (örn.
// 2 deneme arasında büyük bir fark varsa haftalık +/-20 net gibi
// gerçekçi olmayan eğimler çıkabiliyor — gerçek veriyle doğrulanırken
// görüldü). TÜM noktalar aynı güne düşüyorsa (payda=0) da anlamlı bir
// eğim yok → null.
export function dogrusalRegresyonEgimi(noktalar: RegresyonNoktasi[]): number | null {
  const n = noktalar.length;
  if (n < 3) return null;
  const xOrt = noktalar.reduce((t, p) => t + p.gunOffset, 0) / n;
  const yOrt = noktalar.reduce((t, p) => t + p.deger, 0) / n;
  let pay = 0;
  let payda = 0;
  for (const p of noktalar) {
    pay += (p.gunOffset - xOrt) * (p.deger - yOrt);
    payda += (p.gunOffset - xOrt) ** 2;
  }
  if (payda === 0) return null;
  return pay / payda;
}

export type TrendYonu = "yukselen" | "durgun" | "dusen";

// Günlük eğimi haftalık değişime çevirip yorumlar. Eşik (varsayılan 0.5
// net/hafta) altındaki değişimler "durgun" (gürültü) sayılır — YKS net
// hesabında (dogru - yanlis/4) yarım netlik oynama zaten normal varyans.
const TREND_ESIK_HAFTALIK = 0.5;

export function trendYonuBelirle(gunlukEgim: number | null, esikHaftalik = TREND_ESIK_HAFTALIK): TrendYonu | null {
  if (gunlukEgim === null) return null;
  const haftalikDegisim = gunlukEgim * 7;
  if (haftalikDegisim > esikHaftalik) return "yukselen";
  if (haftalikDegisim < -esikHaftalik) return "dusen";
  return "durgun";
}

export interface TrendSonucu {
  yon: TrendYonu | null;
  // Haftalık net değişim — arayüzde "haftada +0.8 net" gibi göstermek için.
  haftalikDegisim: number | null;
}

export function trendHesapla(noktalar: RegresyonNoktasi[]): TrendSonucu {
  const egim = dogrusalRegresyonEgimi(noktalar);
  return {
    yon: trendYonuBelirle(egim),
    haftalikDegisim: egim === null ? null : Math.round(egim * 7 * 100) / 100,
  };
}

// ============ Katman 4: hız / verimlilik analizi ============
//
// soru_cozumleri'nden ders bazlı "soru başı ortalama süre" ve doğruluk
// oranını dört köşeli bir matrise yerleştirir. Hız için SABİT bir eşik
// yerine öğrencinin KENDİ genel ortalaması referans alınır — bu, ders
// zorluğuna göre doğal olarak değişen soru sürelerini (örn. Matematik
// sorusu Türkçe'den daha uzun sürer) tek bir mutlak eşikle karşılaştırma
// hatasından kaçınır.

export type HizDogrulukKategorisi = "hizli-dogru" | "hizli-hatali" | "yavas-dogru" | "yavas-hatali";

// YKS net formülünde (dogru - yanlis/4) %60 doğruluk kabaca "iyi" sınırı
// sayılır (4 yanlış 1 doğruyu götürür, %60'ın altı net'i hızla eritir).
const DOGRULUK_ESIGI = 0.6;

export interface HizDogrulukGirdisi {
  ortSureDakika: number; // bu ders için soru başına ortalama süre
  dogrulukOrani: number; // bu ders için 0-1 doğruluk oranı
  genelOrtSureDakika: number; // öğrencinin TÜM derslerdeki soru başına ortalaması (referans)
}

export function hizDogrulukKategorisiBelirle(girdi: HizDogrulukGirdisi): HizDogrulukKategorisi {
  const hizli = girdi.ortSureDakika <= girdi.genelOrtSureDakika;
  const dogru = girdi.dogrulukOrani >= DOGRULUK_ESIGI;
  if (hizli && dogru) return "hizli-dogru";
  if (hizli && !dogru) return "hizli-hatali"; // dikkatsizlik sinyali
  if (!hizli && dogru) return "yavas-dogru"; // hız çalışması gerekir
  return "yavas-hatali"; // temel eksik
}
