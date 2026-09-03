import Script from "next/script";

// GA4 ölçüm etiketi. Kullanıcı bulgusu (04.09.2026): Google Analytics
// "Web sitenizde veri toplama etkin değil" uyarısı veriyordu — mülk ve akış
// kuruluydu ama sitede gtag.js HİÇ YOKTU, yani hiç veri gönderilmiyordu.
// (/yonetici/google-analytics ekranı yalnızca GA4'te BİRİKMİŞ veriyi Data
// API ile OKUYOR; toplama işi bu etikete bağlı.)
//
// Ölçüm kimliği gizli bir değer değil — sayfa kaynağında zaten herkese
// görünür — bu yüzden ortam değişkeni yerine burada sabit tutuluyor;
// böylece deploy'da bir ayar unutulup ölçüm sessizce durmuyor.
// Google Analytics > Yönetici > Veri akışları ekranındaki değerle aynı
// olmalı (akış: "Sefu Koç", https://sefukoc.com).
export const GA_OLCUM_KIMLIGI = "G-6WSB8R2Q9P";

// SADECE herkese açık sayfalarda kullanılır (ana sayfa, blog, iletişim —
// bkz. SayfaKabugu ve app/page.tsx). Panel içi sayfalar BİLİNÇLİ olarak
// ölçülmüyor: oradaki adresler öğrenci/kullanıcı kimliği içeriyor
// (/yonetici/kullanici/<id> gibi) ve bunları Google'a göndermek KVKK
// açısından gereksiz bir risk. Ziyaretçi/SEO ölçümü için açık sayfalar
// yeterli.
export function GoogleAnalytics() {
  // Yerel geliştirme trafiği gerçek raporları kirletmesin.
  if (process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_OLCUM_KIMLIGI}`} strategy="afterInteractive" />
      <Script id="ga4-baslat" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_OLCUM_KIMLIGI}');`}
      </Script>
    </>
  );
}
