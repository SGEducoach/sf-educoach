"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";
import { Sparkles, Clock, Target, TrendingUp, TrendingDown, Minus, Printer, ListChecks, Gauge } from "lucide-react";
import type { AnalizVerisi, RaporDonemi } from "@/lib/analiz";
import { RAPOR_DONEMI_ETIKET } from "@/lib/analiz";
import { HEDEFE_YAKINLIK_ETIKET, VERIMLILIK_ETIKET } from "@/lib/types";
import type { AytAlan, HedefeYakinlik } from "@/lib/types";
import { satirTytdeGosterilsinMi, satirAytdeGosterilsinMi } from "@/lib/konu-hakimiyeti";
import type { KonuHakimiyetiSatiri } from "@/lib/konu-hakimiyeti";
import type { TrendSonucu, HizDogrulukKategorisi } from "@/lib/analiz-motoru";
import {
  BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED, MINT, MINT_BG, MINT_ON,
  SKY, SKY_BG, BUTTER, BUTTER_BG, BLUSH, BLUSH_BG, LILAC,
} from "@/lib/theme";

function tarihFormat(iso: string) {
  const d = new Date(iso);
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

const HEDEF_RENK: Record<HedefeYakinlik, string> = { yakin: MINT, belirsiz: BUTTER, uzak: BLUSH };

export function AnalizPaneli({ veri, ogrenciAdi, konuHakimiyetiSatirlari = [], konuHakimiyetiTamGorunum = false, konuHakimiyetiAytAlan = "SAY" }: {
  veri: AnalizVerisi; ogrenciAdi?: string; konuHakimiyetiSatirlari?: KonuHakimiyetiSatiri[]; konuHakimiyetiTamGorunum?: boolean; konuHakimiyetiAytAlan?: AytAlan;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const denemeChartData = veri.denemeTrend.map((d) => ({ tarih: tarihFormat(d.tarih), [d.tur]: d.net }));
  const konuChartData = veri.konuCalismaGunluk.map((c) => ({ gun: tarihFormat(c.tarih), dakika: c.dakika }));
  const soruChartData = veri.soruCozumuGunluk.map((c) => ({ gun: tarihFormat(c.tarih), soru: c.soru }));
  const verimlilikChartData = veri.haftalikVerimlilik.map((v) => ({ tarih: tarihFormat(v.tarih), puan: v.puan, duzey: VERIMLILIK_ETIKET[v.duzey] }));

  const hedefToplam = veri.hedefeYakinlikDagilimi.yakin + veri.hedefeYakinlikDagilimi.belirsiz + veri.hedefeYakinlikDagilimi.uzak;
  const konuHakimiyetHakimSayisi = konuHakimiyetiSatirlari.filter((s) => s.hakimiyetSeviyesi === "yakin").length;

  // Ders bazlı ortalama net grafiğinde tekil ders seçilince o dersin
  // net trendi gösteriliyor (§1, yenilikler_1.txt). Dropdown, gerçekten
  // veri girilmiş derslerden oluşuyor.
  const dersSecenekleri = Object.keys(veri.dersGunlukNet).sort();
  const seciliDers = searchParams.get("ders") && dersSecenekleri.includes(searchParams.get("ders") ?? "") ? searchParams.get("ders") : null;
  const dersTrendChartData = seciliDers ? veri.dersGunlukNet[seciliDers].map((d) => ({ gun: tarihFormat(d.tarih), net: d.net })) : [];

  function donemDegistir(donem: RaporDonemi) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("donem", donem);
    router.push(`${pathname}?${params.toString()}`);
  }

  function dersDegistir(ders: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (ders) params.set("ders", ders); else params.delete("ders");
    router.push(`${pathname}?${params.toString()}`);
  }

  const raporTarihi = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-6" id="rapor-icerigi">
      <div className="hidden print:block mb-2">
        <div style={{ color: "#111" }} className="text-lg font-bold">{ogrenciAdi ?? "Öğrenci"} — {RAPOR_DONEMI_ETIKET[veri.donem]} Rapor</div>
        <div style={{ color: "#555" }} className="text-xs">Oluşturulma tarihi: {raporTarihi}{veri.donemBaslangic ? ` · Başlangıç: ${tarihFormat(veri.donemBaslangic)}` : ""}</div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div className="flex gap-1 p-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
          {(Object.entries(RAPOR_DONEMI_ETIKET) as [RaporDonemi, string][]).map(([k, v]) => (
            <button key={k} type="button" onClick={() => donemDegistir(k)}
              className="sfec-btn text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: veri.donem === k ? MINT : "transparent", color: veri.donem === k ? MINT_ON : TEXT_MUTED }}>
              {v}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => window.print()}
          className="sfec-btn flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full"
          style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          <Printer size={13} /> Yazdır / PDF olarak kaydet
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <IstatKart icon={TrendingUp} etiket="Son deneme neti" deger={veri.sonDenemeNet ?? "—"} renk={MINT} bg={MINT_BG} />
        <IstatKart icon={Clock} etiket="Bu hafta · konu" deger={`${veri.buHaftaKonuDakika} dk`} renk={BUTTER} bg={BUTTER_BG} />
        <IstatKart icon={Target} etiket="Bu hafta · soru" deger={`${veri.buHaftaSoru} soru`} renk={SKY} bg={SKY_BG} />
        <IstatKart icon={Target} etiket="Deneme sayısı" deger={veri.denemeTrend.length} renk={SKY} bg={SKY_BG} />
        <IstatKart icon={ListChecks} etiket="Konu Hakimiyeti"
          deger={konuHakimiyetiSatirlari.length > 0 ? `${konuHakimiyetHakimSayisi}/${konuHakimiyetiSatirlari.length}` : "—"}
          altYazi={konuHakimiyetiSatirlari.length > 0 ? `%${Math.round((konuHakimiyetHakimSayisi / konuHakimiyetiSatirlari.length) * 100)} konuya hakim` : undefined}
          renk={MINT} bg={MINT_BG} />
        <IstatKart icon={Sparkles} etiket="Toplam giriş" deger={hedefToplam} renk={LILAC} bg="rgba(199,182,255,0.15)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Deneme net trendi</span>
            <TrendRozeti trend={veri.denemeTrendYonu} />
          </div>
          {denemeChartData.length === 0 ? (
            <BosDurum />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={denemeChartData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                <XAxis dataKey="tarih" tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={false} tickLine={false} />
                <RTooltip cursor={false} contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }} labelStyle={{ color: TEXT_MUTED }} />
                <Legend wrapperStyle={{ fontSize: 11, color: TEXT_MUTED }} />
                <Line type="monotone" dataKey="TYT" stroke={SKY} strokeWidth={2.25} dot={{ r: 3.5, fill: SKY, strokeWidth: 2, stroke: BG1 }} connectNulls />
                <Line type="monotone" dataKey="AYT" stroke={MINT} strokeWidth={2.25} dot={{ r: 3.5, fill: MINT, strokeWidth: 2, stroke: BG1 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold mb-4 block">Günlük konu çalışması (dakika)</span>
          {konuChartData.length === 0 ? (
            <BosDurum />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={konuChartData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                <XAxis dataKey="gun" tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={false} tickLine={false} />
                <RTooltip shared={false} cursor={false} formatter={(deger) => [`${deger} dk`, "Konu çalışması"]} contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }} labelStyle={{ color: TEXT_MUTED }} />
                <Bar dataKey="dakika" fill={MINT} activeBar={false} radius={[5, 5, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold mb-4 block">Günlük soru çözümü (soru)</span>
          {soruChartData.length === 0 ? (
            <BosDurum />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={soruChartData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                <XAxis dataKey="gun" tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={false} tickLine={false} />
                <RTooltip shared={false} cursor={false} formatter={(deger) => [`${deger} soru`, "Soru çözümü"]} contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }} labelStyle={{ color: TEXT_MUTED }} />
                <Bar dataKey="soru" fill={SKY} activeBar={false} radius={[5, 5, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap print:hidden">
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Ders bazlı {seciliDers ? "net trendi" : "ortalama net"}</span>
              {seciliDers && <TrendRozeti trend={veri.dersTrendYonu[seciliDers] ?? { yon: null, haftalikDegisim: null }} />}
            </div>
            {dersSecenekleri.length > 0 && (
              <select value={seciliDers ?? ""} onChange={(e) => dersDegistir(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl outline-none"
                style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
                <option value="">Tüm dersler</option>
                {dersSecenekleri.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold mb-4 hidden print:block">Ders bazlı ortalama net</span>
          {seciliDers ? (
            dersTrendChartData.length === 0 ? <BosDurum /> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dersTrendChartData} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                  <XAxis dataKey="gun" tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={false} tickLine={false} />
                  <RTooltip cursor={false} contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }} labelStyle={{ color: TEXT_MUTED }} formatter={(deger) => [deger, seciliDers]} />
                  <Line type="monotone" dataKey="net" stroke={SKY} strokeWidth={2.25} dot={{ r: 3.5, fill: SKY, strokeWidth: 2, stroke: BG1 }} />
                </LineChart>
              </ResponsiveContainer>
            )
          ) : veri.dersNetOrtalama.length === 0 ? (
            <BosDurum />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={veri.dersNetOrtalama} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                <XAxis dataKey="ders" tick={{ fontSize: 10, fill: TEXT_MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} interval={0} angle={-25} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={false} tickLine={false} />
                <RTooltip shared={false} cursor={false} contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }} labelStyle={{ color: TEXT_MUTED }} />
                <Bar dataKey="net" fill={SKY} activeBar={false} radius={[5, 5, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold mb-4 block">Hedefe yakınlık dağılımı</span>
          {hedefToplam === 0 ? (
            <BosDurum />
          ) : (
            <div className="flex flex-col gap-3">
              {(Object.entries(veri.hedefeYakinlikDagilimi) as [HedefeYakinlik, number][]).map(([k, v]) => {
                const yuzde = Math.round((v / hedefToplam) * 100);
                return (
                  <div key={k}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: TEXT }} className="font-semibold">{HEDEFE_YAKINLIK_ETIKET[k]}</span>
                      <span style={{ color: TEXT_MUTED }}>%{yuzde} ({v})</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <div style={{ width: `${yuzde}%`, background: HEDEF_RENK[k], height: "100%", transition: "width .6s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <KonuHakimiyetKarti satirlar={konuHakimiyetiSatirlari} tamGorunum={konuHakimiyetiTamGorunum} aytAlan={konuHakimiyetiAytAlan} />

        <HizDogrulukKarti satirlar={veri.dersHizDogruluk} />
      </div>

      {verimlilikChartData.length > 0 && (
        <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold mb-4 block">Haftalık verimlilik trendi</span>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={verimlilikChartData} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="tarih" tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={false} tickLine={false} />
              <RTooltip cursor={false} contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }} labelStyle={{ color: TEXT_MUTED }}
                formatter={(_, __, props) => [props.payload.duzey, "Verimlilik"]} />
              <Line type="monotone" dataKey="puan" stroke={LILAC} strokeWidth={2.25} dot={{ r: 3.5, fill: LILAC, strokeWidth: 2, stroke: BG1 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function BosDurum() {
  return <p style={{ color: TEXT_MUTED }} className="text-sm py-10 text-center">Henüz veri yok.</p>;
}

// Analiz Motoru Faz A2, Katman 3 — doğrusal regresyonla çıkarılan net
// trendi (genel veya tek ders) için küçük bir yön rozeti. Trend hesaplanamıyorsa
// (2'den az veri noktası) hiçbir şey göstermez.
function TrendRozeti({ trend }: { trend: TrendSonucu }) {
  if (trend.yon === null) return null;
  const Icon = trend.yon === "yukselen" ? TrendingUp : trend.yon === "dusen" ? TrendingDown : Minus;
  const renk = trend.yon === "yukselen" ? MINT : trend.yon === "dusen" ? BLUSH : TEXT_MUTED;
  const bg = trend.yon === "yukselen" ? MINT_BG : trend.yon === "dusen" ? BLUSH_BG : BG1_ALT;
  const etiket = trend.yon === "yukselen" ? "Yükseliyor" : trend.yon === "dusen" ? "Düşüyor" : "Durgun";
  const degisim = trend.haftalikDegisim;
  return (
    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 shrink-0" style={{ background: bg, color: renk }}>
      <Icon size={12} />
      {etiket}{degisim !== null && Math.abs(degisim) >= 0.05 && ` (${degisim > 0 ? "+" : ""}${degisim} net/hafta)`}
    </span>
  );
}

const HIZ_DOGRULUK_ETIKET: Record<HizDogrulukKategorisi, string> = {
  "hizli-dogru": "Hızlı ve doğru",
  "hizli-hatali": "Hızlı ama hatalı — dikkatsizlik olabilir",
  "yavas-dogru": "Doğru ama yavaş — hız çalış",
  "yavas-hatali": "Yavaş ve hatalı — temel eksik olabilir",
};
const HIZ_DOGRULUK_RENK: Record<HizDogrulukKategorisi, string> = {
  "hizli-dogru": MINT, "hizli-hatali": BUTTER, "yavas-dogru": SKY, "yavas-hatali": BLUSH,
};
const HIZ_DOGRULUK_BG: Record<HizDogrulukKategorisi, string> = {
  "hizli-dogru": MINT_BG, "hizli-hatali": BUTTER_BG, "yavas-dogru": SKY_BG, "yavas-hatali": BLUSH_BG,
};

// Analiz Motoru Faz A2, Katman 4 — ders bazlı hız-doğruluk matrisi. Hız,
// öğrencinin KENDİ genel ortalamasına göre göreli (bkz. analiz-motoru.ts,
// hizDogrulukKategorisiBelirle) — mutlak bir "iyi süre" eşiği yok.
function HizDogrulukKarti({ satirlar }: { satirlar: AnalizVerisi["dersHizDogruluk"] }) {
  return (
    <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: SKY_BG }}>
          <Gauge size={14} color={SKY} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Hız-Doğruluk Analizi</span>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">
        Soru çözümlerindeki süre ve doğruluğun ders bazlı karşılaştırması — hız, kendi genel ortalamana göre.
      </p>
      {satirlar.length === 0 ? (
        <BosDurum />
      ) : (
        <div className="flex flex-col gap-2">
          {satirlar.map((s) => (
            <div key={s.ders} className="rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2 flex-wrap" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
              <div className="min-w-0">
                <div style={{ color: TEXT }} className="text-sm font-semibold">{s.ders}</div>
                <div style={{ color: TEXT_MUTED }} className="text-[11px] mt-0.5">
                  Soru başı ~{s.ortSureDakika} dk · Doğruluk %{Math.round(s.dogrulukOrani * 100)}
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0" style={{ background: HIZ_DOGRULUK_BG[s.kategori], color: HIZ_DOGRULUK_RENK[s.kategori] }}>
                {HIZ_DOGRULUK_ETIKET[s.kategori]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Konu Hakimiyeti kartı — genel (tüm dersler) veya tek bir ders seçilip
// donut grafiğinde o kapsamın hakim/toplam oranı gösterilir. Görsel dil
// KonuHakimiyetiEkrani.tsx'teki donutla birebir aynı (bkz. o dosya).
function KonuHakimiyetKarti({ satirlar, tamGorunum, aytAlan }: { satirlar: KonuHakimiyetiSatiri[]; tamGorunum: boolean; aytAlan: AytAlan }) {
  // Tam görünüm (12. sınıf/dershane) — önce TYT/AYT, sonra o kapsamdaki
  // ders seçilir (bkz. KonuHakimiyetiEkrani.tsx'teki aynı mantık).
  const [seciliSinav, setSeciliSinav] = useState<"TYT" | "AYT">("TYT");
  const [seciliDers, setSeciliDers] = useState<string>("genel");
  const sinavaGoreSatirlar = !tamGorunum
    ? satirlar
    : satirlar.filter((s) => (seciliSinav === "TYT" ? satirTytdeGosterilsinMi(s) : satirAytdeGosterilsinMi(s, aytAlan)));
  const dersler = useMemo(() => Array.from(new Set(sinavaGoreSatirlar.map((s) => s.ders))).sort((a, b) => a.localeCompare(b, "tr")), [sinavaGoreSatirlar]);
  const gorunenSatirlar = seciliDers === "genel" ? sinavaGoreSatirlar : sinavaGoreSatirlar.filter((s) => s.ders === seciliDers);
  const hakimSayisi = gorunenSatirlar.filter((s) => s.hakimiyetSeviyesi === "yakin").length;
  const toplam = gorunenSatirlar.length;
  const yuzde = toplam > 0 ? Math.round((hakimSayisi / toplam) * 100) : 0;
  const donutVeri = toplam > 0
    ? [{ name: "hakim", value: hakimSayisi }, { name: "diger", value: toplam - hakimSayisi }]
    : [{ name: "bos", value: 1 }];

  function sinavDegistir(s: "TYT" | "AYT") {
    setSeciliSinav(s);
    setSeciliDers("genel");
  }

  return (
    <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap print:hidden">
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Konu Hakimiyeti</span>
        {tamGorunum && (
          <div className="flex gap-1 p-1 rounded-full" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
            {(["TYT", "AYT"] as const).map((s) => (
              <button key={s} type="button" onClick={() => sinavDegistir(s)}
                className="sfec-btn text-[11px] font-bold px-3 py-1 rounded-full"
                style={{ background: seciliSinav === s ? MINT : "transparent", color: seciliSinav === s ? MINT_ON : TEXT_MUTED }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-end mb-4 print:hidden">
        {dersler.length > 0 && (
          <select value={seciliDers} onChange={(e) => setSeciliDers(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl outline-none"
            style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
            <option value="genel">Genel</option>
            {dersler.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>
      <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold mb-4 hidden print:block">Konu Hakimiyeti</span>
      {toplam === 0 ? (
        <BosDurum />
      ) : (
        <div className="flex items-center gap-6 flex-wrap">
          <div className="relative shrink-0" style={{ width: 130, height: 130 }}>
            <PieChart width={130} height={130}>
              <Pie data={donutVeri} dataKey="value" cx="50%" cy="50%" innerRadius={44} outerRadius={60}
                startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
                <Cell fill={MINT} />
                <Cell fill={BORDER} />
              </Pie>
            </PieChart>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-extrabold">%{yuzde}</span>
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold">{hakimSayisi}/{toplam}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 text-xs" style={{ color: TEXT_MUTED }}>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: MINT }} /> Hakim olunan konular</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: BORDER, border: `1px solid ${BORDER_STRONG}` }} /> Henüz hakim olunmayan / işaretlenmemiş</div>
          </div>
        </div>
      )}
    </div>
  );
}
