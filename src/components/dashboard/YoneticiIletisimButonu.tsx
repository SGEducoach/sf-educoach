"use client";
import { useState } from "react";
import { Mail } from "lucide-react";
import { YoneticiMesajlar } from "@/components/dashboard/YoneticiMesajlar";
import { BORDER, MINT, MINT_BG, TEXT } from "@/lib/theme";

export function YoneticiIletisimButonu({ satir = false }: { satir?: boolean }) {
  const [acik, setAcik] = useState(false);
  return (
    <><button type="button" onClick={() => setAcik(true)}
      title="Yöneticiyle iletişime geç"
      className={satir
        ? "sfec-btn flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold"
        : "sfec-btn flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"}
      style={{ color: TEXT, background: MINT_BG, border: `2px solid ${BORDER}` }}>
      <Mail size={16} color={MINT} aria-hidden="true" />
      Yöneticiyle iletişime geç
    </button>
    {acik && <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-label="Yöneticiyle iletişim">
      <div className="w-full max-w-xl max-h-[85dvh] overflow-y-auto rounded-2xl p-3" style={{ background: MINT_BG }}>
        <button type="button" onClick={() => setAcik(false)} className="rounded-xl px-4 py-2 mb-2" style={{ color: TEXT }}>Kapat</button>
        <YoneticiMesajlar />
      </div>
    </div>}</>
  );
}
