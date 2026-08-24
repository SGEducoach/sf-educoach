import Link from "next/link";
import {
  BarChart3, BookOpen, BookOpenCheck, Bot, CalendarDays, CalendarPlus2, CircleUserRound, ClipboardCheck, ClipboardList,
  FileCheck2, FileSpreadsheet, GraduationCap, Home, ListChecks, Megaphone, Medal, PenLine, School, ScrollText,
  ShieldCheck, UserPlus, Users,
} from "lucide-react";
import type { KurumTuru, UserRole } from "@/lib/types";
import type { DashboardBolumu, DashboardIkonu } from "@/lib/dashboard-navigation";
import { dashboardMenusu } from "@/lib/dashboard-navigation";
import { BG1, BORDER, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";
import { SeFuSlogan } from "@/components/SeFuWordmark";

const IKONLAR: Record<DashboardIkonu, typeof Home> = {
  "ana-sayfa": Home,
  gorev: ClipboardList,
  plan: CalendarPlus2,
  veri: PenLine,
  hakimiyet: ListChecks,
  analiz: BarChart3,
  ai: Bot,
  rozet: Medal,
  takvim: CalendarDays,
  duyuru: Megaphone,
  talep: UserPlus,
  onay: ClipboardCheck,
  ders: BookOpenCheck,
  ogretmen: GraduationCap,
  ogrenci: Users,
  deneme: FileSpreadsheet,
  kullanici: Users,
  eslestir: FileCheck2,
  okul: School,
  moderator: ShieldCheck,
  icerik: BookOpen,
  kural: ScrollText,
  profil: CircleUserRound,
};

export function DashboardYanMenu({ role, kurumTuru, aktifBolum }: { role: UserRole; kurumTuru?: KurumTuru; aktifBolum: DashboardBolumu }) {
  const menu = dashboardMenusu(role, kurumTuru);
  if (menu.length === 0) return null;
  const rolBasligi: Partial<Record<UserRole, string>> = {
    ogrenci: "Öğrenci çalışma alanı",
    veli: "Veli takip alanı",
    ogretmen: "Öğretmen çalışma alanı",
    mudur: kurumTuru === "dershane" ? "Dershane yönetim alanı" : "Okul yönetim alanı",
    admin: "Platform yönetimi",
  };

  return (
    <aside className="hidden lg:block w-64 xl:w-72 shrink-0 self-stretch print:hidden">
      <nav aria-label="Dashboard bölümleri" className="sfec-dashboard-sidebar sticky top-28 min-h-[calc(100dvh-8.75rem)] rounded-3xl p-4 flex flex-col gap-1.5"
        style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        {/* Bulgu 10 — sol menüde ayrıca logo YOK: Header zaten her sayfanın
            üstünde logoyu gösteriyor, burada tekrarlamak gereksizdi. */}
        <div className="px-3 pt-1 pb-4 mb-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="text-sm font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
            {rolBasligi[role] ?? "Çalışma alanı"}
          </div>
        </div>
        {menu.map((oge) => {
          const Ikon = IKONLAR[oge.ikon];
          const aktif = oge.bolum === aktifBolum;
          const tgBolumu = oge.bolum === "tg-denemeleri";
          return (
            <Link key={oge.href} href={oge.href} aria-current={aktif ? "page" : undefined}
              className={`sfec-btn flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold ${tgBolumu ? "sfec-menu-tg" : ""}`}
              style={{ background: aktif ? MINT_BG : "transparent", color: TEXT, border: `1px solid ${aktif ? MINT : "transparent"}` }}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: aktif ? BG1 : "transparent" }}>
                <Ikon size={17} color={aktif ? TEXT : TEXT_MUTED} aria-hidden="true" />
              </span>
              <span>{oge.etiket}</span>
            </Link>
          );
        })}
        <div className="mt-2 px-3 pt-4 text-[12px] italic leading-relaxed" style={{ borderTop: `1px solid ${BORDER}` }}>
          <SeFuSlogan />
        </div>
      </nav>
    </aside>
  );
}
