// "TG Fen Lisesi" deneme yüklemesi: kurum/şube sıralı liste (deneme-kurum-liste.ts)
// + isteğe bağlı kişisel karneler (deneme-sonuc-belgesi.ts) → kayıt için tek
// öğrenci listesi. SAF birleştirme + ince PDF sarmalayıcıları.
//
// KARAR (kullanıcı isteği 23.10.2026, "yüklemeye hazır olsun"): karnesi
// olmayan ya da karnesi doğrulanamayan öğrenci ATILMAZ; listedeki 4 birleşik
// ders ("TYT Türkçe/Sosyal/Matematik/Fen") olduğu gibi kaydedilir — canlıda
// aynı biçimde kaydedilmiş denemeler var. Karneyle ÇAPRAZ DOĞRULANAN öğrenci
// ise dokuz granüler dersle kaydedilir. Hangi yoldan kaç öğrencinin
// geçtiği `ozet`te döner (yükleme günlüğü).

import { kurumListesiBasligiVarMi, kurumListesiniCoz, type KurumListesiSonucu } from "@/lib/deneme-kurum-liste";
import { karneleriListeyeEsle, sonucBelgeleriniCoz, type SonucBelgesi } from "@/lib/deneme-sonuc-belgesi";
import { pdfSayfaOgeleri } from "@/lib/deneme-pdf-ayristirici";

export interface TgOgrenci {
  ad_soyad: string;
  ders_sonuclari: { ders: string; dogru: number; yanlis: number }[];
  ogrenci_no: number;
  /** "9-B"; PDF'te boşsa "". */
  sinif: string;
  granuler: boolean;
}

export interface TgOzet {
  toplam: number;
  granuler: number;
  birlesik: number;
  karneSayisi: number;
  okunamayanKarneSayfasi: number;
  /** Karnesi eşleşmeyen/doğrulanamayan öğrencilerin neden dağılımı. */
  karneNotlari: Record<string, number>;
}

export interface TgHazirlik {
  basarili: boolean;
  hata?: string;
  sinavAdi: string | null;
  ogrenciler: TgOgrenci[];
  okunamayan: { isimHam: string; neden: string }[];
  ozet: TgOzet;
}

export function tgSonuclariniBirlestir(liste: KurumListesiSonucu, belgeler: SonucBelgesi[], okunamayanKarneSayfasi = 0): TgHazirlik {
  const bosOzet: TgOzet = { toplam: 0, granuler: 0, birlesik: 0, karneSayisi: belgeler.length, okunamayanKarneSayfasi, karneNotlari: {} };
  if (!liste.basarili) return { basarili: false, hata: liste.hata, sinavAdi: null, ogrenciler: [], okunamayan: [], ozet: bosOzet };

  const eslesmeler = belgeler.length > 0
    ? karneleriListeyeEsle(liste.ogrenciler, belgeler)
    : liste.ogrenciler.map((ogrenci) => ({ ogrenci, granuler: null, belge: null, not: null as string | null }));

  const karneNotlari: Record<string, number> = {};
  const ogrenciler: TgOgrenci[] = eslesmeler.map((e) => {
    if (belgeler.length > 0 && e.granuler === null && e.not) karneNotlari[e.not] = (karneNotlari[e.not] ?? 0) + 1;
    return {
      ad_soyad: e.ogrenci.isimHam,
      ders_sonuclari: (e.granuler ?? e.ogrenci.dersSonuclari).map(({ ders, dogru, yanlis }) => ({ ders, dogru, yanlis })),
      ogrenci_no: e.ogrenci.ogrenciNo,
      sinif: e.ogrenci.sinif,
      granuler: e.granuler !== null,
    };
  });
  const granuler = ogrenciler.filter((o) => o.granuler).length;
  return {
    basarili: true,
    sinavAdi: liste.sinavAdi,
    ogrenciler,
    okunamayan: liste.okunamayanSatirlar.map((o) => ({ isimHam: o.isimHam, neden: o.neden })),
    ozet: { toplam: ogrenciler.length, granuler, birlesik: ogrenciler.length - granuler, karneSayisi: belgeler.length, okunamayanKarneSayfasi, karneNotlari },
  };
}

/** Yalnız ilk sayfalara bakan ucuz tanı (büyük karne PDF'leri boşuna okunmasın). */
export async function tgListesiMi(pdf: Buffer): Promise<boolean> {
  try {
    return kurumListesiBasligiVarMi(await pdfSayfaOgeleri(pdf, 2));
  } catch {
    return false;
  }
}

/**
 * `liste`: kurum/şube listesi PDF'i. `karne`: ayrı karne PDF'i; verilmezse
 * liste dosyasının KENDİ sayfalarındaki karneler (birleşik dosya) aranır.
 */
export async function tgListesiniHazirla(liste: Buffer, karne?: Buffer | null): Promise<TgHazirlik> {
  const listeSayfalari = await pdfSayfaOgeleri(liste, 600);
  const listeSonucu = kurumListesiniCoz(listeSayfalari);
  const karneSayfalari = karne ? await pdfSayfaOgeleri(karne, 600) : listeSayfalari;
  const karneSonucu = sonucBelgeleriniCoz(karneSayfalari);
  return tgSonuclariniBirlestir(listeSonucu, karneSonucu.belgeler, karneSonucu.okunamayanSayfalar.length);
}
