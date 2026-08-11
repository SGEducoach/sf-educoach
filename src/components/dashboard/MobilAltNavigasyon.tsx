"use client";

import { BarChart3, BookOpen, Building2, Home, School, UserRoundSearch, Users } from "lucide-react";
import type { UserRole } from "@/lib/types";
import { BG1, BORDER_STRONG, MINT, TEXT_MUTED } from "@/lib/theme";

const MENULER: Record<UserRole, { href: string; etiket: string; ikon: typeof Home }[]> = {
  ogrenci: [
    { href: "#ozet", etiket: "Özet", ikon: Home },
    { href: "#veri-girisi", etiket: "Veri Gir", ikon: BookOpen },
    { href: "#analiz", etiket: "Analiz", ikon: BarChart3 },
    { href: "#zayif-konular", etiket: "Konular", ikon: School },
  ],
  veli: [
    { href: "#ozet", etiket: "Çocuklar", ikon: Users },
    { href: "#analiz", etiket: "Analiz", ikon: BarChart3 },
  ],
  ogretmen: [
    { href: "#duyurular", etiket: "Duyuru", ikon: BookOpen },
    { href: "#veli-talepleri", etiket: "Talepler", ikon: Users },
    { href: "#siniflar", etiket: "Sınıflar", ikon: School },
  ],
  mudur: [
    { href: "#duyurular", etiket: "Duyuru", ikon: BookOpen },
    { href: "#veli-talepleri", etiket: "Talepler", ikon: Users },
    { href: "#siniflar", etiket: "Sınıflar", ikon: School },
  ],
  admin: [
    { href: "#istatistikler", etiket: "Özet", ikon: Home },
    { href: "#kullanicilar", etiket: "Kullanıcı", ikon: UserRoundSearch },
    { href: "#okullar", etiket: "Okullar", ikon: Building2 },
    { href: "#icerik", etiket: "İçerik", ikon: BookOpen },
  ],
};

export function MobilAltNavigasyon({ role }: { role: UserRole }) {
  const menu = MENULER[role];
  return (
    <nav className="sgec-mobile-nav fixed inset-x-0 bottom-0 z-[110] border-t lg:hidden print:hidden" aria-label="Mobil bölüm navigasyonu"
      style={{ background: BG1, borderColor: BORDER_STRONG, paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${menu.length}, minmax(0, 1fr))` }}>
        {menu.map(({ href, etiket, ikon: Ikon }) => (
          <a key={href} href={href} className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold"
            style={{ color: TEXT_MUTED }} onClick={(e) => {
              e.preventDefault();
              document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}>
            <Ikon size={19} color={MINT} aria-hidden="true" />
            <span>{etiket}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
