"use client";

import { useState } from "react";
import { Trophy, BookOpen, PenLine, ClipboardList, BookText, X } from "lucide-react";
import type { RozetSeviye } from "@/lib/types";
import { ROZET_SEVIYE_ETIKET } from "@/lib/types";
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

function RozetKurallariModal({ onKapat }: { onKapat: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-8"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
      onClick={onKapat}>
      <div className="sgec-fade w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4 relative"
        style={{ background: BG1, border: `2px solid ${BORDER}`, maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onKapat}
          className="sgec-btn absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <X size={13} color={TEXT_MUTED} />
        </button>
        <div className="flex items-center gap-2">
          <BookText size={16} color={MINT} />
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Rozet kuralları</span>
        </div>

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
          <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">
            Kayan 30 günde toplam deneme sayısı. Geriye dönük en fazla <strong>7 gün</strong>. <strong>3+ Bronz · 4+ Gümüş · 8+ Altın</strong>.
          </p>
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

        <button type="button" onClick={onKapat}
          className="sgec-btn text-sm font-bold py-2.5 rounded-xl" style={{ background: MINT, color: MINT_ON }}>
          Anladım
        </button>
      </div>
    </div>
  );
}

export function Rozetlerim({ durum }: { durum: RozetDurum }) {
  const [kurallarAcik, setKurallarAcik] = useState(false);

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

      {kurallarAcik && <RozetKurallariModal onKapat={() => setKurallarAcik(false)} />}
    </div>
  );
}
