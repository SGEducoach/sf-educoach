// Duyurular düzeni (kullanıcı isteği 19.10.2026): üstte Site İçi / WhatsApp,
// her birinin altında Genel Duyurular ve Yurt Duyuruları. Kimin hangi
// bölümü göreceği tek yerde; sayfa ve paneller aynı kuralı kullanır.
export type DuyuruTuru = "site" | "whatsapp";
export type DuyuruAlani = "genel" | "yurt";
export interface DuyuruSecenekleri { site: DuyuruAlani[]; whatsapp: DuyuruAlani[] }

export function duyuruSecenekleri(k: {
  mudur: boolean;
  rehber: boolean;          // rehberlik servisi üyesi ya da idare (müdür yardımcısı)
  sinifOgretmeni: boolean;
  yurtlu: boolean;
  idareYurt?: "ek" | "yalniz";
}): DuyuruSecenekleri {
  const yalnizYurt = k.idareYurt === "yalniz";
  const site: DuyuruAlani[] = [];
  const whatsapp: DuyuruAlani[] = [];
  if (!yalnizYurt && (k.mudur || k.rehber || k.sinifOgretmeni)) site.push("genel");
  // Site içi yurt duyurusu yurt öğrencilerine ve velilerine gider: müdür ve
  // yurt sorumlusu müdür yardımcısı.
  if (k.yurtlu && (k.mudur || !!k.idareYurt)) site.push("yurt");
  // Sınıf öğretmeni de WhatsApp genel duyurusu hazırlar; yalnız serbest
  // metinli Genel Duyuru kartıyla (yalnizGenelKart, kullanıcı bildirimi 19.10.2026).
  if (!yalnizYurt && (k.mudur || k.rehber || k.sinifOgretmeni)) whatsapp.push("genel");
  // Yurt listesi kartlarını yurtlu kurumda her öğretmen hazırlar.
  if (k.yurtlu) whatsapp.push("yurt");
  return { site, whatsapp };
}

// Müdür ve rehber kurumun bütün WhatsApp kartlarını hazırlar; öğretmen
// yalnız Genel Duyuru kartını.
export const yalnizGenelKartMi = (k: { mudur: boolean; rehber: boolean }) => !k.mudur && !k.rehber;

// Adresteki tür geçersizse ya da o türde bölüm yoksa ilk uygun tür seçilir.
export function seciliDuyuruTuru(s: DuyuruSecenekleri, tur: string | undefined): DuyuruTuru | null {
  if (tur === "whatsapp" && s.whatsapp.length > 0) return "whatsapp";
  if (s.site.length > 0) return "site";
  return s.whatsapp.length > 0 ? "whatsapp" : null;
}

export function seciliDuyuruAlani(alanlar: DuyuruAlani[], alan: string | undefined): DuyuruAlani | null {
  return alanlar.find((a) => a === alan) ?? alanlar[0] ?? null;
}

export function duyuruAdresi(tur: DuyuruTuru, alan?: DuyuruAlani): string {
  const p = new URLSearchParams();
  if (tur === "whatsapp") p.set("tur", "whatsapp");
  if (alan === "yurt") p.set("alan", "yurt");
  const q = p.toString();
  return `/dashboard/duyurular${q ? `?${q}` : ""}`;
}
