export type SesliSoruVerisi = {
  ders: string;
  dogru: number;
  yanlis: number;
  bos: number;
  sureDakika: number;
};

function normalize(metin: string): string {
  return metin.toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i").replaceAll("ş", "s").replaceAll("ğ", "g")
    .replaceAll("ü", "u").replaceAll("ö", "o").replaceAll("ç", "c")
    .replace(/[.,;:]/g, " ").replace(/\s+/g, " ").trim();
}

function alanOku(metin: string, etiket: string): number | null {
  const once = metin.match(new RegExp(`(?:^|\\s)(\\d{1,3})\\s*(?:soru\\s*)?${etiket}(?=\\s|$)`));
  const sonra = metin.match(new RegExp(`(?:^|\\s)${etiket}\\s*(\\d{1,3})(?=\\s|$)`));
  const deger = once?.[1] ?? sonra?.[1];
  return deger === undefined ? null : Number(deger);
}

export function sesliSoruCozumunuCoz(metin: string, dersler: string[]):
  | { veri: SesliSoruVerisi; hata: null }
  | { veri: null; hata: string } {
  const duz = normalize(metin);
  const ders = [...dersler].sort((a, b) => b.length - a.length)
    .find((ad) => {
      const konum = duz.indexOf(normalize(ad));
      return konum >= 0 && (konum === 0 || duz[konum - 1] === " ") &&
        (konum + normalize(ad).length === duz.length || duz[konum + normalize(ad).length] === " ");
    });
  if (!ders) return { veri: null, hata: "Dersi anlayamadım. Ders adını açıkça söyleyin." };

  const dogru = alanOku(duz, "dogru");
  const yanlis = alanOku(duz, "yanlis");
  const bos = alanOku(duz, "bos");
  const sure = duz.match(/(?:^|\s)(\d{1,3})\s*(?:dakika|dk)(?=\s|$)/)?.[1] ??
    duz.match(/(?:^|\s)sure\s*(\d{1,3})(?=\s|$)/)?.[1];
  if (dogru === null || yanlis === null || bos === null || sure === undefined) {
    return { veri: null, hata: "Doğru, yanlış, boş ve süreyi birlikte söyleyin. Örnek: Matematik 20 doğru 5 yanlış 2 boş 40 dakika." };
  }
  const sureDakika = Number(sure);
  const toplam = dogru + yanlis + bos;
  if (toplam === 0 || sureDakika < 1 || sureDakika > toplam * 2 || Math.max(dogru, yanlis, bos) > 300) {
    return { veri: null, hata: "Sayılar form sınırlarına uymuyor. Söylediklerinizi kontrol edip yeniden deneyin." };
  }
  return { veri: { ders, dogru, yanlis, bos, sureDakika }, hata: null };
}
