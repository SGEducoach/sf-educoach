import "server-only";
import type { PdfOgesi } from "@/lib/pdf-metni";

// pdfjs-dist'i Vercel'de güvenle yüklemek: gerçek canvas render'ı yapmadığımız
// için (yalnızca getTextContent) DOMMatrix/Path2D için no-op stub yeterli, ama
// stub'lar ESM statik import'undan ÖNCE kurulamadığı için pdfjs DİNAMİK
// yükleniyor (aynı gerekçe: src/lib/deneme-pdf-ayristirici.ts).
function pdfjsPolyfilleriKur(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  if (typeof g.DOMMatrix === "undefined") g.DOMMatrix = class DOMMatrix {};
  if (typeof g.Path2D === "undefined") g.Path2D = class Path2D {};
}

type GetDocumentTuru = (parametreler: { data: Uint8Array; disableFontFace?: boolean; standardFontDataUrl?: string }) => {
  promise: Promise<{
    numPages: number;
    getPage: (sayfaNo: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }>;
  }>;
};

let getDocumentSozu: Promise<GetDocumentTuru> | null = null;
function pdfjsGetDocument(): Promise<GetDocumentTuru> {
  if (!getDocumentSozu) {
    pdfjsPolyfilleriKur();
    getDocumentSozu = import("pdfjs-dist/legacy/build/pdf.mjs").then((m) => m.getDocument as unknown as GetDocumentTuru);
  }
  return getDocumentSozu;
}

function metinOgesiMi(oge: unknown): oge is { str: string; width: number; transform: number[] } {
  return typeof oge === "object" && oge !== null && "transform" in oge && "str" in oge;
}

// PDF'teki her metin parçasını sayfa numarası, konum ve genişliğiyle döndürür
// (çözümleyiciler: ders-programi-pdf.ts, yurt-nobeti-pdf.ts).
export async function pdfOgeleriniCikar(veri: Uint8Array, enFazlaSayfa = 60): Promise<PdfOgesi[]> {
  const belge = await (await pdfjsGetDocument())({ data: veri, disableFontFace: true, standardFontDataUrl: undefined }).promise;
  const ogeler: PdfOgesi[] = [];
  const sayfaSayisi = Math.min(belge.numPages, enFazlaSayfa);
  for (let sayfaNo = 1; sayfaNo <= sayfaSayisi; sayfaNo++) {
    const sayfa = await belge.getPage(sayfaNo);
    const icerik = await sayfa.getTextContent();
    for (const oge of icerik.items) {
      if (!metinOgesiMi(oge) || !oge.str.trim()) continue;
      ogeler.push({ sayfa: sayfaNo, metin: oge.str, x: oge.transform[4], y: oge.transform[5], genislik: oge.width });
    }
  }
  return ogeler;
}
