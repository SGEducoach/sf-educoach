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
    .filter((k) => k.length >= 2 && !DOLGU.has(k))
    // Türkçe çekim ekleri ("felsefesinin" ~ "felsefe") için ilk 5 harf.
    .map((k) => k.slice(0, 5));
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
  const kazanimKumesi = new Set(kazanimKokleri);
  const adayKumesi = new Set(adayKokleri);
  const ortak = [...adayKumesi].filter((k) => kazanimKumesi.has(k)).length;
  if (ortak === 0) return 0;
  const adayKapsamasi = ortak / adayKumesi.size;
  const kazanimKapsamasi = ortak / kazanimKumesi.size;
  return 0.7 * adayKapsamasi + 0.3 * kazanimKapsamasi;
}

export const ONERI_ESIGI = 0.45;
// Gerçek veriyle (90 yayınevi konusu, 25.09.2026) bu eşiğin üstündeki
// öneriler doğru çıktı; altındakilerde yanlışlar var ("Haritalarda yer
// şekilleri" → "Karstik yer şekilleri"). Toplu kaydetme yalnızca bunlara açık.
export const GUCLU_ONERI_ESIGI = 0.7;

export function konuOnerisi(kazanimMetni: string, adaylar: KonuAdayi[]): { konu: string; puan: number } | null {
  const kazanimKokleri = kokler(kazanimMetni);
  let enIyi: { konu: string; puan: number } | null = null;
  for (const aday of adaylar) {
    // Etiketteki üst başlık kelimeleri puanı sulandırmasın — yalnızca konu adı.
    const puan = benzerlik(kazanimKokleri, kokler(aday.konu));
    if (puan > (enIyi?.puan ?? 0)) enIyi = { konu: aday.konu, puan: Math.round(puan * 100) / 100 };
  }
  return enIyi && enIyi.puan >= ONERI_ESIGI ? enIyi : null;
}
