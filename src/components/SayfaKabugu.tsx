import { SiteUstNavigasyon, SiteAltligi } from "@/components/SiteUstNavigasyon";

// Blog ve İletişim gibi herkese açık sayfaların ortak kabuğu — ana sayfayla
// aynı header/footer. Kullanıcı isteği (03.09.2026): üst başlıkta ORTALANMIŞ
// bir site navigasyonu (Ana Sayfa / Blog / İletişim) var, GİRİŞ YAP sağda
// kalıp kullanıcıyı uygulamaya götürmeye devam ediyor; footer'daki
// bağlantılar da yerinde duruyor (bkz. SiteUstNavigasyon).
export function SayfaKabugu({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col" style={{ background: "#FFFFFF" }}>
      <SiteUstNavigasyon />
      <main className="flex-1">{children}</main>
      <SiteAltligi />
    </div>
  );
}
