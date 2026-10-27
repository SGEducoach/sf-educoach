// 5-8. sınıf öğrenme çıktısı değerlendirmesi (kullanıcı isteği 27.10.2026,
// migration 0182). İlkokulun gelişim raporuyla aynı bölümde ("Gelişim
// Raporu") durur, ayrı bir menü değildir. Öğrenme çıktıları MEB'in ortak
// yazılı sınav senaryolarından (konu soru dağılım tabloları) gelir; branş
// öğretmeni kendi dersinde her öğrenciye her çıktı için MEB'in dört
// düzeyinden birini verir (Geliştirilmeli / Yeterli / İyi / Çok İyi).
//
// Saf modül, istemci de kullanır: senaryo verisi (JSON) burada içe
// alınmaz, sunucu tarafı ortaokul-cikti-sorgu.ts'te okur.

import { GELISIM_DUZEYLERI } from "@/lib/ilkokul-gelisim";

export const CIKTI_DERSLERI = [
  { anahtar: "turkce", ad: "Türkçe", siniflar: ["5", "6", "7", "8"], branslar: ["Türkçe"] },
  { anahtar: "matematik", ad: "Matematik", siniflar: ["5", "6", "7", "8"], branslar: ["Matematik"] },
  { anahtar: "fen", ad: "Fen Bilimleri", siniflar: ["5", "6", "7", "8"], branslar: ["Fen Bilimleri"] },
  { anahtar: "sosyal", ad: "Sosyal Bilgiler", siniflar: ["5", "6", "7"], branslar: ["Sosyal Bilgiler"] },
  // İnkılap Tarihi'ni Sosyal Bilgiler öğretmeni okutur (kademe.ts, kullanıcı kararı 01.10.2026).
  { anahtar: "inkilap", ad: "T.C. İnkılap Tarihi ve Atatürkçülük", siniflar: ["8"], branslar: ["Sosyal Bilgiler"] },
  { anahtar: "ingilizce", ad: "İngilizce", siniflar: ["5", "6", "7", "8"], branslar: ["İngilizce"] },
  { anahtar: "din", ad: "Din Kültürü ve Ahlak Bilgisi", siniflar: ["5", "6", "7", "8"], branslar: ["Din Kültürü"] },
] as const;

export type CiktiDersi = (typeof CIKTI_DERSLERI)[number]["anahtar"];
export type YaziliNo = 1 | 2;

const DERS_SETI = new Set<string>(CIKTI_DERSLERI.map((d) => d.anahtar));

export function ciktiDersiMi(x: unknown): x is CiktiDersi {
  return typeof x === "string" && DERS_SETI.has(x);
}

export function ciktiDersAdi(ders: CiktiDersi): string {
  return CIKTI_DERSLERI.find((d) => d.anahtar === ders)?.ad ?? ders;
}

export function ortaokulCiktiSinifiMi(seviye: string | null | undefined): boolean {
  return seviye === "5" || seviye === "6" || seviye === "7" || seviye === "8";
}

// Sınıf düzeyinde senaryosu olan dersler (sıra korunur).
export function sinifCiktiDersleri(seviye: string): CiktiDersi[] {
  return CIKTI_DERSLERI.filter((d) => (d.siniflar as readonly string[]).includes(seviye)).map((d) => d.anahtar);
}

// Öğretmenin branşına göre yazabildiği dersler. Ders programı boş olabildiği
// için (canlıda 27.10.2026'da boş) sınıf ataması değil branş esas alınır:
// branş öğretmeni kurumundaki bütün 5-8. sınıflarda kendi dersini işaretler.
export function bransCiktiDersleri(brans: string | null | undefined): CiktiDersi[] {
  if (!brans) return [];
  return CIKTI_DERSLERI.filter((d) => (d.branslar as readonly string[]).includes(brans)).map((d) => d.anahtar);
}

// ---- Senaryo verisi ----

// Yazılıda çıktının senaryolardaki soru sayısı ({"1": 2} = Senaryo 1'de 2
// soru) ya da "ulke": ülke geneli ortak sınav, senaryo yok (tablodaki
// çıktıların hepsi kapsamda).
export type YaziliKapsami = Record<string, number> | "ulke";

export interface SenaryoCiktisi {
  ders: CiktiDersi;
  sinif: string;
  kod: string;
  metin: string;
  unite: string | null;
  konu: string | null;
  yazili1?: YaziliKapsami;
  yazili2?: YaziliKapsami;
}

export function yaziliKapsami(c: SenaryoCiktisi, yazili: YaziliNo): YaziliKapsami | undefined {
  return yazili === 1 ? c.yazili1 : c.yazili2;
}

// Yazılının senaryo numaraları (küçükten büyüğe); ülke geneli sınavda boş.
export function yaziliSenaryolari(ciktilar: readonly SenaryoCiktisi[], yazili: YaziliNo): number[] {
  const s = new Set<number>();
  for (const c of ciktilar) {
    const k = yaziliKapsami(c, yazili);
    if (k && k !== "ulke") for (const n of Object.keys(k)) s.add(Number(n));
  }
  return [...s].sort((a, b) => a - b);
}

export function ulkeGeneliMi(ciktilar: readonly SenaryoCiktisi[], yazili: YaziliNo): boolean {
  return ciktilar.some((c) => yaziliKapsami(c, yazili) === "ulke");
}

// Yazılıda yer alan çıktılar; senaryo verilirse yalnız o senaryodakiler
// (okul zümresi senaryolardan birini seçer). Ülke geneli sınavda senaryo
// süzgeci uygulanmaz.
export function yaziliCiktilari(ciktilar: readonly SenaryoCiktisi[], yazili: YaziliNo, senaryo: number | null = null): SenaryoCiktisi[] {
  return ciktilar.filter((c) => {
    const k = yaziliKapsami(c, yazili);
    if (!k) return false;
    if (k === "ulke" || senaryo === null) return true;
    return (k[String(senaryo)] ?? 0) > 0;
  });
}

// "Senaryo 1: 2 soru, Senaryo 3: 1 soru" — ekrandaki açıklama için.
export function senaryoOzeti(c: SenaryoCiktisi, yazili: YaziliNo): string {
  const k = yaziliKapsami(c, yazili);
  if (!k) return "";
  if (k === "ulke") return "Ülke geneli ortak sınav";
  return Object.entries(k).sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([s, n]) => `S${s}: ${n} soru`).join(" · ");
}

// ---- Düzeyler (MEB'in dört düzeyi, ilkokul raporuyla aynı) ----

export const CIKTI_DUZEYLERI = GELISIM_DUZEYLERI;
export type CiktiDuzeyi = (typeof CIKTI_DUZEYLERI)[number]["anahtar"];
const DUZEY_SETI = new Set<string>(CIKTI_DUZEYLERI.map((d) => d.anahtar));

export function ciktiDuzeyiMi(x: unknown): x is CiktiDuzeyi {
  return typeof x === "string" && DUZEY_SETI.has(x);
}

export interface CiktiKaydi {
  studentId: string;
  yazili: YaziliNo;
  kod: string;
  duzey: CiktiDuzeyi;
}
