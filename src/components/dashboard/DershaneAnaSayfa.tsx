"use client";

import { Users, Target, ListChecks } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import type { DershaneAnaSayfaVerisi } from "@/lib/dershane-ana-sayfa";
import {
  BG1, BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED, MINT, MINT_BG, MINT_ON,
  SKY, SKY_BG, BUTTER, LILAC,
} from "@/lib/theme";

// Kademe (9./10./11./12. sınıf) çizgi/bar rengi — dersRenkleri (theme.ts)
// ile aynı paletten, en fazla 4 kademe olduğu için 4 sabit renk yeterli.
const KADEME_RENK: Record<string, string> = { "9": MINT, "10": SKY, "11": BUTTER, "12": LILAC };
const KADEME_RENGI = (seviye: string) => KADEME_RENK[seviye] ?? TEXT_MUTED;

function tarihFormat(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

function IstatKart({ icon: Icon, etiket, deger, altYazi, renk, bg }: {
  icon: typeof Target; etiket: string; deger: string | number; altYazi?: string; renk: string; bg: string;
}) {
  return (
    <div className="sfec-fade rounded-3xl p-4 flex-1 min-w-0" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: bg }}>
          <Icon size={14} color={renk} />
        </div>
        <span style={{ color: TEXT_MUTED }} className="text-[11px] font-semibold uppercase tracking-wider">{etiket}</span>
      </div>
      <div style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[28px] font-bold leading-none">{deger}</div>
      {altYazi && <div style={{ color: TEXT_MUTED }} className="text-xs mt-1.5">{altYazi}</div>}
    </div>
  );
}

export function DershaneAnaSayfa({ veri }: { veri: DershaneAnaSayfaVerisi }) {
  const buHaftaGenel = veri.genel[veri.genel.length - 1];
  const buHaftaKademeSoru = veri.kademeler.map((k) => `${k.seviye}. sınıf: ${k.noktalar[k.noktalar.length - 1].soruSayisi}`).join(" · ");

  const netChartData = veri.genel.map((n, i) => {
    const satir: Record<string, string | number | null> = { tarih: tarihFormat(n.haftaBaslangic), Genel: n.netOrtalama };
    for (const k of veri.kademeler) satir[`${k.seviye}. sınıf`] = k.noktalar[i].netOrtalama;
    return satir;
  });

  const soruChartData = veri.genel.map((_, i) => {
    const satir: Record<string, string | number> = { tarih: tarihFormat(veri.genel[i].haftaBaslangic) };
    for (const k of veri.kademeler) satir[`${k.seviye}. sınıf`] = k.noktalar[i].soruSayisi;
    return satir;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <IstatKart icon={Users} etiket="Toplam öğrenci" deger={veri.ogrenciSayisi} renk={MINT_ON} bg={MINT_BG} />
        <IstatKart icon={Target} etiket="Bu hafta genel net ort." deger={buHaftaGenel.netOrtalama ?? "—"}
          altYazi={buHaftaGenel.denemeSayisi > 0 ? `${buHaftaGenel.denemeSayisi} deneme` : "Bu hafta deneme yok"} renk={SKY} bg={SKY_BG} />
        <IstatKart icon={ListChecks} etiket="Bu hafta çözülen soru" deger={buHaftaGenel.soruSayisi}
          altYazi={buHaftaKademeSoru || undefined} renk={MINT_ON} bg={MINT_BG} />
      </div>

      {veri.ogrenciSayisi === 0 ? (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}`, color: TEXT_MUTED }}>
          Kurumunuzda henüz kayıtlı öğrenci yok — veriler öğrenciler eklendikçe burada görünecek.
        </div>
      ) : (
        <>
          <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold mb-4 block">
              Net ortalaması — son 8 hafta
            </span>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={netChartData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                <XAxis dataKey="tarih" tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={false} tickLine={false} />
                <RTooltip cursor={false} allowEscapeViewBox={{ x: true, y: true }}
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }}
                  labelStyle={{ color: TEXT_MUTED }} itemStyle={{ color: TEXT }} />
                <Legend wrapperStyle={{ fontSize: 11, color: TEXT_MUTED }} />
                <Line type="monotone" dataKey="Genel" stroke={TEXT} strokeWidth={2.5} dot={{ r: 3.5, fill: TEXT, strokeWidth: 2, stroke: BG1 }} connectNulls />
                {veri.kademeler.map((k) => (
                  <Line key={k.seviye} type="monotone" dataKey={`${k.seviye}. sınıf`} stroke={KADEME_RENGI(k.seviye)} strokeWidth={2}
                    dot={{ r: 3, fill: KADEME_RENGI(k.seviye), strokeWidth: 1.5, stroke: BG1 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold mb-4 block">
              Kademe bazlı çözülen soru sayısı — son 8 hafta
            </span>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={soruChartData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                <XAxis dataKey="tarih" tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={false} tickLine={false} />
                <RTooltip cursor={false} allowEscapeViewBox={{ x: true, y: true }}
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }}
                  labelStyle={{ color: TEXT_MUTED }} itemStyle={{ color: TEXT }} />
                <Legend wrapperStyle={{ fontSize: 11, color: TEXT_MUTED }} />
                {veri.kademeler.map((k) => (
                  <Bar key={k.seviye} dataKey={`${k.seviye}. sınıf`} fill={KADEME_RENGI(k.seviye)} radius={[4, 4, 0, 0]} maxBarSize={22} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
