import { BRANS_LISTESI } from "@/lib/types";

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
  "Türkçe",
  "Matematik",
  "Fen Bilimleri",
  "Sosyal Bilgiler",
  "T.C. İnkılap Tarihi ve Atatürkçülük",
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
