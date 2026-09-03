import type { MetadataRoute } from "next";

// Arama motorlarına: genel sayfalar taransın, oturum/panel yolları taranmasın.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/yonetici", "/moderator", "/login", "/signup", "/sifre-sifirla", "/api/"],
    }],
    sitemap: "https://www.sefukoc.com/sitemap.xml",
  };
}
