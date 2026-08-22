// Tarih hesaplamaları için saat dilimi güvenli yardımcılar.
//
// `new Date().toISOString().slice(0, 10)` gibi yaygın bir desen İSTANBUL
// (UTC+3) gibi UTC'nin İLERİSİNDEKİ saat dilimlerinde gece yarısı ile
// sabah ~03:00 arasında YANLIŞ (bir önceki) günü döndürür — çünkü
// toISOString() her zaman UTC'ye çeviriyor. Aynı sorun "yerel gece yarısı
// olarak parse et + gün ekle/çıkar + toISOString ile geri yaz" desende de
// var. Bu dosyadaki iki fonksiyon, sunucu/istemci hangi saat diliminde
// çalışırsa çalışsın bu kaymayı önler.

// "Bugün", Türkiye saatine göre (YYYY-MM-DD). Sunucu (Vercel varsayılan
// UTC) veya istemci hangi saat diliminde olursa olsun aynı sonucu verir.
export function bugununTarihiTR(): string {
  const parcalar = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const bul = (tur: string) => parcalar.find((p) => p.type === tur)?.value ?? "";
  return `${bul("year")}-${bul("month")}-${bul("day")}`;
}

// tarihISO (YYYY-MM-DD) üzerine gün ekler/çıkarır (negatif de olabilir) —
// öğlen UTC'ye sabitlenmiş bir Date + UTC getter/setter'lar kullanır, bu
// yüzden hiçbir saat diliminde gün kayması olmaz.
export function tarihEkle(tarihISO: string, gunSayisi: number): string {
  const d = new Date(`${tarihISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + gunSayisi);
  return d.toISOString().slice(0, 10);
}
