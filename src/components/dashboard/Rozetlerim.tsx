"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trophy, BookOpen, PenLine, ClipboardList, BookText, X } from "lucide-react";
import type { RozetSeviye } from "@/lib/types";
import { ROZET_SEVIYE_ETIKET, dokuzOnSinifMi } from "@/lib/types";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// Rozet sistemi v2: 3 bağımsız kategori (konu/soru/deneme) + bunlardan
// türetilen "genel" (SG EDUCOACH) rozeti. Hepsi CANLI durum — kalıcı değil,
// öğrenci pas geçtiğinde seviye düşebilir. Kazanım/düşüş mantığı tamamen
// DB'de (ogrenci_rozet_durumu RPC, her dashboard yüklemesinde tazeleniyor);
// burada sadece görüntüleniyor.

const SEVIYE_EMOJI: Record<RozetSeviye, string> = { yok: "—", bronz: "🥉", gumus: "🥈", altin: "🥇" };

const KATEGORI_META = {
  konu: { ad: "Konu Çalışma", Icon: BookOpen, renk: MINT },
  soru: { ad: "Soru Çözümü", Icon: PenLine, renk: "#8FC6FF" },
  deneme: { ad: "Deneme", Icon: ClipboardList, renk: "#FFB199" },
} as const;

export interface RozetDurum {
  konu: RozetSeviye;
  soru: RozetSeviye;
  deneme: RozetSeviye;
  genel: RozetSeviye;
}

function RozetKurallariModal({ onKapat, dokuzOnMu }: { onKapat: () => void; dokuzOnMu: boolean }) {
  useEffect(() => {
    const oncekiTasima = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const escapeIleKapat = (event: KeyboardEvent) => {
      if (event.key === "Escape") onKapat();
    };
    document.addEventListener("keydown", escapeIleKapat);

    return () => {
      document.body.style.overflow = oncekiTasima;
      document.removeEventListener("keydown", escapeIleKapat);
    };
  }, [onKapat]);

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-start justify-center px-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] sm:items-center sm:px-4 sm:py-8"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
      onClick={onKapat}>
      <div className="sgec-fade relative grid w-full max-w-sm grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-3xl"
        style={{ background: BG1, border: `2px solid ${BORDER}`, height: "calc(100dvh - max(24px, env(safe-area-inset-top) + env(safe-area-inset-bottom)))", maxHeight: 860 }}
        onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onKapat}
          className="sgec-btn absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <X size={13} color={TEXT_MUTED} />
        </button>
        <div className="flex shrink-0 items-center gap-2 px-5 pb-3 pt-5 pr-14">
          <BookText size={16} color={MINT} />
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Rozet kuralları</span>
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain px-5 pb-4">
        <div className="rounded-2xl p-3.5" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <div style={{ color: MINT }} className="text-xs font-bold mb-1">📖 Konu Çalışma</div>
          <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">
            Her gün ayrı bir &ldquo;aktif gün&rdquo; sayılır. Geriye dönük en fazla <strong>3 gün</strong> önceye kadar girebilirsin — daha uzun bir boşluk olursa seri sıfırlanır (Duolingo mantığı). Kayan 30 günde: <strong>15 gün Bronz · 20 gün Gümüş · 30 gün Altın</strong>.
          </p>
        </div>

        <div className="rounded-2xl p-3.5" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <div style={{ color: "#8FC6FF" }} className="text-xs font-bold mb-1">✏️ Soru Çözümü</div>
          <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">
            TYT&apos;nin 5 çekirdek dersinde (Türkçe, Matematik, Fizik, Kimya, Biyoloji) <strong>her birinde ayrı ayrı</strong> son 3 günün toplamına bakılır — en düşük ders eşiği geçmeden seviye atlanmaz. Geriye dönük en fazla <strong>3 gün</strong>. Ders başına: <strong>20+ Bronz · 30+ Gümüş · 50+ Altın</strong>.
          </p>
        </div>

        <div className="rounded-2xl p-3.5" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <div style={{ color: "#FFB199" }} className="text-xs font-bold mb-1">📋 Deneme</div>
          {dokuzOnMu ? (
            <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">
              9 ve 10. sınıfta Branş Denemesi sayılır — kayan 30 günde (aylık) toplam deneme sayısı. Geriye dönük en fazla <strong>7 gün</strong>. <strong>1+ Bronz · 2+ Gümüş · 3+ Altın</strong>.
            </p>
          ) : (
            <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">
              Kayan 30 günde toplam deneme sayısı. Geriye dönük en fazla <strong>7 gün</strong>. <strong>3+ Bronz · 4+ Gümüş · 8+ Altın</strong>.
            </p>
          )}
        </div>

        <div className="rounded-2xl p-3.5" style={{ background: "rgba(255,196,107,0.1)", border: "1px solid rgba(255,196,107,0.3)" }}>
          <div style={{ color: "#FFC46B" }} className="text-xs font-bold mb-1">🏆 SG EDUCOACH</div>
          <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">
            Yukarıdaki 3 kategoriden kaçı Altın seviyesindeyse: <strong>1 kategori Altın → Bronz · 2 kategori Altın → Gümüş · 3 kategori Altın → Altın</strong>.
          </p>
        </div>

        <p style={{ color: TEXT_MUTED }} className="text-[10px] leading-relaxed italic">
          Not: Rozetler kalıcı değil — düzenli girişi kesersen seviye düşebilir/sıfırlanabilir.
        </p>
        </div>

        <div className="relative z-20 shrink-0 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3" style={{ background: BG1, borderTop: `2px solid ${BORDER}` }}>
          <button type="button" onClick={onKapat}
            className="sgec-btn w-full rounded-xl py-2.5 text-sm font-bold" style={{ background: MINT, color: MINT_ON }}>
            Anladım
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function Rozetlerim({ durum, sinifSeviyesi }: { durum: RozetDurum; sinifSeviyesi?: string | null }) {
  const [kurallarAcik, setKurallarAcik] = useState(false);
  const dokuzOnMu = dokuzOnSinifMi(sinifSeviyesi);

  return (
    <div className="sgec-fade rounded-3xl p-5 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,196,107,0.15)" }}>
            <Trophy size={13} color="#FFC46B" />
          </div>
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Rozetlerim</span>
        </div>
        <button type="button" onClick={() => setKurallarAcik(true)} title="Rozet kuralları"
          className="sgec-btn w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER_STRONG}` }}>
          <BookText size={13} color={TEXT_MUTED} />
        </button>
      </div>

      {/* SG EDUCOACH — en belirgin, en dikkat çekici olan */}
      <div className="rounded-2xl p-4 mb-3 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, rgba(255,196,107,0.18), rgba(255,196,107,0.05))", border: `1px solid rgba(255,196,107,0.35)` }}>
        <span className="text-3xl">{durum.genel === "yok" ? "🏆" : SEVIYE_EMOJI[durum.genel]}</span>
        <div className="flex flex-col">
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-sm font-bold">SG EDUCOACH {ROZET_SEVIYE_ETIKET[durum.genel]}</span>
          <span style={{ color: TEXT_MUTED }} className="text-[11px]">3 kategorinin üçünde de altına ulaşınca kazanılır</span>
        </div>
      </div>

      {/* Kategori rozetleri — birbirine eşit değerde, ayrı görsellikte */}
      <div className="grid grid-cols-3 gap-2.5">
        {(Object.keys(KATEGORI_META) as (keyof typeof KATEGORI_META)[]).map((k) => {
          const meta = KATEGORI_META[k];
          const seviye = durum[k];
          const Icon = meta.Icon;
          return (
            <div key={k} className="rounded-2xl p-3 flex flex-col items-center gap-1 text-center"
              style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}`, opacity: seviye === "yok" ? 0.55 : 1 }}>
              <Icon size={14} color={meta.renk} />
              <span className="text-lg">{SEVIYE_EMOJI[seviye]}</span>
              <span style={{ color: TEXT }} className="text-[10px] font-bold leading-tight">{meta.ad}</span>
              <span style={{ color: seviye === "yok" ? TEXT_MUTED : MINT }} className="text-[9px] font-semibold">{ROZET_SEVIYE_ETIKET[seviye]}</span>
            </div>
          );
        })}
      </div>

      {kurallarAcik && <RozetKurallariModal onKapat={() => setKurallarAcik(false)} dokuzOnMu={dokuzOnMu} />}
    </div>
  );
}
