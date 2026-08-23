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

// Türkçe'ye özel büyük harf dönüşümü (i → İ, ı → I) — düz .toUpperCase()
// bunu yanlış yapar (i → I). Ad/soyad kayıtlarını normalize etmek ve
// izinli isim listesiyle karşılaştırmak için kullanılıyor. Fazla boşlukları
// da tek boşluğa indirip baş/son boşlukları kırpıyor.
export function adNormalize(v: string) {
  return v
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR")
    // Bazı kaynaklar İ harfini "i + birleştirilen nokta" olarak gönderiyor.
    // Türkçe büyük harfe çevrilince çift noktalı İ oluşmaması için temizle.
    .replace(/([iı])\u0307/g, "$1")
    .normalize("NFC")
    .replace(/(^|[\s'-])([a-zçğıöşü])/g, (_, ayirici: string, harf: string) => ayirici + harf.toLocaleUpperCase("tr-TR"));
}

export function hedefBolumNormalize(v: string) {
  return v
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("tr-TR");
}

const OZEL_KARAKTER_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;

export function sifreGecerliMi(v: string) {
  return (
    v.length >= 8 &&
    !/\s/.test(v) &&
    /[A-Za-z]/.test(v) &&
    /[0-9]/.test(v) &&
    OZEL_KARAKTER_REGEX.test(v)
  );
}

export const SIFRE_IPUCU = "En az 8 karakter, boşluksuz; harf, rakam ve özel işaret (. , ! gibi) içermeli.";
export const TELEFON_IPUCU = "Sadece rakam, 10-11 hane (örn. 5xxxxxxxxx).";

// Admin'in manuel eklediği öğretmen/öğrenci hesapları için geçici şifre
// üretir — harf+rakam+özel işaret karışık, 10 karakter (sifreGecerliMi'yi
// her zaman geçer).
export function rastgeleSifre() {
  const harfler = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
  const rakamlar = "23456789";
  const ozelKarakterler = "!@#$%*.,";
  let s = "";
  for (let i = 0; i < 5; i++) s += harfler[Math.floor(Math.random() * harfler.length)];
  for (let i = 0; i < 4; i++) s += rakamlar[Math.floor(Math.random() * rakamlar.length)];
  s += ozelKarakterler[Math.floor(Math.random() * ozelKarakterler.length)];
  return s.split("").sort(() => Math.random() - 0.5).join("");
}
