// Site ana temasının arka plan (siyahlık) rengi — admin paneli
// "Site ayarları" bölümünden seçilebilen 6 sabit pastel ton. Değer
// app_ayarlari tablosunda "site_arka_plan_rengi" anahtarıyla saklanır
// (yeni tablo/migration gerekmez: select politikası herkese açık, yazma
// zaten service-role üzerinden admin'e ait).
//
// Palet mevcut siyahtan açığa doğru ilerler; gece kullanımında göz
// yormaması için sade mavi-lavanta pastel tonları seçildi. Tam beyaz
// bilinçli olarak yok: metin renkleri açık tonlarda, beyaz zemin metni
// okunamaz kılardı.
export const SITE_TEMA_ANAHTAR = "site_arka_plan_rengi";

export interface SiteTemaRengi {
  renk: string; // ana zemin rengi (hex)
  ad: string;
}

export const SITE_TEMA_PALETI: SiteTemaRengi[] = [
  { renk: "#08090b", ad: "Gece siyahı" }, // mevcut varsayılan
  { renk: "#12151f", ad: "Füme" },
  { renk: "#1a2030", ad: "Gece mavisi" },
  { renk: "#252c45", ad: "Pastel çivit" },
  { renk: "#353d5c", ad: "Pastel lavanta" },
  { renk: "#4b5476", ad: "Açık pastel" },
];

export const VARSAYILAN_TEMA_RENGI = SITE_TEMA_PALETI[0].renk;

export function temaRengiGecerliMi(renk: string): boolean {
  return SITE_TEMA_PALETI.some((t) => t.renk === renk);
}

// Not: sunucuda değeri okuyan siteTemaRengiGetir() yardımcısı bu dosyaya
// değil src/lib/app-ayarlari.ts'e kondu — bu modül istemci bileşenleri
// tarafından da import edildiği için "server-only" bağımlılık
// (next/headers) içeremez.

// Hex rengi beyaza doğru karıştırır (yüzde 0-100). Kabuk ve menü
// gradyanını seçilen zemine uyumlu hale getirmek için kullanılır.
export function temaRengiAc(hex: string, yuzde: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const k = (v: number) => Math.round(v + (255 - v) * (yuzde / 100));
  return `#${[k(r), k(g), k(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
