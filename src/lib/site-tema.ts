// Site teması — admin paneli "Site ayarları" bölümünden seçilebilen 7 sabit
// tema (2026-09-06 genişletme: önceden sadece zemin rengi seçilebiliyordu;
// artık tema zemin + kutu içi + kenarlık + font renklerinin tamamını kapsıyor).
// Değer app_ayarlari tablosunda "site_arka_plan_rengi" anahtarıyla saklanır
// (anahtar adı ve tablo korunuyor — yeni tablo/migration gerekmez; eski hex
// kayıtlar otomatik olarak varsayılan "gece-siyahi" temasına düşer, bkz.
// temaBul). Select politikası herkese açık, yazma service-role/admin.
//
// Tema ilhamı: dokumanlar/tema/ornek_1.jpeg (Windows 7 Aero — Boğaziçi
// Mavisi) ve ornek_2.jpeg (Vista/7 aurora — Uludağ Yeşili). Kalan üç tema
// üniversite isimleriyle motivasyon amaçlıdır (ODTÜ, İstanbul, Ege).
// ODTÜ kullanıcı onayıyla yumuşatılmış kızıl/bozkır tonlarındadır.
//
// Her tema koyu zemin prensibini korur (Bulgu 11: site tek koyu temada
// çalışır) ve el ile tayin edilmiş kontrast uyumlu renk çiftleri taşır —
// font TİPİ hiç değişmez (Montserrat), sadece renk değişkenleri temaya
// göre eşelenir.
export const SITE_TEMA_ANAHTAR = "site_arka_plan_rengi";

export interface SiteTemasi {
  id: string;
  ad: string;
  aciklama: string; // nostaljik gönderme / kısa alt yazı
  // globals.css :root'undaki karşılıklar. Tamamı tam renk — RootLayout
  // bu haritayı tek bir :root override bloğuna çevirir.
  degisken: {
    background: string;
    foreground: string;
    bg0: string;
    bg1: string;
    bg1Alt: string;
    border: string;
    borderStrong: string;
    text: string;
    textMuted: string;
    mint: string;
    mintOn: string;
    mintBg: string;
    seafoam: string;
    shellBg: string;
    navBg: string;
    markaMavi: string;
    markaKirmizi: string;
    markaKirmiziVurgu: string;
  };
  // globals.css'teki .sfec-brand-logo filtresi sabit ÖSYM mavisine boyuyor
  // (koyu zeminlerde okunur). Pamukkale açık zeminde çalışır; onun için tam
  // filtre override gerekir. Koyu temalarda marka uyumu sadece hue-rotate
  // basamağının değiştirilmesiyle sağlanır (gerisi globals.css'tekiyle aynı).
  logoHueRotate: number;
  // Tanımlıysa logo filtresi tamamen bu değerle ezilir (açık temalar).
  logoFiltre?: string;
}

export const SITE_TEMA_PALETI: SiteTemasi[] = [
  {
    id: "gece-siyahi",
    ad: "Gece Siyahı",
    aciklama: "Klasik SeFu Koç teması",
    degisken: {
      background: "#08090b", foreground: "#c2e9f8",
      bg0: "#08090b", bg1: "#111316", bg1Alt: "#191a1d",
      border: "#111316", borderStrong: "#111316",
      text: "#c2e9f8", textMuted: "#8fc6d9",
      mint: "#c2e9f8", mintOn: "#0b3b4d", mintBg: "rgba(194, 233, 248, 0.18)",
      seafoam: "#78c9e8", shellBg: "#0b0c0f",
      navBg: "linear-gradient(135deg, #08090b 0%, #181a1e 50%, #08090b 100%)",
      markaMavi: "#c2e9f8", markaKirmizi: "#c2e9f8", markaKirmiziVurgu: "#78c9e8",
    },
    logoHueRotate: 167,
  },
  {
    id: "bogazici-mavisi",
    ad: "Boğaziçi Mavisi",
    aciklama: "Windows 7 Aero'nun cam mavisi",
    degisken: {
      background: "#0a1a32", foreground: "#e3f1ff",
      bg0: "#0a1a32", bg1: "#10254a", bg1Alt: "#16305c",
      border: "#10254a", borderStrong: "#10254a",
      text: "#e3f1ff", textMuted: "#9cc3e8",
      mint: "#aee0ff", mintOn: "#083a6b", mintBg: "rgba(174, 224, 255, 0.18)",
      seafoam: "#8fd0ff", shellBg: "#071124",
      navBg: "linear-gradient(135deg, #0a1a32 0%, #17365e 50%, #0a1a32 100%)",
      markaMavi: "#aee0ff", markaKirmizi: "#aee0ff", markaKirmiziVurgu: "#8fd0ff",
    },
    logoHueRotate: 173,
  },
  {
    id: "uludag-yesili",
    ad: "Uludağ Yeşili",
    aciklama: "Windows Vista aurorasının yeşili",
    degisken: {
      background: "#081c12", foreground: "#d9f7e5",
      bg0: "#081c12", bg1: "#0e2a1c", bg1Alt: "#143626",
      border: "#0e2a1c", borderStrong: "#0e2a1c",
      text: "#d9f7e5", textMuted: "#94d4b1",
      mint: "#aef2cd", mintOn: "#0b4a2c", mintBg: "rgba(174, 242, 205, 0.16)",
      seafoam: "#8fe6b4", shellBg: "#060f0a",
      navBg: "linear-gradient(135deg, #081c12 0%, #10301f 50%, #081c12 100%)",
      markaMavi: "#aef2cd", markaKirmizi: "#aef2cd", markaKirmiziVurgu: "#8fe6b4",
    },
    logoHueRotate: 117,
  },
  {
    id: "odtu",
    ad: "ODTÜ",
    aciklama: "Yumuşatılmış kızıl — bozkır akşamı",
    degisken: {
      background: "#1c0d0f", foreground: "#ffe9e2",
      bg0: "#1c0d0f", bg1: "#2b1417", bg1Alt: "#381a1e",
      border: "#2b1417", borderStrong: "#2b1417",
      text: "#ffe9e2", textMuted: "#e2a89b",
      mint: "#ffc7bb", mintOn: "#5c1712", mintBg: "rgba(255, 199, 187, 0.16)",
      seafoam: "#f0a095", shellBg: "#14090a",
      navBg: "linear-gradient(135deg, #1c0d0f 0%, #331517 50%, #1c0d0f 100%)",
      markaMavi: "#ffc7bb", markaKirmizi: "#ffc7bb", markaKirmiziVurgu: "#f0a095",
    },
    logoHueRotate: 319,
  },
  {
    id: "istanbul",
    ad: "İstanbul",
    aciklama: "Sarı-lacivert çınar gölgesi",
    degisken: {
      background: "#0b0f2a", foreground: "#e8eaff",
      bg0: "#0b0f2a", bg1: "#12184a", bg1Alt: "#1a2260",
      border: "#12184a", borderStrong: "#12184a",
      text: "#e8eaff", textMuted: "#aab0e6",
      mint: "#ffd766", mintOn: "#4a3800", mintBg: "rgba(255, 215, 102, 0.16)",
      seafoam: "#aab0e6", shellBg: "#080b22",
      navBg: "linear-gradient(135deg, #0b0f2a 0%, #1a2058 50%, #0b0f2a 100%)",
      markaMavi: "#e8eaff", markaKirmizi: "#ffd766", markaKirmiziVurgu: "#ffd766",
    },
    logoHueRotate: 205,
  },
  {
    id: "ege",
    ad: "Ege",
    aciklama: "Ege Denizi'nin turkuazı",
    degisken: {
      background: "#062226", foreground: "#d4f7fa",
      bg0: "#062226", bg1: "#0a3238", bg1Alt: "#0f3f47",
      border: "#0a3238", borderStrong: "#0a3238",
      text: "#d4f7fa", textMuted: "#88cbd2",
      mint: "#8ff0f5", mintOn: "#074a52", mintBg: "rgba(143, 240, 245, 0.16)",
      seafoam: "#5fe0e8", shellBg: "#041618",
      navBg: "linear-gradient(135deg, #062226 0%, #0d3a40 50%, #062226 100%)",
      markaMavi: "#8ff0f5", markaKirmizi: "#8ff0f5", markaKirmiziVurgu: "#5fe0e8",
    },
    logoHueRotate: 152,
  },
  {
    id: "pamukkale",
    ad: "Pamukkale",
    aciklama: "Traverten beyazı — tek açık tema",
    // Sitenin tek AÇIK teması: Bulgu 11'deki "sadece koyu" kuralının bilinçli
    // istisnası (kullanıcı isteği, 2026-08'deki kart maketi). Metin renkleri
    // koyu lacivert tonlarına çevrilir; sabit rgba vurgular (SKY/BLUSH vb.)
    // açık zeminde de okunur kalır.
    degisken: {
      background: "#eaf4fc", foreground: "#0a1e3d",
      bg0: "#eaf4fc", bg1: "#ffffff", bg1Alt: "#dcebf7",
      border: "#ffffff", borderStrong: "#ffffff",
      text: "#0a1e3d", textMuted: "#3d5a80",
      mint: "#1a365d", mintOn: "#f0f8ff", mintBg: "rgba(43, 90, 140, 0.14)",
      seafoam: "#2b5a8c", shellBg: "#dcebf7",
      navBg: "linear-gradient(135deg, #eaf4fc 0%, #ffffff 50%, #eaf4fc 100%)",
      markaMavi: "#1a365d", markaKirmizi: "#1a365d", markaKirmiziVurgu: "#2b5a8c",
    },
    logoHueRotate: 0,
    // Açık zeminde logo koyu lacivert olmalı — beyaz-boyayan varsayılan
    // filtre yerine koyuya boyayan tam filtre kullanılır.
    logoFiltre: "brightness(0) saturate(100%) invert(12%) sepia(35%) saturate(1500%) hue-rotate(195deg) brightness(95%) contrast(95%)",
  },
];

export const VARSAYILAN_TEMA = SITE_TEMA_PALETI[0];

export function temaGecerliMi(id: string): boolean {
  return SITE_TEMA_PALETI.some((t) => t.id === id);
}

// Kayıtlı değer tema kimliği değilse (ör. eski paletten kalma bir hex)
// varsayılan temaya düşer — eski veri hiçbir yerde kırılmaz.
export function temaBul(deger: string | null | undefined): SiteTemasi {
  return SITE_TEMA_PALETI.find((t) => t.id === deger) ?? VARSAYILAN_TEMA;
}

// RootLayout'un <style> içine yazacağı tam tema override bloğu. Varsayılan
// temada null döner: globals.css'teki :root değerleri aynen geçerli kalır
// (mevcut davranış korunur). Logo filtresi de marka uyumu için temaya göre
// yazılır (globals.css'teki .sfec-brand-logo filtresinin hue-rotate
// basamağı değiştirilir, gerisi aynı tutulur).
export function temaCssUret(tema: SiteTemasi): string | null {
  if (tema.id === VARSAYILAN_TEMA.id) return null;
  const d = tema.degisken;
  return (
    `:root{` +
    `--background:${d.background};--foreground:${d.foreground};` +
    `--sfec-bg0:${d.bg0};--sfec-bg1:${d.bg1};--sfec-bg1-alt:${d.bg1Alt};` +
    `--sfec-border:${d.border};--sfec-border-strong:${d.borderStrong};` +
    `--sfec-text:${d.text};--sfec-text-muted:${d.textMuted};` +
    `--sfec-mint:${d.mint};--sfec-mint-on:${d.mintOn};--sfec-mint-bg:${d.mintBg};` +
    `--sfec-seafoam:${d.seafoam};--sfec-shell-bg:${d.shellBg};--sfec-nav-bg:${d.navBg};` +
    `--sfec-marka-mavi:${d.markaMavi};--sfec-marka-kirmizi:${d.markaKirmizi};--sfec-marka-kirmizi-vurgu:${d.markaKirmiziVurgu};}` +
    `.sfec-brand-logo{filter:${tema.logoFiltre ?? `brightness(0) saturate(100%) invert(89%) sepia(18%) saturate(749%) hue-rotate(${tema.logoHueRotate}deg) brightness(104%) contrast(95%)`};}`
  );
}

// Not: sunucuda değeri okuyan siteTemaGetir() yardımcısı bu dosyaya değil
// src/lib/app-ayarlari.ts'e kondu — bu modül istemci bileşenleri tarafından
// da import edildiği için "server-only" bağımlılık (next/headers) içeremez.
