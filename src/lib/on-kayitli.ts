// Ön kayıtlı (sisteme üye olmamış) okul öğrencileri — ortak sabitler ve saf
// yardımcılar. Plan: docs/ON_KAYITLI_OGRENCI_UYGULAMA_PLANI.md, migration 0179.
//
// Hesapsız öğrencinin kimliği okul_ogrenci_listesi satırıdır. Ona verilen ödev
// ve duyuru 10 gün bekler; süre VERİLME tarihinden sayılır (kullanıcı kararı
// 24.10.2026). Aynı süre veritabanında da sabit (0179, interval '10 days').

import { adlarBenzerMi, sozcukleriAddaGeciyorMu } from "@/lib/ad-benzerligi";
import { adNormalize } from "@/lib/validators";

export const ON_KAYIT_BEKLEME_GUNU = 10;
export const ON_KAYIT_ETIKETI = "Sisteme kayıtlı değil";

/** Rehber ekranı: hesapsız öğrenci + yüklü denemelerinin özeti. */
export interface KayitsizOgrenciOzeti {
  listeId: string;
  ad: string;
  okulNo: string | null;
  sinifAdi: string;
  denemeSayisi: number;
  /** En yeni yüklü denemenin toplam neti; deneme yoksa null. */
  sonNet: number | null;
  sonDenemeTarihi: string | null;
}

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

/** PDF numarasından en çok bu kadar uzak numaralar "yakın" sayılır (optikte hatalı kodlanmış hane). */
const YAKIN_NUMARA_FARKI = 3;

/**
 * Numarası başka birine ait çıkan ve adı o kişiye benzemeyen satır için
 * (kullanıcı isteği 28.10.2026): numarası PDF'tekine yakın (±3), sınıf seviyesi
 * çelişmeyen ve PDF'teki her sözcük adında geçen TEK kişi önerilir. Numara
 * yakınlığı adayları zaten daralttığı için tek sözcüklü ad ("SENA") da yeter.
 * Otomatik yazılmaz, yönetici onaylar.
 */
export function yakinNumaradaAday(satir: BekleyenSatiri, liste: ListeAdayi[]): ListeAdayi | null {
  if (satir.ogrenciNo === null || satir.ogrenciNo === "") return null;
  const no = Number(satir.ogrenciNo);
  if (!Number.isInteger(no)) return null;
  const adaylar = liste.filter((l) => {
    if (!l.okulNo || !/^\d+$/.test(l.okulNo)) return false;
    const fark = Math.abs(Number(l.okulNo) - no);
    return fark > 0 && fark <= YAKIN_NUMARA_FARKI && !seviyeCelisirMi(satir, l) && sozcukleriAddaGeciyorMu(satir.adSoyad, l.adSoyad);
  });
  return adaylar.length === 1 ? adaylar[0] : null;
}

/**
 * "numara": numara eşleşiyor ama ad/sınıf uyuşmuyor (ada benzeyen başka kişi yok);
 * "numara-hatali": ad listedeki TEK bir öğrenciye uyuyor ama PDF'teki numara başka birine ait;
 * "yakin-numara": ad, PDF numarasına yakın numaralı TEK öğrencinin adında geçiyor;
 * "ad": numara yok, ad tam aynı ve tek kişi.
 */
export type OneriTuru = "numara" | "numara-hatali" | "yakin-numara" | "ad";

/** Listeye bağlanmamış bekleyen satır için yöneticiye sunulacak öneri; uygun kimse yoksa null. */
export function bekleyenSatirOnerisi(satir: BekleyenSatiri, liste: ListeAdayi[]): { liste: ListeAdayi; tur: OneriTuru } | null {
  const numara = numarayaGoreListeBaglantisi(satir, liste);
  if (numara.karar !== "yok") {
    // Numara eşleşse bile ad listedeki BAŞKA tek bir öğrenciye uyuyorsa asıl sahibi odur
    // (PDF'te numara hatalı kodlanmış): numaradaki kişi değil o önerilir.
    const adAdayi = adaGoreBenzerAday(satir, liste);
    if (adAdayi && adAdayi.id !== numara.liste.id) return { liste: adAdayi, tur: "numara-hatali" };
    // Ad numaradaki kişiye uyuyorsa (yalnız sınıf çelişiyor olabilir) öneri odur.
    if (adlarBenzerMi(satir.adSoyad, numara.liste.adSoyad)) return { liste: numara.liste, tur: "numara" };
    const yakin = yakinNumaradaAday(satir, liste);
    if (yakin) return { liste: yakin, tur: "yakin-numara" };
    // Ad da sınıf düzeyi de tutmuyorsa numaradaki kişi apayrı biridir (ör. 9. sınıf
    // satırı → 12. sınıf öğrencisi): yanlış bağlamaya davet etmesin, öneri yok.
    if (seviyeCelisirMi(satir, numara.liste)) return null;
    return { liste: numara.liste, tur: "numara" };
  }
  if (satir.ogrenciNo === null || satir.ogrenciNo === "") {
    const adayi = adaGoreListeOnerisi(satir, liste);
    return adayi ? { liste: adayi, tur: "ad" } : null;
  }
  // Numara listede hiç yok: ad tek kişiye benziyorsa ya da yakın numaralı kişinin adında geçiyorsa öneri.
  const adAdayi = adaGoreBenzerAday(satir, liste);
  if (adAdayi) return { liste: adAdayi, tur: "numara-hatali" };
  const yakin = yakinNumaradaAday(satir, liste);
  return yakin ? { liste: yakin, tur: "yakin-numara" } : null;
}
