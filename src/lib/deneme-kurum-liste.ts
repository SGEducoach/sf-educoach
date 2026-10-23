// "ÖĞRENCİ LİSTESİ - KURUM|ŞUBE - 9-10.SINIF SIRALI" biçimli deneme sonuç
// listeleri (kullanıcı isteği 23.10.2026 — Elbistan Fen Lisesi "TG DENEME"
// çıktıları). SAF, test edilebilir çözümleyici; PDF'ten metin çıkarma
// deneme-pdf-ayristirici.ts'te.
//
// Bu biçim hiçbir mevcut okuyucuya uymuyordu (okul net listesi başlığı, sınıf
// net listesi başlığı ve "SIRA ... TOPLAM" başlığı yok): PDF Claude'a düşüyor,
// 100+ öğrenci yanıt sınırını aşıyordu. Satır yapısı:
//   Sıra | "No - AD SOYAD" | "9 / B" | 4 ders × (D Y N) | Toplam (D Y N) | Puan | sıralamalar
// 4 ders BİRLEŞİK: TÜRK DİLİ, SOSYAL BİLİMLER, MATEMATİK, FEN BİLİMLERİ
// (mevcut "TYT Türkçe/Sosyal/Matematik/Fen" birleşik adlarıyla aynı).
// Granüler (9 ders) sonuç ayrı dosyadaki karneden gelir (deneme-sonuc-belgesi.ts).
//
// Sütunlar SIRAYLA değil, başlıktaki D/Y/N harfinin yatay konumuna göre
// okunur (deneme-sinif-listesi.ts ile aynı ilke): değer merkezi ile başlık
// harfi merkezi birebir örtüşüyor, böylece bir derse hiç girmeyen öğrencide
// sütunlar kaymıyor. Her satır, derslerin toplamının "Toplam" sütunuyla ve
// net = D − Y/4 formülüyle tutmasıyla doğrulanır; tutmayan satır SESSİZCE
// atılmaz, "okunamayan" olarak döner.

import type { GenisMetin } from "@/lib/deneme-sinif-listesi";

export type ListeKapsami = "kurum" | "sube";

export const BIRLESIK_DERS_ADLARI = ["TYT Türkçe", "TYT Sosyal", "TYT Matematik", "TYT Fen"] as const;

const BASLIK_KARSILIGI: { desen: RegExp; ders: (typeof BIRLESIK_DERS_ADLARI)[number] }[] = [
  { desen: /^T[ÜU]RK\s*D[İI]L[İI]$/i, ders: "TYT Türkçe" },
  { desen: /^SOSYAL\s*B[İI]L[İI]MLER$/i, ders: "TYT Sosyal" },
  { desen: /^MATEMAT[İI]K$/i, ders: "TYT Matematik" },
  { desen: /^FEN\s*B[İI]L[İI]MLER[İI]$/i, ders: "TYT Fen" },
];

const LISTE_BASLIGI = /ÖĞRENC[İI]\s+L[İI]STES[İI]\s*-\s*(KURUM|ŞUBE|SUBE)\s*-.*SIRALI/i;
const AD_HUCRESI = /^(?:(\d{1,4})\s+)?(\d{1,6})\s*-\s*(\S.*)$/;
const SINIF_HUCRESI = /^(\d{1,2}|Mezun)\s*\/\s*([A-ZÇĞİÖŞÜ0-9]{1,4})$/;
const SAYI = /^-?\d+(?:[.,]\d+)?$/;

/** Başlık harfi ile değer merkezi arasında kabul edilen en büyük yatay fark. */
const SUTUN_TOLERANSI = 12;
const NET_TOLERANSI = 0.011;

export interface KurumListesiDersi { ders: string; dogru: number; yanlis: number; net: number }

export interface KurumListesiOgrencisi {
  sira: number;
  ogrenciNo: number;
  isimHam: string;
  /** "9-B" biçiminde; PDF'te "9 / B". Sınıf/şube boşsa ("0 / 0") "". */
  sinif: string;
  dersSonuclari: KurumListesiDersi[];
  toplam: { dogru: number; yanlis: number; net: number };
  puan: number;
}

export interface KurumListesiSonucu {
  basarili: boolean;
  hata?: string;
  kapsam: ListeKapsami | null;
  sinavAdi: string | null;
  /** Başlıktaki sınav katılımcı sayısı (genel); yoksa null. */
  genelKatilim: number | null;
  ogrenciler: KurumListesiOgrencisi[];
  okunamayanSatirlar: { sira: number; isimHam: string; neden: string }[];
}

interface Satir { y: number; ogeler: GenisMetin[] }

function satirlaraGrupla(ogeler: GenisMetin[], tolerans = 2): Satir[] {
  const satirlar: Satir[] = [];
  for (const o of ogeler) {
    if (!o.str.trim()) continue;
    const s = satirlar.find((r) => Math.abs(r.y - o.y) <= tolerans);
    if (s) s.ogeler.push(o);
    else satirlar.push({ y: o.y, ogeler: [o] });
  }
  for (const s of satirlar) s.ogeler.sort((a, b) => a.x - b.x);
  return satirlar.sort((a, b) => b.y - a.y);
}

const merkez = (o: GenisMetin) => o.x + o.w / 2;
const sayiOku = (t: string): number | null => (SAYI.test(t.trim()) ? Number(t.trim().replace(",", ".")) : null);
const yuvarla2 = (n: number) => Math.round(n * 100) / 100;

interface SutunHaritasi {
  /** 4 ders × [D, Y, N] merkezleri + ders adları. */
  dersler: { ders: string; d: number; y: number; n: number }[];
  toplam: { d: number; y: number; n: number };
  puanMerkezi: number | null;
}

// Başlık: ders adları satırı (TÜRK DİLİ … Toplam) + hemen altındaki D/Y/N satırı.
function sutunlariBul(satirlar: Satir[]): SutunHaritasi | null {
  for (let i = 0; i < satirlar.length; i++) {
    const adlar = satirlar[i].ogeler;
    const eslesen = BASLIK_KARSILIGI.map((b) => ({ b, oge: adlar.find((o) => b.desen.test(o.str.trim())) }));
    if (eslesen.some((e) => !e.oge)) continue;
    // D/Y/N satırı: aşağıdaki ilk satırlardan "D","Y","N" harfleri en az 15 kez geçen.
    for (let j = i + 1; j < Math.min(satirlar.length, i + 4); j++) {
      const harfler = satirlar[j].ogeler.filter((o) => /^[DYN]$/.test(o.str.trim()));
      if (harfler.length < 15) continue;
      const sirali = harfler.slice(0, 15);
      const grup = (k: number) => ({
        d: merkez(sirali[k * 3]), y: merkez(sirali[k * 3 + 1]), n: merkez(sirali[k * 3 + 2]),
      });
      const puan = satirlar[j].ogeler.find((o) => /^Puan$/i.test(o.str.trim()));
      return {
        dersler: eslesen.map((e, k) => ({ ders: e.b.ders, ...grup(k) })),
        toplam: grup(4),
        puanMerkezi: puan ? merkez(puan) : null,
      };
    }
  }
  return null;
}

function enYakin(sayilar: { m: number; v: number }[], hedef: number): { m: number; v: number } | null {
  let en: { m: number; v: number } | null = null;
  for (const s of sayilar) {
    const fark = Math.abs(s.m - hedef);
    if (fark <= SUTUN_TOLERANSI && (en === null || fark < Math.abs(en.m - hedef))) en = s;
  }
  return en;
}

/** Sayfalar: her sayfa bir GenisMetin dizisi. Birden çok şube/sayfa sırayla okunur. */
export function kurumListesiniCoz(sayfalar: GenisMetin[][]): KurumListesiSonucu {
  const bos = (hata: string, kapsam: ListeKapsami | null = null): KurumListesiSonucu => ({
    basarili: false, hata, kapsam, sinavAdi: null, genelKatilim: null, ogrenciler: [], okunamayanSatirlar: [],
  });

  let kapsam: ListeKapsami | null = null;
  let sinavAdi: string | null = null;
  let genelKatilim: number | null = null;
  let sutunlar: SutunHaritasi | null = null;
  const ogrenciler: KurumListesiOgrencisi[] = [];
  const okunamayan: KurumListesiSonucu["okunamayanSatirlar"] = [];
  const gorulen = new Set<string>();

  for (const oge of sayfalar) {
    const satirlar = satirlaraGrupla(oge);

    for (const s of satirlar) {
      const metin = s.ogeler.map((o) => o.str).join(" ");
      const b = LISTE_BASLIGI.exec(metin.replace(/\s+/g, " "));
      if (b) { kapsam ??= /KURUM/i.test(b[1]) ? "kurum" : "sube"; break; }
    }

    // Sınav adı: "İL İLÇE KURUM SINAV ADI" başlığının hemen altındaki satırda
    // sınav adı sütununda (x>500) duran, rakam olmayan metin.
    if (sinavAdi === null) {
      const basIdx = satirlar.findIndex((s) => s.ogeler.some((o) => /^S[İI]NAV\s+ADI$/i.test(o.str.trim())));
      if (basIdx >= 0) {
        // Başlığın altındaki 3 satır: "GENEL İL İLÇE KURUM" alt başlığı, sonra
        // sınav adı + katılım sayıları satırı.
        for (const alt of satirlar.slice(basIdx + 1, basIdx + 4)) {
          const ad = alt.ogeler.find((o) => o.x > 480 && o.x < 700 && /\d/.test(o.str) && /\D/.test(o.str) && !SAYI.test(o.str.trim()));
          if (!ad) continue;
          sinavAdi = ad.str.trim();
          const katilim = alt.ogeler.filter((o) => o.x >= 700 && /^\d+$/.test(o.str.trim())).map((o) => Number(o.str.trim()));
          if (katilim.length > 0) genelKatilim = katilim[0];
          break;
        }
      }
    }

    const bulunan = sutunlariBul(satirlar);
    if (bulunan) sutunlar = bulunan;
    if (!sutunlar) continue;
    const sut = sutunlar;

    for (const s of satirlar) {
      const adOgesi = s.ogeler.find((o) => o.x >= 10 && o.x < 118 && AD_HUCRESI.test(o.str.trim()));
      const sinifOgesi = s.ogeler.find((o) => o.x >= 100 && o.x < 150 && SINIF_HUCRESI.test(o.str.trim()));
      if (!adOgesi || !sinifOgesi) continue; // ortalama / sıralama / başlık satırları

      const ad = AD_HUCRESI.exec(adOgesi.str.trim())!;
      const ayrikSira = s.ogeler.find((o) => o.x < 24 && /^\d{1,4}$/.test(o.str.trim()));
      const sira = ad[1] !== undefined ? Number(ad[1]) : ayrikSira ? Number(ayrikSira.str.trim()) : 0;
      const ogrenciNo = Number(ad[2]);
      const isimHam = ad[3].replace(/\s+/g, " ").trim();
      const sm = SINIF_HUCRESI.exec(sinifOgesi.str.trim())!;
      // "0 / 0" ya da "10 / 0": sınıf/şube PDF'te boş — bilinmiyor sayılır.
      const sinif = sm[1] === "0" || sm[2] === "0" ? "" : `${sm[1]}-${sm[2]}`;

      // Sıralama sütunları (x>705) ve ad/sınıf hücreleri dışındaki sayılar.
      const sayilar = s.ogeler
        .filter((o) => o.x >= 140 && o.x < 705)
        .map((o) => ({ m: merkez(o), v: sayiOku(o.str) }))
        .filter((o): o is { m: number; v: number } => o.v !== null);

      const hata = (neden: string) => okunamayan.push({ sira, isimHam, neden });
      const dersSonuclari: KurumListesiDersi[] = [];
      let bozuk: string | null = null;
      for (const d of sut.dersler) {
        const D = enYakin(sayilar, d.d), Y = enYakin(sayilar, d.y), N = enYakin(sayilar, d.n);
        if (!D || !Y || !N) { bozuk = `${d.ders} sütunu eksik`; break; }
        if (!Number.isInteger(D.v) || !Number.isInteger(Y.v)) { bozuk = `${d.ders} D/Y tamsayı değil`; break; }
        if (Math.abs(yuvarla2(D.v - Y.v / 4) - N.v) > NET_TOLERANSI) { bozuk = `${d.ders} net D−Y/4 ile tutmuyor`; break; }
        dersSonuclari.push({ ders: d.ders, dogru: D.v, yanlis: Y.v, net: N.v });
      }
      if (bozuk) { hata(bozuk); continue; }

      const TD = enYakin(sayilar, sut.toplam.d), TY = enYakin(sayilar, sut.toplam.y), TN = enYakin(sayilar, sut.toplam.n);
      if (!TD || !TY || !TN) { hata("Toplam sütunu eksik"); continue; }
      const sumD = dersSonuclari.reduce((t, d) => t + d.dogru, 0);
      const sumY = dersSonuclari.reduce((t, d) => t + d.yanlis, 0);
      if (sumD !== TD.v || sumY !== TY.v) { hata(`ders toplamları (${sumD}/${sumY}) Toplam sütunuyla (${TD.v}/${TY.v}) tutmuyor`); continue; }
      if (Math.abs(yuvarla2(TD.v - TY.v / 4) - TN.v) > NET_TOLERANSI) { hata("Toplam net D−Y/4 ile tutmuyor"); continue; }

      const puanAdayi = sut.puanMerkezi === null
        ? null
        : s.ogeler.filter((o) => Math.abs(merkez(o) - sut.puanMerkezi!) <= 22 && sayiOku(o.str) !== null).map((o) => sayiOku(o.str)!)[0];
      if (puanAdayi === undefined || puanAdayi === null) { hata("Puan okunamadı"); continue; }

      // Aynı öğrenci başka sayfada/şubede tekrar görünürse (şube + kurum
      // listesi aynı dosyada) bir kez alınır.
      const anahtar = `${ogrenciNo}|${isimHam}|${sinif}`;
      if (gorulen.has(anahtar)) continue;
      gorulen.add(anahtar);

      ogrenciler.push({
        sira, ogrenciNo, isimHam, sinif, dersSonuclari,
        toplam: { dogru: TD.v, yanlis: TY.v, net: TN.v },
        puan: puanAdayi,
      });
    }
  }

  if (kapsam === null) return bos("\"ÖĞRENCİ LİSTESİ - KURUM|ŞUBE - … SIRALI\" başlığı bulunamadı — bilinmeyen format.");
  if (!sutunlar) return bos("Ders başlıkları (TÜRK DİLİ … FEN BİLİMLERİ) ve D/Y/N satırı bulunamadı.", kapsam);
  if (ogrenciler.length === 0) return bos("Başlık tanındı ama hiçbir öğrenci satırı okunamadı.", kapsam);
  return { basarili: true, kapsam, sinavAdi, genelKatilim, ogrenciler, okunamayanSatirlar: okunamayan };
}

/** Hızlı tanı: sayfalardan birinde "ÖĞRENCİ LİSTESİ - KURUM|ŞUBE - … SIRALI" başlığı var mı? */
export function kurumListesiBasligiVarMi(sayfalar: GenisMetin[][]): boolean {
  return sayfalar.some((oge) => LISTE_BASLIGI.test(satirlaraGrupla(oge).map((s) => s.ogeler.map((o) => o.str).join(" ")).join(" ").replace(/\s+/g, " ")));
}
