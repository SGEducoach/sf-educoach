"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3, BookOpen, BookOpenCheck, Bot, Bug, CalendarDays, CalendarPlus2, ChevronDown,
  CircleUserRound, ClipboardCheck, ClipboardList,
  Copyright, Crown, FileCheck2, FileSpreadsheet, GraduationCap, HeartHandshake, History, Home, ListChecks, Megaphone, PenLine, School, ScrollText,
  Settings2, ShieldCheck, UserPlus, Users, UsersRound, Rss } from "lucide-react";
import type { KurumTuru, UserRole } from "@/lib/types";
import type { DashboardBolumu, DashboardIkonu } from "@/lib/dashboard-navigation";
import { dashboardMenuYapisi, menuGrubuMu } from "@/lib/dashboard-navigation";
import { KomutPaleti } from "@/components/dashboard/KomutPaleti";
import { BG1, BG1_ALT, BORDER, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

const IKONLAR: Record<DashboardIkonu, typeof Home> = {
  "ana-sayfa": Home,
  gorev: ClipboardList,
  plan: CalendarPlus2,
  veri: PenLine,
  hakimiyet: ListChecks,
  analiz: BarChart3,
  ai: Bot,
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
  blog: Rss,
  kural: ScrollText,
  profil: CircleUserRound,
  hata: Bug,
  ayarlar: Settings2,
  admin: Crown,
  gecmis: History,
  grup: UsersRound,
  rehberlik: HeartHandshake,
};

export function DashboardYanMenu({ role, kurumTuru, brans, grupMu = false, kademe, aktifBolum, rozetler, okulRehberi = false }: {
  role: UserRole; kurumTuru?: KurumTuru; brans?: string; grupMu?: boolean; aktifBolum: DashboardBolumu;
  // Ortaokul paneli (Faz 1): yalnız bayrak acikken ve ortaokul sinifinda dolu gelir.
  kademe?: "ortaokul" | "lise" | "ikisi" | null;
  // Bölüm başına bekleyen iş sayısı (denetim 27.09.2026): koç, bekleyen veli
  // talebini ekrana girmeden görsün.
  rozetler?: Partial<Record<DashboardBolumu, number>>;
  okulRehberi?: boolean;
}) {
  const menu = dashboardMenuYapisi(role, kurumTuru, brans, grupMu, kademe, okulRehberi);
  const [acikGrup, setAcikGrup] = useState<string | null>(
    () => menu.filter(menuGrubuMu).find((kalem) => kalem.ogeler.some((oge) => oge.bolum === aktifBolum))?.baslik ?? null,
  );
  if (menu.length === 0) return null;
  const rolBasligi: Partial<Record<UserRole, string>> = {
    ogrenci: "Öğrenci çalışma alanı",
    veli: "Veli takip alanı",
    ogretmen: "Öğretmen çalışma alanı",
    mudur: kurumTuru === "dershane" ? "Dershane yönetim alanı" : "Okul yönetim alanı",
    admin: "Platform yönetimi",
  };

  return (
    <aside
      className="sticky top-28 hidden h-[calc(100dvh-8.75rem)] w-64 shrink-0 self-start lg:block xl:w-72 print:hidden"
    >
      <nav aria-label="Dashboard bölümleri"
        className="sfec-dashboard-sidebar flex h-full min-h-0 flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-3xl p-4"
        style={{ border: `1px solid ${BORDER}` }}>
        {role === "admin" && <div className="pb-2">
          <KomutPaleti role={role} kurumTuru={kurumTuru} brans={brans} grupMu={grupMu} kademe={kademe}
            okulRehberi={okulRehberi} />
        </div>}

        <div className="px-3 pt-1 pb-4 mb-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="text-sm font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
            {grupMu && role === "ogretmen" ? "Grup koçluk alanı" : rolBasligi[role] ?? "Çalışma alanı"}
          </div>
        </div>

        {menu.map((kalem) => {
          if (menuGrubuMu(kalem)) {
            const Ikon = IKONLAR[kalem.ikon];
            const acik = acikGrup === kalem.baslik;
            return (
              <div key={kalem.baslik} className="flex flex-col gap-1">
                <button type="button" onClick={() => setAcikGrup(acik ? null : kalem.baslik)} aria-expanded={acik}
                  className="sfec-btn flex min-h-12 w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-bold"
                  style={{ color: TEXT, background: acik ? BG1_ALT : "transparent", border: "1px solid transparent" }}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                    <Ikon size={17} color={acik ? TEXT : TEXT_MUTED} aria-hidden="true" />
                  </span>
                  <span className="flex-1">{kalem.baslik}</span>
                  <ChevronDown size={15} color={TEXT_MUTED} aria-hidden="true" style={{ transform: acik ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
                </button>
                {acik && (
                  <div className="ml-5 flex flex-col gap-0.5 pl-3" style={{ borderLeft: `1px solid ${BORDER}` }}>
                    {kalem.ogeler.map((oge) => {
                      const aktif = oge.bolum === aktifBolum;
                      return (
                        <Link key={oge.href} href={oge.href} aria-current={aktif ? "page" : undefined}
                          className="sfec-btn flex items-center rounded-xl px-3 py-2 text-[13px] font-semibold"
                          style={{ background: aktif ? MINT_BG : "transparent", color: aktif ? TEXT : TEXT_MUTED, border: `1px solid ${aktif ? MINT : "transparent"}` }}>
                          {oge.etiket}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          const oge = kalem;
          const Ikon = IKONLAR[oge.ikon];
          const aktif = oge.bolum === aktifBolum;
          const tgBolumu = oge.bolum === "tg-denemeleri";
          const rozet = rozetler?.[oge.bolum] ?? 0;

          return (
            <Link key={oge.href} href={oge.href} aria-current={aktif ? "page" : undefined}
              className={`sfec-btn flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-bold ${tgBolumu ? "sfec-menu-tg" : ""}`}
              style={{ background: aktif ? MINT_BG : "transparent", color: TEXT, border: `1px solid ${aktif ? MINT : "transparent"}` }}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: aktif ? BG1 : "transparent" }}>
                <Ikon size={17} color={aktif ? TEXT : TEXT_MUTED} aria-hidden="true" />
              </span>
              <span>{oge.etiket}</span>
              {rozet > 0 && (
                <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-extrabold" style={{ background: MINT, color: BG1 }}>
                  {rozet}
                </span>
              )}
            </Link>
          );
        })}

        <div className="mt-auto flex items-center gap-1 px-3 pt-4 text-[11px] font-semibold" style={{ borderTop: `1px solid ${BORDER}`, color: TEXT_MUTED }}>
          <Copyright size={12} aria-hidden="true" /> SefuKoc {new Date().getFullYear()}
        </div>
      </nav>
    </aside>
  );
}
