"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Mail, Rss } from "lucide-react";

// Kullanıcı isteği (03.09.2026): "Site üst kısmının ortasına site navigasyonu
// eklenecek. Ana sayfa, Blog ve İletişim butonları olacak... Giriş Yap butonu
// yerinde kalacak ve kullanıcıyı uygulamaya yönlendirmeye devam edecek. Bu
// sistem uygulama içerisinde değil, sadece sitede olacak."
// Yani bu başlık YALNIZCA herkese açık sayfalarda (/, /blog, /blog/[slug],
// /iletisim) kullanılıyor; giriş sonrası panel kendi Header'ıyla çalışıyor
// (src/components/dashboard/Header.tsx) ve buradan hiç etkilenmiyor.
const LACIVERT = "#0F2540";
const TURKUAZ = "#14B8B0";
const BEYAZ = "#FFFFFF";
const GRI = "#3F4B5A";

const BAGLANTILAR = [
  { href: "/", etiket: "Ana Sayfa", Icon: Home },
  { href: "/blog", etiket: "Blog", Icon: Rss },
  { href: "/iletisim", etiket: "İletişim", Icon: Mail },
] as const;

export function SiteUstNavigasyon() {
  const yol = usePathname();

  return (
    <header className="border-b" style={{ borderColor: "#E9EFF3", background: BEYAZ }}>
      {/* Mobilde iki satır (logo + Giriş üstte, navigasyon altta ortalı),
          sm ve üzerinde üç sütunlu grid — orta sütun tam ortada kalsın diye
          yan sütunlar eşit genişlikte (1fr). */}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-y-3 px-5 py-3.5 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:px-8 sm:py-4">
        <Link href="/" aria-label="Ana sayfa" className="shrink-0">
          <Image src="/logo.png" alt="SeFu Koç" width={512} height={512} className="h-10 w-auto object-contain sm:h-12" priority />
        </Link>

        <nav aria-label="Site menüsü" className="order-3 flex w-full items-center justify-center gap-1 sm:order-none sm:w-auto sm:gap-2">
          {BAGLANTILAR.map(({ href, etiket, Icon }) => {
            // /blog/bir-yazi gibi alt sayfalarda da "Blog" aktif görünsün;
            // "/" yalnızca tam eşleşmede aktif olur.
            const aktif = href === "/" ? yol === "/" : yol === href || yol.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} aria-current={aktif ? "page" : undefined}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold sm:px-4"
                style={{ color: aktif ? TURKUAZ : LACIVERT, background: aktif ? "rgba(20,184,176,0.10)" : "transparent" }}>
                <Icon size={15} /> {etiket}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto shrink-0 sm:justify-self-end">
          <Link href="/login" className="inline-block rounded-full px-5 py-2.5 text-sm font-bold sm:px-6"
            style={{ background: TURKUAZ, color: BEYAZ }}>GİRİŞ YAP</Link>
        </div>
      </div>
    </header>
  );
}

export function SiteAltligi() {
  return (
    <footer className="mt-auto flex flex-col items-center gap-2 px-5 py-6 text-center text-xs" style={{ color: GRI }}>
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link href="/" className="inline-flex items-center gap-1 font-semibold"><Home size={12} /> Ana Sayfa</Link>
        <Link href="/blog" className="inline-flex items-center gap-1 font-semibold"><Rss size={12} /> Blog</Link>
        <Link href="/iletisim" className="inline-flex items-center gap-1 font-semibold"><Mail size={12} /> İletişim</Link>
        <Link href="/login" className="font-semibold">Giriş Yap</Link>
      </nav>
      <span>© {new Date().getFullYear()} www.sefukoc.com. Tüm hakları saklıdır.</span>
    </footer>
  );
}
