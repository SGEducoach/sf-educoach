"use client";

// MOBİL ALT SEKME ÇUBUĞU (görsel yenileme 4/4, kullanıcı kararı 09.10.2026).
//
// NEDEN: yan menü mobilde HİÇ görünmüyordu (hidden lg:block). Mobilde
// gezinmenin tek yolu hamburger → sağ üstte 288 piksellik açılır panel →
// 8+ kalemi kaydır → dokun idi; müdürde liste daha da uzun. Bu, masaüstü
// menüsünün küçültülmüşü, mobilin kendi deseni değil.
//
// Çubuk başparmak erişiminde duruyor, rozetler görünür kalıyor ve ilk dört
// bölüm tek dokunuşa iniyor. Kalanlar "Daha" sayfasında.
//
// globals.css'teki --mobile-nav-height ve --z-mobile-nav değişkenleri
// baştan beri tanımlıydı ama HİÇBİR YERDE kullanılmıyordu: planlanıp
// yapılmamış bir yuva. Burada doldurulup kullanılıyor.
//
// Hamburger menüsü KALDIRILMADI, görev değiştirdi: dashboard sayfası artık
// Header'a mobilNavigasyon={false} geçiyor, böylece hamburgerde yalnızca
// hesap/mesaj kalıyor ve gezinme iki yerde birden durmuyor.

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  BarChart3, BookOpen, BookOpenCheck, Bot, Bug, CalendarDays, CalendarPlus2, CircleUserRound, ClipboardCheck,
  ClipboardList, Crown, Ellipsis, FileCheck2, FileSpreadsheet, GraduationCap, HeartHandshake, History, Home,
  ListChecks, Megaphone, PenLine, School, ScrollText, Settings2, ShieldCheck, UserPlus, Users, UsersRound, Rss, X,
} from "lucide-react";
import type { KurumTuru, UserRole } from "@/lib/types";
import type { DashboardBolumu, DashboardIkonu, DashboardMenuOgesi } from "@/lib/dashboard-navigation";
import { dashboardMenusu } from "@/lib/dashboard-navigation";
import { BG0, BG1, BG1_ALT, BORDER, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

const IKONLAR: Record<DashboardIkonu, typeof Home> = {
  "ana-sayfa": Home, gorev: ClipboardList, plan: CalendarPlus2, veri: PenLine, hakimiyet: ListChecks,
  analiz: BarChart3, ai: Bot, takvim: CalendarDays, duyuru: Megaphone, talep: UserPlus, onay: ClipboardCheck,
  ders: BookOpenCheck, ogretmen: GraduationCap, ogrenci: Users, deneme: FileSpreadsheet, kullanici: Users,
  eslestir: FileCheck2, okul: School, moderator: ShieldCheck, icerik: BookOpen, blog: Rss, kural: ScrollText,
  profil: CircleUserRound, hata: Bug, ayarlar: Settings2, admin: Crown, gecmis: History, grup: UsersRound,
  rehberlik: HeartHandshake,
};

/** Çubukta kaç bölüm doğrudan görünsün. Beşinci yuva "Daha"ya ayrılır. */
export const DOGRUDAN_SEKME = 4;

/**
 * Çubuğa girecek bölümler. Menü beş ya da daha kısaysa "Daha" GEREKMEZ —
 * beşinci yuvayı boş bırakıp kalanı gizlemek yerine hepsi gösterilir.
 */
export function sekmeleriBol(menu: DashboardMenuOgesi[], aktifBolum: DashboardBolumu): {
  gorunen: DashboardMenuOgesi[];
  kalan: DashboardMenuOgesi[];
} {
  if (menu.length <= DOGRUDAN_SEKME + 1) return { gorunen: menu, kalan: [] };
  const gorunen = menu.slice(0, DOGRUDAN_SEKME);
  const kalan = menu.slice(DOGRUDAN_SEKME);
  // Aktif bölüm "Daha"nın içindeyse çubukta görünmüyor demektir; kullanıcı
  // nerede olduğunu kaybetmesin diye son yuvayla yer değiştirir.
  const aktifKalanda = kalan.findIndex((o) => o.bolum === aktifBolum);
  if (aktifKalanda !== -1) {
    const [aktif] = kalan.splice(aktifKalanda, 1);
    kalan.unshift(gorunen[DOGRUDAN_SEKME - 1]);
    gorunen[DOGRUDAN_SEKME - 1] = aktif;
  }
  return { gorunen, kalan };
}

export function AltSekmeCubugu({ role, kurumTuru, brans, grupMu = false, kademe, okulRehberi = false, aktifBolum, rozetler }: {
  role: UserRole;
  kurumTuru?: KurumTuru;
  brans?: string;
  grupMu?: boolean;
  kademe?: "ortaokul" | "lise" | "ikisi" | null;
  okulRehberi?: boolean;
  aktifBolum: DashboardBolumu;
  rozetler?: Partial<Record<DashboardBolumu, number>>;
}) {
  const [dahaAcik, setDahaAcik] = useState(false);
  const menu = dashboardMenusu(role, kurumTuru, brans, grupMu, kademe, okulRehberi);
  if (menu.length === 0) return null;
  const { gorunen, kalan } = sekmeleriBol(menu, aktifBolum);

  const sekme = (oge: DashboardMenuOgesi) => {
    const Ikon = IKONLAR[oge.ikon];
    const aktif = oge.bolum === aktifBolum;
    const rozet = rozetler?.[oge.bolum] ?? 0;
    return (
      <Link key={oge.href} href={oge.href} aria-current={aktif ? "page" : undefined}
        className="sfec-btn relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-1"
        style={{ background: aktif ? MINT_BG : "transparent", color: aktif ? TEXT : TEXT_MUTED }}>
        <Ikon size={19} aria-hidden="true" />
        <span className="w-full text-center text-[10px] font-semibold leading-[1.15]" style={{ letterSpacing: "0.01em" }}>{oge.etiket}</span>
        {rozet > 0 && (
          <span className="absolute right-1 top-1 min-w-[16px] rounded-full px-1 text-center text-[9px] font-extrabold"
            style={{ background: MINT, color: BG1 }}>{rozet}</span>
        )}
      </Link>
    );
  };

  const kalanRozetToplami = kalan.reduce((t, o) => t + (rozetler?.[o.bolum] ?? 0), 0);

  return (
    <>
      <nav aria-label="Ana bölümler"
        className="fixed inset-x-0 bottom-0 grid gap-1 px-2 pt-2 lg:hidden print:hidden"
        style={{
          zIndex: "var(--z-mobile-nav)",
          gridTemplateColumns: `repeat(${gorunen.length + (kalan.length > 0 ? 1 : 0)}, minmax(0, 1fr))`,
          background: BG1,
          borderTop: `1px solid ${BORDER}`,
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}>
        {gorunen.map(sekme)}
        {kalan.length > 0 && (
          <button type="button" onClick={() => setDahaAcik(true)} aria-expanded={dahaAcik}
            className="sfec-btn relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-1"
            style={{ color: TEXT_MUTED }}>
            <Ellipsis size={19} aria-hidden="true" />
            <span className="text-[10px] font-semibold leading-[1.15]" style={{ letterSpacing: "0.01em" }}>Daha</span>
            {kalanRozetToplami > 0 && (
              <span className="absolute right-1 top-1 min-w-[16px] rounded-full px-1 text-center text-[9px] font-extrabold"
                style={{ background: MINT, color: BG1 }}>{kalanRozetToplami}</span>
            )}
          </button>
        )}
      </nav>

      {/* Palette ile aynı sebeple PORTAL: kabukta isolation: isolate var,
          üst başlık ise kabuğun DIŞINDA ve açık z-index taşıyor — yığın
          bağlamı içinde kalan bir örtü başlığı karartamıyor ve başlığa
          dokunuşlar modal açıkken de geçiyor. */}
      {dahaAcik && typeof document !== "undefined" && createPortal((
        <div className="fixed inset-0 flex items-end lg:hidden" style={{ zIndex: "var(--z-modal)" }}>
          <button type="button" aria-label="Kapat" onClick={() => setDahaAcik(false)}
            className="fixed inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
          <div role="dialog" aria-label="Diğer bölümler" aria-modal="true"
            className="sfec-fade relative max-h-[70vh] w-full overflow-y-auto rounded-t-3xl p-3"
            style={{ background: BG1, borderTop: `1px solid ${BORDER}`, paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-sm font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Diğer bölümler</span>
              <button type="button" onClick={() => setDahaAcik(false)} aria-label="Kapat"
                className="sfec-btn flex h-10 w-10 items-center justify-center rounded-xl" style={{ color: TEXT_MUTED }}>
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {kalan.map((oge) => {
                const Ikon = IKONLAR[oge.ikon];
                const aktif = oge.bolum === aktifBolum;
                const rozet = rozetler?.[oge.bolum] ?? 0;
                return (
                  <Link key={oge.href} href={oge.href} onClick={() => setDahaAcik(false)}
                    aria-current={aktif ? "page" : undefined}
                    className="sfec-btn flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold"
                    style={{ background: aktif ? MINT_BG : BG1_ALT, color: TEXT, border: `1px solid ${aktif ? MINT : BORDER}` }}>
                    <Ikon size={17} color={aktif ? TEXT : TEXT_MUTED} aria-hidden="true" />
                    <span className="flex-1">{oge.etiket}</span>
                    {rozet > 0 && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold" style={{ background: MINT, color: BG0 }}>{rozet}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  );
}
