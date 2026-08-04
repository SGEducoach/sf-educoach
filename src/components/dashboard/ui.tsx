"use client";

import { Target } from "lucide-react";
import { BORDER, MINT, SKY, TEXT, TEXT_MUTED, BG1, BORDER_STRONG } from "@/lib/theme";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

export function HedefHalkasi({ yuzde, size = 128 }: { yuzde: number; size?: number }) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dolu = Math.max(0, Math.min(100, yuzde));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="halkaGradyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={SKY} />
            <stop offset="100%" stopColor={MINT} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={BORDER} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke="url(#halkaGradyan)" strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c - (c * dolu) / 100} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Target size={14} color={MINT} style={{ marginBottom: 2 }} />
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-2xl font-bold leading-none">%{Math.round(dolu)}</span>
        <span style={{ color: TEXT_MUTED }} className="text-[10px] mt-1 tracking-wide">hedefe yakınlık</span>
      </div>
    </div>
  );
}

export function IstatKart({ icon: Icon, etiket, deger, altYazi, yon, renk, bg, gecikme }: {
  icon: LucideIcon; etiket: string; deger: string | number; altYazi?: string;
  yon?: "up" | "down" | null; renk: string; bg: string; gecikme?: number;
}) {
  const TrendIcon = yon === "up" ? TrendingUp : yon === "down" ? TrendingDown : null;
  return (
    <div
      className="sgec-fade rounded-3xl p-4 flex-1 min-w-0 transition-transform duration-200 hover:-translate-y-0.5"
      style={{ background: BG1, border: `1px solid ${BORDER}`, animationDelay: `${gecikme || 0}ms` }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: bg }}>
          <Icon size={14} color={renk} />
        </div>
        <span style={{ color: TEXT_MUTED }} className="text-[11px] font-semibold uppercase tracking-wider">{etiket}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[28px] font-bold leading-none">{deger}</span>
        {TrendIcon && <TrendIcon size={14} color={yon === "up" ? MINT : "#FF9FB4"} />}
      </div>
      {altYazi && <div style={{ color: TEXT_MUTED }} className="text-xs mt-1.5">{altYazi}</div>}
    </div>
  );
}

export function GirisAlani({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      <input
        {...props}
        className="text-sm px-2.5 py-1.5 rounded-xl outline-none transition-shadow"
        style={{ border: `1px solid ${BORDER_STRONG}`, background: BG1, color: TEXT }}
      />
    </label>
  );
}
