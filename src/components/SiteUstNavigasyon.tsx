"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Mail, Menu, Rss, X } from "lucide-react";

// Kullanıcı isteği (04.09.2026): navigasyon ORTADA değil, eskisi gibi sağda
// (GİRİŞ YAP'ın solunda) duruyor; mobilde üç bağlantı hamburger menüye
// taşındı; "Ana Sayfa" bağlantısında ikon yok (logo zaten ana sayfaya
// gidiyor, ikinci bir ev ikonu gereksiz görünüyordu).
// Bu başlık YALNIZCA herkese açık sayfalarda (/, /blog, /blog/[slug],
// /iletisim) kullanılıyor; giriş sonrası panel kendi Header'ıyla çalışıyor
// (src/components/dashboard/Header.tsx) ve buradan hiç etkilenmiyor.
const LACIVERT = "#0F2540";
const TURKUAZ = "#14B8B0";
const BEYAZ = "#FFFFFF";
const GRI = "#3F4B5A";
const CIZGI = "#E9EFF3";

const BAGLANTILAR: { href: string; etiket: string; Icon: typeof Rss | null }[] = [
  { href: "/", etiket: "Ana Sayfa", Icon: null },
  { href: "/blog", etiket: "Blog", Icon: Rss },
  { href: "/iletisim", etiket: "İletişim", Icon: Mail },
];

// /blog/bir-yazi gibi alt sayfalarda da "Blog" aktif görünsün; "/" yalnızca
// tam eşleşmede aktif olur.
function aktifMi(yol: string, href: string) {
  return href === "/" ? yol === "/" : yol === href || yol.startsWith(`${href}/`);
}

export function SiteUstNavigasyon() {
  const yol = usePathname();
  const [acik, setAcik] = useState(false);

  return (
    <header className="border-b" style={{ borderColor: CIZGI, background: BEYAZ }}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-3.5 sm:px-8 sm:py-4">
        <Link href="/" aria-label="Ana sayfa" className="shrink-0">
          <Image src="/logo.png" alt="SeFu Koç" width={512} height={512} className="h-10 w-auto object-contain sm:h-12" priority />
        </Link>

        <div className="flex items-center gap-2 sm:gap-5">
          <nav aria-label="Site menüsü" className="hidden items-center gap-5 sm:flex">
            {BAGLANTILAR.map(({ href, etiket, Icon }) => {
              const aktif = aktifMi(yol, href);
              return (
                <Link key={href} href={href} aria-current={aktif ? "page" : undefined}
                  className="inline-flex items-center gap-1.5 text-sm font-bold"
                  style={{ color: aktif ? TURKUAZ : LACIVERT }}>
                  {Icon && <Icon size={15} />} {etiket}
                </Link>
              );
            })}
          </nav>

          <Link href="/login" className="shrink-0 rounded-full px-5 py-2.5 text-sm font-bold sm:px-6"
            style={{ background: TURKUAZ, color: BEYAZ }}>GİRİŞ YAP</Link>

          <button type="button" onClick={() => setAcik((v) => !v)}
            aria-label={acik ? "Menüyü kapat" : "Menüyü aç"} aria-expanded={acik} aria-controls="site-mobil-menu"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl sm:hidden"
            style={{ color: LACIVERT, border: `1px solid ${CIZGI}` }}>
            {acik ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {acik && (
        <nav id="site-mobil-menu" aria-label="Site menüsü" className="flex flex-col border-t px-5 pb-3 pt-1 sm:hidden" style={{ borderColor: CIZGI }}>
          {BAGLANTILAR.map(({ href, etiket, Icon }) => {
            const aktif = aktifMi(yol, href);
            return (
              <Link key={href} href={href} onClick={() => setAcik(false)} aria-current={aktif ? "page" : undefined}
                className="inline-flex items-center gap-2 rounded-xl px-2 py-3 text-sm font-bold"
                style={{ color: aktif ? TURKUAZ : LACIVERT, background: aktif ? "rgba(20,184,176,0.08)" : "transparent" }}>
                {Icon && <Icon size={16} />} {etiket}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}

export function SiteAltligi() {
  return (
    <footer className="mt-auto flex flex-col items-center gap-2 px-5 py-6 text-center text-xs" style={{ color: GRI }}>
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link href="/" className="font-semibold">Ana Sayfa</Link>
        <Link href="/blog" className="inline-flex items-center gap-1 font-semibold"><Rss size={12} /> Blog</Link>
        <Link href="/iletisim" className="inline-flex items-center gap-1 font-semibold"><Mail size={12} /> İletişim</Link>
        <Link href="/login" className="font-semibold">Giriş Yap</Link>
      </nav>
      <span>© {new Date().getFullYear()} www.sefukoc.com. Tüm hakları saklıdır.</span>
    </footer>
  );
}
