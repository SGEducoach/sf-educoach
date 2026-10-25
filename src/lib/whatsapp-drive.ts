// İstemci ve sunucunun ortak ek dosya sınırları. Google kimlik bilgisi içermez.
export const DRIVE_EK_SAYISI = 5;
export const DRIVE_EK_BOYUTU = 25 * 1024 * 1024;
export const DRIVE_EK_KABUL = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.webp";
export interface DriveEki { id: string; ad: string; adres: string; qr?: string }
export interface DriveDurumu { hazir: boolean; bagli: boolean; klasorAdi: string | null; kurulumHazir?: boolean; eksikler?: string[]; tabloHazir?: boolean }
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
