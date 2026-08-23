import Link from "next/link";
import {
  BarChart3, BookOpenCheck, BookMarked, ClipboardCheck, ClipboardList,
  Home, Megaphone, Medal, PenLine, UserPlus,
} from "lucide-react";
import type { UserRole } from "@/lib/types";
import type { DashboardBolumu, DashboardIkonu } from "@/lib/dashboard-navigation";
import { dashboardMenusu } from "@/lib/dashboard-navigation";
import { BG1, BORDER, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

const IKONLAR: Record<DashboardIkonu, typeof Home> = {
  "ana-sayfa": Home,
  gorev: ClipboardList,
  veri: PenLine,
  analiz: BarChart3,
  konu: BookMarked,
  rozet: Medal,
  duyuru: Megaphone,
  talep: UserPlus,
  onay: ClipboardCheck,
  ders: BookOpenCheck,
};

export function DashboardYanMenu({ role, aktifBolum }: { role: UserRole; aktifBolum: DashboardBolumu }) {
  const menu = dashboardMenusu(role);
  if (menu.length === 0) return null;

  return (
    <aside className="hidden lg:block w-60 shrink-0 print:hidden">
      <nav aria-label="Dashboard bölümleri" className="sticky top-28 rounded-3xl p-3 flex flex-col gap-1"
        style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="px-3 pb-2 mb-1 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: TEXT_MUTED }}>
          Menü
        </div>
        {menu.map((oge) => {
          const Ikon = IKONLAR[oge.ikon];
          const aktif = oge.bolum === aktifBolum;
          return (
            <Link key={oge.href} href={oge.href} aria-current={aktif ? "page" : undefined}
              className="sfec-btn flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold"
              style={{ background: aktif ? MINT_BG : "transparent", color: aktif ? MINT : TEXT }}>
              <Ikon size={17} color={aktif ? MINT : TEXT_MUTED} aria-hidden="true" />
              <span>{oge.etiket}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
