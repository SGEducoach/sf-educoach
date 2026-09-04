import type { NextConfig } from "next";

// Supabase Storage host'u — next/image'ın uzak görsel optimizasyonu için
// (ana sayfa slider'ı, TG deneme görselleri). Env okunamazsa eklenmez.
let supabaseHost: string | null = null;
try { supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname; } catch { /* yapılandırılmamış */ }

const nextConfig: NextConfig = {
  ...(supabaseHost && {
    images: {
      remotePatterns: [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
    },
  }),
  // public/ altındaki değişmeyen statik görseller için tarayıcıya 1 yıllık
  // önbellek — tekrar ziyaretlerde ağdan tekrar indirilmezler.
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|ico|gif|woff|woff2)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
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
  // çıkıyor). Bunu tek başına çözmedi (@napi-rs/canvas eklemek de
  // yetmedi — Next.js'in dosya izleyicisi o native paketi Vercel'in
  // fonksiyon paketine dahil etmiyordu); asıl çözüm pdfjs-dist'i artık
  // dinamik import + manuel DOMMatrix/Path2D stub'ıyla yüklemek (bkz.
  // deneme-pdf-ayristirici.ts, pdfjsGetDocument). Bu ayar YİNE DE
  // tutuluyor: pdfjs-dist'in kendi iç Node/tarayıcı ortam algılamasını
  // (dinamik require çağrıları) bundling bozmasın diye.
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
