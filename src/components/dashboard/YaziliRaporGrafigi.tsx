"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, XAxis, YAxis } from "recharts";
import { DUSUK_BASARI_ESIGI, NOT_SIRASI, type NotSonucu } from "@/lib/yazili-rapor-hesap";

const NOT_RENGI: Record<NotSonucu, string> = {
  GEÇMEZ: "#d9534f",
  GEÇER: "#f0ad4e",
  ORTA: "#5bc0de",
  İYİ: "#2f6fb2",
  PEKİYİ: "#2e8b57",
};

// Rapordaki "Grafik analiz" — şablondaki gibi iki grafik. Yazdırmada genişlik
// ölçümü şaşmasın diye sabit ölçülü (ResponsiveContainer yok) ve animasyonsuz:
// animasyonlu çubuklar yazdırma anında sıfır yükseklikte kalabiliyor.
export function YaziliRaporGrafigi({ soruBasari, dagilim }: { soruBasari: (number | null)[]; dagilim: Record<NotSonucu, number> }) {
  const soruVerisi = soruBasari.map((v, i) => ({ ad: `S${i + 1}`, basari: v === null ? 0 : Math.round(v * 10) / 10 }));
  const notVerisi = NOT_SIRASI.map((sonuc) => ({ ad: sonuc, sayi: dagilim[sonuc] }));

  return (
    <div className="grid grid-cols-2 gap-3 overflow-x-auto">
      <figure>
        <figcaption className="mb-1 text-center text-[10px] font-bold">Sorulara göre başarı (%)</figcaption>
        <BarChart width={340} height={170} data={soruVerisi} margin={{ top: 14, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d0d0d0" vertical={false} />
          <XAxis dataKey="ad" tick={{ fontSize: 9, fill: "#222" }} interval={0} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 9, fill: "#222" }} />
          <ReferenceLine y={DUSUK_BASARI_ESIGI} stroke="#c00000" strokeDasharray="4 3" />
          <Bar dataKey="basari" isAnimationActive={false} maxBarSize={28}>
            {soruVerisi.map((d) => (
              <Cell key={d.ad} fill={d.basari < DUSUK_BASARI_ESIGI ? "#d9534f" : "#2f6fb2"} />
            ))}
            <LabelList dataKey="basari" position="top" style={{ fontSize: 8, fill: "#111" }} />
          </Bar>
        </BarChart>
      </figure>
      <figure>
        <figcaption className="mb-1 text-center text-[10px] font-bold">Not dağılımı (öğrenci sayısı)</figcaption>
        <BarChart width={340} height={170} data={notVerisi} margin={{ top: 14, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#d0d0d0" vertical={false} />
          <XAxis dataKey="ad" tick={{ fontSize: 8.5, fill: "#222" }} interval={0} />
          <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#222" }} />
          <Bar dataKey="sayi" isAnimationActive={false} maxBarSize={34}>
            {notVerisi.map((d) => (
              <Cell key={d.ad} fill={NOT_RENGI[d.ad]} />
            ))}
            <LabelList dataKey="sayi" position="top" style={{ fontSize: 9, fill: "#111" }} />
          </Bar>
        </BarChart>
      </figure>
    </div>
  );
}
