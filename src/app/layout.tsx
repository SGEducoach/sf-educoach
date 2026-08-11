import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

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
  title: "SG EduCoach",
  description: "Her zaman bir adım ötesini düşün",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SG EduCoach",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#F7FBFB",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${montserratGovde.variable} ${montserratBaslik.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
