// pdfjs'in worker derlemesinin tip tanımı yok; onu yalnızca
// globalThis.pdfjsWorker'a yerleştirmek için import ediyoruz (bkz.
// src/lib/pdf-oge.ts — Vercel'de "fake worker" dosya yolundan yüklenemiyor).
declare module "pdfjs-dist/legacy/build/pdf.worker.mjs";
