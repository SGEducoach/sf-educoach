import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { GlobalIslemGostergesi } from "@/components/GlobalIslemGostergesi";
import { TemaDenetimi } from "@/components/TemaDenetimi";

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

export const metadata: Metadata = {
  title: "SeFu Koç",
  description: "Sen Geliş, Farkın Duyulur",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SeFu Koç",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

const temaBaslangicKodu = `
try {
  var tercih = localStorage.getItem('sfec_tema_tercihi');
  var tema = tercih;
  if (tercih !== 'acik' && tercih !== 'koyu') {
    var saat = Number(new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', hour12: false, timeZone: 'Europe/Istanbul' }).formatToParts(new Date()).find(function (p) { return p.type === 'hour'; }).value);
    tema = saat < 7 || saat >= 19 ? 'koyu' : 'acik';
  }
  document.documentElement.dataset.theme = tema;
  document.documentElement.style.colorScheme = tema === 'koyu' ? 'dark' : 'light';
} catch (_) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${montserratGovde.variable} ${montserratBaslik.variable} h-full antialiased`}
    >
      <head><script dangerouslySetInnerHTML={{ __html: temaBaslangicKodu }} /></head>
      <body className="min-h-full flex flex-col font-sans">
        <TemaDenetimi />
        <a href="#ana-icerik" className="sfec-skip-link">İçeriğe geç</a>
        {children}
        <GlobalIslemGostergesi />
      </body>
    </html>
  );
}
