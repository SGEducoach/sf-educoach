"use client";

import { useState, type ReactNode } from "react";
import { BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED } from "@/lib/theme";

// Öğrenci "Analiz / Rapor" ekranının uzun yığınını iki sekmeye böler
// (denetim 20.10.2026): Gelişim (analiz paneli) ve Denemeler (karne + konu
// analizi). İçerikler sunucuda üretilip buraya hazır gelir; bu bileşen yalnız
// hangisinin görüneceğini seçer. Etkin olmayan sekme yazdırmada YİNE basılır
// (print:block) — "Yazdır / PDF" çıktısı eskisi gibi eksiksiz kalır.
// "Konu ve çalışma" ayrı sekme DEĞİL: o kartlar analiz panelinin içinde
// (hız/doğruluk, hedefe yakınlık) ve ayrıştırılması ayrı bir yeniden yazım.

type Sekme = "gelisim" | "denemeler";

export function AnalizSekmeleri({ gelisim, denemeler, denemeVarMi }: {
  gelisim: ReactNode;
  /** Karne + konu analizi; yoksa sekme hiç gösterilmez. */
  denemeler: ReactNode;
  denemeVarMi: boolean;
}) {
  const [sekme, setSekme] = useState<Sekme>("gelisim");
  if (!denemeVarMi) return <>{gelisim}</>;

  const sekmeler: { kod: Sekme; etiket: string }[] = [
    { kod: "gelisim", etiket: "Gelişim" },
    { kod: "denemeler", etiket: "Denemeler" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Analiz bölümleri" className="flex gap-2 print:hidden">
        {sekmeler.map((s) => (
          <button key={s.kod} type="button" role="tab" id={`analiz-sekme-${s.kod}`}
            aria-selected={sekme === s.kod} aria-controls={`analiz-panel-${s.kod}`}
            onClick={() => setSekme(s.kod)}
            className="sfec-btn rounded-xl px-4 py-2 text-sm font-bold"
            style={{
              background: sekme === s.kod ? BG1_ALT : "transparent",
              color: sekme === s.kod ? TEXT : TEXT_MUTED,
              border: `2px solid ${sekme === s.kod ? BORDER_STRONG : BORDER}`,
            }}>
            {s.etiket}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="analiz-panel-gelisim" aria-labelledby="analiz-sekme-gelisim"
        className={sekme === "gelisim" ? "" : "hidden print:block"}>
        {gelisim}
      </div>
      <div role="tabpanel" id="analiz-panel-denemeler" aria-labelledby="analiz-sekme-denemeler"
        className={sekme === "denemeler" ? "flex flex-col gap-4" : "hidden print:flex print:flex-col print:gap-4"}>
        {denemeler}
      </div>
    </div>
  );
}
