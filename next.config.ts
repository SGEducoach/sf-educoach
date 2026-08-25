import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Varsayılan 1MB — dershane deneme sonuç PDF'i (taranmış/görsel
    // olabiliyor, bkz. deneme-pdf-actions.ts) bunu kolayca aşıyor.
    // Server Action'a giden ham istek gövdesi için üst sınır.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  // pdfjs-dist (bkz. deneme-pdf-ayristirici.ts) Next.js'in server bundle'ına
  // dahil edilince (Turbopack) Vercel'in derleme/çalışma ortamında
  // "ReferenceError: DOMMatrix is not defined" ile MODÜL YÜKLEME anında
  // çöküyordu — bu da o modülü (dolayısıyla deneme-pdf-actions.ts'i)
  // paylaşan chunk'a giren HER server action'ı (çıkış yapma, hesap silme,
  // veli talebi onaylama vb.) canlıda kırıyordu (2026-08-25'te keşfedildi,
  // yerelde ASLA tekrarlanmadı — sadece Vercel'in derlemesinde ortaya
  // çıkıyor). pdfjs-dist Node'a özgü davranışını (require ile, kendi
  // ortam algılamasıyla) koruyabilsin diye bundle DIŞINDA tutuluyor.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
