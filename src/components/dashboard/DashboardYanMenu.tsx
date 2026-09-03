import Link from "next/link";
import {
  BarChart3, BookOpen, BookOpenCheck, Bot, Bug, CalendarDays, CalendarPlus2, CircleUserRound, ClipboardCheck, ClipboardList,
  Copyright, Crown, FileCheck2, FileSpreadsheet, GraduationCap, HeartHandshake, History, Home, ListChecks, Megaphone, Medal, PenLine, School, ScrollText,
  Settings2, ShieldCheck, UserPlus, Users, Newspaper } from "lucide-react";
import type { KurumTuru, UserRole } from "@/lib/types";
import type { DashboardBolumu, DashboardIkonu } from "@/lib/dashboard-navigation";
import { dashboardMenusu } from "@/lib/dashboard-navigation";
import { BG1, BORDER, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

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
  blog: Newspaper,
  kural: ScrollText,
  profil: CircleUserRound,
  hata: Bug,
  ayarlar: Settings2,
  admin: Crown,
  gecmis: History,
  rehberlik: HeartHandshake,
};

export function DashboardYanMenu({ role, kurumTuru, brans, aktifBolum }: { role: UserRole; kurumTuru?: KurumTuru; brans?: string; aktifBolum: DashboardBolumu }) {
  const menu = dashboardMenusu(role, kurumTuru, brans);
  if (menu.length === 0) return null;
  const rolBasligi: Partial<Record<UserRole, string>> = {
    ogrenci: "Öğrenci çalışma alanı",
    veli: "Veli takip alanı",
    ogretmen: "Öğretmen çalışma alanı",
    mudur: kurumTuru === "dershane" ? "Dershane yönetim alanı" : "Okul yönetim alanı",
    admin: "Platform yönetimi",
  };

  return (
    <aside className="sticky top-28 hidden h-[calc(100dvh-8.75rem)] w-64 shrink-0 self-start lg:block xl:w-72 print:hidden">
      <nav aria-label="Dashboard bölümleri" className="sfec-dashboard-sidebar flex h-full min-h-0 flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-3xl p-4"
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
        {/* Kullanıcı isteği (27.08.2026): "Sen Geliş Farkın Duyulur" yazısı
            kaldırılıp yerine "SeFu {yıl}" — yıl her zaman otomatik, elle
            güncelleme gerekmiyor. */}
        <div className="mt-auto flex items-center gap-1 px-3 pt-4 text-[11px] font-semibold" style={{ borderTop: `1px solid ${BORDER}`, color: TEXT_MUTED }}>
          <Copyright size={12} aria-hidden="true" /> SefuKoc {new Date().getFullYear()}
        </div>
      </nav>
    </aside>
  );
}
