// Karnenin 1. sayfasındaki (ders tablosu dışındaki) bilgiler — kullanıcı
// isteği 25.09.2026: puan ve sıralamalar (sınıf/kurum/ilçe/il/genel +
// katılım), ders bazında sınıf/kurum/genel ortalamaları ve soru soru
// cevaplar (öğrencinin cevabı / cevap anahtarı). Saf modül: PDF'ten
// konumlu satırları alır (bkz. deneme-pdf-ayristirici.ts), sorgu yok.
//
// Cevap satırlarında büyük harf = doğru, küçük harf = yanlış; boş bırakılan
// soruda harf HİÇ YOK — bu yüzden cevaplar metin sırasına göre değil, üstteki
// soru numarasının x konumuna göre eşlenir (gerçek karnede hizalı).

export interface KonumluParca { str: string; x: number }
export interface KonumluSatir { y: number; parcalar: KonumluParca[] }

export interface KarnePuani {
  tur: string;
  puan: number;
  genelOrtalama: number | null;
  sira: { sinif: number | null; kurum: number | null; ilce: number | null; il: number | null; genel: number | null };
  katilim: { sinif: number | null; kurum: number | null; ilce: number | null; il: number | null; genel: number | null } | null;
}

export interface KarneDersOrtalamasi {
  ders: string;
  soru: number;
  dogru: number;
  yanlis: number;
  net: number;
  basari: number;
  sinifOrt: number | null;
  kurumOrt: number | null;
  genelOrt: number | null;
}

export type SoruDurumu = "dogru" | "yanlis" | "bos";

export interface KarneTestCevaplari {
  test: string;
  kitapcik: string | null;
  sorular: { no: number; cevap: string | null; anahtar: string | null; durum: SoruDurumu }[];
}

export interface KarneBirinciSayfa {
  puanlar: KarnePuani[];
  dersler: KarneDersOrtalamasi[];
  testler: KarneTestCevaplari[];
}

const HIZA_TOLERANSI = 6;

function sayi(t: string): number | null {
  if (!/^-?\d+(?:,\d+)?$/.test(t)) return null;
  return Number(t.replace(",", "."));
}

function metin(s: KonumluSatir): string {
  return s.parcalar.map((p) => p.str).join(" ").replace(/\s+/g, " ").trim();
}

function tokenlar(s: KonumluSatir): string[] {
  return metin(s).split(" ").filter(Boolean);
}

// "1 2 3 ... N" — soru numarası başlık satırı mı?
function soruNumaralari(s: KonumluSatir): KonumluParca[] | null {
  const p = s.parcalar.filter((x) => x.str.trim());
  if (p.length < 5) return null;
  for (let i = 0; i < p.length; i++) if (p[i].str.trim() !== String(i + 1)) return null;
  return p;
}

function cevaplariHizala(numaralar: KonumluParca[], satir: KonumluSatir, etiketSinirX: number): Map<number, string> {
  const sonuc = new Map<number, string>();
  for (const parca of satir.parcalar) {
    const harf = parca.str.trim();
    if (!/^[A-Ea-e]$/.test(harf) || parca.x < etiketSinirX) continue;
    let enYakin = -1;
    let enKucukFark = Infinity;
    numaralar.forEach((n, i) => {
      const fark = Math.abs(n.x - parca.x);
      if (fark < enKucukFark) { enKucukFark = fark; enYakin = i; }
    });
    if (enYakin >= 0 && enKucukFark <= HIZA_TOLERANSI) sonuc.set(enYakin + 1, harf);
  }
  return sonuc;
}

export function karneBirinciSayfaCoz(satirlar: KonumluSatir[]): KarneBirinciSayfa {
  const puanlar: KarnePuani[] = [];
  const dersler: KarneDersOrtalamasi[] = [];
  const testler: KarneTestCevaplari[] = [];
  let bolum: "yok" | "puan" | "ders" = "yok";

  for (let i = 0; i < satirlar.length; i++) {
    const t = tokenlar(satirlar[i]);
    const m = t.join(" ");
    // DİKKAT: \b Türkçe harfle ("Türü") biten kelimede çalışmaz — (\s|$) kullanılıyor.
    if (/^Puan Türü(\s|$)/.test(m)) { bolum = "puan"; continue; }
    if (/^Ders(\s*\/\s*Test)?\s+Soru(\s|$)/.test(m)) { bolum = "ders"; continue; }

    const numaralar = soruNumaralari(satirlar[i]);
    if (numaralar) {
      bolum = "yok";
      const ogrenci = satirlar[i + 1];
      const anahtar = satirlar[i + 2];
      if (!ogrenci || !anahtar || !/^Cevap Anahtar/.test(metin(anahtar))) continue;
      const ilkSoruX = numaralar[0].x - HIZA_TOLERANSI;
      const etiket = ogrenci.parcalar.filter((p) => p.x < ilkSoruX).map((p) => p.str).join(" ").replace(/\s+/g, " ").trim();
      const kitapcik = anahtar.parcalar.find((p) => p.x < ilkSoruX && /^[A-D]$/.test(p.str.trim()))?.str.trim() ?? null;
      const ogrenciCevaplari = cevaplariHizala(numaralar, ogrenci, ilkSoruX);
      const anahtarCevaplari = cevaplariHizala(numaralar, anahtar, ilkSoruX);
      testler.push({
        test: etiket,
        kitapcik,
        sorular: numaralar.map((_, idx) => {
          const no = idx + 1;
          const cevap = ogrenciCevaplari.get(no) ?? null;
          const durum: SoruDurumu = cevap === null ? "bos" : cevap === cevap.toLocaleUpperCase("en") ? "dogru" : "yanlis";
          return { no, cevap: cevap?.toUpperCase() ?? null, anahtar: anahtarCevaplari.get(no)?.toUpperCase() ?? null, durum };
        }),
      });
      i += 2;
      continue;
    }

    if (bolum === "puan") {
      if (/^(Sıralamalar|Ortalamalar)$/.test(m)) continue;
      if (/^Sınıf Kurum/.test(m)) continue;
      const sayilar = t.slice(1).map(sayi);
      if (t[0] === "Katılımlar" && puanlar.length > 0 && sayilar.length === 5 && sayilar.every((n) => n !== null)) {
        const [sinif, kurum, ilce, il, genel] = sayilar as number[];
        for (const p of puanlar) p.katilim ??= { sinif, kurum, ilce, il, genel };
        continue;
      }
      if (/^\p{L}+$/u.test(t[0]) && sayilar.length === 7 && sayilar.every((n) => n !== null)) {
        const [puan, genelOrtalama, sinif, kurum, ilce, il, genel] = sayilar as number[];
        puanlar.push({ tur: t[0], puan, genelOrtalama, sira: { sinif, kurum, ilce, il, genel }, katilim: null });
      }
      continue;
    }

    if (bolum === "ders") {
      // "<ders adı> soru doğru yanlış net başarı sınıfOrt kurumOrt genelOrt"
      const sondan = t.slice(-8).map(sayi);
      if (t.length >= 9 && sondan.every((n) => n !== null)) {
        const [soru, dogru, yanlis, net, basari, sinifOrt, kurumOrt, genelOrt] = sondan as number[];
        dersler.push({ ders: t.slice(0, -8).join(" "), soru, dogru, yanlis, net, basari, sinifOrt, kurumOrt, genelOrt });
      }
    }
  }
  return { puanlar, dersler, testler };
}
