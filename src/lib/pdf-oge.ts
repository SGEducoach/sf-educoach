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

// pdfjs, worker verilmediğinde "fake worker"ı pdf.worker.mjs'i DOSYA
// YOLUNDAN dinamik yükleyerek kuruyor; Vercel'in fonksiyon paketine o dosya
// dahil edilmediği için canlıda "Setting up fake worker failed: Cannot find
// module .../pdf.worker.mjs" ile çöküyordu (17.09.2026, nöbet PDF yüklemesi).
// pdfjs önce globalThis.pdfjsWorker'a bakıyor: worker modülünü burada açıkça
// import edip oraya koyunca hem dosya yoluna hiç bakılmıyor hem de sabit
// belirteç sayesinde dosya fonksiyon paketine izleniyor.
async function workeriKur(): Promise<void> {
  const g = globalThis as unknown as Record<string, unknown>;
  if (g.pdfjsWorker) return;
  g.pdfjsWorker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
}

let getDocumentSozu: Promise<GetDocumentTuru> | null = null;
function pdfjsGetDocument(): Promise<GetDocumentTuru> {
  if (!getDocumentSozu) {
    pdfjsPolyfilleriKur();
    getDocumentSozu = (async () => {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      await workeriKur();
      return pdfjs.getDocument as unknown as GetDocumentTuru;
    })();
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
