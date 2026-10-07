"use client";

import { Users, Target, ListChecks } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import type { DershaneAnaSayfaVerisi, HaftalikNokta } from "@/lib/dershane-ana-sayfa";
import { kapsamKarari } from "@/lib/kapsam";
import {
  BG1, BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED, MINT, MINT_BG,
  SKY, SKY_BG, BUTTER, LILAC, BLUSH,
} from "@/lib/theme";

// Kapsam dürüstlüğü (Rehber Radarı Adım 1, kullanıcı onayı 07.10.2026):
// bir ortalama KAÇ ÖĞRENCİDEN geldiğini söylemeden gösterilmez. Elbistan'da
// "9. sınıf net ortalaması" 20 öğrencinin 2'sinden hesaplanıyordu; rehber
// bunu "düşük performans" diye okuyor, oysa gerçek "ölçülmemiş".
//
// Çizgi kararı: bir kademenin EN İYİ haftasında bile kapsam eşiğin altında
// kaldıysa o çizgi sekiz hafta boyunca güvenilmez demektir — kesikli çizilir.
function enIyiKapsam(noktalar: HaftalikNokta[]): number {
  return noktalar.reduce((en, n) => Math.max(en, n.denemeOgrenci), 0);
}
function cizgiGuvenilir(noktalar: HaftalikNokta[], ogrenciSayisi: number): boolean {
  return kapsamKarari(enIyiKapsam(noktalar), ogrenciSayisi).yeterli;
}

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

  // Bu haftanın kapsamı — kart ve kademe listesi aynı karara bakar.
  const genelKapsam = kapsamKarari(buHaftaGenel.denemeOgrenci, veri.ogrenciSayisi);
  const kademeKapsamlari = veri.kademeler.map((k) => ({
    seviye: k.seviye,
    ogrenciSayisi: k.ogrenciSayisi,
    nokta: k.noktalar[k.noktalar.length - 1],
    karar: kapsamKarari(k.noktalar[k.noktalar.length - 1].denemeOgrenci, k.ogrenciSayisi),
    guvenilir: cizgiGuvenilir(k.noktalar, k.ogrenciSayisi),
  }));
  const olculmeyenKademeVar = kademeKapsamlari.some((k) => !k.karar.yeterli);

  const netChartData = veri.genel.map((n, i) => {
    const satir: Record<string, string | number | null> = { tarih: tarihFormat(n.haftaBaslangic), Genel: n.netOrtalama };
    for (const k of veri.kademeler) satir[`${k.seviye}. sınıf`] = k.noktalar[i].netOrtalama;
    return satir;
  });

  const sinifChartData = veri.genel.map((n,i)=>{ const satir:Record<string,string|number|null>={tarih:tarihFormat(n.haftaBaslangic)}; for(const x of veri.siniflar??[])satir[x.ad]=x.noktalar[i].netOrtalama; return satir; });

  const soruChartData = veri.genel.map((_, i) => {
    const satir: Record<string, string | number> = { tarih: tarihFormat(veri.genel[i].haftaBaslangic) };
    for (const k of veri.kademeler) satir[`${k.seviye}. sınıf`] = k.noktalar[i].soruSayisi;
    return satir;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <IstatKart icon={Users} etiket="Toplam öğrenci" deger={veri.ogrenciSayisi} renk={MINT} bg={MINT_BG} />
        <IstatKart icon={Target} etiket="Bu hafta genel net ort."
          deger={genelKapsam.yeterli ? (buHaftaGenel.netOrtalama ?? "—") : "—"}
          altYazi={genelKapsam.uyari
            ?? (buHaftaGenel.denemeSayisi > 0 ? `${buHaftaGenel.denemeSayisi} deneme · ${genelKapsam.etiket}` : "Bu hafta deneme yok")}
          renk={SKY} bg={SKY_BG} />
        <IstatKart icon={ListChecks} etiket="Bu hafta çözülen soru" deger={buHaftaGenel.soruSayisi}
          altYazi={buHaftaKademeSoru || undefined} renk={MINT} bg={MINT_BG} />
      </div>

      {veri.ogrenciSayisi === 0 ? (
        <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}`, color: TEXT_MUTED }}>
          Kurumunuzda henüz kayıtlı öğrenci yok — veriler öğrenciler eklendikçe burada görünecek.
        </div>
      ) : (
        <>
          {/* Kademe kapsamı — ortalamadan ÖNCE geliyor, çünkü "ölçülmemiş"i
              "düşük performans" sanmak bu panelin en pahalı hatası. */}
          <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold block">
              Bu haftanın kapsamı
            </span>
            <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
              Net ortalaması yalnızca deneme girmiş öğrencilerden hesaplanır. Kapsam düşükse ortalama gösterilmez — o kademe
              {" "}<strong style={{ color: TEXT }}>başarısız değil, ölçülmemiş</strong> demektir.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {kademeKapsamlari.map((k) => (
                <div key={k.seviye} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2" style={{ background: BG1_ALT }}>
                  <span className="text-sm font-semibold" style={{ color: KADEME_RENGI(k.seviye) }}>{k.seviye}. sınıf</span>
                  {k.karar.yeterli ? (
                    <span className="text-xs" style={{ color: TEXT }}>
                      <strong>{k.nokta.netOrtalama ?? "—"}</strong> net · <span style={{ color: TEXT_MUTED }}>{k.karar.etiket}</span>
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: BLUSH }}>{k.karar.uyari}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold mb-1 block">
              Net ortalaması — son 8 hafta
            </span>
            {olculmeyenKademeVar && (
              <p className="mb-3 text-xs" style={{ color: TEXT_MUTED }}>
                Kesikli çizgiler, en iyi haftasında bile yeterli öğrenciye ulaşamayan kademeleri gösterir — eğilim olarak okunmamalı.
              </p>
            )}
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={netChartData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                <XAxis dataKey="tarih" tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={false} tickLine={false} />
                <RTooltip cursor={false}
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }}
                  labelStyle={{ color: TEXT_MUTED }} itemStyle={{ color: TEXT }} />
                <Legend wrapperStyle={{ fontSize: 11, color: TEXT_MUTED }} />
                <Line type="monotone" dataKey="Genel" stroke={TEXT} strokeWidth={2.5}
                  strokeDasharray={cizgiGuvenilir(veri.genel, veri.ogrenciSayisi) ? undefined : "5 4"}
                  dot={{ r: 3.5, fill: TEXT, strokeWidth: 2, stroke: BG1 }} connectNulls />
                {kademeKapsamlari.map((k) => (
                  <Line key={k.seviye} type="monotone" dataKey={`${k.seviye}. sınıf`} stroke={KADEME_RENGI(k.seviye)} strokeWidth={2}
                    strokeDasharray={k.guvenilir ? undefined : "5 4"}
                    dot={{ r: 3, fill: KADEME_RENGI(k.seviye), strokeWidth: 1.5, stroke: BG1 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold mb-4 block">Sınıf bazlı net ortalaması — son 8 hafta</span>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={sinifChartData} margin={{left:-20,right:10}}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false}/><XAxis dataKey="tarih" tick={{fontSize:11,fill:TEXT_MUTED}}/><YAxis tick={{fontSize:11,fill:TEXT_MUTED}}/>
                <RTooltip contentStyle={{fontSize:12,borderRadius:12,border:`2px solid ${BORDER_STRONG}`,background:BG1_ALT}}/><Legend wrapperStyle={{fontSize:10}}/>
                {(veri.siniflar??[]).map((x,i)=><Line key={x.id} type="monotone" dataKey={x.ad} stroke={[MINT,SKY,BUTTER,LILAC,"#f97316","#ef4444","#06b6d4","#8b5cf6"][i%8]} strokeWidth={2} strokeDasharray={cizgiGuvenilir(x.noktalar, x.ogrenciSayisi) ? undefined : "5 4"} dot={false} connectNulls/>)}
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
                <RTooltip cursor={false}
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
