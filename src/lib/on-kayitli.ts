// Ön kayıtlı (sisteme üye olmamış) okul öğrencileri — ortak sabitler ve saf
// yardımcılar. Plan: docs/ON_KAYITLI_OGRENCI_UYGULAMA_PLANI.md, migration 0179.
//
// Hesapsız öğrencinin kimliği okul_ogrenci_listesi satırıdır. Ona verilen ödev
// ve duyuru 10 gün bekler; süre VERİLME tarihinden sayılır (kullanıcı kararı
// 24.10.2026). Aynı süre veritabanında da sabit (0179, interval '10 days').

import { adlarBenzerMi } from "@/lib/ad-benzerligi";
import { adNormalize } from "@/lib/validators";

export const ON_KAYIT_BEKLEME_GUNU = 10;
export const ON_KAYIT_ETIKETI = "Sisteme kayıtlı değil";

export interface KayitsizOgrenciSatiri {
  id: string; // okul_ogrenci_listesi.id
  ad: string;
  okulNo: string | null;
  sinifId: string;
}

const GUN_MS = 24 * 60 * 60 * 1000;

// Verilme tarihinden bu yana süre dolmadıysa kalan gün (10 → 1), dolduysa 0.
export function bekleyenKalanGun(verilmeTarihi: string | Date, simdi: number = Date.now()): number {
  const baslangic = typeof verilmeTarihi === "string" ? Date.parse(verilmeTarihi) : verilmeTarihi.getTime();
  if (!Number.isFinite(baslangic)) return 0;
  const kalan = ON_KAYIT_BEKLEME_GUNU - (simdi - baslangic) / GUN_MS;
  return kalan > 0 ? Math.ceil(kalan) : 0;
}

export function bekleyenSuresiDolduMu(verilmeTarihi: string | Date, simdi: number = Date.now()): boolean {
  return bekleyenKalanGun(verilmeTarihi, simdi) === 0;
}

// Hesapsız öğrencinin yüklü denemelerinden ders sonuçları (jsonb) → toplam net.
// Net = doğru − yanlış/4; ders satırı {dogru, yanlis} taşır.
export function hesapsizDenemeNeti(dersSonuclari: unknown): number {
  if (!Array.isArray(dersSonuclari)) return 0;
  let net = 0;
  for (const d of dersSonuclari) {
    const s = d as { dogru?: unknown; yanlis?: unknown };
    const dogru = typeof s.dogru === "number" ? s.dogru : 0;
    const yanlis = typeof s.yanlis === "number" ? s.yanlis : 0;
    net += dogru - yanlis / 4;
  }
  return Math.round(net * 100) / 100;
}

// ——— Deneme sonucu ↔ okul listesi eşleştirme ———
// Kural (adaş tuzağı, migration 0180): OKUL NUMARASI tek başına yetmez. Numara
// eşleşse bile PDF'teki ad kayıtlı ada benzemiyorsa ya da PDF'in sınıf seviyesi
// listedekiyle çelişiyorsa bağlantı "şüpheli" sayılır ve yönetici onayı ister.
// Numarası olmayan satırlar yalnız ad TAM aynıysa (ve tek kişiye denk geliyorsa)
// öneri alır; bu da otomatik yazılmaz, onay bekler.

export interface ListeAdayi {
  id: string;
  okulNo: string | null;
  adSoyad: string;
  /** Sınıf seviyesi ("9".."12"); bilinmiyorsa null. */
  seviye: string | null;
  /** Hesabı olan öğrencinin kimliği; hesapsızsa null. */
  studentId: string | null;
}

export interface BekleyenSatiri {
  adSoyad: string;
  ogrenciNo: number | string | null;
  sinifSeviyesi: string | null;
}

export type ListeBaglantisi =
  | { karar: "guvenli" | "supheli"; liste: ListeAdayi }
  | { karar: "yok" };

const seviyeCelisirMi = (satir: BekleyenSatiri, aday: ListeAdayi) =>
  !!satir.sinifSeviyesi && !!aday.seviye && satir.sinifSeviyesi !== aday.seviye;

export function numarayaGoreListeBaglantisi(satir: BekleyenSatiri, liste: ListeAdayi[]): ListeBaglantisi {
  if (satir.ogrenciNo === null || satir.ogrenciNo === "") return { karar: "yok" };
  const no = String(satir.ogrenciNo);
  const aday = liste.find((l) => l.okulNo === no);
  if (!aday) return { karar: "yok" };
  return {
    karar: adlarBenzerMi(satir.adSoyad, aday.adSoyad) && !seviyeCelisirMi(satir, aday) ? "guvenli" : "supheli",
    liste: aday,
  };
}

/** Numarası olmayan satır için: ad TAM aynı ve listede tek kişiyse öneri (otomatik yazılmaz). */
export function adaGoreListeOnerisi(satir: BekleyenSatiri, liste: ListeAdayi[]): ListeAdayi | null {
  const ad = adNormalize(satir.adSoyad);
  const adaylar = liste.filter((l) => adNormalize(l.adSoyad) === ad && !seviyeCelisirMi(satir, l));
  return adaylar.length === 1 ? adaylar[0] : null;
}

// Hesapsız öğrenciye iletilecek giriş daveti (WhatsApp metni). Kişisel veri
// içermez (öğrenci adı/numarası yok); öğretmen kendi paylaşır, otomatik gönderim yoktur.
export function davetMetni(ogretmenAdi?: string | null): string {
  const imza = ogretmenAdi?.trim() ? `\n\n${ogretmenAdi.trim()}` : "";
  return `Merhaba, SeFu Koç'a henüz üye olmadığınızı gördük. www.sefukoc.com adresinden okul numaranızla üye olabilirsiniz.\n\nSize verdiğimiz ödev ve duyurular ${ON_KAYIT_BEKLEME_GUNU} gün saklanıyor; bu süre içinde üye olursanız hesabınıza eklenecek, olmazsanız silinecek.${imza}`;
}

/**
 * Numarası başka birine ait çıkan (ya da numarası hatalı kodlanmış) satır için:
 * AD benzer (adlarBenzerMi: ikinci ad eksik / kısaltma) ve listede TEK kişi,
 * sınıf seviyesi çelişmiyorsa o kişi önerilir. Otomatik yazılmaz, yönetici onaylar.
 * Tek sözcüklü ("SENA") ya da birden çok kişiye uyan adlar öneri almaz.
 */
export function adaGoreBenzerAday(satir: BekleyenSatiri, liste: ListeAdayi[]): ListeAdayi | null {
  const adaylar = liste.filter((l) => adlarBenzerMi(satir.adSoyad, l.adSoyad) && !seviyeCelisirMi(satir, l));
  return adaylar.length === 1 ? adaylar[0] : null;
}
