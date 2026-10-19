"use client";

import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED } from "@/lib/theme";

// Kurumları Yönet'in Rehberlik ve İdare / Ders Programı ve Nöbet sekmeleri
// (20.10.2026): kurum değişince aynı sekme açık kalır.
export function KurumSecici({ okullar, seciliOkulId, sekme }: { okullar: { id: string; ad: string }[]; seciliOkulId: string | null; sekme: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-3xl px-5 py-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <Building2 size={14} color={TEXT_MUTED} aria-hidden="true" />
      <label htmlFor="kurum-secici" className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Kurum</label>
      <select id="kurum-secici" value={seciliOkulId ?? ""} onChange={(e) => router.push(`/yonetici/okullar?okul=${e.target.value}&sekme=${sekme}`)}
        className="min-w-0 max-w-full rounded-full px-3 py-1.5 text-xs font-bold outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
        {okullar.map((o) => <option key={o.id} value={o.id}>{o.ad}</option>)}
      </select>
    </div>
  );
}
