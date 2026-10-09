"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  BarChart3, BookOpen, BookOpenCheck, Bot, Bug, CalendarDays, CalendarPlus2, ChevronDown, ChevronsLeft, ChevronsRight,
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

// Görsel yenileme 3/4 (kullanıcı kararı 09.10.2026) — "komut rayı".
//
// Menü artık İKİ GENİŞLİKTE: dar ray (ikon + küçük etiket) ve geniş liste.
// Varsayılan DAR; tercih localStorage'da tutuluyor.
//
// Neden etiketsiz saf ikon rayı DEĞİL: kullanıcılar öğretmen ve müdür, güç
// kullanıcısı değil. Saf ikon rayı ekran kazandırır ama "hangi ikon neydi"
// sorusunu yaratır. İkonun altındaki 10px etiket bu bedeli ödemeden
// genişliği 256px'den 76px'e indiriyor.
//
// Neden kapatılabilir: bu değişiklik her rolün gezinmesini etkiliyor ve
// panel gerçek hesapla görülemiyor. Tek tıkla eski genişliğe dönmek,
// göremediğim bir ekranda kullanıcıyı kilitlememenin en ucuz yolu.
const DAR_TERCIH_ANAHTARI = "sfec_yan_menu_dar";

// Tercih useEffect + setState ile okunmuyor: efekt içinde senkron setState
// "cascading renders" uyarısı veriyor (react-hooks/set-state-in-effect) ve
// aynı menüyü iki kez boyuyor. useSyncExternalStore tam bu iş için: sunucu
// anlık görüntüsü DAR, istemci hidrasyondan sonra gerçek tercihi okuyor,
// uyumsuzluk uyarısı çıkmıyor.
const dinleyiciler = new Set<() => void>();

function tercihAbone(dinleyici: () => void): () => void {
  dinleyiciler.add(dinleyici);
  return () => { dinleyiciler.delete(dinleyici); };
}

function darMi(): boolean {
  // Gizli sekmede localStorage erişilemeyebilir; varsayılan dar.
  try { return window.localStorage.getItem(DAR_TERCIH_ANAHTARI) !== "0"; } catch { return true; }
}

function darYaz(yeni: boolean): void {
  try { window.localStorage.setItem(DAR_TERCIH_ANAHTARI, yeni ? "1" : "0"); } catch { /* yok sayılır */ }
  dinleyiciler.forEach((d) => d());
}

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
  // Sunucuda ve hidrasyonda DAR; gerçek tercih istemcide okunuyor.
  const dar = useSyncExternalStore(tercihAbone, darMi, () => true);

  function genisligiDegistir() {
    const yeni = !dar;
    // Dar raya dönerken açık grup kapanır: dar modda alt menü çizilmiyor.
    if (yeni) setAcikGrup(null);
    darYaz(yeni);
  }

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
      className={`sticky top-28 hidden h-[calc(100dvh-8.75rem)] shrink-0 self-start lg:block print:hidden ${dar ? "w-[76px]" : "w-64 xl:w-72"}`}
      style={{ transition: "width 0.18s ease" }}
    >
      <nav aria-label="Dashboard bölümleri"
        className={`sfec-dashboard-sidebar flex h-full min-h-0 flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-3xl ${dar ? "p-2" : "p-4"}`}
        style={{ background: BG1, border: `1px solid ${BORDER}` }}>

        <button type="button" onClick={genisligiDegistir}
          aria-label={dar ? "Menüyü genişlet" : "Menüyü daralt"}
          aria-expanded={!dar}
          className={`sfec-btn flex min-h-11 items-center rounded-2xl text-[11px] font-extrabold ${dar ? "justify-center" : "gap-2 px-3"}`}
          style={{ color: TEXT_MUTED }}>
          {dar ? <ChevronsRight size={16} aria-hidden="true" /> : <><ChevronsLeft size={16} aria-hidden="true" /><span>Daralt</span></>}
        </button>

        {/* Komut paleti: yazarak gezinme. Dar rayda ikon, geniş menüde
            Ctrl+K ipucunu da taşıyan arama kutusu. */}
        <div className={dar ? "flex justify-center pb-1" : "pb-2"}>
          <KomutPaleti role={role} kurumTuru={kurumTuru} brans={brans} grupMu={grupMu} kademe={kademe}
            okulRehberi={okulRehberi} tetikleyiciStili={dar ? "ikon" : "tus"} />
        </div>

        {!dar && (
          <div className="px-3 pt-1 pb-4 mb-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="text-sm font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
              {grupMu && role === "ogretmen" ? "Grup koçluk alanı" : rolBasligi[role] ?? "Çalışma alanı"}
            </div>
          </div>
        )}

        {menu.map((kalem) => {
          if (menuGrubuMu(kalem)) {
            const Ikon = IKONLAR[kalem.ikon];
            const acik = acikGrup === kalem.baslik;
            const icindeAktif = kalem.ogeler.some((o) => o.bolum === aktifBolum);
            // Dar rayda grup alt menüsü çizilmiyor; tıklanınca menü genişler
            // ve grup açılır. Uçan panel yerine bu seçildi: uçan panel dar
            // rayda ekranın dışına taşıyor ve klavyeyle yönetimi ayrı iş.
            if (dar) {
              return (
                <button key={kalem.baslik} type="button" title={kalem.baslik}
                  onClick={() => { darYaz(false); setAcikGrup(kalem.baslik); }}
                  className="sfec-btn flex min-h-[52px] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1"
                  style={{ background: icindeAktif ? MINT_BG : "transparent", border: `1px solid ${icindeAktif ? MINT : "transparent"}`, color: TEXT }}>
                  <Ikon size={18} color={icindeAktif ? TEXT : TEXT_MUTED} aria-hidden="true" />
                  <span className="w-full truncate text-center text-[10px] font-bold leading-tight">{kalem.baslik}</span>
                </button>
              );
            }
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

          if (dar) {
            return (
              <Link key={oge.href} href={oge.href} aria-current={aktif ? "page" : undefined} title={oge.etiket}
                className={`sfec-btn relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-1 ${tgBolumu ? "sfec-menu-tg" : ""}`}
                style={{ background: aktif ? MINT_BG : "transparent", color: TEXT, border: `1px solid ${aktif ? MINT : "transparent"}` }}>
                <Ikon size={18} color={aktif ? TEXT : TEXT_MUTED} aria-hidden="true" />
                <span className="w-full truncate text-center text-[10px] font-bold leading-tight">{oge.etiket}</span>
                {rozet > 0 && (
                  <span className="absolute right-1.5 top-1.5 min-w-[16px] rounded-full px-1 text-center text-[9px] font-extrabold"
                    style={{ background: MINT, color: BG1 }}>{rozet}</span>
                )}
              </Link>
            );
          }
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

        {!dar && (
          <div className="mt-auto flex items-center gap-1 px-3 pt-4 text-[11px] font-semibold" style={{ borderTop: `1px solid ${BORDER}`, color: TEXT_MUTED }}>
            <Copyright size={12} aria-hidden="true" /> SefuKoc {new Date().getFullYear()}
          </div>
        )}
      </nav>
    </aside>
  );
}
