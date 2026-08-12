"use client";

import { useState } from "react";
import { Sparkles, Wand2, Zap } from "lucide-react";
import { TEXT, TEXT_MUTED, LILAC, MINT, SKY } from "@/lib/theme";

// Öğrenciye "yakında gelecek" olarak duyurulan Yapay Zeka Analizi özelliğinin
// tanıtım kartı. Şimdilik tıklanınca sadece "çok yakında" bilgisi veriyor —
// gerçek analiz akışı (bkz. konuşma geçmişindeki maliyet/rozet planlaması)
// hazır olduğunda buton burada canlı akışa bağlanacak.
//
// Kart rengi genel teal paletini değil, kendi CSS değişkenlerini kullanıyor
// (--sgec-ai-*, bkz. globals.css) — düşük opaklıklı pastel tonlar koyu modda
// neredeyse görünmez kaldığı için açık/koyu ayrı ayrı tanımlandı.

const SPARKLE_KONUMLARI = [
  { top: "8%", left: "6%", boyut: 16, gecikme: "0s", Icon: Sparkles, renk: MINT },
  { top: "16%", left: "90%", boyut: 14, gecikme: "0.6s", Icon: Zap, renk: SKY },
  { top: "78%", left: "92%", boyut: 16, gecikme: "1.1s", Icon: Sparkles, renk: LILAC },
  { top: "82%", left: "8%", boyut: 13, gecikme: "1.6s", Icon: Wand2, renk: SKY },
] as const;

const VARSAYILAN_BALON = "Biraz sabır 😊";
const TIKLANINCA_BALON = "Çok yakında burada olacak! 🚀";

// Gerçek bir kişinin fotoğrafını taklit etmeyen, elle çizilmiş "dahi bilim
// insanı" karikatürü — dağınık saç + bıyık, herkesin tanıdığı ama tamamen
// özgün bir çizim.
function BilimInsaniMaskotu() {
  return (
    <svg width="76" height="76" viewBox="0 0 100 100" className="sgec-ai-mascot shrink-0" aria-hidden="true">
      {/* Zemin dairesi — hem açık hem koyu temada maskotu arka plandan ayırır */}
      <circle cx="50" cy="52" r="46" fill="var(--sgec-bg1)" stroke="var(--sgec-ai-border)" strokeWidth="2" />
      {/* Dağınık saç */}
      <path
        d="M14 46c-6-10 2-24 12-22-4-10 8-20 16-12 2-12 20-12 20 0 10-8 22 2 16 12 10-2 16 12 8 20 8 6 2 20-8 18 4 10-10 18-18 12 0 10-16 12-20 2-6 10-22 6-20-6-10 4-18-8-12-16-8 2-14-10-6-16-8 0-10-10-4-14 4-4 14-2 16 4"
        fill="#F1F1F1"
        stroke="#D6D6D6"
        strokeWidth="1.5"
      />
      {/* Yüz */}
      <circle cx="50" cy="54" r="26" fill="#F3C9A0" />
      {/* Kaşlar */}
      <path d="M34 46q6-6 12-1" stroke="#D6D6D6" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M54 45q6-5 12 1" stroke="#D6D6D6" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Mutlu kapalı gözler */}
      <path d="M38 55q4 4 8 0" stroke="#5A4636" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M54 55q4 4 8 0" stroke="#5A4636" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      {/* Burun */}
      <path d="M49 56q-2 6 1 8" stroke="#D9A876" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Bıyık */}
      <path
        d="M32 68c6-5 12-4 18-1 6-3 12-4 18 1-4 6-12 5-18 2-6 3-14 4-18-2Z"
        fill="#F1F1F1"
        stroke="#D6D6D6"
        strokeWidth="1.2"
      />
      {/* Gülümseme */}
      <path d="M44 72q6 4 12 0" stroke="#B4693F" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Papyon */}
      <path d="M40 84l10 5 10-5-10-3z" fill={LILAC} />
    </svg>
  );
}

export function YapayZekaAnaliziPromosu() {
  const [balonMetni, setBalonMetni] = useState(VARSAYILAN_BALON);

  function analizIste() {
    setBalonMetni(TIKLANINCA_BALON);
    window.setTimeout(() => setBalonMetni(VARSAYILAN_BALON), 4000);
  }

  return (
    <div
      className="sgec-fade relative overflow-hidden rounded-3xl p-5 sm:p-6"
      style={{ background: "var(--sgec-ai-bg)", border: "2px solid var(--sgec-ai-border)" }}
    >
      {/* Yumuşak nefes alan arka plan parıltıları */}
      <div className="sgec-ai-glow pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full" style={{ background: "radial-gradient(circle, var(--sgec-ai-glow-1), transparent 70%)" }} />
      <div className="sgec-ai-glow pointer-events-none absolute -bottom-20 -left-14 h-56 w-56 rounded-full" style={{ background: "radial-gradient(circle, var(--sgec-ai-glow-2), transparent 70%)", animationDelay: "1.2s" }} />

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

      <div className="relative flex flex-col items-center gap-4 text-center">
        {/* Sayfa/kart ortasında maskot + konuşma balonu */}
        <div className="flex items-end gap-2">
          <BilimInsaniMaskotu />
          <div
            key={balonMetni}
            className="sgec-ai-bubble relative rounded-2xl px-3.5 py-2 text-[12px] font-bold"
            style={{ background: "#ffffff", color: "#18302f", border: `2px solid ${LILAC}`, boxShadow: "0 6px 16px rgba(0,0,0,0.18)" }}
          >
            {balonMetni}
            <span
              className="absolute -bottom-[7px] left-4 h-3 w-3 rotate-45"
              style={{ background: "#ffffff", borderRight: `2px solid ${LILAC}`, borderBottom: `2px solid ${LILAC}` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[16px] font-bold">
            Yapay Zeka Analizi
          </span>
          <span
            className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: "var(--sgec-ai-chip-bg)", color: "var(--sgec-ai-accent-text)" }}
          >
            <Sparkles size={9} /> Yakında
          </span>
        </div>
        <p style={{ color: TEXT_MUTED }} className="text-[12px] leading-relaxed max-w-md">
          Deneme sonuçların, konu çalışman ve soru performansın yapay zekayla analiz edilsin — güçlü/zayıf yönlerin
          ve sana özel çalışma önerilerin tek dokunuşla önünde olsun.
        </p>

        <button
          type="button"
          onClick={analizIste}
          className="sgec-btn flex items-center gap-1.5 text-[12px] font-bold px-4 py-2.5 rounded-full"
          style={{ background: "linear-gradient(135deg, #7C3AED, #2563EB)", color: "#fff", boxShadow: "0 4px 14px rgba(124,58,237,0.32)" }}
        >
          <Wand2 size={13} /> Analiz iste
        </button>
      </div>
    </div>
  );
}
