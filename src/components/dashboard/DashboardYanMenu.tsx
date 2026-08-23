import Image from "next/image";
import Link from "next/link";
import {
  BarChart3, BookOpenCheck, Bot, CalendarDays, CalendarPlus2, ClipboardCheck, ClipboardList,
  Home, Megaphone, Medal, PenLine, UserPlus,
} from "lucide-react";
import type { UserRole } from "@/lib/types";
import type { DashboardBolumu, DashboardIkonu } from "@/lib/dashboard-navigation";
import { dashboardMenusu } from "@/lib/dashboard-navigation";
import { BG1, BORDER, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";
import { SeFuSlogan } from "@/components/SeFuWordmark";

const IKONLAR: Record<DashboardIkonu, typeof Home> = {
  "ana-sayfa": Home,
  gorev: ClipboardList,
  plan: CalendarPlus2,
  veri: PenLine,
  analiz: BarChart3,
  ai: Bot,
  rozet: Medal,
  takvim: CalendarDays,
  duyuru: Megaphone,
  talep: UserPlus,
  onay: ClipboardCheck,
  ders: BookOpenCheck,
};

export function DashboardYanMenu({ role, aktifBolum }: { role: UserRole; aktifBolum: DashboardBolumu }) {
  const menu = dashboardMenusu(role);
  if (menu.length === 0) return null;
  const rolBasligi: Partial<Record<UserRole, string>> = {
    ogrenci: "Öğrenci çalışma alanı",
    veli: "Veli takip alanı",
    ogretmen: "Öğretmen çalışma alanı",
    mudur: "Okul yönetim alanı",
  };

  return (
    <aside className="hidden lg:block w-64 xl:w-72 shrink-0 self-stretch print:hidden">
      <nav aria-label="Dashboard bölümleri" className="sfec-dashboard-sidebar sticky top-28 min-h-[calc(100dvh-8.75rem)] rounded-3xl p-4 flex flex-col gap-1.5"
        style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <div className="px-3 pt-1 pb-4 mb-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <Image
            src="/logo.png"
            alt="SeFu Koç"
            width={800}
            height={395}
            className="sfec-brand-logo h-12 w-auto max-w-full object-contain object-left"
          />
          <div className="mt-1 text-sm font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
            {rolBasligi[role] ?? "Çalışma alanı"}
          </div>
        </div>
        {menu.map((oge) => {
          const Ikon = IKONLAR[oge.ikon];
          const aktif = oge.bolum === aktifBolum;
          return (
            <Link key={oge.href} href={oge.href} aria-current={aktif ? "page" : undefined}
              className="sfec-btn flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold"
              style={{ background: aktif ? MINT_BG : "transparent", color: TEXT, border: `1px solid ${aktif ? MINT : "transparent"}` }}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: aktif ? BG1 : "transparent" }}>
                <Ikon size={17} color={aktif ? TEXT : TEXT_MUTED} aria-hidden="true" />
              </span>
              <span>{oge.etiket}</span>
            </Link>
          );
        })}
        <div className="mt-auto px-3 pt-5 text-[12px] italic leading-relaxed" style={{ borderTop: `1px solid ${BORDER}` }}>
          <SeFuSlogan />
        </div>
      </nav>
    </aside>
  );
}
