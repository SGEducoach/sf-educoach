// LGS okul net listesi PDF'inin yapay zekâsız okuyucusu (kullanıcı kararı
// 16.10.2026: kolej denemeleri yalnız deterministik okunur; örnek PDF'ler
// 19.10.2026'da geldi). Saf modül — PDF parçaları src/lib/pdf-oge.ts ile
// çıkarılır.
//
// Biçim (dört farklı yayın/kurumun örneğinde aynı): sayfa başlığı
// "OKUL NET LİSTESİ (LGS sıralı)"; ders kodları satırı "Sözel (TÜR) …
// Sayısal (FEN)"; "D Y N" etiket satırı (6 ders + Toplam), ardından "Puanı"
// ve dereceler. Öğrenci satırı: sıra, okul no, ad, sınıf, her ders için
// D/Y/N, toplam D/Y/N, LGS puanı, dereceler. Genel derece ve yüzde ayrı
// satırlarda (atlanır). Sınıf listesi sayfaları ("8-A SINIFI NET
// LİSTESİ") ve kişisel sonuç belgeleri okunmaz; aynı öğrenciler tekrar
// eder.
//
// Sütunlar konuma göre okunur: bazı sayılar tek parça gelir ("18,67 10"),
// her sözcüğün yeri parçanın genişliğinden orantıyla bulunur. Bir dersi
// hiç cevaplamayan öğrencide o dersin üç hücresi boştur (ders atlanır).
// Her ders N = D − Y/3 ile, toplam D/Y ders toplamıyla doğrulanır;
// tutmayan satır "okunamadı" sayılır, tahmin edilmez.
import type { PdfOgesi } from "@/lib/pdf-metni";
import { parcalariBirlestir, satirlariOlustur } from "@/lib/pdf-metni";

// PDF'teki ders kodundan sistemdeki LGS ders adına (src/lib/types.ts LGS_DERSLERI).
export const LGS_DERS_KODLARI: Record<string, string> = {
  "TÜR": "Türkçe",
  "TAR": "T.C. İnkılap Tarihi ve Atatürkçülük",
  "DİN": "Din Kültürü ve Ahlak Bilgisi",
  "İNG": "İngilizce",
  "MAT": "Matematik",
  "FEN": "Fen Bilimleri",
};
const VARSAYILAN_KOD_SIRASI = ["TÜR", "TAR", "DİN", "İNG", "MAT", "FEN"];

export interface LgsDersSonucu { ders: string; dogru: number; yanlis: number; net: number }

export interface LgsOgrenciSatiri {
  sira: number;
  ogrenciNo: number; // PDF'te 0 ise numara yok
  isimHam: string;
  sinif: string;
  dersSonuclari: LgsDersSonucu[];
  toplam: { dogru: number; yanlis: number; net: number };
  puan: number | null;
}

export interface LgsOkulListesiSonucu {
  basarili: boolean;
  hata?: string;
  sinavAdi: string | null;
  ogrenciler: LgsOgrenciSatiri[];
  okunamayanSatirlar: { isimHam: string; sira: number | null; neden: string }[];
}

interface Kelime { metin: string; x: number }

// Parçayı sözcüklerine ayırır; her sözcüğün merkezi, parçanın genişliğinden
// karakter oranıyla bulunur.
function kelimeler(o: PdfOgesi): Kelime[] {
  const n = o.metin.length;
  if (!n) return [];
  const birim = o.genislik / n;
  const sonuc: Kelime[] = [];
  for (const m of o.metin.matchAll(/\S+/g)) {
    sonuc.push({ metin: m[0], x: o.x + (m.index! + m[0].length / 2) * birim });
  }
  return sonuc;
}

const sayi = (s: string): number | null => {
  const t = s.replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};
const tamSayi = (s: string): number | null => (/^\d+$/.test(s) ? Number(s) : null);
const SINIF = /^(\d{1,2})-([A-ZÇĞİÖŞÜ0-9]{1,4})$/;
const SINIF_SONDA = /(\d{1,2}-[A-ZÇĞİÖŞÜ0-9]{1,4})$/;

interface Sutunlar {
  dyn: number[]; // 21 merkez: 6 ders × D,Y,N + Toplam D,Y,N
  puan: number | null;
  kimlikSonu: number; // bunun solu sıra/no/ad/sınıf
  kodlar: string[];
}

function sayfaSutunlari(satirlar: ReturnType<typeof satirlariOlustur>): Sutunlar | null {
  let dyn: number[] | null = null;
  let puan: number | null = null;
  for (const s of satirlar) {
    const k = s.ogeler.flatMap(kelimeler);
    const etiketler = k.filter((w) => w.metin === "D" || w.metin === "Y" || w.metin === "N");
    if (etiketler.length >= 21) {
      const ilk21 = etiketler.slice(0, 21);
      const sira = ilk21.map((w) => w.metin).join("");
      if (sira !== "DYN".repeat(7)) continue;
      dyn = ilk21.map((w) => w.x);
      puan = k.find((w) => /^Puan/i.test(w.metin))?.x ?? null;
      break;
    }
  }
  if (!dyn) return null;
  const kodSatiri = satirlar.map((s) => s.ogeler.map((o) => o.metin).join(" ")).find((m) => /\((TÜR|TAR|DİN|İNG|MAT|FEN)\)/.test(m));
  const kodlar = kodSatiri ? [...kodSatiri.matchAll(/\((TÜR|TAR|DİN|İNG|MAT|FEN)\)/g)].map((m) => m[1]) : [];
  return { dyn, puan, kimlikSonu: dyn[0] - 8, kodlar: kodlar.length === 6 ? kodlar : VARSAYILAN_KOD_SIRASI };
}

function enYakin(x: number, merkezler: number[], tolerans: number): number {
  let en = -1;
  let fark = Infinity;
  merkezler.forEach((m, i) => {
    const f = Math.abs(m - x);
    if (f < fark) { fark = f; en = i; }
  });
  return fark <= tolerans ? en : -1;
}

const yakin = (a: number, b: number) => Math.abs(a - b) <= 0.011;

export function lgsOkulListesiCoz(ogeler: PdfOgesi[]): LgsOkulListesiSonucu {
  const bos = (hata: string): LgsOkulListesiSonucu => ({ basarili: false, hata, sinavAdi: null, ogrenciler: [], okunamayanSatirlar: [] });
  const tumSatirlar = satirlariOlustur(ogeler);
  const sayfalar = [...new Set(tumSatirlar.map((s) => s.sayfa))];
  const okulSayfalari = sayfalar.filter((no) => {
    const baslik = tumSatirlar.filter((s) => s.sayfa === no).slice(0, 3).map((s) => s.ogeler.map((o) => o.metin).join(" ")).join(" ");
    return /OKUL NET L[İI]STES[İI]/i.test(baslik) && /LGS/i.test(baslik) && !/SINIFI NET/i.test(baslik);
  });
  if (okulSayfalari.length === 0) return bos("\"OKUL NET LİSTESİ (LGS)\" sayfası bulunamadı.");

  let sinavAdi: string | null = null;
  const ogrenciler: LgsOgrenciSatiri[] = [];
  const okunamayan: LgsOkulListesiSonucu["okunamayanSatirlar"] = [];
  const gorulen = new Set<string>();

  for (const no of okulSayfalari) {
    const satirlar = tumSatirlar.filter((s) => s.sayfa === no);
    const sutun = sayfaSutunlari(satirlar);
    if (!sutun) return bos("Ders sütunları (D/Y/N etiket satırı) çözümlenemedi.");
    const aralik = Math.min(...sutun.dyn.slice(1).map((x, i) => x - sutun.dyn[i]));
    const tolerans = Math.max(4, aralik * 0.48);

    if (sinavAdi === null) sinavAdi = sinavAdiBul(satirlar);

    for (const s of satirlar) {
      // Sıra ve okul numarası birleştirilmeden okunur: uzun numaralar sıraya
      // bitişik gelebiliyor ("13" + "99513858"). Yalnız ad parçaları
      // birleştirilir (ayrı gelen İ/ğ/Ş harfleri için).
      // Kimlik sütunlarına düşen sözcükler; sınıfa bitişik gelen ilk ders
      // değeri ("8-D 19") parçadan ayıklanır.
      const kimlikHam = s.ogeler.filter((o) => o.x < sutun.kimlikSonu)
        .map((o) => ({ ...o, metin: kelimeler(o).filter((w) => w.x < sutun.kimlikSonu).map((w) => w.metin).join(" ") }))
        .filter((o) => o.metin);
      const hamKelime = kimlikHam.flatMap(kelimeler);
      const sira = hamKelime[0] ? tamSayi(hamKelime[0].metin) : null;
      const okulNo = hamKelime[1] ? tamSayi(hamKelime[1].metin) : null;
      // Öğrenci satırı: sıra + numara + en az bir ad sözcüğü.
      if (sira === null || okulNo === null || hamKelime.length < 3) continue;
      let atlanacak = 2;
      const adOgeleri: PdfOgesi[] = [];
      for (const o of kimlikHam) {
        const sozcukler = o.metin.trim().split(/\s+/).filter(Boolean);
        if (atlanacak >= sozcukler.length) { atlanacak -= sozcukler.length; continue; }
        adOgeleri.push(atlanacak > 0 ? { ...o, metin: sozcukler.slice(atlanacak).join(" ") } : o);
        atlanacak = 0;
      }
      const adParcalari = parcalariBirlestir(adOgeleri).flatMap((o) => o.metin.trim().split(/\s+/)).filter(Boolean);
      let sinif = "";
      const son = adParcalari[adParcalari.length - 1];
      if (SINIF.test(son)) { sinif = son; adParcalari.pop(); }
      else {
        const m = SINIF_SONDA.exec(son);
        if (m) { sinif = m[1]; adParcalari[adParcalari.length - 1] = son.slice(0, -m[1].length); }
      }
      const isimHam = adParcalari.filter(Boolean).join(" ").trim();
      if (!isimHam || /ORTALAMA/i.test(isimHam)) continue;

      const hucre: (number | null)[] = Array(21).fill(null);
      let puan: number | null = null;
      let bozuk = false;
      for (const w of s.ogeler.flatMap(kelimeler).filter((k) => k.x >= sutun.kimlikSonu)) {
        const deger = sayi(w.metin);
        if (deger === null) continue;
        if (sutun.puan !== null && Math.abs(w.x - sutun.puan) <= tolerans && /[.,]\d{3}$/.test(w.metin)) { puan = deger; continue; }
        const i = enYakin(w.x, sutun.dyn, tolerans);
        if (i === -1) continue; // dereceler
        if (hucre[i] !== null) bozuk = true;
        hucre[i] = deger;
      }
      const anahtar = `${okulNo}|${isimHam}`;
      if (gorulen.has(anahtar)) continue;
      gorulen.add(anahtar);

      const dersSonuclari: LgsDersSonucu[] = [];
      let neden: string | null = bozuk ? "aynı hücreye iki değer düştü" : null;
      for (let d = 0; d < 6 && !neden; d++) {
        const [dg, yn, net] = hucre.slice(d * 3, d * 3 + 3);
        if (dg === null && yn === null && net === null) continue; // ders cevaplanmamış
        if (dg === null || yn === null || net === null) { neden = `${sutun.kodlar[d]} sütunları eksik`; break; }
        if (!yakin(net, Math.round((dg - yn / 3) * 100) / 100)) { neden = `${sutun.kodlar[d]} neti D−Y/3 ile tutmuyor`; break; }
        dersSonuclari.push({ ders: LGS_DERS_KODLARI[sutun.kodlar[d]], dogru: dg, yanlis: yn, net });
      }
      const [td, ty, tn] = hucre.slice(18, 21);
      if (!neden && (td === null || ty === null || tn === null)) neden = "toplam sütunları eksik";
      if (!neden && (dersSonuclari.reduce((t, x) => t + x.dogru, 0) !== td || dersSonuclari.reduce((t, x) => t + x.yanlis, 0) !== ty)) neden = "toplam doğru/yanlış dersler toplamıyla tutmuyor";
      if (!neden && dersSonuclari.length === 0) neden = "hiç ders sonucu yok";
      if (neden) { okunamayan.push({ isimHam, sira, neden }); continue; }
      ogrenciler.push({ sira, ogrenciNo: okulNo, isimHam, sinif, dersSonuclari, toplam: { dogru: td!, yanlis: ty!, net: tn! }, puan });
    }
  }
  if (ogrenciler.length === 0 && okunamayan.length === 0) return bos("Öğrenci satırı bulunamadı.");
  return { basarili: true, sinavAdi, ogrenciler, okunamayanSatirlar: okunamayan };
}

// "İL İLÇE OKUL SINAV ADI OKUL İLÇE İL GENEL" başlığının altındaki satırda
// SINAV ADI sütununa düşen sözcükler.
function sinavAdiBul(satirlar: ReturnType<typeof satirlariOlustur>): string | null {
  const i = satirlar.findIndex((s) => s.ogeler.some((o) => /SINAV ADI/.test(o.metin)));
  if (i < 0 || !satirlar[i + 1]) return null;
  // Başlık parçalarının başlangıç konumları (sözcük merkezi değil).
  const baslik = satirlar[i].ogeler;
  const sinavX = baslik.find((o) => /SINAV/.test(o.metin))?.x;
  const katilimOkulX = baslik.filter((o) => o.metin.trim() === "OKUL").map((o) => o.x).find((x) => sinavX !== undefined && x > sinavX);
  const okulX = baslik.filter((o) => o.metin.trim() === "OKUL").map((o) => o.x).find((x) => sinavX !== undefined && x < sinavX);
  if (sinavX === undefined || katilimOkulX === undefined || okulX === undefined) return null;
  // Sınav adı parçası okul ve sınav adı başlıklarının ortasından sonra,
  // katılım sütunundan önce başlar.
  const bas = (okulX + sinavX) / 2;
  const veri = satirlar[i + 1].ogeler;
  let ad = veri.filter((o) => o.x > bas && o.x < katilimOkulX - 2).map((o) => o.metin).join(" ").replace(/\s+/g, " ").trim();
  // Sınav adına bitişik gelen katılım sayısı (sağdaki katılım sütunlarındaki
  // sayılardan biriyse) atılır; "… TG 1" gibi adın parçası olan sayı kalır.
  const katilimlar = new Set(veri.filter((o) => o.x >= katilimOkulX - 2).flatMap((o) => o.metin.trim().split(/\s+/)));
  const son = /\s+(\d+)$/.exec(ad);
  if (son && katilimlar.has(son[1])) ad = ad.slice(0, -son[0].length);
  return ad || null;
}
