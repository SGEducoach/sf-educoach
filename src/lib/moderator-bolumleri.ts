// Moderatör paneli bölümleri (kullanıcı isteği 03.10.2026) — menü
// (components/moderator/ModeratorNavigasyonu.tsx) ve /moderator sayfası
// aynı listeyi kullanır.
export const MODERATOR_PANEL_BOLUMLERI = ["ogrenciler", "ogretmenler", "siniflar", "kurum", "deneme-yukle", "pdf-eslesme"] as const;
export type ModeratorPanelBolumu = (typeof MODERATOR_PANEL_BOLUMLERI)[number];
export type ModeratorMenuOgesi = ModeratorPanelBolumu | "konu-haritasi" | "kurum-konulari" | "profil";

// denemeAcik: kurumda deneme yükleme/eşleştirme bölümleri var mı (dershane
// ve okul; 16.10.2026'ya kadar yalnız dershane).
export function moderatorBolumuCoz(ham: string | undefined, denemeAcik: boolean): ModeratorPanelBolumu {
  const bolum = (MODERATOR_PANEL_BOLUMLERI as readonly string[]).includes(ham ?? "") ? ham as ModeratorPanelBolumu : "ogrenciler";
  if (!denemeAcik && (bolum === "deneme-yukle" || bolum === "pdf-eslesme")) return "ogrenciler";
  return bolum;
}
