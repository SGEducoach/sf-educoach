"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Wand2, Zap, Rocket } from "lucide-react";
import { TEXT, TEXT_MUTED, LILAC } from "@/lib/theme";
import { MaskotKonusmaBalonu } from "@/components/dashboard/MaskotKonusmaBalonu";

// Öğrenciye "yakında gelecek" olarak duyurulan Yapay Zeka Analizi özelliğinin
// tanıtım kartı. "Analiz iste" butonu, sitede Mesajlarım'da da kullanılan aynı
// Einstein maskot sahnesini (bkz. MaskotKonusmaBalonu) açıyor — ayrı bir
// karakter/balon tasarımı kurmak yerine tutarlılık için aynısı kullanılıyor.
// Gerçek analiz akışı hazır olduğunda buton canlı akışa bağlanacak.
//
// Kart rengi genel teal paletini değil, kendi CSS değişkenlerini kullanıyor
// (--sfec-ai-*, bkz. globals.css) — düşük opaklıklı pastel tonlar koyu modda
// neredeyse görünmez kaldığı için açık/koyu ayrı ayrı tanımlandı.

const SPARKLE_KONUMLARI = [
  { top: "8%", left: "6%", boyut: 16, gecikme: "0s", Icon: Sparkles, renk: "var(--sfec-mint)" },
  { top: "16%", left: "90%", boyut: 14, gecikme: "0.6s", Icon: Zap, renk: "#2563EB" },
  { top: "78%", left: "92%", boyut: 16, gecikme: "1.1s", Icon: Sparkles, renk: LILAC },
  { top: "82%", left: "8%", boyut: 13, gecikme: "1.6s", Icon: Wand2, renk: "#2563EB" },
] as const;

export function YapayZekaAnaliziPromosu() {
  const [mascotAcik, setMascotAcik] = useState(false);

  return (
    <div
      className="sfec-fade relative overflow-hidden rounded-3xl p-5 sm:p-6"
      style={{ background: "var(--sfec-ai-bg)", border: "2px solid var(--sfec-ai-border)" }}
    >
      {/* Yumuşak nefes alan arka plan parıltıları */}
      <div className="sfec-ai-glow pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full" style={{ background: "radial-gradient(circle, var(--sfec-ai-glow-1), transparent 70%)" }} />
      <div className="sfec-ai-glow pointer-events-none absolute -bottom-20 -left-14 h-56 w-56 rounded-full" style={{ background: "radial-gradient(circle, var(--sfec-ai-glow-2), transparent 70%)", animationDelay: "1.2s" }} />

      {/* Twinkle eden dağınık sparkle ikonları */}
      {SPARKLE_KONUMLARI.map((s, i) => (
        <s.Icon
          key={i}
          size={s.boyut}
          color={s.renk}
          className="sfec-sparkle pointer-events-none absolute hidden sm:block"
          style={{ top: s.top, left: s.left, animationDelay: s.gecikme }}
        />
      ))}

      {/* Sol üstte, hangi yapay zeka modelinin kullanılacağını belirten küçük
          rozet — mobilde de yer kaplamaması için kısa ve sabit boyutlu. */}
      <div
        className="relative sm:absolute sm:top-4 sm:left-4 mb-3 sm:mb-0 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
        style={{ background: "rgba(0,0,0,0.28)", color: "#E8E1FF", border: "1px solid rgba(255,255,255,0.18)" }}
      >
        <Sparkles size={10} color="#C4B5FD" /> Claude Opus 5 ile
      </div>

      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[16px] font-bold">
            Yapay Zeka Analizi
          </span>
          <span
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: "var(--sfec-ai-chip-bg)", color: "var(--sfec-ai-accent-text)" }}
          >
            <Sparkles size={9} /> Yakında
          </span>
        </div>
        <p style={{ color: TEXT_MUTED }} className="text-[12px] leading-relaxed max-w-md">
          Deneme sonuçların, konu çalışman ve soru performansın yapay zekayla analiz edilsin. Güçlü/zayıf yönlerin ve
          sana özel çalışma önerilerin tek dokunuşla önünde olsun.
        </p>

        <button
          type="button"
          onClick={() => setMascotAcik(true)}
          className="sfec-btn flex items-center gap-1.5 text-[12px] font-bold px-4 py-2.5 rounded-full"
          style={{ background: "linear-gradient(135deg, #7C3AED, #2563EB)", color: "#fff", boxShadow: "0 4px 14px rgba(124,58,237,0.32)" }}
        >
          <Wand2 size={13} /> Analiz iste
        </button>
      </div>

      {mascotAcik && createPortal(
        <MaskotKonusmaBalonu onKapat={() => setMascotAcik(false)} ariaLabel="Yapay Zeka Analizi">
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="flex items-center gap-2 pr-8 text-base font-bold">
            <Rocket size={16} color={LILAC} /> Çok yakında burada olacak!
          </span>
        </MaskotKonusmaBalonu>,
        document.body,
      )}
    </div>
  );
}
