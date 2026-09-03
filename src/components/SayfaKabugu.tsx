import Link from "next/link";
import Image from "next/image";

// Blog ve İletişim gibi herkese açık sayfaların ortak kabuğu — ana sayfayla
// aynı header/footer. Kullanıcı isteği (03.09.2026): Blog ve İletişim
// bağlantıları header'da GİRİŞ YAP'ın solunda, ayrıca footer'da; iç
// bağlantı arama motorunun yeni yazıları bulmasını hızlandırıyor.
const LACIVERT = "#0F2540";
const TURKUAZ = "#14B8B0";
const BEYAZ = "#FFFFFF";
const GRI = "#3F4B5A";

export function SayfaKabugu({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col" style={{ background: BEYAZ }}>
      <header className="flex items-center justify-between gap-3 px-5 py-4 sm:px-10">
        <Link href="/" aria-label="Ana sayfa">
          <Image src="/logo.png" alt="SeFu Koç" width={512} height={512} className="h-10 w-auto object-contain sm:h-12" priority />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/blog" className="hidden text-sm font-bold sm:block" style={{ color: LACIVERT }}>Blog</Link>
          <Link href="/iletisim" className="hidden text-sm font-bold sm:block" style={{ color: LACIVERT }}>İletişim</Link>
          <Link href="/login" className="rounded-full px-6 py-2.5 text-sm font-bold" style={{ background: TURKUAZ, color: BEYAZ }}>GİRİŞ YAP</Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <SayfaAltligi />
    </div>
  );
}

export function SayfaAltligi() {
  return (
    <footer className="mt-auto flex flex-col items-center gap-2 px-5 py-6 text-center text-xs" style={{ color: GRI }}>
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link href="/" className="font-semibold">Ana Sayfa</Link>
        <Link href="/blog" className="font-semibold">Blog</Link>
        <Link href="/iletisim" className="font-semibold">İletişim</Link>
        <Link href="/login" className="font-semibold">Giriş Yap</Link>
      </nav>
      <span>© {new Date().getFullYear()} www.sefukoc.com. Tüm hakları saklıdır.</span>
    </footer>
  );
}
