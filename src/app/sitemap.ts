import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { blogYazilariniGetir } from "@/lib/blog";

const TABAN = "https://www.sefukoc.com";

// Kullanıcı isteği (03.09.2026): her blog yazısı Google için ayrı bir sayfa —
// sitemap artık sabit değil, yayındaki yazıları da listeliyor. lastModified
// yazının updated_at'inden geliyor (blog_yazilari trigger'ı tazeliyor).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sabitler: MetadataRoute.Sitemap = [
    { url: TABAN, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${TABAN}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${TABAN}/iletisim`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
  ];

  try {
    const supabase = createPublicClient();
    const yazilar = await blogYazilariniGetir(supabase);
    return [
      ...sabitler,
      ...yazilar.map((y) => ({
        url: `${TABAN}/blog/${y.slug}`,
        lastModified: new Date(y.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
    ];
  } catch (hata) {
    // Sitemap hiçbir koşulda çökmemeli — yazılar okunamazsa sabit sayfalar
    // yine de sunulur.
    console.error("sitemap blog yazıları okunamadı:", hata);
    return sabitler;
  }
}
