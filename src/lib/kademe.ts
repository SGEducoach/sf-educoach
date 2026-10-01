import { BRANS_LISTESI, kurumBransListesi } from "@/lib/types";
import type { KurumKademesi, KurumTuru } from "@/lib/types";

// Kademe (ortaokul / lise) — Ortaokul Paneli Faz 0.
//
// Kullanıcı kararı (30.09.2026): ortaokul, mevcut lise modelinin yanında
// PARALEL bir müfredat/ilerleme/ölçme katmanı olarak kurulacak. Buna karşılık
// kimlik, rol, kurum, SINIF, bildirim ve denetim kaydı TEK kalır — kademe de
// bu ortak tarafa aittir.
//
// Kademe için tabloya kolon EKLENMEDİ: bir kurumda hem ortaokul hem lise
// bulunabiliyor (çok yaygın), dolayısıyla kademe kurumun değil SINIFIN
// özelliğidir ve `classes.seviye`den türetilir. Türetme tek yerde, burada.

export type Kademe = "ortaokul" | "lise";

export const ORTAOKUL_SEVIYELERI = ["5", "6", "7", "8"] as const;
export const LISE_SEVIYELERI = ["9", "10", "11", "12"] as const;

// LGS'ye hazırlanan sınıf. LGS modu varsayılan olarak yalnız burada açılır
// (tasarım belgesi §10.3); 7. sınıfta kurum tercihiyle açılabilir.
export const LGS_SEVIYESI = "8";

// "12", "12. Sınıf", " 8 " gibi farklı yazımları tek biçime indirger.
// Mezun/hazırlık gibi sayısal olmayan değerlerde null döner.
export function seviyeNormalize(seviye: string | null | undefined): string | null {
  const ham = String(seviye ?? "").trim();
  if (!ham) return null;
  const m = /^(\d{1,2})/.exec(ham);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 12 ? String(n) : null;
}

export function kademeBul(seviye: string | null | undefined): Kademe | null {
  const n = seviyeNormalize(seviye);
  if (n === null) return null;
  if ((ORTAOKUL_SEVIYELERI as readonly string[]).includes(n)) return "ortaokul";
  if ((LISE_SEVIYELERI as readonly string[]).includes(n)) return "lise";
  return null; // 1-4. sınıf: ilkokul, panel kapsamında değil
}

export function ortaokulMu(seviye: string | null | undefined): boolean {
  return kademeBul(seviye) === "ortaokul";
}

export function lgsSinifiMi(seviye: string | null | undefined): boolean {
  return seviyeNormalize(seviye) === LGS_SEVIYESI;
}

export const KADEME_ETIKET: Record<Kademe, string> = {
  ortaokul: "Ortaokul",
  lise: "Lise",
};

// ---- Öğretmen branşları ----
//
// `BRANS_LISTESI` (types.ts) lise branşlarından oluşuyor; ortaokulun kendi
// branşları (Türkçe, Fen Bilimleri, Sosyal Bilgiler…) orada YOK. İki listeyi
// birleştirmek yerine kademeye göre veriliyor: lise formlarında ortaokul
// branşı, ortaokul formlarında lise branşı çıkmasın.
//
// İki kademede de ders veren öğretmen (Matematik, İngilizce, Din Kültürü,
// Beden Eğitimi, Müzik, Rehber Öğretmen) için metinler İKİ LİSTEDE DE BİREBİR
// AYNI olmalı — aksi hâlde aynı öğretmen iki ayrı branş gibi görünür.
export const ORTAOKUL_BRANSLARI = [
  // Lisede branş "Türk Dili ve Edebiyatı"; ortaokulda ÖĞRETMEN BRANŞI
  // "Türkçe"dir (kullanıcı kararı 01.10.2026). Lise adı bu listede YOK.
  "Türkçe",
  "Matematik",
  "Fen Bilimleri",
  // Kullanıcı kararı (01.10.2026): T.C. İnkılap Tarihi ve Atatürkçülük
  // dersini de Sosyal Bilgiler öğretmeni okutuyor — ayrı branş olarak
  // sunulmuyor. Ders taksonomisinde İnkılap AYRI kalır (müfredatta kendi
  // ders kaydı var); birleşen yalnız ÖĞRETMEN BRANŞI.
  "Sosyal Bilgiler",
  "İngilizce",
  "Din Kültürü",
  "Görsel Sanatlar",
  "Müzik",
  "Beden Eğitimi",
  "Teknoloji ve Tasarım",
  "Bilişim Teknolojileri",
  // rehberlik.ts'teki REHBER_BRANSI ile birebir aynı olmalı (bkz. oradaki not).
  "Rehber Öğretmen",
  "Diğer",
] as const;

export function bransListesi(kademe: Kademe | null | undefined): readonly string[] {
  return kademe === "ortaokul" ? ORTAOKUL_BRANSLARI : BRANS_LISTESI;
}

// Formların kullandığı liste: kurum türü (okul/dershane) VE kademe birlikte.
//
// `kurumBransListesi` (types.ts) yalnız kurum türüne bakıyordu; kademeyi de
// hesaba katan sarmalayıcı burada çünkü types.ts kademe.ts'i import edemez
// (döngüsel bağımlılık — kademe.ts BRANS_LISTESI'ni oradan alıyor).
//
// Ortaokulda okula özel branşlar (Bilişim/Bilgisayar) eklenmiyor; ortaokul
// listesinin kendi "Bilişim Teknolojileri" kalemi var.
export function panelBransListesi(
  kurumTuru: KurumTuru | null | undefined,
  kademe: KurumKademesi | null | undefined,
): readonly string[] {
  if (kademe === "ortaokul") return ORTAOKUL_BRANSLARI;
  // "ikisi": hem ortaokul hem lise branşı gerekir, metinler birebir aynı
  // olduğu için tekilleştirme yeterli (bkz. testler).
  if (kademe === "ikisi") {
    return [...new Set([...ORTAOKUL_BRANSLARI, ...kurumBransListesi(kurumTuru)])];
  }
  return kurumBransListesi(kurumTuru);
}

// Kurumun kademesine göre açılabilecek sınıf seviyeleri (schools.kademe,
// migration 0128). Yönetici "ortaokul" seçmedikçe 5-8 hiç görünmez —
// yanlışlıkla ortaokul sınıfı açılmasın.
export function kurumSeviyeleri(kademe: KurumKademesi | null | undefined): readonly string[] {
  if (kademe === "ortaokul") return ORTAOKUL_SEVIYELERI;
  if (kademe === "ikisi") return [...ORTAOKUL_SEVIYELERI, ...LISE_SEVIYELERI];
  return LISE_SEVIYELERI;
}

export const KURUM_KADEMESI_ETIKET: Record<KurumKademesi, string> = {
  lise: "Lise (9-12)",
  ortaokul: "Ortaokul (5-8)",
  ikisi: "Ortaokul + Lise (5-12)",
};

// ---- Kurum türü seçimi (kullanıcı isteği 01.10.2026) ----
//
// Yönetici kurum eklerken TEK bir seçim yapar. Arka planda bu seçim iki alana
// çözülür: `schools.tur` (okul|dershane) ve `schools.kademe`
// (ortaokul|lise|ikisi). Böylece ortaokul kurumunda sınıf ekleme formunda 9-12
// boş yere görünmez.
//
// "ikisi" aynı binada ortaokul + lise bulunan kurum için (özel okullarda çok
// yaygın); orada sınıf eklerken 5-12 birlikte çıkar.
export type KurumSecimi = "ortaokul" | "lise" | "ikisi" | "dershane";

// Formlarda düğme sırası. İki form (ekleme + düzenleme) bu tek listeden
// okuyor; ayrı ayrı yazılsa biri eklenip diğeri unutulabilirdi.
export const KURUM_SECIMI_SIRASI = ["ortaokul", "lise", "ikisi", "dershane"] as const satisfies readonly KurumSecimi[];

export const KURUM_SECIMI_ETIKET: Record<KurumSecimi, string> = {
  ortaokul: "Ortaokul (5-8)",
  lise: "Lise (9-12)",
  ikisi: "Ortaokul + Lise",
  dershane: "Dershane",
};

// Seçimin ne anlama geldiğini yöneticiye tek satırla söyler.
export const KURUM_SECIMI_ACIKLAMA: Record<KurumSecimi, string> = {
  ortaokul: "Sınıf eklerken yalnız 5-8 seçenekleri çıkar.",
  lise: "Sınıf eklerken yalnız 9-12 seçenekleri çıkar.",
  ikisi: "Aynı kurumda ortaokul ve lise varsa: sınıf eklerken 5-12 birlikte çıkar.",
  dershane: "Dershane: kurum yönetimi ve deneme yükleme açık, sınıflar 9-12.",
};

export function kurumSeciminiCoz(secim: KurumSecimi): { tur: "okul" | "dershane"; kademe: KurumKademesi } {
  if (secim === "dershane") return { tur: "dershane", kademe: "lise" };
  if (secim === "ortaokul") return { tur: "okul", kademe: "ortaokul" };
  if (secim === "ikisi") return { tur: "okul", kademe: "ikisi" };
  return { tur: "okul", kademe: "lise" };
}

// Kayıtlı kurumdan seçime geri dönüş (düzenleme formu için).
export function kurumSecimi(tur: string | null | undefined, kademe: KurumKademesi | null | undefined): KurumSecimi {
  if (tur === "dershane") return "dershane";
  if (kademe === "ortaokul") return "ortaokul";
  if (kademe === "ikisi") return "ikisi";
  return "lise";
}
