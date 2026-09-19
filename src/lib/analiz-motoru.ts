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

// ============ Katman 8: öncelik motoru ============
//
// Faz A3 — "şimdi hangi konuya odaklanmalıyım" sıralı önerisi. Katman
// 2'nin (masterySkoru) çıktısını doğrudan girdi alır — YENİ bir veri
// sorgusu GEREKMEZ, tamamen türetilmiş/saf bir dönüşümdür.
//
// BİLİNÇLİ SADELEŞTİRME: rapordaki formül "kalan_gun_orani"na (YKS'ye
// kaç gün kaldı) da bölüyordu. Bu faktör BİLEREK dışarıda bırakıldı —
// aynı öğrencinin TÜM konularına AYNI sabit çarpan uygulanacağından,
// sıralamayı hiç DEĞİŞTİRMEZ (sadece zamanla tüm skorları birlikte
// şişirir); motorun tek çıktısı sıralı bir liste olduğu için bu faktörü
// eklemek YKS tarihi ayarı gibi ek karmaşıklık katar ama sonucu
// değiştirmez. Mutlak "ne kadar acil" göstergesi istenirse (örn. sayısal
// bir gösterge, sıralamadan bağımsız) o zaman eklenmeli.
const DERS_SINAV_AGIRLIGI: Record<string, number> = {
  "Türkçe": 40, "Matematik": 80, "Fizik": 21, "Kimya": 20, "Biyoloji": 19,
  "Tarih": 15, "Coğrafya": 11, "Felsefe": 17, "Din Kültürü": 11, "Edebiyat": 24,
};
const VARSAYILAN_DERS_AGIRLIGI = 10;

function dersAgirligiGetir(ders: string): number {
  return DERS_SINAV_AGIRLIGI[ders] ?? VARSAYILAN_DERS_AGIRLIGI;
}

// "Hazırlık" (9. sınıf ÖNCESİ ek/zenginleştirme materyali, bkz.
// konu-hakimiyeti.ts'teki tam-görünüm filtresiyle aynı gerekçe) çekirdek
// YKS müfredatı değil — gerçek veriyle doğrulanırken bu konuların, sırf
// MUFREDAT_KONULARI JSON'ında en başta durdukları için (aynı skordaki
// diğer konularla eşitlik bozulurken stabil sıralama JSON sırasını
// koruyor) "en öncelikli" görünmesi tespit edildi. Küçük bir çarpanla
// bilinçli olarak geriye itiliyor.
function seviyeAgirlikCarpaniGetir(seviye: string): number {
  return seviye === "Hazırlık" ? 0.3 : 1;
}

// 0 gün -> 1.0 (henüz unutma etkisi yok), 90+ gün -> 2.0 (tavan) — mevcut
// bayatlama eşikleriyle (90/180 gün) aynı 90 günlük referans noktası.
function unutmaCarpaniHesapla(gunFarki: number | null): number {
  if (gunFarki === null) return 1;
  const oran = Math.min(1, Math.max(0, gunFarki) / 90);
  return 1 + oran;
}

export interface OncelikSatiri {
  ders: string;
  ustKonu: string;
  konu: string;
  oncelikSkoru: number;
  masterySkoru: number | null;
}

export function oncelikSiralamasiOlustur(
  satirlar: { ders: string; ustKonu: string; konu: string; seviye: string; masterySkoru: number | null; guncellenmeTarihi: string | null }[],
): OncelikSatiri[] {
  const simdi = Date.now();
  return satirlar
    .map((s) => {
      const zayiflik = s.masterySkoru === null ? 100 : 100 - s.masterySkoru;
      const gunFarki = s.guncellenmeTarihi === null ? null : (simdi - new Date(s.guncellenmeTarihi).getTime()) / (1000 * 3600 * 24);
      const oncelikSkoru = Math.round(
        zayiflik * dersAgirligiGetir(s.ders) * seviyeAgirlikCarpaniGetir(s.seviye) * unutmaCarpaniHesapla(gunFarki),
      );
      return { ders: s.ders, ustKonu: s.ustKonu, konu: s.konu, oncelikSkoru, masterySkoru: s.masterySkoru };
    })
    .sort((a, b) => b.oncelikSkoru - a.oncelikSkoru);
}

// ============ Katman 9: kural bazlı içgörü metni ============
//
// Önceki katmanların sayısal çıktısını Türkçe cümlelere döken TAMAMEN
// deterministik bir şablon motoru — if/else + string birleştirme, HİÇBİR
// LLM çağrısı yok. Ton, platformun mevcut samimi/teşvik edici diliyle
// tutarlı (kullanıcı kararı, 25.08.2026 — "algoritma senin").

function trendIcgorusu(dersEtiketi: string, trend: TrendSonucu): string | null {
  if (trend.yon === null || trend.haftalikDegisim === null) return null;
  if (trend.yon === "yukselen") return `${dersEtiketi} son haftalarda ortalama haftada +${trend.haftalikDegisim} net artıyor — bu tempoyu koru! 🎉`;
  if (trend.yon === "dusen") return `${dersEtiketi} son haftalarda haftada ${Math.abs(trend.haftalikDegisim)} net geriliyor — bir sonraki çalışma planına bu dersi eklemek iyi olabilir.`;
  return null; // "durgun" — özel bir uyarı gerektirmiyor, gürültü olmasın diye eklenmiyor
}

function hizDogrulukIcgorusu(satir: { ders: string; kategori: HizDogrulukKategorisi }): string | null {
  if (satir.kategori === "hizli-hatali") return `${satir.ders}'te hızlısın ama hata oranın yüksek — dikkatsizlik olabilir, sorulara biraz daha yavaş yaklaşmayı dene.`;
  if (satir.kategori === "yavas-hatali") return `${satir.ders}'te hem yavaş hem hata oranın yüksek — temel konu eksikleri olabilir, konu tekrarına öncelik ver.`;
  if (satir.kategori === "yavas-dogru") return `${satir.ders}'te doğru çözüyorsun ama yavaşsın — kronometreli pratik hızını artırabilir.`;
  return null; // "hizli-dogru" zaten iyi durumda, özel bir uyarı gerekmiyor
}

// Kullanıcı bulgusu (25.08.2026): hiçbir konuda verisi olmayan (yeni
// kayıt olmuş) bir öğrenciye tek bir konu (örn. "Matematik") önerilmesi
// yanıltıcı — bu durumda TÜM konular masterySkoru=null olduğundan eşit
// zayıflıkta sayılıyor ve sıralama sadece ders sınav ağırlığına göre
// belirleniyor (Matematik en yüksek ağırlığa sahip olduğundan HEP
// kazanıyor) — bu, gerçek bir öncelik değil, yapay bir sonuç. Bu yüzden
// "gerçekten hiç veri yok" durumu AYRICA tespit edilip genel/nötr bir
// mesaja dönüştürülüyor.
function oncelikIcgorusu(oncelikSiralamasi: OncelikSatiri[]): string | null {
  if (oncelikSiralamasi.length === 0) return null;
  if (oncelikSiralamasi.every((s) => s.masterySkoru === null)) {
    return "Henüz hiçbir konuda veri girmemişsin — hangi dersten başlarsan başla iyi bir ilk adım olur, seni bekleyen tüm derslerden birini seçip başlayabilirsin! 🚀";
  }
  const ilkSatir = oncelikSiralamasi[0];
  const seviyeIfade = ilkSatir.masterySkoru === null ? "hiç çalışmadığın" : `hakimiyet skorun ${ilkSatir.masterySkoru}/100 olan`;
  return `Şimdi en çok "${ilkSatir.konu}" (${ilkSatir.ders}) konusuna odaklanmanı öneririz — ${seviyeIfade} bir konu.`;
}

export interface IcgoruGirdisi {
  denemeTrend: TrendSonucu;
  dersTrendleri: Record<string, TrendSonucu>;
  hizDogruluk: { ders: string; kategori: HizDogrulukKategorisi }[];
  oncelikSiralamasi: OncelikSatiri[];
  // Faz A4 — sadece hedef net GİRİLMİŞSE dolu gelir (bkz. hedefProjeksiyonuHesapla).
  hedefProjeksiyonlari?: { tur: "TYT" | "AYT"; sonuc: HedefProjeksiyonuSonucu }[];
}

// En fazla 4 cümle döner — hepsi birden gösterilirse "AI konuşuyormuş"
// hissi yerine liste okuma hissi verir; en aksiyona dönüştürülebilir
// (hedef projeksiyonu + öncelik + en belirgin trend + en belirgin
// hız-doğruluk uyarısı) seçiliyor. Hedef projeksiyonu EN MOTİVE EDİCİ/
// somut bilgi olduğundan varsa listenin BAŞINA alınır.
export function icgoruMetinleriOlustur(girdi: IcgoruGirdisi): string[] {
  const metinler: string[] = [];

  for (const { tur, sonuc } of girdi.hedefProjeksiyonlari ?? []) {
    const metin = hedefIcgorusu(tur, sonuc);
    if (metin) metinler.push(metin);
  }

  const oncelik = oncelikIcgorusu(girdi.oncelikSiralamasi);
  if (oncelik) metinler.push(oncelik);

  const genelTrend = trendIcgorusu("Genel deneme netin", girdi.denemeTrend);
  if (genelTrend) metinler.push(genelTrend);

  // En belirgin (mutlak değeri en büyük) TEK ders trendi — hepsini
  // eklemek gürültü olur.
  const dersTrendGirdileri = Object.entries(girdi.dersTrendleri)
    .filter(([, t]) => t.haftalikDegisim !== null)
    .sort((a, b) => Math.abs(b[1].haftalikDegisim ?? 0) - Math.abs(a[1].haftalikDegisim ?? 0));
  if (dersTrendGirdileri.length > 0) {
    const [ders, trend] = dersTrendGirdileri[0];
    const metin = trendIcgorusu(`${ders} netin`, trend);
    if (metin) metinler.push(metin);
  }

  // En "acil" hız-doğruluk uyarısı — yavas-hatali > hizli-hatali > yavas-dogru
  // önceliğiyle (temel eksik, en ciddi sinyal).
  const oncelikSirasi: HizDogrulukKategorisi[] = ["yavas-hatali", "hizli-hatali", "yavas-dogru"];
  for (const kategori of oncelikSirasi) {
    const satir = girdi.hizDogruluk.find((h) => h.kategori === kategori);
    if (satir) {
      const metin = hizDogrulukIcgorusu(satir);
      if (metin) { metinler.push(metin); break; }
    }
  }

  return metinler.slice(0, 4);
}

// ============ Katman 5: hedefe uzaklık ve projeksiyon ============
//
// Faz A4 — kullanıcı kararı (25.08.2026, açık soru 1): hedef net alanını
// ÖĞRENCİ KENDİ girer (migration 0061 — students.hedef_net_tyt/
// hedef_net_ayt). TYT ve AYT AYRI tutulur — farklı ölçekte puanlanıyor
// ve ayrı deneme trendleri var (Katman 3, bkz. AnalizVerisi.denemeTrendYonuTur).
//
// "Kalan gün" (kaç hafta kaldı) burada Katman 8'deki gibi ATLANAMAZ —
// orada sadece SIRALAMA için gerekliydi (etkisizdi), burada "haftada
// ne kadar ivme gerekiyor" hesabının PAYDASI, gerçekten gerekli. Tam bir
// admin-ayarlanabilir tarih mekanizması kurmak (yeni tablo/UI) tek bir
// yıllık değer için aşırı mühendislik — bu yüzden BİLİNÇLİ OLARAK basit
// bir sabit kullanılıyor. Her yıl (YKS tarihi ÖSYM tarafından
// açıklandığında) bu satırın güncellenmesi yeterli.
const YKS_TARIHI_TAHMINI = "2027-06-20"; // TAHMİNİ — ÖSYM takvimi açıklanınca güncellenmeli

function kalanHaftaSayisiHesapla(): number {
  const gunFarki = (new Date(YKS_TARIHI_TAHMINI).getTime() - Date.now()) / (1000 * 3600 * 24);
  return Math.max(1, gunFarki / 7); // sıfıra bölme/negatif süre riskini önlemek için en az 1 hafta
}

export interface HedefProjeksiyonuGirdisi {
  guncelNet: number | null; // o türün (TYT/AYT) en son deneme neti
  hedefNet: number | null; // öğrencinin kendi belirlediği hedef
  haftalikEgim: number | null; // Katman 3'ten (o türe özel trend, TrendSonucu.haftalikDegisim)
}

export interface HedefProjeksiyonuSonucu {
  kalanNet: number | null; // hedef - guncel (negatif/0 ise hedefe ulaşılmış)
  gerekenHaftalikIvme: number | null; // kalanNet / kalan hafta sayısı
  tahminiHaftaSayisi: number | null; // kalanNet / haftalık eğim (eğim pozitifse)
}

export function hedefProjeksiyonuHesapla(girdi: HedefProjeksiyonuGirdisi): HedefProjeksiyonuSonucu {
  if (girdi.guncelNet === null || girdi.hedefNet === null) {
    return { kalanNet: null, gerekenHaftalikIvme: null, tahminiHaftaSayisi: null };
  }
  const kalanNet = Math.round((girdi.hedefNet - girdi.guncelNet) * 100) / 100;
  if (kalanNet <= 0) return { kalanNet, gerekenHaftalikIvme: 0, tahminiHaftaSayisi: 0 };

  const gerekenHaftalikIvme = Math.round((kalanNet / kalanHaftaSayisiHesapla()) * 100) / 100;
  const tahminiHaftaSayisi = girdi.haftalikEgim !== null && girdi.haftalikEgim > 0 ? Math.round(kalanNet / girdi.haftalikEgim) : null;

  return { kalanNet, gerekenHaftalikIvme, tahminiHaftaSayisi };
}

// Katman 9'un bir parçası — hedef projeksiyonunu Türkçe cümleye döker.
export function hedefIcgorusu(tur: "TYT" | "AYT", sonuc: HedefProjeksiyonuSonucu): string | null {
  if (sonuc.kalanNet === null) return null;
  if (sonuc.kalanNet <= 0) return `${tur} hedefine zaten ulaştın, hatta üstündesin! 🎉 Hedefini güncellemek isteyebilirsin.`;
  if (sonuc.tahminiHaftaSayisi !== null) return `Bu tempoyla ${tur} hedefine yaklaşık ${sonuc.tahminiHaftaSayisi} haftada ulaşabilirsin.`;
  if (sonuc.gerekenHaftalikIvme !== null) return `${tur} hedefine ulaşmak için haftada ortalama +${sonuc.gerekenHaftalikIvme} net'lik bir ivme gerekiyor.`;
  return null;
}

// ============ Katman 6: kohort karşılaştırması ============
//
// Faz A5 — kullanıcı kararı (25.08.2026, açık soru 2): "öğretmen tarafı
// yeterli" — bu katmanın çıktısı SADECE öğretmen/müdür/admin görünümünde
// gösterilir, ÖĞRENCİYE HİÇ GÖSTERİLMEZ (motivasyon riski — bir öğrencinin
// "sınıfının en altındasın" görmesi ters tepebilir). Bkz. AnalizPaneli'nin
// ogretmenGorunumu prop'u — bu katman student-facing hiçbir kod yolunda
// ÇAĞRILMAZ bile (veri çekme fonksiyonu da sadece öğretmen/admin çağrı
// noktalarından import edilir, bkz. src/lib/analiz-kohort.ts).
//
// k-anonymity: konu_zayiflik_raporu RPC'sinde (migration 0058) kurulan
// AYNI eşik (≥3) — kohort 3'ten küçükse (kendisi hariç) persentil
// hesaplanmaz, tek bir sınıf arkadaşının notu ifşa olmasın.
const KOHORT_MIN_BUYUKLUK = 3;

export interface PersentilSonucu {
  // 0-100 — kendi değerinin kohortun yüzde kaçının ÜSTÜNDE olduğu.
  // Kohort yetersizse (< KOHORT_MIN_BUYUKLUK) null — gösterilmemeli.
  persentil: number | null;
  kohortBuyuklugu: number;
}

export function persentilHesapla(kendiDeger: number, digerDegerler: number[]): PersentilSonucu {
  if (digerDegerler.length < KOHORT_MIN_BUYUKLUK) {
    return { persentil: null, kohortBuyuklugu: digerDegerler.length };
  }
  const altindaOlanSayisi = digerDegerler.filter((d) => d < kendiDeger).length;
  return { persentil: Math.round((altindaOlanSayisi / digerDegerler.length) * 100), kohortBuyuklugu: digerDegerler.length };
}

// ============ Katman 7: erken uyarı / risk skoru ============
//
// Faz A5 — Katman 6 ile AYNI gerekçeyle SADECE öğretmen/müdür/admin
// görünümünde gösterilir. Girdiler YENİ bir sorgu GEREKTİRMEZ — hepsi
// zaten hesaplanmış sinyallerin (Katman 3'ün trendleri, Konu Hakimiyeti'nin
// "bayat" bayrağı, AnalizVerisi'ndeki tarih listeleri) çağıran tarafta
// türetilmesi.
export type RiskDuzeyi = "dusuk" | "orta" | "yuksek";

export interface RiskGirdisi {
  // En son HERHANGİ bir veri girişinden (konu/soru/deneme) bu yana geçen
  // gün — hiç veri yoksa null (bu durumda aktivite sinyali atlanır, "hiç
  // veri yok" zaten başka göstergelerde belli).
  sonAktiviteGunFarki: number | null;
  denemeTrendYonu: TrendYonu | null;
  verimlilikTrendYonu: TrendYonu | null;
  // Konu Hakimiyeti'nde BEYAN EDİLMİŞ konular arasında 90+ gündür
  // güncellenmemiş ("bayat") olanların oranı, 0-1. Hiç beyan yoksa null.
  bayatKonuOrani: number | null;
}

export interface RiskSonucu {
  duzey: RiskDuzeyi;
  puan: number;
  // Arayüzde "neden bu seviye" şeffaflığı için — hangi sinyaller katkı verdi.
  nedenler: string[];
}

const RISK_AKTIVITE_ORTA_GUN = 7;
const RISK_AKTIVITE_YUKSEK_GUN = 14;
const RISK_BAYAT_ORANI_ESIGI = 0.5;

export function riskSkoruHesapla(girdi: RiskGirdisi): RiskSonucu {
  let puan = 0;
  const nedenler: string[] = [];

  if (girdi.sonAktiviteGunFarki !== null) {
    const gun = Math.round(girdi.sonAktiviteGunFarki);
    if (girdi.sonAktiviteGunFarki > RISK_AKTIVITE_YUKSEK_GUN) { puan += 2; nedenler.push(`${gun} gündür hiç veri girişi yok`); }
    else if (girdi.sonAktiviteGunFarki > RISK_AKTIVITE_ORTA_GUN) { puan += 1; nedenler.push(`${gun} gündür veri girişi yok`); }
  }
  if (girdi.denemeTrendYonu === "dusen") { puan += 2; nedenler.push("deneme net trendi düşüyor"); }
  if (girdi.verimlilikTrendYonu === "dusen") { puan += 1; nedenler.push("verimlilik algısı düşüyor"); }
  if (girdi.bayatKonuOrani !== null && girdi.bayatKonuOrani > RISK_BAYAT_ORANI_ESIGI) {
    puan += 1;
    nedenler.push(`konu hakimiyeti beyanlarının %${Math.round(girdi.bayatKonuOrani * 100)}'i 90+ gündür güncellenmemiş`);
  }

  const duzey: RiskDuzeyi = puan >= 4 ? "yuksek" : puan >= 2 ? "orta" : "dusuk";
  return { duzey, puan, nedenler };
}
