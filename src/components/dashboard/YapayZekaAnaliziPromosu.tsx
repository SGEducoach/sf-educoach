"use client";

import { useState } from "react";
import { Sparkles, BrainCircuit, Wand2, Zap, Rocket } from "lucide-react";
import { BORDER, TEXT, TEXT_MUTED, LILAC, LILAC_BG, SKY, MINT } from "@/lib/theme";

// Öğrenciye "yakında gelecek" olarak duyurulan Yapay Zeka Analizi özelliğinin
// tanıtım kartı. Şimdilik tıklanınca sadece "çok yakında" bilgisi veriyor —
// gerçek analiz akışı (bkz. konuşma geçmişindeki maliyet/rozet planlaması)
// hazır olduğunda buton burada canlı akışa bağlanacak.
const SPARKLE_KONUMLARI = [
  { top: "8%", left: "6%", boyut: 16, gecikme: "0s", Icon: Sparkles, renk: MINT },
  { top: "18%", left: "88%", boyut: 14, gecikme: "0.6s", Icon: Zap, renk: SKY },
  { top: "72%", left: "92%", boyut: 18, gecikme: "1.1s", Icon: Sparkles, renk: LILAC },
  { top: "80%", left: "10%", boyut: 13, gecikme: "1.6s", Icon: Wand2, renk: SKY },
  { top: "45%", left: "97%", boyut: 12, gecikme: "0.3s", Icon: Sparkles, renk: MINT },
] as const;

export function YapayZekaAnaliziPromosu() {
  const [mesajAcik, setMesajAcik] = useState(false);

  function analizIste() {
    setMesajAcik(true);
    window.setTimeout(() => setMesajAcik(false), 4000);
  }

  return (
    <div
      className="sgec-fade relative overflow-hidden rounded-3xl p-5 sm:p-6"
      style={{
        background: `linear-gradient(135deg, ${LILAC_BG} 0%, rgba(143,198,255,0.10) 55%, rgba(124,232,176,0.08) 100%)`,
        border: `2px solid ${BORDER}`,
      }}
    >
      {/* Yumuşak nefes alan arka plan parıltıları */}
      <div className="sgec-ai-glow pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full" style={{ background: "radial-gradient(circle, rgba(124,58,237,0.22), transparent 70%)" }} />
      <div className="sgec-ai-glow pointer-events-none absolute -bottom-20 -left-14 h-56 w-56 rounded-full" style={{ background: "radial-gradient(circle, rgba(37,99,235,0.16), transparent 70%)", animationDelay: "1.2s" }} />

      {/* Twinkle eden dağınık sparkle ikonları */}
      {SPARKLE_KONUMLARI.map((s, i) => (
        <s.Icon
          key={i}
          size={s.boyut}
          color={s.renk}
          className="sgec-sparkle pointer-events-none absolute hidden sm:block"
          style={{ top: s.top, left: s.left, animationDelay: s.gecikme }}
        />
      ))}

      <div className="relative flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="sgec-ai-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, #7C3AED, #2563EB)", boxShadow: "0 6px 18px rgba(124,58,237,0.35)" }}
          >
            <BrainCircuit size={20} color="#fff" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[16px] font-bold">
                Yapay Zeka Analizi
              </span>
              <span
                className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(37,99,235,0.18))", color: LILAC }}
              >
                <Sparkles size={9} /> Yakında
              </span>
            </div>
            <p style={{ color: TEXT_MUTED }} className="text-[12px] leading-relaxed mt-1 max-w-md">
              Deneme sonuçların, konu çalışman ve soru performansın yapay zekayla analiz edilsin — güçlü/zayıf yönlerin
              ve sana özel çalışma önerilerin tek dokunuşla önünde olsun.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={analizIste}
          className="sgec-btn shrink-0 flex items-center gap-1.5 text-[12px] font-bold px-4 py-2.5 rounded-full self-start sm:self-auto"
          style={{ background: "linear-gradient(135deg, #7C3AED, #2563EB)", color: "#fff", boxShadow: "0 4px 14px rgba(124,58,237,0.32)" }}
        >
          <Wand2 size={13} /> Analiz iste
        </button>
      </div>

      {mesajAcik && (
        <div
          className="sgec-fade relative mt-3.5 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[12px] font-semibold"
          style={{ background: "rgba(124,58,237,0.12)", color: LILAC }}
        >
          <Rocket size={13} /> Çok yakında burada olacak! Hazır olduğunda seni bilgilendireceğiz.
        </div>
      )}
    </div>
  );
}
