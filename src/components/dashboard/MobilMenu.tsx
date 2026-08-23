"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3, BookOpenCheck, Bot, CalendarDays, CalendarPlus2, ClipboardCheck, ClipboardList, Home,
  LogOut, Medal, Megaphone, Menu, PenLine, ShieldCheck, UserPlus, X,
} from "lucide-react";
import { BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, SEAFOAM, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { signOut } from "@/app/dashboard/actions";
import { TemaButonu } from "@/components/TemaDenetimi";
import { BildirimAyarlari } from "@/components/dashboard/BildirimAyarlari";
import { MesajlarimIkonu } from "@/components/dashboard/MesajlarimIkonu";
import type { UserRole } from "@/lib/types";
import type { DashboardBolumu, DashboardIkonu } from "@/lib/dashboard-navigation";
import { dashboardMenusu } from "@/lib/dashboard-navigation";

const rolEtiket: Record<UserRole, string> = {
  ogrenci: "Öğrenci",
  veli: "Veli",
  ogretmen: "Öğretmen",
  mudur: "Müdür",
  admin: "Yönetici",
};

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

// Telefon genişliğinde header'daki ikon sırası (moderatör/tema/bildirim/
// mesajlar/çıkış) tek satıra sığmıyordu (bkz. önceki düzeltmeler) — hepsi
// tek bir hamburger menüye toplandı, birçok sitede olduğu gibi üç çizgiye
// basılınca header'ın altına doğru açılıyor. Yan menünün devreye girdiği
// geniş masaüstüne (lg) kadar hamburger görünür; böylece tabletlerde menüsüz
// bir ara genişlik oluşmaz. Renkler
// header gibi tema değişkenlerine bağlı — açık modda beyaz metin/koyu panel
// kullanmak (eskiden olduğu gibi) gündüz de "gece" görünümü veriyordu.
export function MobilMenu({ ad, role, okunmamisMesajSayisi, moderatorMu, rolEtiketi, aktifBolum = "ozet", navigasyonGoster = true }: {
  ad: string;
  role: UserRole;
  okunmamisMesajSayisi: number;
  moderatorMu: boolean;
  rolEtiketi?: string;
  aktifBolum?: DashboardBolumu;
  navigasyonGoster?: boolean;
}) {
  const [acik, setAcik] = useState(false);
  const menu = navigasyonGoster ? dashboardMenusu(role) : [];

  return (
    <div className="relative lg:hidden">
      <button type="button" onClick={() => setAcik((v) => !v)} aria-label={acik ? "Menüyü kapat" : "Menüyü aç"} aria-expanded={acik}
        className="sfec-btn h-11 w-11 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
        {acik ? <X size={18} color={TEXT} /> : <Menu size={18} color={TEXT} />}
      </button>

      {acik && (
        <>
          <button type="button" aria-label="Menüyü kapat" onClick={() => setAcik(false)} className="fixed inset-0 z-[150]" style={{ background: "transparent" }} />
          <div
            className="sfec-fade absolute right-0 top-14 z-[150] w-72 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl p-3 flex flex-col gap-1"
            style={{ background: BG1, border: `2px solid ${BORDER_STRONG}`, boxShadow: "0 16px 32px rgba(0,0,0,0.28)" }}
          >
            <div className="px-2 py-1.5 mb-1" style={{ borderBottom: `2px solid ${BORDER}` }}>
              <div style={{ color: TEXT }} className="text-[13px] font-bold truncate">{ad}</div>
              <div style={{ color: TEXT_MUTED }} className="text-[11px]">{rolEtiketi ?? rolEtiket[role]}</div>
            </div>

            {menu.length > 0 && (
              <nav aria-label="Mobil dashboard bölümleri" className="flex flex-col gap-0.5 pb-2 mb-1" style={{ borderBottom: `2px solid ${BORDER}` }}>
                {menu.map((oge) => {
                  const Ikon = IKONLAR[oge.ikon];
                  const aktif = oge.bolum === aktifBolum;
                  return (
                    <Link key={oge.href} href={oge.href} aria-current={aktif ? "page" : undefined} onClick={() => setAcik(false)}
                      className="sfec-btn flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold"
                      style={{ color: TEXT, background: aktif ? MINT_BG : "transparent", border: `1px solid ${aktif ? MINT : "transparent"}` }}>
                      <Ikon size={16} color={aktif ? TEXT : TEXT_MUTED} aria-hidden="true" /> {oge.etiket}
                    </Link>
                  );
                })}
              </nav>
            )}

            {moderatorMu && (
              <Link href="/moderator" onClick={() => setAcik(false)}
                className="sfec-btn flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold" style={{ color: TEXT }}>
                <ShieldCheck size={16} color={SEAFOAM} /> Moderatör paneli
              </Link>
            )}

            <div className="flex items-center justify-between rounded-xl px-2.5 py-1.5">
              <span style={{ color: TEXT }} className="text-[13px] font-semibold">Tema</span>
              <TemaButonu />
            </div>

            <div className="flex items-center justify-between rounded-xl px-2.5 py-1.5">
              <span style={{ color: TEXT }} className="text-[13px] font-semibold">Bildirimler</span>
              <BildirimAyarlari />
            </div>

            {(role === "ogrenci" || role === "veli") && (
              <div className="flex items-center justify-between rounded-xl px-2.5 py-1.5">
                <span style={{ color: TEXT }} className="text-[13px] font-semibold">Mesajlarım</span>
                <MesajlarimIkonu baslangicSayisi={okunmamisMesajSayisi} />
              </div>
            )}

            <form action={signOut} className="mt-1 pt-2" style={{ borderTop: `2px solid ${BORDER}` }}>
              <button type="submit"
                className="sfec-btn w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold" style={{ color: BLUSH }}>
                <LogOut size={16} /> Çıkış yap
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
