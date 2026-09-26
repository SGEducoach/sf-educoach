import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { GlobalIslemGostergesi } from "@/components/GlobalIslemGostergesi";
import { seoAnahtarKelimeleriGetir, siteTemaGetir } from "@/lib/app-ayarlari";
import { gunduzGeceCssUret } from "@/lib/site-tema";
import { TEMA_BETIGI } from "@/lib/gunduz-gece";
import { TemaDenetimi } from "@/components/TemaSecici";

// Not: değişken isimleri (--font-nunito, --font-baloo) kod tabanında onlarca
// yerde referans veriliyor; tekrar adlandırmak yerine ikisini de Montserrat'a
// bağlayıp (gövde: 400-600, başlık: 700-800) tek bir aile altında birleştiriyoruz.
const montserratGovde = Montserrat({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const montserratBaslik = Montserrat({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const SITE = "https://www.sefukoc.com";

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(SITE),
    title: "SeFu Koç",
    description: "YKS hazırlık, öğrenci koçluğu ve okul temelli öğrenci takip platformu.",
    keywords: await seoAnahtarKelimeleriGetir(),
    manifest: "/manifest.json",
    // Google arama sonucundaki site ikonu (23.09.2026 kullanıcı bildirimi:
    // "listelemede hâlâ eski logo var"). Önceden SADECE 16x16 favicon.ico
    // bildiriliyordu; Google en az 48x48 ve kare bir ikon ister, küçük ikonu
    // eleyip eski önbelleğinde kalabiliyor. Artık büyük boyutlar da
    // bildiriliyor (dosyalar zaten güncel logoyla üretilmişti).
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
      ],
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      title: "SeFu Koç",
      description: "YKS hazırlık, öğrenci koçluğu ve okul temelli öğrenci takip platformu.",
      url: SITE,
      siteName: "SeFu Koç",
      locale: "tr_TR",
      type: "website",
      images: [{ url: "/og-kapak.png", width: 1200, height: 630, alt: "SeFu Koç" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "SeFu Koç",
      description: "YKS hazırlık, öğrenci koçluğu ve okul temelli öğrenci takip platformu.",
      images: ["/og-kapak.png"],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "SeFu Koç",
    },
  };
}

// Gece/gündüz modu geri geldi (kullanıcı isteği 27.09.2026; 24.08'de
// Bulgu 11 ile kaldırılmıştı). O zamanki "yanlış tema parlaması" iki ayrı
// mantığın çelişmesinden doğuyordu — artık tek kaynak var (gunduz-gece.ts):
// <head>'deki TEMA_BETIGI boyamadan önce <html data-tema> yazar, istemci
// bileşeni aynı modBelirle() kuralını kullanır.
export const viewport = {
  themeColor: "#08090b",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Admin'in panelden seçtiği site teması — app_ayarlari'dan sunucuda
  // okunur, ilk boyamadan önce :root değişkenlerini ezer (flaş/yanlış
  // renk olmaz). Tema artık zeminle sınırlı değil: kutu içi (bg1/bg1-alt),
  // kenarlıklar, metin/font renkleri ve marka (logo) renkleri de tema
  // tanımından gelir. Bkz. src/lib/site-tema.ts.
  const temaCss = gunduzGeceCssUret(await siteTemaGetir());

  return (
    // data-tema, hidrasyondan önce TEMA_BETIGI tarafından yazılıyor —
    // sunucu HTML'inde yok; uyarı bastırılıyor.
    <html
      lang="tr"
      className={`${montserratGovde.variable} ${montserratBaslik.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_BETIGI }} />
        <style dangerouslySetInnerHTML={{ __html: temaCss }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <TemaDenetimi />
        <a href="#ana-icerik" className="sfec-skip-link">İçeriğe geç</a>
        {children}
        <GlobalIslemGostergesi />
      </body>
    </html>
  );
}
