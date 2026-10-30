import surumler from "./duyuru-foto-surumleri.json";

export const FOTO_KOKU = "/duyuru-fotograflari/";

// Bu JPG'ler bir yıl immutable önbellekte. Dosyanın içeriği değiştiğinde
// URL de değişmeli; admin, seçim düğmesi ve canvas aynı adresi kullanır.
// Fotoğraf değiştirince: node scripts/guncelle-duyuru-foto-surumleri.mjs
export function yerlesikFotoAdresi(dosya: string): string {
  const surum = (surumler as Record<string, string>)[dosya];
  return `${FOTO_KOKU}${dosya}${surum ? `?v=${surum}` : ""}`;
}
