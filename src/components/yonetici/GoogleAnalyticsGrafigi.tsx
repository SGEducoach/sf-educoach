"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BG1, BORDER, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";

type GunlukOturum = { etiket: string; deger: number };

function tarih(etiket: string, yil = false) {
  return `${etiket.slice(6, 8)}.${etiket.slice(4, 6)}${yil ? `.${etiket.slice(0, 4)}` : ""}`;
}

export function GoogleAnalyticsGrafigi({ gunler }: { gunler: GunlukOturum[] }) {
  const dolguId = `ga-oturum-${useId().replace(/:/g, "")}`;

  // Yalnızca GA4'ten dönen satırlar çizilir; eksik günlere tahmini değer eklenmez.
  if (!gunler.length) return <p className="mt-3 text-sm" style={{ color: TEXT_MUTED }}>Bu dönemde kayıtlı veri yok.</p>;

  return <div className="mt-4 h-40 min-w-0 w-full" role="group" aria-label="Günlük oturum grafiği. Ayrıntılı değerler aşağıdaki tarih ve oturum tablosundadır.">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <AreaChart data={gunler} margin={{ top: 8, right: 10, bottom: 0, left: 0 }} accessibilityLayer>
        <defs>
          <linearGradient id={dolguId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MINT} stopOpacity={0.32} />
            <stop offset="100%" stopColor={MINT} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={BORDER} strokeDasharray="3 5" />
        <XAxis dataKey="etiket" tickFormatter={etiket => tarih(String(etiket))} tick={{ fill: TEXT_MUTED, fontSize: 10 }}
          axisLine={false} tickLine={false} minTickGap={28} tickMargin={10} height={28} padding={{ left: 6, right: 6 }} />
        <YAxis allowDecimals={false} domain={[0, "auto"]} tickCount={3} width={42}
          tickFormatter={deger => Number(deger).toLocaleString("tr-TR", { notation: "compact", maximumFractionDigits: 1 })}
          tick={{ fill: TEXT_MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip labelFormatter={etiket => tarih(String(etiket), true)}
          formatter={deger => [Number(deger).toLocaleString("tr-TR"), "Oturum"]}
          contentStyle={{ background: BG1, border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT, fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}
          labelStyle={{ color: TEXT_MUTED, marginBottom: 4 }} itemStyle={{ color: MINT }}
          cursor={{ stroke: MINT, strokeOpacity: 0.4, strokeDasharray: "3 3" }} isAnimationActive={false} />
        <Area type="linear" dataKey="deger" name="Oturum" stroke={MINT} strokeWidth={2}
          fill={`url(#${dolguId})`} dot={gunler.length === 1 ? { r: 4, fill: MINT, stroke: BG1, strokeWidth: 2 } : false}
          activeDot={{ r: 4, fill: MINT, stroke: BG1, strokeWidth: 2 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}
