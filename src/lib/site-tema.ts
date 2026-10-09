// Site teması — admin paneli "Site ayarları" bölümünden seçilebilen İKİ tema
// (2026-09-06 genişletme: önceden sadece zemin rengi seçilebiliyordu; artık
// tema zemin + kutu içi + kenarlık + font renklerinin tamamını kapsıyor).
//
// 09.10.2026: palet 7 temadan 2'ye indirildi (kullanıcı kararı: "fazlalık
// temaları kaldır, zaten ikisi kullanılıyor"). Silinenler: Boğaziçi Mavisi,
// Uludağ Yeşili, ODTÜ, İstanbul, Ege — veritabanında seçili olan tema
// "gece-siyahi" idi (kontrol edildi), bu yüzden hiçbir ayar kırılmadı.
// Kalan ikisi YAPISAL olarak gerekli: gece modu VARSAYILAN_TEMA'yı,
// gündüz modu tek açık temayı (acik: true) kullanıyor. Eski bir kimlik
// kayıtlıysa temaBul zaten varsayılana düşürüyor.
// Değer app_ayarlari tablosunda "site_arka_plan_rengi" anahtarıyla saklanır
// (anahtar adı ve tablo korunuyor — yeni tablo/migration gerekmez; eski hex
// kayıtlar otomatik olarak varsayılan "gece-siyahi" temasına düşer, bkz.
// temaBul). Select politikası herkese açık, yazma service-role/admin.
//
// Gece Siyahı koyu zemin prensibini (Bulgu 11) taşır; Pamukkale bunun
// bilinçli istisnasıdır ve yalnızca gündüz modunda devreye girer. İkisi de
// el ile tayin edilmiş kontrast uyumlu renk çiftleri kullanır — font TİPİ
// hiç değişmez (Montserrat), sadece renk değişkenleri temaya göre eşlenir.
//
// YENİ RENK/EFEKT EKLERKEN: değeri sabit yazma, jeton kullan. İki tema
// birbirinin zıddı olduğu için (koyu zemin / beyaz panel) sabit bir renk
// birinde mutlaka yanlış düşer — ör. beyaz bir "üstten ışık" Pamukkale'nin
// beyaz panelinde görünmez (bkz. globals.css'teki data-tema koşulu).
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
    // Saydam panel zemini — cam yüzeyler için (backdrop-filter ile birlikte).
    // Sabit rgba olarak tutuluyor: color-mix() derleyicide sadeleşip opak
    // renge iniyor (odak halkasında tarayıcıda ölçüldü).
    panelCam: string;
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
  // Açık zeminli tema (gündüz modunda kullanılan) — gece modunun teması olamaz.
  acik?: boolean;
}

export const SITE_TEMA_PALETI: SiteTemasi[] = [
  {
    id: "gece-siyahi",
    ad: "Gece Siyahı",
    aciklama: "Klasik SeFu Koç teması",
    degisken: {
      background: "#08090b", foreground: "#c2e9f8",
      bg0: "#08090b", bg1: "#111316", bg1Alt: "#191a1d",
      border: "#24282e", borderStrong: "#343b44",
      text: "#c2e9f8", textMuted: "#8fc6d9",
      mint: "#c2e9f8", mintOn: "#0b3b4d", mintBg: "rgba(194, 233, 248, 0.18)",
      panelCam: "rgba(23, 26, 30, 0.72)",
      seafoam: "#78c9e8", shellBg: "#0b0c0f",
      navBg: "linear-gradient(135deg, #08090b 0%, #181a1e 50%, #08090b 100%)",
      markaMavi: "#c2e9f8", markaKirmizi: "#c2e9f8", markaKirmiziVurgu: "#78c9e8",
    },
    logoHueRotate: 167,
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
      border: "#d2e0ec", borderStrong: "#b9ccdc",
      text: "#0a1e3d", textMuted: "#3d5a80",
      mint: "#1a365d", mintOn: "#f0f8ff", mintBg: "rgba(43, 90, 140, 0.14)",
      panelCam: "rgba(255, 255, 255, 0.72)",
      seafoam: "#2b5a8c", shellBg: "#dcebf7",
      navBg: "linear-gradient(135deg, #eaf4fc 0%, #ffffff 50%, #eaf4fc 100%)",
      markaMavi: "#1a365d", markaKirmizi: "#1a365d", markaKirmiziVurgu: "#2b5a8c",
    },
    logoHueRotate: 0,
    // Açık zeminde logo koyu lacivert olmalı — beyaz-boyayan varsayılan
    // filtre yerine koyuya boyayan tam filtre kullanılır.
    logoFiltre: "brightness(0) saturate(100%) invert(12%) sepia(35%) saturate(1500%) hue-rotate(195deg) brightness(95%) contrast(95%)",
    acik: true,
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
function temaBlogu(tema: SiteTemasi, secici: string): string {
  const d = tema.degisken;
  return (
    `${secici}{` +
    `--background:${d.background};--foreground:${d.foreground};` +
    `--sfec-bg0:${d.bg0};--sfec-bg1:${d.bg1};--sfec-bg1-alt:${d.bg1Alt};` +
    `--sfec-border:${d.border};--sfec-border-strong:${d.borderStrong};` +
    `--sfec-text:${d.text};--sfec-text-muted:${d.textMuted};` +
    `--sfec-mint:${d.mint};--sfec-mint-on:${d.mintOn};--sfec-mint-bg:${d.mintBg};` +
    `--sfec-panel-cam:${d.panelCam};` +
    `--sfec-seafoam:${d.seafoam};--sfec-shell-bg:${d.shellBg};--sfec-nav-bg:${d.navBg};` +
    `--sfec-marka-mavi:${d.markaMavi};--sfec-marka-kirmizi:${d.markaKirmizi};--sfec-marka-kirmizi-vurgu:${d.markaKirmiziVurgu};}` +
    `${secici === ":root" ? "" : `${secici} `}.sfec-brand-logo{filter:${tema.logoFiltre ?? `brightness(0) saturate(100%) invert(89%) sepia(18%) saturate(749%) hue-rotate(${tema.logoHueRotate}deg) brightness(104%) contrast(95%)`};}`
  );
}

export function temaCssUret(tema: SiteTemasi): string | null {
  if (tema.id === VARSAYILAN_TEMA.id) return null;
  return temaBlogu(tema, ":root");
}

// Gündüz modunun teması: paletteki en açık tema (Pamukkale).
export const GUNDUZ_TEMASI = SITE_TEMA_PALETI.find((t) => t.acik) ?? VARSAYILAN_TEMA;

// Gece/gündüz (kullanıcı isteği 27.09.2026, bkz. gunduz-gece.ts). Gece =
// admin'in seçtiği site teması (açık bir tema seçildiyse Gece Siyahı);
// <html data-tema="gunduz"> iken en açık tema geçerli. globals.css'te
// değişkenle tanımlı olmayan koyu gölge/hero zemini de gündüzde yumuşatılır.
export function gunduzGeceCssUret(siteTemasi: SiteTemasi): string {
  const gece = siteTemasi.acik ? VARSAYILAN_TEMA : siteTemasi;
  const gunduzSecici = ':root[data-tema="gunduz"]';
  return (
    (temaCssUret(gece) ?? "") +
    temaBlogu(GUNDUZ_TEMASI, gunduzSecici) +
    `${gunduzSecici}{color-scheme:light;--sfec-panel-shadow:0 10px 24px rgba(15,40,70,0.12);` +
    `--sfec-hero-bg:linear-gradient(135deg,#ffffff 0%,#eaf4fc 62%,#dcebf7 100%);}`
  );
}

// Not: sunucuda değeri okuyan siteTemaGetir() yardımcısı bu dosyaya değil
// src/lib/app-ayarlari.ts'e kondu — bu modül istemci bileşenleri tarafından
// da import edildiği için "server-only" bağımlılık (next/headers) içeremez.
