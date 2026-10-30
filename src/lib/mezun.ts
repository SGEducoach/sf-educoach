// Mezun Takip modülü (kullanıcı isteği 30.10.2026, migration 0184) — saf
// yardımcılar: alan doğrulama, ad-soyad ayırma, otomatik aktarım zamanı ve
// PDF satırlarının mevcut mezunlarla eşleştirilmesi. Sorgular mezun-veri.ts'te.

import { adAnahtari } from "@/lib/pdf-metni";
import { telefonuNormallestir } from "@/lib/sms-telefon";
import { adNormalize } from "@/lib/validators";

export type MezunKaynagi = "otomatik" | "pdf" | "elle";

export const MEZUN_KAYNAK_ETIKETI: Record<MezunKaynagi, string> = {
  otomatik: "Sistemden",
  pdf: "PDF",
  elle: "Elle",
};

// Rehberin PDF'te kullanacağı sütunlar (şablondaki sıra).
export const MEZUN_PDF_SUTUNLARI = [
  "Ad", "Soyad", "İl", "İlçe", "E-posta", "Telefon", "Üniversite", "Meslek", "Mezuniyet Yılı",
] as const;

export interface MezunBilgisi {
  ad: string;
  soyad: string;
  il: string | null;
  ilce: string | null;
  eposta: string | null;
  /** 905XXXXXXXXX ya da null. */
  telefon: string | null;
  universite: string | null;
  meslek: string | null;
  mezuniyetYili: number;
}

export interface MezunKaydi extends MezunBilgisi {
  id: string;
  okulNo: string | null;
  kaynak: MezunKaynagi;
  hesabiVar: boolean;
  guncelleme: string;
}

// Ham (formdan ya da PDF'ten gelen) alanlar; hepsi metin.
export type MezunHamBilgisi = Partial<Record<"ad" | "soyad" | "il" | "ilce" | "eposta" | "telefon" | "universite" | "meslek" | "mezuniyetYili", string | number | null>>;

const SINIR = { ad: 80, soyad: 80, il: 40, ilce: 60, eposta: 120, universite: 160, meslek: 120 } as const;
const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function metin(v: unknown, sinir: number): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).normalize("NFC").replace(/\s+/g, " ").trim();
  return s ? s.slice(0, sinir) : null;
}

// "AHMET CAN YILMAZ" → ad "Ahmet Can", soyad "Yılmaz" (son sözcük soyad).
export function adSoyadAyir(tamAd: string): { ad: string; soyad: string } {
  const parcalar = adNormalize(tamAd ?? "").split(" ").filter(Boolean);
  if (parcalar.length <= 1) return { ad: parcalar[0] ?? "", soyad: "" };
  return { ad: parcalar.slice(0, -1).join(" "), soyad: parcalar[parcalar.length - 1] };
}

export function mezuniyetYiliGecerliMi(yil: number, buYil: number): boolean {
  return Number.isInteger(yil) && yil >= 1950 && yil <= buYil + 1;
}

// Formdan/PDF'ten gelen alanları temizler. Ad ve geçerli mezuniyet yılı
// zorunlu; geçersiz telefon ya da e-posta kaydı engellemez, boş bırakılır
// ve uyarı olarak döner.
export function mezunBilgisiDogrula(ham: MezunHamBilgisi, buYil: number): { bilgi: MezunBilgisi | null; hatalar: string[]; uyarilar: string[] } {
  const hatalar: string[] = [];
  const uyarilar: string[] = [];
  const ad = metin(ham.ad, SINIR.ad);
  const soyad = metin(ham.soyad, SINIR.soyad);
  if (!ad) hatalar.push("Ad boş.");
  const yilMetni = String(ham.mezuniyetYili ?? "").replace(/\D/g, "");
  const yil = Number(yilMetni);
  if (!yilMetni) hatalar.push("Mezuniyet yılı boş.");
  else if (!mezuniyetYiliGecerliMi(yil, buYil)) hatalar.push(`Mezuniyet yılı geçersiz (${yilMetni}).`);

  const telefonHam = metin(ham.telefon, 40);
  const telefon = telefonuNormallestir(telefonHam);
  if (telefonHam && !telefon) uyarilar.push(`Telefon geçersiz, boş bırakıldı (${telefonHam}).`);
  const epostaHam = metin(ham.eposta, SINIR.eposta)?.replace(/\s/g, "").toLocaleLowerCase("tr-TR") ?? null;
  const eposta = epostaHam && EPOSTA.test(epostaHam) ? epostaHam : null;
  if (epostaHam && !eposta) uyarilar.push(`E-posta geçersiz, boş bırakıldı (${epostaHam}).`);

  if (hatalar.length > 0) return { bilgi: null, hatalar, uyarilar };
  const yer = (v: unknown, s: number) => { const m = metin(v, s); return m ? adNormalize(m) : null; };
  return {
    bilgi: {
      ad: adNormalize(ad!),
      soyad: soyad ? adNormalize(soyad) : "",
      il: yer(ham.il, SINIR.il),
      ilce: yer(ham.ilce, SINIR.ilce),
      eposta,
      telefon,
      universite: metin(ham.universite, SINIR.universite),
      meslek: metin(ham.meslek, SINIR.meslek),
      mezuniyetYili: yil,
    },
    hatalar,
    uyarilar,
  };
}

// ---- Otomatik aktarım ----
//
// Ders yılı Haziran sonunda biter (kullanıcı kararı: 1 Temmuz). Aktarım
// yalnız 1 Temmuz–31 Ağustos arasında yapılır: Eylül'de okul sınıfları bir
// üst düzeye geçirmiş olabilir; o zaman 12. sınıftakiler yeni dönemin
// öğrencileridir ve mezun sayılmamalıdır.
export function otomatikAktarimYili(bugun: string): number | null {
  const m = /^(\d{4})-(\d{2})-\d{2}/.exec(bugun);
  if (!m) return null;
  const ay = Number(m[2]);
  return ay === 7 || ay === 8 ? Number(m[1]) : null;
}

// ---- PDF eşleştirme ----

export type PdfSatirDurumu = "yeni" | "guncelle" | "hatali";

export interface MezunPdfOnizlemesi {
  sira: number;
  durum: PdfSatirDurumu;
  bilgi: MezunBilgisi | null;
  /** Güncellenecek mevcut mezun. */
  mezunId: string | null;
  mevcutAd: string | null;
  hatalar: string[];
  uyarilar: string[];
}

export const mezunKimlikAnahtari = (ad: string, soyad: string, yil: number) => `${adAnahtari(`${ad} ${soyad}`)}|${yil}`;

// PDF satırlarını kurumun mevcut mezunlarıyla eşleştirir: aynı ad soyad ve
// mezuniyet yılı varsa "güncelle", yoksa "yeni". Telefonla eşleştirilmez:
// aynı numarayı kullanan başka bir kişinin (kardeş) kaydının üzerine
// yazılabilirdi. PDF içinde aynı kişi iki kez geçiyorsa ikincisi hatalı sayılır.
export function mezunPdfEslestir(
  hamSatirlar: MezunHamBilgisi[],
  mevcutlar: Pick<MezunKaydi, "id" | "ad" | "soyad" | "mezuniyetYili">[],
  buYil: number,
): MezunPdfOnizlemesi[] {
  const anahtarla = new Map(mevcutlar.map((m) => [mezunKimlikAnahtari(m.ad, m.soyad, m.mezuniyetYili), m]));
  const pdfteGorulen = new Set<string>();
  return hamSatirlar.map((ham, i) => {
    const { bilgi, hatalar, uyarilar } = mezunBilgisiDogrula(ham, buYil);
    if (!bilgi) return { sira: i + 1, durum: "hatali", bilgi: null, mezunId: null, mevcutAd: null, hatalar, uyarilar };
    const anahtar = mezunKimlikAnahtari(bilgi.ad, bilgi.soyad, bilgi.mezuniyetYili);
    if (pdfteGorulen.has(anahtar)) {
      return { sira: i + 1, durum: "hatali", bilgi, mezunId: null, mevcutAd: null, hatalar: ["Bu kişi PDF'te daha önce geçiyor."], uyarilar };
    }
    pdfteGorulen.add(anahtar);
    const mevcut = anahtarla.get(anahtar);
    return mevcut
      ? { sira: i + 1, durum: "guncelle", bilgi, mezunId: mevcut.id, mevcutAd: `${mevcut.ad} ${mevcut.soyad}`.trim(), hatalar, uyarilar }
      : { sira: i + 1, durum: "yeni", bilgi, mezunId: null, mevcutAd: null, hatalar, uyarilar };
  });
}

// Güncellemede PDF'te boş bırakılan alan mevcut değeri silmez.
export function mezunGuncellemesi(pdf: MezunBilgisi): Partial<MezunBilgisi> {
  const sonuc: Partial<MezunBilgisi> = { ad: pdf.ad, mezuniyetYili: pdf.mezuniyetYili };
  for (const k of ["soyad", "il", "ilce", "eposta", "telefon", "universite", "meslek"] as const) {
    if (pdf[k]) (sonuc as Record<string, unknown>)[k] = pdf[k];
  }
  return sonuc;
}
