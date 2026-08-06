// Client ve server tarafında ortak kullanılan doğrulama/yardımcı fonksiyonlar.
// Saf fonksiyonlar (DOM'a bağımlı değil) — hem "use client" bileşenlerinde
// hem server action'larda import edilebilir.

export function telefonSanitize(v: string) {
  return v.replace(/\D/g, "").slice(0, 11);
}
export function telefonGecerliMi(v: string) {
  return /^[0-9]{10,11}$/.test(v);
}
export function okulNoSanitize(v: string) {
  return v.replace(/\D/g, "").slice(0, 5);
}
export function okulNoGecerliMi(v: string) {
  return /^[0-9]{1,5}$/.test(v);
}
export function sifreGecerliMi(v: string) {
  return /^[A-Za-z0-9]{8,}$/.test(v) && /[A-Za-z]/.test(v) && /[0-9]/.test(v);
}

export const SIFRE_IPUCU = "En az 8 karakter, boşluksuz, harf ve rakam içermeli.";
export const TELEFON_IPUCU = "Sadece rakam, 10-11 hane (örn. 5xxxxxxxxx).";

// Admin'in manuel eklediği öğretmen/öğrenci hesapları için geçici şifre
// üretir — harf+rakam karışık, 10 karakter (sifreGecerliMi'yi her zaman geçer).
export function rastgeleSifre() {
  const harfler = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
  const rakamlar = "23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += harfler[Math.floor(Math.random() * harfler.length)];
  for (let i = 0; i < 4; i++) s += rakamlar[Math.floor(Math.random() * rakamlar.length)];
  return s.split("").sort(() => Math.random() - 0.5).join("");
}
