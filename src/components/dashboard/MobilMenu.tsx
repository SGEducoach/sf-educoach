"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3, BookOpen, BookOpenCheck, Bot, Bug, CalendarDays, CalendarPlus2, ChevronDown, CircleUserRound, ClipboardCheck, ClipboardList, Crown, FileCheck2, FileSpreadsheet, GraduationCap, HeartHandshake, History, Home,
  LayoutDashboard, ListChecks, LogOut, Megaphone, Menu, PenLine, School, ScrollText, Settings2, ShieldCheck, UserPlus, Users, UsersRound, X, Rss } from "lucide-react";
import { BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, SEAFOAM, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { signOut } from "@/app/dashboard/actions";
import { BildirimAyarlari } from "@/components/dashboard/BildirimAyarlari";
import { MesajlarimIkonu } from "@/components/dashboard/MesajlarimIkonu";
import { HataBildirButonu } from "@/components/dashboard/HataBildirButonu";
import { TemaButonu } from "@/components/TemaSecici";
import { YoneticiIletisimButonu } from "@/components/dashboard/YoneticiIletisimButonu";
import type { KurumTuru, UserRole } from "@/lib/types";
import type { DashboardBolumu, DashboardIkonu } from "@/lib/dashboard-navigation";
import { dashboardMenuYapisi, menuGrubuMu } from "@/lib/dashboard-navigation";

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

// Telefon genişliğinde header'daki ikon sırası (moderatör/tema/bildirim/
// mesajlar/çıkış) tek satıra sığmıyordu (bkz. önceki düzeltmeler) — hepsi
// tek bir hamburger menüye toplandı, birçok sitede olduğu gibi üç çizgiye
// basılınca header'ın altına doğru açılıyor. Yan menünün devreye girdiği
// geniş masaüstüne (lg) kadar hamburger görünür; böylece tabletlerde menüsüz
// bir ara genişlik oluşmaz. Renkler
// header gibi tema değişkenlerine bağlı — açık modda beyaz metin/koyu panel
// kullanmak (eskiden olduğu gibi) gündüz de "gece" görünümü veriyordu.
export function MobilMenu({ ad, role, kurumTuru, brans, grupMu = false, kademe, okunmamisMesajSayisi, moderatorMu, rolEtiketi, aktifBolum = "ozet", navigasyonGoster = true, geriDonusHref, geriDonusEtiketi, rozetler }: {
  ad: string;
  role: UserRole;
  kurumTuru?: KurumTuru;
  brans?: string;
  grupMu?: boolean;
  // Ortaokul paneli (Faz 1): yalniz bayrak acikken dolu gelir.
  kademe?: "ortaokul" | "lise" | "ikisi" | null;
  // Bölüm başına bekleyen iş sayısı (bkz. DashboardYanMenu).
  rozetler?: Partial<Record<DashboardBolumu, number>>;
  okunmamisMesajSayisi: number;
  moderatorMu: boolean;
  rolEtiketi?: string;
  aktifBolum?: DashboardBolumu;
  navigasyonGoster?: boolean;
  geriDonusHref?: string; geriDonusEtiketi?: string;
}) {
  const [acik, setAcik] = useState(false);
  const menu = navigasyonGoster ? dashboardMenuYapisi(role, kurumTuru, brans, grupMu, kademe) : [];
  // Aktif sayfanın grubu açık başlar.
  const [acikGrup, setAcikGrup] = useState<string | null>(
    () => menu.filter(menuGrubuMu).find((k) => k.ogeler.some((o) => o.bolum === aktifBolum))?.baslik ?? null,
  );

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
                {menu.map((kalem) => {
                  if (menuGrubuMu(kalem)) {
                    // Mobilde grup başlığı yalnızca açar/kapatır (menü sayfa
                    // değişince kapandığı için alt bölümler görünmez kalırdı).
                    const Ikon = IKONLAR[kalem.ikon];
                    const grupAcik = acikGrup === kalem.baslik;
                    return (
                      <div key={kalem.baslik}>
                        <button type="button" onClick={() => setAcikGrup(grupAcik ? null : kalem.baslik)} aria-expanded={grupAcik}
                          className="sfec-btn w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold text-left" style={{ color: TEXT }}>
                          <Ikon size={16} color={grupAcik ? TEXT : TEXT_MUTED} aria-hidden="true" />
                          <span className="flex-1">{kalem.baslik}</span>
                          <ChevronDown size={14} color={TEXT_MUTED} aria-hidden="true" style={{ transform: grupAcik ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
                        </button>
                        {grupAcik && (
                          <div className="ml-4 flex flex-col gap-0.5 pl-2.5" style={{ borderLeft: `1px solid ${BORDER}` }}>
                            {kalem.ogeler.map((oge) => {
                              const aktif = oge.bolum === aktifBolum;
                              return (
                                <Link key={oge.href} href={oge.href} aria-current={aktif ? "page" : undefined} onClick={() => setAcik(false)}
                                  className="sfec-btn rounded-xl px-2.5 py-2 text-[13px] font-semibold"
                                  style={{ color: aktif ? TEXT : TEXT_MUTED, background: aktif ? MINT_BG : "transparent", border: `1px solid ${aktif ? MINT : "transparent"}` }}>
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
                  return (
                    <Link key={oge.href} href={oge.href} aria-current={aktif ? "page" : undefined} onClick={() => setAcik(false)}
                      className={`sfec-btn flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold ${tgBolumu ? "sfec-menu-tg" : ""}`}
                      style={{ color: TEXT, background: aktif ? MINT_BG : "transparent", border: `1px solid ${aktif ? MINT : "transparent"}` }}>
                      <Ikon size={16} color={aktif ? TEXT : TEXT_MUTED} aria-hidden="true" /> {oge.etiket}
                      {(rozetler?.[oge.bolum] ?? 0) > 0 && (
                        <span className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-extrabold" style={{ background: MINT, color: BG1 }}>
                          {rozetler?.[oge.bolum]}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}

            {geriDonusHref ? (
              <Link href={geriDonusHref} onClick={() => setAcik(false)}
                className="sfec-btn flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold" style={{ color: TEXT }}>
                <LayoutDashboard size={16} color={SEAFOAM} /> {geriDonusEtiketi}
              </Link>
            ) : moderatorMu && !grupMu && (
              <Link href="/moderator" onClick={() => setAcik(false)}
                className="sfec-btn flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold" style={{ color: TEXT }}>
                <ShieldCheck size={16} color={SEAFOAM} /> Moderatör paneli
              </Link>
            )}

            <HataBildirButonu boyut="satir" />
            {role !== "admin" && (role === "mudur" || moderatorMu) && <YoneticiIletisimButonu satir />}

            <div style={{ color: TEXT }}><TemaButonu satir /></div>

            <div className="flex items-center justify-between rounded-xl px-2.5 py-1.5">
              <span style={{ color: TEXT }} className="text-[13px] font-semibold">Bildirimler</span>
              <BildirimAyarlari role={role} />
            </div>

            {/* Kullanıcı isteği (26.08.2026, Bildirimler yeniden tasarımı —
                devam): yanlış giriş bildirimi artık Bildirimler'e gidiyor
                (bkz. Header.tsx'teki aynı notu) — Mesajlarım tekrar öğrenci/
                veli'ye özel görünüme alındı. */}
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
