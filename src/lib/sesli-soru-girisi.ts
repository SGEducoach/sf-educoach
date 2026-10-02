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

const SOZLU_DERS_ADLARI: ReadonlyArray<readonly [string, string]> = [
  ["tarih bir", "Tarih-1"], ["tarih iki", "Tarih-2"],
  ["tarih 1", "Tarih-1"], ["tarih 2", "Tarih-2"],
  ["cografya bir", "Coğrafya-1"], ["cografya iki", "Coğrafya-2"],
  ["cografya 1", "Coğrafya-1"], ["cografya 2", "Coğrafya-2"],
  ["felsefe grubu", "Felsefe Grubu"],
  ["matematigi", "Matematik"],
];

const DERS_EKLERI = ["", "ten", "tan", "den", "dan", "te", "ta", "de", "da", "i", "yi"];
const BIRLER: Record<string, number> = {
  sifir: 0, bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9,
};
const ONLAR: Record<string, number> = {
  on: 10, yirmi: 20, otuz: 30, kirk: 40, elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90,
};

function yaziylaSayilariDonustur(metin: string): string | null {
  const kelimeler = metin.split(" ");
  const sonuc: string[] = [];
  for (let i = 0; i < kelimeler.length; i++) {
    const kelime = kelimeler[i];
    if (kelime === "yuz") {
      if (kelimeler[i + 1] in BIRLER || kelimeler[i + 1] in ONLAR) return null;
      sonuc.push("100");
    } else if (kelime in ONLAR) {
      const birler = BIRLER[kelimeler[i + 1]];
      if (birler !== undefined && birler > 0) { sonuc.push(String(ONLAR[kelime] + birler)); i++; }
      else sonuc.push(String(ONLAR[kelime]));
    } else if (kelime in BIRLER) sonuc.push(String(BIRLER[kelime]));
    else sonuc.push(kelime);
  }
  return sonuc.join(" ");
}

function dersBul(metin: string, dersler: string[]): { ders: string | null; listedeYok: boolean } {
  const soylendiginde = SOZLU_DERS_ADLARI.find(([sozlu]) =>
    metin === sozlu || metin.startsWith(`${sozlu} `) || metin.endsWith(` ${sozlu}`) || metin.includes(` ${sozlu} `));
  if (soylendiginde) {
    return dersler.includes(soylendiginde[1])
      ? { ders: soylendiginde[1], listedeYok: false }
      : { ders: null, listedeYok: true };
  }
  const ders = [...dersler].sort((a, b) => b.length - a.length)
    .find((ad) => {
      const aranan = normalize(ad);
      const konum = metin.indexOf(aranan);
      const son = konum + aranan.length;
      return konum >= 0 && (konum === 0 || metin[konum - 1] === " ") &&
        DERS_EKLERI.some((ek) => metin.slice(son).startsWith(ek) &&
          (son + ek.length === metin.length || metin[son + ek.length] === " "));
    });
  return { ders: ders ?? null, listedeYok: false };
}

function cevapAlanlariniOku(metin: string): { dogru: number; yanlis: number; bos: number } | null {
  const kelimeler = metin.split(" ");
  const etiketler = ["dogru", "yanlis", "bos"] as const;
  type Etiket = typeof etiketler[number];
  const degerler: Partial<Record<Etiket, number>> = {};
  const etiketSayisi: Record<Etiket, number> = { dogru: 0, yanlis: 0, bos: 0 };

  for (const kelime of kelimeler) {
    if (etiketler.includes(kelime as Etiket)) etiketSayisi[kelime as Etiket]++;
  }
  if (etiketSayisi.dogru !== 1 || etiketSayisi.yanlis !== 1 || etiketSayisi.bos > 1) return null;

  // Her sayıyı bir kez, kendisine bitişik tek bir cevap etiketine bağla.
  // "doğru 20 yanlış 5" örneğinde 20, önceki boş etikete aittir;
  // "20 doğru 5 yanlış" örneğinde ise sonraki boş etikete aittir.
  for (let i = 0; i < kelimeler.length; i++) {
    if (!/^\d{1,3}$/.test(kelimeler[i])) continue;
    const onceki = kelimeler[i - 1] as Etiket | undefined;
    const sonraki = (kelimeler[i + 1] === "soru" ? kelimeler[i + 2] : kelimeler[i + 1]) as Etiket | undefined;
    const etiket = onceki && etiketler.includes(onceki) && degerler[onceki] === undefined ? onceki :
      sonraki && etiketler.includes(sonraki) && degerler[sonraki] === undefined ? sonraki : null;
    if (etiket) degerler[etiket] = Number(kelimeler[i]);
  }

  if (degerler.dogru === undefined || degerler.yanlis === undefined ||
      (etiketSayisi.bos === 1 && degerler.bos === undefined)) return null;
  return { dogru: degerler.dogru, yanlis: degerler.yanlis, bos: degerler.bos ?? 0 };
}

export function sesliSoruCozumunuCoz(metin: string, dersler: string[]):
  | { veri: SesliSoruVerisi; hata: null }
  | { veri: null; hata: string } {
  if (/\d[,.]\d/.test(metin)) {
    return { veri: null, hata: "Ondalıklı sayı kullanmayın. Süreyi ve soru sayılarını tam sayı olarak söyleyin." };
  }
  const duz = normalize(metin);
  const dersSonucu = dersBul(duz, dersler);
  if (dersSonucu.listedeYok) return { veri: null, hata: "Bu ders senin listende yok. Listendeki ders adını söyleyin." };
  const ders = dersSonucu.ders;
  if (!ders) return { veri: null, hata: "Dersi anlayamadım. Ders adını açıkça söyleyin." };

  const sayiliMetin = yaziylaSayilariDonustur(duz);
  if (sayiliMetin === null) return { veri: null, hata: "Yüzden büyük yazıyla sayıları bu sürüm okuyamıyor. Rakamla söyleyin." };
  const cevaplar = cevapAlanlariniOku(sayiliMetin);
  const sure = sayiliMetin.match(/(?:^|\s)(\d{1,3})\s*(?:dakika|dakikada|dk)(?=\s|$)/)?.[1] ??
    sayiliMetin.match(/(?:^|\s)sure\s*(\d{1,3})(?=\s|$)/)?.[1];
  if (!cevaplar || sure === undefined) {
    return { veri: null, hata: "Doğru, yanlış, boş ve süreyi birlikte söyleyin. Örnek: Matematik 20 doğru 5 yanlış 2 boş 40 dakika." };
  }
  const { dogru, yanlis, bos } = cevaplar;
  const sureDakika = Number(sure);
  const toplam = dogru + yanlis + bos;
  if (toplam === 0 || sureDakika < 1 || sureDakika > toplam * 2 || Math.max(dogru, yanlis, bos) > 300) {
    return { veri: null, hata: "Sayılar form sınırlarına uymuyor. Söylediklerinizi kontrol edip yeniden deneyin." };
  }
  return { veri: { ders, dogru, yanlis, bos, sureDakika }, hata: null };
}
