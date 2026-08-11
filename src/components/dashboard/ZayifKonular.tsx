"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, PEACH, PEACH_BG, SKY, SKY_BG, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { konuAnlatimiGetir } from "@/app/dashboard/veri-actions";

interface ZayifKonu {
  ders: string;
  konu: string;
  seviye?: string | null;
}

export function ZayifKonular({ konular }: { konular: ZayifKonu[] }) {
  if (konular.length === 0) return null;

  return (
    <div className="sgec-fade rounded-3xl p-6 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: PEACH_BG }}>
          <BookOpen size={13} color={PEACH} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Konuları biliyor muyum?</span>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">
        &quot;Hedefe uzak&quot; işaretlediğiniz konular — üzerine tıklayıp yapay zeka destekli konu anlatımını okuyabilirsiniz.
      </p>
      <div className="flex flex-col gap-2">
        {konular.map((k) => <KonuSatiri key={`${k.ders}-${k.konu}`} konu={k} />)}
      </div>
    </div>
  );
}

function KonuSatiri({ konu }: { konu: ZayifKonu }) {
  const [acik, setAcik] = useState(false);
  const [icerik, setIcerik] = useState<string | null>(null);
  const [seviye, setSeviye] = useState<string | null>(konu.seviye ?? null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function ac() {
    setAcik((a) => !a);
    if (icerik || yukleniyor) return;
    setYukleniyor(true);
    setHata(null);
    const res = await konuAnlatimiGetir(konu.ders, konu.konu);
    setYukleniyor(false);
    if (res.error) setHata(res.error);
    else { setIcerik(res.icerik); if (res.seviye) setSeviye(res.seviye); }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <button type="button" onClick={ac}
        className="sgec-btn w-full flex items-center justify-between px-4 py-3 text-left">
        <div>
          <div className="flex items-center gap-1.5">
            <span style={{ color: TEXT }} className="text-sm font-semibold">{konu.konu}</span>
            {seviye && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: SKY_BG, color: SKY }}>{seviye}</span>
            )}
          </div>
          <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">{konu.ders}</div>
        </div>
        {yukleniyor ? <Loader2 size={16} color={TEXT_MUTED} className="animate-spin" /> : acik ? <ChevronUp size={16} color={TEXT_MUTED} /> : <ChevronDown size={16} color={TEXT_MUTED} />}
      </button>
      {acik && (
        <div className="px-4 pb-4">
          {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
          {icerik && (
            <div style={{ color: TEXT_MUTED, borderTop: `2px solid ${BORDER_STRONG}` }} className="text-sm leading-relaxed whitespace-pre-line pt-3">
              {icerik}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
