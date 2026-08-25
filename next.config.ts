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
};

export default nextConfig;
