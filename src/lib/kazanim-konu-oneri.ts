// Yayınevi kazanım/konu metni → müfredat konusu eşleştirmesi (Analiz
// Motoru'nun "ölçüm" sinyali için, kullanıcı isteği 25.09.2026). Eşleştirme
// yönetici onaylı (kazanim_konu_eslesmeleri, migration 0063: "otomatik/AI
// eşleştirme yanlış konuya yanlış veri yazma riski taşıyor") — bu modül
// yalnızca yöneticiye ÖNERİ üretir. Saf/deterministik.

import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";

const MUFREDAT_DERSLERI = new Set(MUFREDAT_KONULARI.map((k) => k.ders));

// Karnedeki ham ders adı → müfredat dersi. "Tarih-1" → "Tarih",
// "Geometri" → "Matematik", "Felsefe (Seçmeli)" → "Felsefe". Müfredatta
// karşılığı yoksa null (eşleştirilemez).
const OZEL_DERSLER: Record<string, string> = {
  "Geometri": "Matematik",
  "Din Kül. ve Ahl. Bil.": "Din Kültürü",
  "Din Kültürü ve Ahlak Bilgisi": "Din Kültürü",
};

export function kazanimDersiniKanoniklestir(ders: string): string | null {
  const sade = ders.trim().replace(/\s*\(Se[çc]meli\)$/i, "").replace(/-\d+$/, "");
  const kanonik = OZEL_DERSLER[sade] ?? sade;
  return MUFREDAT_DERSLERI.has(kanonik) ? kanonik : null;
}

// Kazanım cümlelerindeki anlam taşımayan fiil/bağlaçlar.
const DOLGU = new Set([
  "ve", "ile", "ya", "veya", "da", "de", "ki", "bir", "bu", "şu", "için", "olarak", "gibi", "göre", "arasında", "arasındaki",
  "açıklar", "eder", "yapar", "kavrar", "analiz", "ilişkilendirir", "değerlendirir", "yorumlar", "belirler", "hesaplar",
  "hesaplamalar", "tanır", "bilir", "kullanır", "çözer", "karşılaştırır", "sorgular", "fark", "ayırt", "örneklendirir",
  "konusunu", "problemlerini", "kavramlarını", "özelliklerini", "bağlı", "olduğu", "değişkenleri", "etkisini", "yönelik",
]);

function kokler(metin: string): string[] {
  return metin
    .normalize("NFC")
    .toLocaleLowerCase("tr-TR")
    .replace(/[’'`]/g, " ")
    .replace(/[^\p{L}\d\s]/gu, " ")
    .split(/\s+/)
    .filter((k) => k.length >= 2 && !DOLGU.has(k));
}

// Kullanıcı geri bildirimi (25.09.2026): "eşleşmeyen konular var, bunlara
// öneri getir" — eşleşmeden kalan 30 başlığın hiçbirine öneri çıkmıyordu.
// Kök karşılaştırması sabit 5 harfle yapıldığı için "sayılar" ("sayıl") ile
// "sayı" tutmuyordu. Artık iki kelimeden biri diğerinin öneki olduğunda
// (en az 4 harf) aynı kök sayılıyor; ek farkları ("kümeler"/"küme",
// "prizmalar"/"prizma", "üslü ifadeler"/"üslü sayılar") eşleşiyor.
const EN_KISA_ONEK = 4;

function ayniKok(a: string, b: string): boolean {
  if (a === b) return true;
  const kisa = a.length <= b.length ? a : b;
  const uzun = a.length <= b.length ? b : a;
  return kisa.length >= EN_KISA_ONEK && uzun.startsWith(kisa);
}

// Adaydaki kaç kelime kazanım metninde karşılık buluyor (ve tersi).
function ortakSayisi(birinci: string[], ikinci: string[]): number {
  const kullanilan = new Set<number>();
  let ortak = 0;
  for (const kelime of birinci) {
    const eslesen = ikinci.findIndex((d, i) => !kullanilan.has(i) && ayniKok(kelime, d));
    if (eslesen >= 0) { kullanilan.add(eslesen); ortak++; }
  }
  return ortak;
}

export interface KonuAdayi {
  // Kaydedilecek değer — müfredattaki konu adı ya da alt başlık.
  konu: string;
  // Ekranda gösterilecek (alt başlıksa "Üst › Alt").
  etiket: string;
}

// Adayın kelimelerinin ne kadarı kazanım metninde geçiyor (0-1); kısa aday
// adları tek kelimeyle tam puan almasın diye kazanım tarafının kapsaması da
// hesaba katılıyor.
function benzerlik(kazanimKokleri: string[], adayKokleri: string[]): number {
  if (kazanimKokleri.length === 0 || adayKokleri.length === 0) return 0;
  const kazanimKumesi = [...new Set(kazanimKokleri)];
  const adayKumesi = [...new Set(adayKokleri)];
  const ortak = ortakSayisi(adayKumesi, kazanimKumesi);
  if (ortak === 0) return 0;
  const adayKapsamasi = ortak / adayKumesi.length;
  const kazanimKapsamasi = ortak / kazanimKumesi.length;
  return 0.7 * adayKapsamasi + 0.3 * kazanimKapsamasi;
}

export const ONERI_ESIGI = 0.45;
// Gerçek veriyle (90 yayınevi konusu, 25.09.2026) bu eşiğin üstündeki
// öneriler doğru çıktı; altındakilerde yanlışlar var ("Haritalarda yer
// şekilleri" → "Karstik yer şekilleri"). Toplu kaydetme yalnızca bunlara açık.
export const GUCLU_ONERI_ESIGI = 0.7;

// Kullanıcı isteği (25.09.2026): eşiği geçemeyen başlıklar da yöneticiye
// aday göstersin — "eşleşmeyen konulara öneri getir". Bu eşiğin altındakiler
// listelenmez; üstündekiler "zayıf öneri" olarak SEÇİLİ GELMEZ, yalnızca tek
// tıkla seçiciye yazılır. Kaydetme kararı yine yöneticinin.
export const ZAYIF_ONERI_ESIGI = 0.22;

export function konuOnerileri(kazanimMetni: string, adaylar: KonuAdayi[], enFazla = 3, esik = ZAYIF_ONERI_ESIGI): { konu: string; puan: number }[] {
  const kazanimKokleri = kokler(kazanimMetni);
  const puanlar = new Map<string, number>();
  for (const aday of adaylar) {
    // Etiketteki üst başlık kelimeleri puanı sulandırmasın — yalnızca konu adı.
    const puan = Math.round(benzerlik(kazanimKokleri, kokler(aday.konu)) * 100) / 100;
    if (puan >= esik && puan > (puanlar.get(aday.konu) ?? 0)) puanlar.set(aday.konu, puan);
  }
  return [...puanlar.entries()]
    .map(([konu, puan]) => ({ konu, puan }))
    .sort((a, b) => b.puan - a.puan || a.konu.localeCompare(b.konu, "tr"))
    .slice(0, enFazla);
}

export function konuOnerisi(kazanimMetni: string, adaylar: KonuAdayi[]): { konu: string; puan: number } | null {
  return konuOnerileri(kazanimMetni, adaylar, 1, ONERI_ESIGI)[0] ?? null;
}
