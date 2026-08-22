// Gündüz: beyaz zemin + ÖSYM mavisi. Gece: siyah zemin + ÖSYM kırmızısı.
// (bkz. globals.css — tema geçişi TemaDenetimi.tsx'te sistem tercihine göre.)
export const BG0 = "var(--sfec-bg0)";
export const BG1 = "var(--sfec-bg1)";
export const BG1_ALT = "var(--sfec-bg1-alt)";
export const BORDER = "var(--sfec-border)";
export const BORDER_STRONG = "var(--sfec-border-strong)";
export const TEXT = "var(--sfec-text)";
export const TEXT_MUTED = "var(--sfec-text-muted)";

export const MINT = "var(--sfec-mint)";
export const MINT_BG = "var(--sfec-mint-bg)";
export const MINT_ON = "var(--sfec-mint-on)";
export const SKY = "#2563EB";
export const SKY_BG = "rgba(143,198,255,0.14)";
export const PEACH = "#C2410C";
export const PEACH_BG = "rgba(255,177,153,0.15)";
export const BUTTER = "#A16207";
export const BUTTER_BG = "rgba(255,217,131,0.15)";
export const BLUSH = "#E11D48";
export const BLUSH_BG = "rgba(255,159,180,0.15)";
export const LILAC = "#7C3AED";
export const LILAC_BG = "rgba(199,182,255,0.15)";
export const SEAFOAM = "var(--sfec-seafoam)";

// "SeFu Koç" marka renkleri — isim ÖSYM mavisi, slogan ÖSYM kırmızısı
// (kullanıcı kararı). Slogandaki vurgulu baş harfler (S/G/F/D) için ayrı
// bir vurgu tonu var. Gece temasında kontrast için ikisi de aydınlatılır
// (bkz. globals.css, :root[data-theme="koyu"]).
export const SEFU_MAVI = "var(--sfec-marka-mavi)";
export const SEFU_KIRMIZI = "var(--sfec-marka-kirmizi)";
export const SEFU_KIRMIZI_VURGU = "var(--sfec-marka-kirmizi-vurgu)";

// Üst navigatör zemini — gündüz sedefli beyaz, gece piano black.
export const NAV_BG = "var(--sfec-nav-bg)";

export const dersRenkleri: Record<string, string> = {
  Matematik: MINT,
  Fizik: SKY,
  Kimya: BUTTER,
  Biyoloji: SEAFOAM,
  Türkçe: PEACH,
  Tarih: LILAC,
};
