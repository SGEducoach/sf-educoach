import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { GlobalIslemGostergesi } from "@/components/GlobalIslemGostergesi";
import { siteTemaRengiGetir } from "@/lib/app-ayarlari";
import { temaRengiAc, VARSAYILAN_TEMA_RENGI } from "@/lib/site-tema";

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
  title: "SeFu Koç | YKS Hazırlık ve Öğrenci Takip Platformu",
  description: "SeFu Koç ile konu çalışmalarını, soru çözümlerini ve deneme netlerini takip edin. Öğrenci, veli ve öğretmen aynı platformda gelişimi izlesin.",
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

// Bulgu 11 kararı (23 Ağustos 2026): açık tema kaldırıldı, site tek bir
// sabit koyu temayla çalışıyor. Önceden burada ayrıca sistem tercihine
// (prefers-color-scheme) göre açık/koyu seçen, ilk boyamadan önce çalışan
// bir betik vardı (üstelik saat bazlı eski mantıkla — TemaDenetimi.tsx'in
// asıl uyguladığı sistem-tercihi mantığıyla ÇELİŞİYORDU, ilk açılışta kısa
// bir "yanlış tema" parlamasına sebep oluyordu). Artık tema doğrudan
// globals.css'teki :root'ta sabit olduğu için bu betiğe hiç gerek kalmadı.
export const viewport = {
  themeColor: "#08090b",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Admin'in panelden seçtiği ana tema (zemin) rengi — app_ayarlari'dan
  // sunucuda okunur, ilk boyamadan önce :root değişkenlerini ezer
  // (flaş/yanlış renk olmaz). Kabuk ve menügradyanı seçilen rengin hafif
  // açılmış türevleriyle uyumlu tutulur. Bkz. src/lib/site-tema.ts.
  const temaRengi = await siteTemaRengiGetir();
  const temaCss =
    temaRengi === VARSAYILAN_TEMA_RENGI
      ? null // varsayılanda globals.css'teki :root aynen geçerli
      : `:root{--background:${temaRengi};--sfec-bg0:${temaRengi};--sfec-shell-bg:${temaRengi};--sfec-nav-bg:linear-gradient(135deg, ${temaRengi} 0%, ${temaRengiAc(temaRengi, 5)} 50%, ${temaRengi} 100%);}`;

  return (
    <html
      lang="tr"
      className={`${montserratGovde.variable} ${montserratBaslik.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {temaCss && <style dangerouslySetInnerHTML={{ __html: temaCss }} />}
        <a href="#ana-icerik" className="sfec-skip-link">İçeriğe geç</a>
        {children}
        <GlobalIslemGostergesi />
      </body>
    </html>
  );
}
