// Ortaokul mufredatinin SAF sekillendirme katmani — sunucuya bagli degil,
// arayuz bilesenleri de tip ve etiketleri buradan alir. Sorgular:
// ortaokul-mufredat-sorgu.ts
// Ortaokul Paneli — Faz 1: öğrencinin sınıfına ait müfredatı okuma katmanı.
//
// Müfredat tabloları (migration 0127) authenticated'a SALT OKUNUR açıktır;
// burada servis anahtarı kullanılmaz, öğrencinin kendi oturumu yeterlidir.
//
// Sorgular ince tutulup şekillendirme saf fonksiyonlara ayrıldı — böylece
// gruplama mantığı veritabanı olmadan test edilebiliyor.

export interface OrtaokulKazanimi {
  id: string;
  kod: string;
  metin: string;
}

export interface OrtaokulTemasi {
  id: string;
  kod: string;
  ad: string | null;
  tur: "tema" | "unite" | "beceri";
  dersSaati: number | null;
  kazanimlar: OrtaokulKazanimi[];
}

export interface OrtaokulDersi {
  id: string;
  dersKodu: string;
  ad: string;
  temaSayisi: number;
  kazanimSayisi: number;
}

// Ekranda "tema" yerine dersin kendi terimi yazılmalı (tasarım belgesi §7.1:
// veritabanı ortak, etiket derse özgü).
export const TEMA_TURU_ETIKET: Record<OrtaokulTemasi["tur"], string> = {
  tema: "Tema",
  unite: "Ünite",
  beceri: "Beceri",
};

// Çoğullar açıkça yazıldı: Türkçe ses uyumu gereği "Tema→Temalar" ama
// "Ünite→Üniteler"; tek kural üretmek yerine üç kelimeyi sabitlemek net.
const TEMA_TURU_COGUL: Record<OrtaokulTemasi["tur"], string> = {
  tema: "Temalar",
  unite: "Üniteler",
  beceri: "Beceriler",
};

export function temaTuruEtiketi(tur: string, cogul = false): string {
  const anahtar = (["tema", "unite", "beceri"].includes(tur) ? tur : "tema") as OrtaokulTemasi["tur"];
  return cogul ? TEMA_TURU_COGUL[anahtar] : TEMA_TURU_ETIKET[anahtar];
}

export interface HamTemaSatiri {
  id: string;
  kod: string;
  ad: string | null;
  tur: string;
  ders_saati: number | null;
  sira: number;
  ortaokul_mufredat_kazanimlari: { id: string; kod: string; metin: string; sira: number }[] | null;
}

// Gömülü ilişki supabase-js'te dizi görünür ama tek satırda NESNE dönebilir
// (bkz. proje notu) — burada gerçekten çoklu olduğu için dizi beklenir,
// yine de null'a karşı korunuyor.
export function temalariDuzenle(satirlar: HamTemaSatiri[]): OrtaokulTemasi[] {
  return [...satirlar]
    .sort((a, b) => a.sira - b.sira)
    .map((t) => ({
      id: t.id,
      kod: t.kod,
      ad: t.ad,
      tur: (["tema", "unite", "beceri"].includes(t.tur) ? t.tur : "tema") as OrtaokulTemasi["tur"],
      dersSaati: t.ders_saati,
      kazanimlar: [...(t.ortaokul_mufredat_kazanimlari ?? [])]
        .sort((a, b) => a.sira - b.sira)
        .map((k) => ({ id: k.id, kod: k.kod, metin: k.metin })),
    }));
}

export function dersleriOzetle(
  dersler: { id: string; ders_kodu: string; ad: string; sira: number }[],
  temalar: { id: string; ders_id: string }[],
  kazanimSayilari: Map<string, number>,
): OrtaokulDersi[] {
  const temaSayisi = new Map<string, number>();
  const kazanimSayisi = new Map<string, number>();
  for (const t of temalar) {
    temaSayisi.set(t.ders_id, (temaSayisi.get(t.ders_id) ?? 0) + 1);
    kazanimSayisi.set(t.ders_id, (kazanimSayisi.get(t.ders_id) ?? 0) + (kazanimSayilari.get(t.id) ?? 0));
  }
  return [...dersler]
    .sort((a, b) => a.sira - b.sira || a.ad.localeCompare(b.ad, "tr"))
    .map((d) => ({
      id: d.id,
      dersKodu: d.ders_kodu,
      ad: d.ad,
      temaSayisi: temaSayisi.get(d.id) ?? 0,
      kazanimSayisi: kazanimSayisi.get(d.id) ?? 0,
    }));
}
