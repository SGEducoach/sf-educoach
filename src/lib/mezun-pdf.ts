// Mezun listesi PDF'i (kullanıcı isteği 30.10.2026): rehber öğretmen eski
// mezunları bir tabloya yazıp PDF olarak yükler. Tablo başlık satırındaki
// sütun adlarından (Ad, Soyad, İl, İlçe, E-posta, Telefon, Üniversite,
// Meslek, Mezuniyet Yılı — "Ad Soyad" tek sütun da olur) sütun konumları
// bulunur; her satırdaki metin en yakın sütuna yerleştirilir. Saf modül:
// PDF'ten metin çıkarma pdf-oge.ts'te.

import { parcalariBirlestir, satirlariOlustur, type PdfOgesi } from "@/lib/pdf-metni";
import { adSoyadAyir, type MezunHamBilgisi } from "@/lib/mezun";

type Alan = "ad" | "soyad" | "adSoyad" | "il" | "ilce" | "eposta" | "telefon" | "universite" | "meslek" | "mezuniyetYili" | "yoksay";

function sade(s: string): string {
  return s.normalize("NFC").toLocaleLowerCase("tr-TR").replace(/[\s.\-_:/()]+/g, "");
}

// Başlık hücresinin sade hâli → alan.
const BASLIKLAR: Record<string, Alan> = {
  ad: "ad", adi: "ad", adı: "ad", isim: "ad",
  soyad: "soyad", soyadi: "soyad", soyadı: "soyad",
  adsoyad: "adSoyad", adısoyadı: "adSoyad", adisoyadi: "adSoyad", adsoyadı: "adSoyad", isimsoyisim: "adSoyad",
  il: "il", şehir: "il", sehir: "il", yaşadığıil: "il", yasadigiil: "il",
  ilçe: "ilce", ilce: "ilce", yaşadığıilçe: "ilce",
  eposta: "eposta", email: "eposta", mail: "eposta", epostaadresi: "eposta",
  telefon: "telefon", tel: "telefon", telefonno: "telefon", telefonnumarası: "telefon", cep: "telefon", ceptelefonu: "telefon", gsm: "telefon",
  üniversite: "universite", universite: "universite", okuduğuüniversite: "universite", üniversitebölüm: "universite",
  meslek: "meslek", mesleği: "meslek", meslegi: "meslek",
  mezuniyetyılı: "mezuniyetYili", mezuniyetyili: "mezuniyetYili", mezuniyet: "mezuniyetYili", mezunyılı: "mezuniyetYili", yılı: "mezuniyetYili", yıl: "mezuniyetYili", yil: "mezuniyetYili",
  sıra: "yoksay", sira: "yoksay", no: "yoksay", sno: "yoksay", sırano: "yoksay",
};

interface Sutun { alan: Alan; merkez: number }

function basliklariBul(hucreler: PdfOgesi[]): Sutun[] | null {
  const sutunlar: Sutun[] = [];
  for (const h of hucreler) {
    const alan = BASLIKLAR[sade(h.metin)];
    if (alan) sutunlar.push({ alan, merkez: h.x + h.genislik / 2 });
  }
  const adVar = sutunlar.some((s) => s.alan === "ad" || s.alan === "adSoyad");
  const anlamli = sutunlar.filter((s) => s.alan !== "yoksay").length;
  return adVar && anlamli >= 3 ? sutunlar.sort((a, b) => a.merkez - b.merkez) : null;
}

// Hücre merkezini, komşu sütun merkezlerinin orta noktalarıyla ayrılan
// aralıklara yerleştirir.
function sutunBul(x: number, sutunlar: Sutun[]): Sutun {
  for (let i = 0; i < sutunlar.length - 1; i++) {
    if (x < (sutunlar[i].merkez + sutunlar[i + 1].merkez) / 2) return sutunlar[i];
  }
  return sutunlar[sutunlar.length - 1];
}

export interface MezunPdfSonucu {
  satirlar: MezunHamBilgisi[];
  baslikBulundu: boolean;
  eksikSutunlar: string[];
}

export function mezunPdfiniCoz(ogeler: PdfOgesi[]): MezunPdfSonucu {
  const satirlar: MezunHamBilgisi[] = [];
  let sutunlar: Sutun[] | null = null;
  let baslikBulundu = false;
  let son: Partial<Record<Alan, string>> | null = null;
  let sonSayfa = -1;

  for (const satir of satirlariOlustur(ogeler)) {
    const hucreler = parcalariBirlestir(satir.ogeler);
    const baslik = basliklariBul(hucreler);
    if (baslik) { sutunlar = baslik; baslikBulundu = true; son = null; continue; }
    if (!sutunlar) continue;

    const deger: Partial<Record<Alan, string>> = {};
    for (const h of hucreler) {
      const s = sutunBul(h.x + h.genislik / 2, sutunlar);
      if (s.alan === "yoksay") continue;
      deger[s.alan] = deger[s.alan] ? `${deger[s.alan]} ${h.metin}` : h.metin;
    }
    const adli = !!(deger.ad || deger.adSoyad);
    // Adı olmayan satır: bir önceki satırın taşan devamı (uzun üniversite adı
    // gibi). Aynı sayfadaysa öncekine eklenir, değilse yok sayılır.
    if (!adli) {
      if (son && satir.sayfa === sonSayfa) {
        for (const [k, v] of Object.entries(deger) as [Alan, string][]) son[k] = son[k] ? `${son[k]} ${v}` : v;
      }
      continue;
    }
    son = deger;
    sonSayfa = satir.sayfa;
    satirlar.push(deger as MezunHamBilgisi);
  }

  const alanlar = new Set((sutunlar ?? []).map((s) => s.alan));
  const eksikSutunlar = [
    ...(!alanlar.has("mezuniyetYili") ? ["Mezuniyet Yılı"] : []),
    ...(!alanlar.has("soyad") && !alanlar.has("adSoyad") ? ["Soyad"] : []),
  ];
  return {
    satirlar: (satirlar as Partial<Record<Alan, string>>[]).map((d) => {
      const { adSoyad, yoksay: _y, ...geri } = d;
      void _y;
      if (adSoyad && !geri.ad) {
        const { ad, soyad } = adSoyadAyir(adSoyad);
        return { ...geri, ad, soyad: geri.soyad ?? soyad };
      }
      return geri;
    }),
    baslikBulundu,
    eksikSutunlar,
  };
}
