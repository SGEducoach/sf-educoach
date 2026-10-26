// İstemci ve sunucunun ortak ek dosya sınırları. Google kimlik bilgisi içermez.
export const DRIVE_EK_SAYISI = 5;
export const DRIVE_EK_BOYUTU = 25 * 1024 * 1024;
export const DRIVE_EK_KABUL = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp";
export interface DriveEki { id: string; ad: string; adres: string; qr?: string }
export interface DriveDurumu { hazir: boolean; bagli: boolean; klasorAdi: string | null; kurulumHazir?: boolean; eksikler?: string[]; tabloHazir?: boolean; koptu?: boolean }

// Google yenileme anahtarını reddettiğinde (izin geri alındı, anahtar süresi doldu, istemci silindi) bağlantı
// kalıcı olarak kopmuştur ve admin yeniden bağlamalıdır. Ağ/geçici hatalar kopma sayılmaz.
const KOPMA_KODLARI = /invalid_grant|unauthorized_client|invalid_client|deleted_client/;
export function driveBaglantiKopmaMi(hata: unknown): boolean {
  const e = hata as { response?: { data?: { error?: unknown } }; message?: unknown } | null;
  const kod = typeof e?.response?.data?.error === "string" ? e.response.data.error : typeof e?.message === "string" ? e.message : "";
  return KOPMA_KODLARI.test(kod);
}
const TUR: Record<string, string> = {
  pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp",
};
export function driveDosyasiDogrula(girdi: { ad: unknown; boyut: unknown }) {
  if (typeof girdi.ad !== "string" || !girdi.ad.trim() || girdi.ad.length > 180 || /[\\/\u0000-\u001f]/.test(girdi.ad)) throw new Error("Geçerli bir dosya adı seçin (en fazla 180 karakter).");
  const tur = TUR[girdi.ad.split(".").pop()?.toLowerCase() ?? ""];
  if (!tur) throw new Error("PDF, Word, Excel, PowerPoint, TXT, PNG, JPG veya WEBP seçin.");
  if (typeof girdi.boyut !== "number" || !Number.isSafeInteger(girdi.boyut) || girdi.boyut < 1 || girdi.boyut > DRIVE_EK_BOYUTU) throw new Error("Dosya 0–25 MB arasında olmalı.");
  return { ad: girdi.ad.trim(), boyut: girdi.boyut, tur };
}
// Uzantı tek başına güvenilmez: yetkili bir kullanıcı "föy.pdf" adıyla başka içerik
// yükleyebilir ve dosya herkese açık klasörde durur. Tamamlama adımında dosyanın
// ilk baytları uzantıyla karşılaştırılır (25.10.2026 incelemesi).
const DRIVE_IMZA_BAYT = 16;
const zipMi = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
const imzalar: Record<string, (b: Uint8Array) => boolean> = {
  pdf: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d,
  png: (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v),
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  webp: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  docx: zipMi, xlsx: zipMi, pptx: zipMi,
  // Eski Office biçimleri (OLE2 bileşik belge).
  doc: (b) => [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every((v, i) => b[i] === v),
  // Düz metin: ilk baytlarda NUL / kontrol karakteri olmamalı.
  txt: (b) => b.length > 0 && Array.from(b).every((v) => v === 0x09 || v === 0x0a || v === 0x0d || v >= 0x20),
};
imzalar.jpeg = imzalar.jpg; imzalar.xls = imzalar.doc; imzalar.ppt = imzalar.doc;
export const DRIVE_IMZA_OKUMA_BAYTI = DRIVE_IMZA_BAYT;
export function driveIcerikUygunMu(dosyaAdi: string, ilkBaytlar: Uint8Array): boolean {
  const kontrol = imzalar[dosyaAdi.split(".").pop()?.toLowerCase() ?? ""];
  return !!kontrol && kontrol(ilkBaytlar);
}
export function driveKimligi(id: unknown): id is string { return typeof id === "string" && /^[A-Za-z0-9_-]{10,200}$/.test(id); }
export function driveDosyaAdresi(id: string) {
  if (!driveKimligi(id)) throw new Error("Geçersiz Drive dosyası.");
  return `https://drive.google.com/file/d/${id}/view`;
}
export function driveYuklemeAdresi(adres: string): boolean {
  try { const u = new URL(adres); return u.protocol === "https:" && u.hostname === "www.googleapis.com" && !u.username && !u.password && !u.port && u.pathname === "/upload/drive/v3/files" && !!u.searchParams.get("upload_id"); } catch { return false; }
}
export function drivePaylasimMetni(baslik: string, ekler: DriveEki[]): string {
  return ekler.length ? [baslik, "Ek dosyalar:", ...ekler.map((e) => `${e.ad}\n${driveDosyaAdresi(e.id)}`)].join("\n\n") : "";
}
