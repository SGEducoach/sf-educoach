// Sınıf bazlı deneme net listeleri (kullanıcı isteği 18.09.2026) — SAF,
// test edilebilir çözümleyici.
//
// Bazı yayınevleri (ör. "ORBİTAL DENEME KULÜBÜ TYT") okulun toplu "OKUL ...
// NET LİSTESİ" sayfasını hiç vermiyor; PDF yalnızca "11-A SINIFI TYT NET
// LİSTESİ" gibi sınıf sayfalarından oluşuyor. okulListesiniAyristir sınıf
// sayfalarını (normalde okul listesinin tekrarı oldukları için) bilerek
// atladığından bu PDF'ler Claude'a düşüyor, 100+ öğrenci × 11 ders yanıt
// sınırını aşıp "tek seferde işlenemeyecek kadar büyük" hatası veriyordu.
//
// Bu biçimde ders başına 11 alt sütun var ve öğrencinin HİÇ çözmediği ders
// (ör. Felsefe (Seçmeli)) satırdan tamamen düşüyor. Sıraya göre okumak bu
// yüzden dersleri kaydırır (toplam kontrolü eksiğin YERİNİ ayırt edemez);
// her sayı bu yüzden başlıktaki D/Y/N harfinin yatay konumuna göre sütununa
// yerleştiriliyor — gerçek PDF'te değer merkezi ile başlık harfi merkezi
// birebir aynı (bkz. deneme-sinif-listesi.test.ts).

export interface GenisMetin {
  str: string;
  x: number;
  y: number;
  w: number;
}

export interface SinifListesiDersi {
  ders: string;
  dogru: number;
  yanlis: number;
  net: number;
}

export interface SinifListesiOgrencisi {
  isimHam: string;
  ogrenciNo: number;
  sinif: string;
  dersSonuclari: SinifListesiDersi[];
  toplam: { dogru: number; yanlis: number; net: number };
}

export interface SinifListesiSonucu {
  basarili: boolean;
  ogrenciler: SinifListesiOgrencisi[];
  okunamayanSatir: number;
  hata?: string;
}

const SINIF_BASLIK_DESENI = /\S+\s+SINIFI\s+.*NET\s+L[İI]STES[İI]/i;
const SUTUN_BASLIK_DESENI = /^S[ıi]ra\s+Ö\.?\s*No\s+[İI]sim\s+S[ıi]n[ıi]f\s+(.*)$/i;
const SINIF_DESENI = /^(?:\d{1,2}|Mezun)-[A-ZÇĞİÖŞÜX]{1,4}$/;
const TAMSAYI = /^\d+$/;
const ONDALIK = /^-?\d+(?:,\d+)?$/;
// Sütun merkezi ile değer merkezi arasındaki izin verilen fark (pt).
// Gerçek PDF'te fark 0,1'in altında; komşu sütunlar ~16 pt uzakta.
const SUTUN_TOLERANSI = 6;

// Tanınan sütun adları. Başlık satırında adlar boşlukla ayrılmış ama kendi
// içlerinde de boşluk barındırabiliyor ("Din Kül. ve Ahl. Bil."), bu yüzden
// en uzun adı önce deneyerek soldan sağa okunuyor. Listede olmayan bir ad
// görülürse sayfa tanınmıyor sayılır ve eski yola (Claude) düşülür.
const SUTUN_ADLARI = [
  "Din Kül. ve Ahl. Bil.", "Felsefe (Seçmeli)", "Coğrafya-1", "Matematik-1", "Tarih-1",
  "Türkçe", "Felsefe", "Geometri", "Fizik", "Kimya", "Biyoloji", "Toplam",
].sort((a, b) => b.length - a.length);

export function sutunAdlariniCoz(metin: string): string[] | null {
  const adlar: string[] = [];
  let kalan = metin.replace(/\s+/g, " ").trim();
  while (kalan) {
    const ad = SUTUN_ADLARI.find((a) => kalan.startsWith(a) && (kalan.length === a.length || kalan[a.length] === " "));
    if (!ad) return null;
    adlar.push(ad);
    kalan = kalan.slice(ad.length).trim();
    if (ad === "Toplam") break;
  }
  return adlar.length >= 2 && adlar.at(-1) === "Toplam" ? adlar : null;
}

function satirlaraGrupla(ogeler: GenisMetin[]): GenisMetin[][] {
  const gruplar: { y: number; ogeler: GenisMetin[] }[] = [];
  for (const oge of ogeler) {
    if (!oge.str.trim()) continue;
    let grup = gruplar.find((g) => Math.abs(g.y - oge.y) <= 1.5);
    if (!grup) { grup = { y: oge.y, ogeler: [] }; gruplar.push(grup); }
    grup.ogeler.push(oge);
  }
  gruplar.sort((a, b) => b.y - a.y);
  for (const g of gruplar) g.ogeler.sort((a, b) => a.x - b.x);
  return gruplar.map((g) => g.ogeler);
}

const metniOf = (satir: GenisMetin[]) => satir.map((o) => o.str).join(" ").replace(/\s+/g, " ").trim();
const merkez = (o: GenisMetin) => o.x + o.w / 2;
const sayi = (s: string) => Number(s.replace(",", "."));

interface SayfaDuzeni {
  sutunlar: { ders: string; merkezler: [number, number, number] }[];
  genelMerkez: number | null;
}

function sayfaDuzeniniBul(satirlar: GenisMetin[][]): SayfaDuzeni | string {
  let adlar: string[] | null = null;
  for (const satir of satirlar) {
    const m = SUTUN_BASLIK_DESENI.exec(metniOf(satir));
    if (m) { adlar = sutunAdlariniCoz(m[1]); break; }
  }
  if (!adlar) return "Sütun adları tanınmadı.";

  const dyn = satirlar.find((s) => /^(?:D Y N ){2,}/.test(metniOf(s) + " "));
  if (!dyn) return "D/Y/N başlık satırı bulunamadı.";
  const harfler = dyn.filter((o) => ["D", "Y", "N"].includes(o.str.trim()));
  if (harfler.length % 3 !== 0) return "D/Y/N başlık satırı eksik.";
  const sutunlar: SayfaDuzeni["sutunlar"] = [];
  for (let i = 0; i < harfler.length; i += 3) {
    const [d, y, n] = harfler.slice(i, i + 3);
    if (d.str.trim() !== "D" || y.str.trim() !== "Y" || n.str.trim() !== "N") return "D/Y/N sırası bozuk.";
    sutunlar.push({ ders: "", merkezler: [merkez(d), merkez(y), merkez(n)] });
  }
  if (sutunlar.length !== adlar.length) return `Sütun sayısı (${sutunlar.length}) ile ders adı sayısı (${adlar.length}) tutmuyor.`;
  sutunlar.forEach((s, i) => { s.ders = adlar![i]; });
  const genel = dyn.find((o) => /^Genel$/i.test(o.str.trim()));
  return { sutunlar, genelMerkez: genel ? merkez(genel) : null };
}

const SINIF_SAYI_YAPISIK = /^((?:\d{1,2}|Mezun)-[A-ZÇĞİÖŞÜ]{1,4})(\d+(?:,\d+)?)$/;

// PDF bazen birden çok hücreyi tek metin parçası olarak veriyor (gerçek
// veride: uzun adlarda "EYLÜL AZRA BAHCİVAN 12-B", "12-XX" sınıfında sınıf
// ile ilk sayı yapışık "12-XX32"). Parçalar kelimelere bölünür, her kelimeye
// parçadaki karakter konumuyla orantılı bir x verilir — sayıların sütuna
// oturması için yeterince isabetli (yapışık "32"nin tahmini merkezi gerçek
// sütun merkezinden 0,1 pt sapıyor).
function ogeleriParcala(satir: GenisMetin[]): GenisMetin[] {
  const sonuc: GenisMetin[] = [];
  for (const oge of satir) {
    const metin = oge.str;
    const harfGenisligi = metin.length > 0 ? oge.w / metin.length : 0;
    const kelimeler = [...metin.matchAll(/\S+/g)];
    for (const k of kelimeler) {
      const x = oge.x + (k.index ?? 0) * harfGenisligi;
      const yapisik = SINIF_SAYI_YAPISIK.exec(k[0]);
      if (yapisik) {
        const sinifW = yapisik[1].length * harfGenisligi;
        sonuc.push({ str: yapisik[1], x, y: oge.y, w: sinifW });
        sonuc.push({ str: yapisik[2], x: x + sinifW, y: oge.y, w: yapisik[2].length * harfGenisligi });
      } else {
        sonuc.push({ str: k[0], x, y: oge.y, w: k[0].length * harfGenisligi });
      }
    }
  }
  return sonuc;
}

// Tek öğrenci satırı: "Sıra Ö.No Ad Soyad Sınıf" + sütunlara yerleşen sayılar.
function ogrenciSatiriniCoz(hamSatir: GenisMetin[], duzen: SayfaDuzeni): SinifListesiOgrencisi | null {
  const satir = ogeleriParcala(hamSatir);
  if (satir.length < 5 || !TAMSAYI.test(satir[0].str.trim()) || !TAMSAYI.test(satir[1].str.trim())) return null;
  const sinifIdx = satir.findIndex((o, i) => i >= 3 && SINIF_DESENI.test(o.str.trim()));
  if (sinifIdx === -1) return null;
  const isimHam = satir.slice(2, sinifIdx).map((o) => o.str.trim()).join(" ").replace(/\s+/g, " ").trim();
  if (!isimHam) return null;

  const hucreler = duzen.sutunlar.map(() => [null, null, null] as (string | null)[]);
  for (const oge of satir.slice(sinifIdx + 1)) {
    const deger = oge.str.trim();
    if (!ONDALIK.test(deger)) return null;
    const m = merkez(oge);
    if (duzen.genelMerkez !== null && Math.abs(m - duzen.genelMerkez) <= SUTUN_TOLERANSI * 2) continue; // genel sıra
    let bulundu = false;
    for (let s = 0; s < duzen.sutunlar.length && !bulundu; s++) {
      for (let k = 0; k < 3; k++) {
        if (Math.abs(m - duzen.sutunlar[s].merkezler[k]) <= SUTUN_TOLERANSI) {
          if (hucreler[s][k] !== null) return null; // aynı hücreye iki değer
          hucreler[s][k] = deger;
          bulundu = true;
          break;
        }
      }
    }
    if (!bulundu) return null; // hiçbir sütuna oturmayan sayı: güvenli tarafta kal
  }

  const dersler: SinifListesiDersi[] = [];
  for (let s = 0; s < duzen.sutunlar.length; s++) {
    const [d, y, n] = hucreler[s];
    if (d === null && y === null && n === null) {
      dersler.push({ ders: duzen.sutunlar[s].ders, dogru: 0, yanlis: 0, net: 0 }); // hiç çözülmemiş ders
      continue;
    }
    if (d === null || y === null || n === null || !TAMSAYI.test(d) || !TAMSAYI.test(y)) return null;
    dersler.push({ ders: duzen.sutunlar[s].ders, dogru: sayi(d), yanlis: sayi(y), net: sayi(n) });
  }

  const toplamSatiri = dersler.pop();
  if (!toplamSatiri || toplamSatiri.ders !== "Toplam") return null;
  const dogruToplam = dersler.reduce((t, d) => t + d.dogru, 0);
  const yanlisToplam = dersler.reduce((t, d) => t + d.yanlis, 0);
  if (dogruToplam !== toplamSatiri.dogru || yanlisToplam !== toplamSatiri.yanlis) return null;

  return {
    isimHam,
    ogrenciNo: Number(satir[1].str.trim()),
    sinif: satir[sinifIdx].str.trim(),
    dersSonuclari: dersler,
    toplam: { dogru: toplamSatiri.dogru, yanlis: toplamSatiri.yanlis, net: toplamSatiri.net },
  };
}

export function sinifListesiSayfalariniCoz(sayfalar: GenisMetin[][]): SinifListesiSonucu {
  const ogrenciler: SinifListesiOgrencisi[] = [];
  let okunamayanSatir = 0;
  let sinifSayfasi = 0;
  let sonHata: string | undefined;

  for (const ogeler of sayfalar) {
    const satirlar = satirlaraGrupla(ogeler);
    if (!satirlar.some((s) => SINIF_BASLIK_DESENI.test(metniOf(s)))) continue;
    sinifSayfasi++;
    const duzen = sayfaDuzeniniBul(satirlar);
    if (typeof duzen === "string") { sonHata = duzen; continue; }

    for (const satir of satirlar) {
      // Öğrenci satırı adayı: sıra ve öğrenci no ile başlayan satırlar
      // ("Genel Ortalama", "SINIF: 11-A" gibi satırlar bu koşula uymaz).
      if (satir.length < 5 || !TAMSAYI.test(satir[0].str.trim()) || !TAMSAYI.test(satir[1].str.trim())) continue;
      const ogrenci = ogrenciSatiriniCoz(satir, duzen);
      if (ogrenci) ogrenciler.push(ogrenci); else okunamayanSatir++;
    }
  }

  if (sinifSayfasi === 0) return { basarili: false, ogrenciler: [], okunamayanSatir: 0, hata: "Sınıf net listesi sayfası bulunamadı." };
  const gorulen = new Set<string>();
  const tekil = ogrenciler.filter((o) => {
    const anahtar = `${o.ogrenciNo}|${o.sinif}|${o.isimHam}`;
    if (gorulen.has(anahtar)) return false;
    gorulen.add(anahtar);
    return true;
  });
  if (tekil.length === 0) return { basarili: false, ogrenciler: [], okunamayanSatir, hata: sonHata ?? "Öğrenci satırı okunamadı." };
  return { basarili: true, ogrenciler: tekil, okunamayanSatir };
}

// Alt dersleri sistemin TYT derslerine indirger (Matematik-1 + Geometri →
// Matematik vb.). Eşleme karne okuyucusuyla aynı; Felsefe (Seçmeli) orada
// olduğu gibi bilinçli olarak hariç. Bilinmeyen bir ad görülürse null.
export function tytDerslerineIndirge(
  dersler: SinifListesiDersi[],
  eslestirme: Record<string, string>,
): { ders: string; dogru: number; yanlis: number }[] | null {
  const toplamlar = new Map<string, { dogru: number; yanlis: number }>();
  for (const d of dersler) {
    if (/\(Seçmeli\)$/.test(d.ders)) continue;
    const hedef = eslestirme[d.ders];
    if (!hedef) return null;
    const mevcut = toplamlar.get(hedef) ?? { dogru: 0, yanlis: 0 };
    mevcut.dogru += d.dogru;
    mevcut.yanlis += d.yanlis;
    toplamlar.set(hedef, mevcut);
  }
  // Hiç çözülmemiş dersler (0/0) de kayda girer; boş bırakılan ders "girilmedi"
  // değil "0 doğru 0 yanlış" demek.
  return toplamlar.size > 0 ? [...toplamlar.entries()].map(([ders, v]) => ({ ders, ...v })) : null;
}
