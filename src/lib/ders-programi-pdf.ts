import { enYakinSutun, parcalariBirlestir, satirMetni, satirlariOlustur } from "./pdf-metni";
import type { PdfOgesi } from "./pdf-metni";

// MEB öğretmen ders programı PDF'i (kullanıcının okulundan, bkz.
// dokumanlar/program_nobet): her öğretmen için bir blok —
//   "Sayı : | Sınıf Öğretmenliği : 9/C | Nöbet Günü ve Yeri : Pzt BİRİNCİ KAT"
//   "Adı Soyadı : ABDULLAH METİN | Eğitici Kolu(Kulüp) :"
//   "Ders\Gün (1) (2) … (10)" başlığı, altında gün satırları.
// Her hücrede sınıf (üst satır) ve ders (gün satırının kendisi) sütun sütun
// hizalı. Nöbet birden fazlaysa virgülle ayrılır ("Pzt … ,Prs …").
// Saf fonksiyon: sunucu PDF'i okuyup parçaları verir (lib/pdf-oge.ts).

export type ProgramGunu = "pazartesi" | "sali" | "carsamba" | "persembe" | "cuma" | "cumartesi" | "pazar";

// Sıra önemli: "cumartesi" "cuma"dan, "pazartesi" "pazar"dan önce denenir.
const GUN_DESENLERI: [RegExp, ProgramGunu][] = [
  [/^pazartesi/i, "pazartesi"],
  [/^cumartesi/i, "cumartesi"],
  [/^sal[ıi]/i, "sali"],
  [/^[çc]ar[şs]amba/i, "carsamba"],
  [/^per[şs]embe/i, "persembe"],
  [/^cuma/i, "cuma"],
  [/^pazar/i, "pazar"],
];

// Nöbet satırındaki kısaltmalar (Pzt, Sali, Çar, Prs, Cuma, Cmt, Paz).
const NOBET_GUN_DESENLERI: [RegExp, ProgramGunu][] = [
  [/^pzt|^pazartesi/i, "pazartesi"],
  [/^cmt|^cumartesi/i, "cumartesi"],
  [/^sal/i, "sali"],
  [/^[çc]ar/i, "carsamba"],
  [/^prs|^per/i, "persembe"],
  [/^cum/i, "cuma"],
  [/^paz/i, "pazar"],
];

export interface PdfNobeti { gun: ProgramGunu; yer: string }
export interface PdfProgramHucresi { gun: ProgramGunu; sira: number; sinif: string; ders: string }
export interface PdfOgretmenProgrami {
  ad: string;
  sinifOgretmenligi: string | null;
  nobetler: PdfNobeti[];
  hucreler: PdfProgramHucresi[];
}
export interface ProgramPdfSonucu {
  ogretmenler: PdfOgretmenProgrami[];
  uyarilar: string[];
}

function gunuCoz(metin: string, desenler: [RegExp, ProgramGunu][]): ProgramGunu | null {
  const temiz = metin.trim();
  for (const [desen, gun] of desenler) if (desen.test(temiz)) return gun;
  return null;
}

export function nobetleriCoz(metin: string): { nobetler: PdfNobeti[]; uyarilar: string[] } {
  const nobetler: PdfNobeti[] = [];
  const uyarilar: string[] = [];
  for (const parca of metin.split(",").map((p) => p.trim()).filter(Boolean)) {
    const bosluk = parca.indexOf(" ");
    const gunMetni = bosluk === -1 ? parca : parca.slice(0, bosluk);
    const yer = bosluk === -1 ? "" : parca.slice(bosluk + 1).trim();
    const gun = gunuCoz(gunMetni, NOBET_GUN_DESENLERI);
    if (!gun) {
      uyarilar.push(`Nöbet günü okunamadı: "${parca}"`);
      continue;
    }
    if (nobetler.some((n) => n.gun === gun)) continue;
    nobetler.push({ gun, yer: yer || "Belirtilmedi" });
  }
  return { nobetler, uyarilar };
}

const SINIF_DESENI = /^\d{1,2}\/[A-ZÇĞİÖŞÜ]$/;

export function programPdfiniCoz(ogeler: PdfOgesi[]): ProgramPdfSonucu {
  const satirlar = satirlariOlustur(ogeler);
  const uyarilar: string[] = [];
  const ogretmenler: PdfOgretmenProgrami[] = [];

  const satirMetinleri = satirlar.map((s) => satirMetni(s));
  const blokBaslangiclari = satirMetinleri
    .map((metin, i) => ({ metin, i }))
    .filter(({ metin }) => metin.includes("Adı Soyadı"));

  for (const [sira, blok] of blokBaslangiclari.entries()) {
    const blokSonu = sira + 1 < blokBaslangiclari.length ? blokBaslangiclari[sira + 1].i : satirlar.length;
    const ad = /Adı Soyadı\s*:?\s*(.+?)(?:\s+Eğitici|$)/.exec(blok.metin)?.[1]?.trim() ?? "";
    if (!ad || ad.length < 3) {
      uyarilar.push(`Sayfa ${satirlar[blok.i].sayfa}: öğretmen adı okunamadı.`);
      continue;
    }

    // Nöbet ve sınıf öğretmenliği bloğun ilk satırlarında (genelde hemen üstte).
    let nobetler: PdfNobeti[] = [];
    let sinifOgretmenligi: string | null = null;
    for (let i = Math.max(0, blok.i - 3); i <= blok.i; i++) {
      const metin = satirMetinleri[i];
      const nobetMetni = /Nöbet Günü ve Yeri\s*:?\s*(.*)$/.exec(metin)?.[1]?.trim();
      if (nobetMetni) {
        const cozum = nobetleriCoz(nobetMetni);
        nobetler = cozum.nobetler;
        for (const u of cozum.uyarilar) uyarilar.push(`${ad}: ${u}`);
      }
      const sinif = /Sınıf Öğretmenliği\s*:?\s*(\d{1,2}\s*\/\s*[A-ZÇĞİÖŞÜ])/.exec(metin)?.[1];
      if (sinif) sinifOgretmenligi = sinif.replace(/\s+/g, "");
    }

    // Sütun merkezleri: "(1)" … "(8)" başlık satırı.
    let sutunMerkezleri: number[] = [];
    let baslikIndeksi = -1;
    for (let i = blok.i; i < blokSonu; i++) {
      const numaralar = parcalariBirlestir(satirlar[i].ogeler)
        .map((o) => ({ sira: Number(/^\((\d{1,2})\)$/.exec(o.metin)?.[1] ?? NaN), x: o.x }))
        .filter((o) => Number.isInteger(o.sira) && o.sira >= 1 && o.sira <= 8);
      if (numaralar.length >= 4) {
        sutunMerkezleri = [];
        for (const n of numaralar.sort((a, b) => a.sira - b.sira)) sutunMerkezleri[n.sira - 1] = n.x;
        baslikIndeksi = i;
        break;
      }
    }
    if (baslikIndeksi === -1) {
      uyarilar.push(`${ad}: ders saati başlığı bulunamadı, programı atlandı.`);
      ogretmenler.push({ ad, sinifOgretmenligi, nobetler, hucreler: [] });
      continue;
    }

    const hucreler: PdfProgramHucresi[] = [];
    for (let i = baslikIndeksi + 1; i < blokSonu; i++) {
      const satir = satirlar[i];
      const parcalar = parcalariBirlestir(satir.ogeler);
      const ilk = parcalar[0];
      if (!ilk) continue;
      const gun = gunuCoz(ilk.metin, GUN_DESENLERI);
      if (!gun) continue;

      // Sınıf satırı gün satırının hemen üstünde (aynı sayfada, ~10 punto).
      const ustSatir = satirlar[i - 1];
      const sinifParcalari = ustSatir && ustSatir.sayfa === satir.sayfa && ustSatir.y - satir.y > 4 && ustSatir.y - satir.y < 18
        ? parcalariBirlestir(ustSatir.ogeler)
        : [];
      const sinifSutunlari = new Map<number, string>();
      for (const parca of sinifParcalari) {
        if (!SINIF_DESENI.test(parca.metin)) continue;
        const sutun = enYakinSutun(parca.x, sutunMerkezleri);
        if (sutun >= 0) sinifSutunlari.set(sutun, parca.metin);
      }

      for (const parca of parcalar.slice(1)) {
        const sutun = enYakinSutun(parca.x, sutunMerkezleri);
        if (sutun < 0) continue;
        const sinif = sinifSutunlari.get(sutun);
        if (!sinif) {
          uyarilar.push(`${ad}: ${gun} ${sutun + 1}. ders saatinde sınıf okunamadı ("${parca.metin}").`);
          continue;
        }
        hucreler.push({ gun, sira: sutun + 1, sinif, ders: parca.metin });
      }
    }

    ogretmenler.push({ ad, sinifOgretmenligi, nobetler, hucreler });
  }

  if (ogretmenler.length === 0) uyarilar.push("PDF'te öğretmen programı bulunamadı.");
  return { ogretmenler, uyarilar };
}
