export const SEO_ANAHTAR_KELIMELER_ANAHTAR = "seo_anahtar_kelimeler";
export const SEO_ANAHTAR_KELIME_ADET_SINIRI = 30;
export const SEO_ANAHTAR_KELIME_UZUNLUK_SINIRI = 60;

export const VARSAYILAN_SEO_ANAHTAR_KELIMELERI = [
  "YKS hazırlık",
  "öğrenci takip sistemi",
  "öğrenci koçluğu",
  "okul öğrenci takip",
  "dershane öğrenci takip",
  "konu hakimiyeti",
  "deneme analizi",
  "öğrenci çalışma programı",
  "veli öğrenci takibi",
  "öğretmen öğrenci takibi",
];

function temizle(degerler: string[]): string[] {
  const gorulen = new Set<string>();
  const sonuc: string[] = [];

  for (const ham of degerler) {
    const kelime = ham.replace(/\s+/g, " ").trim();
    if (!kelime) continue;
    const anahtar = kelime.toLocaleLowerCase("tr-TR");
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    sonuc.push(kelime);
  }

  return sonuc;
}

export function seoAnahtarKelimeleriniAyristir(ham: string): {
  error: string | null;
  kelimeler: string[];
} {
  const kelimeler = temizle(ham.split(/[,;\n\r]+/));
  const uzunKelime = kelimeler.find((kelime) => kelime.length > SEO_ANAHTAR_KELIME_UZUNLUK_SINIRI);

  if (uzunKelime) {
    return {
      error: `Her ifade en fazla ${SEO_ANAHTAR_KELIME_UZUNLUK_SINIRI} karakter olabilir: “${uzunKelime}”`,
      kelimeler: [],
    };
  }

  if (kelimeler.length > SEO_ANAHTAR_KELIME_ADET_SINIRI) {
    return {
      error: `En fazla ${SEO_ANAHTAR_KELIME_ADET_SINIRI} anahtar kelime ekleyebilirsiniz.`,
      kelimeler: [],
    };
  }

  return { error: null, kelimeler };
}

export function kayitliSeoAnahtarKelimeleriniOku(ham: string | null): string[] {
  if (ham === null) return [...VARSAYILAN_SEO_ANAHTAR_KELIMELERI];

  try {
    const deger = JSON.parse(ham) as unknown;
    if (!Array.isArray(deger) || deger.some((kelime) => typeof kelime !== "string")) {
      return [...VARSAYILAN_SEO_ANAHTAR_KELIMELERI];
    }
    const kelimeler = temizle(deger);
    if (
      kelimeler.length > SEO_ANAHTAR_KELIME_ADET_SINIRI ||
      kelimeler.some((kelime) => kelime.length > SEO_ANAHTAR_KELIME_UZUNLUK_SINIRI)
    ) {
      return [...VARSAYILAN_SEO_ANAHTAR_KELIMELERI];
    }
    return kelimeler;
  } catch {
    // İlk sürümlerde elle yazılmış virgüllü bir değer bulunursa onu da oku.
    const { error, kelimeler } = seoAnahtarKelimeleriniAyristir(ham);
    return error ? [...VARSAYILAN_SEO_ANAHTAR_KELIMELERI] : kelimeler;
  }
}
