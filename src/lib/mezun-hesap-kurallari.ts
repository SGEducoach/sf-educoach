// Mezun hesabı (migration 0188) — saf kurallar; sunucu işlemleri
// src/lib/mezun-hesap.ts'te.

/** Yalnız 12. sınıf öğrencisi mezun edilebilir (yanlışlıkla 11'i mezun etmeyi önler). */
export const MEZUN_EDILEBILIR_SEVIYE = "12";

/**
 * Mezuniyet yılı: ders yılı Haziran'da biter. Haziran–Aralık arası yapılan
 * mezun etme o yılın, Ocak–Mayıs arası yapılan (geç kalmış işlem) bir önceki
 * yılın mezunu sayılır.
 */
export function mezuniyetYiliBelirle(bugun: string): number {
  const m = /^(\d{4})-(\d{2})-\d{2}/.exec(bugun);
  if (!m) throw new Error(`Geçersiz tarih: ${bugun}`);
  const yil = Number(m[1]);
  return Number(m[2]) >= 6 ? yil : yil - 1;
}

/**
 * Sistemin ürettiği giriş adresleri (…@ogrenci.sgeducoach.internal,
 * veli+…@sgeducoach.internal, …@sefukoc.com) gerçek e-posta değildir; mezun
 * kaydına alınmaz.
 */
export function gercekEposta(eposta: string | null | undefined): string | null {
  const e = (eposta ?? "").trim().toLocaleLowerCase("tr-TR");
  if (!e || !e.includes("@") || /@(.+\.internal|sefukoc\.com)$/i.test(e)) return null;
  return e;
}
