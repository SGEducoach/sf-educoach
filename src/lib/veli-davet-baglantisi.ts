// Öğrencinin velisine gönderdiği davet bağlantısı — saf yardımcılar
// (bkz. migration 0187). İlkokulun öğretmen/müdür verdiği veli kodu ayrı:
// src/lib/veli-davet.ts.

import { createHash, randomBytes } from "node:crypto";

export const DAVET_GECERLILIK_GUN = 7;
/** Bir öğrenciye bağlanabilecek en fazla veli hesabı (anne + baba). */
export const DAVETLE_EN_FAZLA_VELI = 2;
/** Bir öğrencinin 24 saatte üretebileceği en fazla davet. */
export const GUNLUK_DAVET_SINIRI = 5;

/** 256 bit rastgele, URL'de güvenli anahtar (43 karakter). */
export function davetTokeniUret(): string {
  return randomBytes(32).toString("base64url");
}

export function davetTokenOzeti(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function davetTokeniBicimliMi(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

/**
 * Davet sayfasında veliye gösterilen öğrenci adı: ilk ad(lar) tam, soyad
 * yalnız baş harf ("Ayşe Nur K."). Veli doğru çocuğun davetini açtığını
 * anlar; bağlantı başkasının eline geçerse tam ad sızmaz.
 */
export function davetteOgrenciAdi(ad: string): string {
  const parcalar = ad.trim().split(/\s+/).filter(Boolean);
  if (parcalar.length <= 1) return parcalar[0] ?? "";
  const soyad = parcalar[parcalar.length - 1];
  return `${parcalar.slice(0, -1).join(" ")} ${soyad.charAt(0).toLocaleUpperCase("tr-TR")}.`;
}
