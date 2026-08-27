import { TYT_DERSLERI, AYT_DERSLERI, BRANS_DENEMESI_DERSLERI } from "@/lib/types";
import type { DenemeTuru } from "@/lib/types";

// Bir deneme türü için geçerli ders adları — hem PDF hem Excel toplu sonuç
// yükleme yollarında (dashboard/deneme-pdf-actions.ts) VE Excel şablonu
// üretiminde (api/dershane/deneme-sablonu) ortak kullanılıyor. "use server"
// dosyasından (deneme-pdf-actions.ts) senkron bir fonksiyon export edilemediği
// için (Server Action'lar async olmak zorunda) burada, ayrı bir modülde.
export function gecerliDersler(tur: DenemeTuru): string[] {
  if (tur === "TYT") return [...TYT_DERSLERI];
  if (tur === "BRANS") return [...BRANS_DENEMESI_DERSLERI];
  return [...new Set(Object.values(AYT_DERSLERI).flat())];
}
