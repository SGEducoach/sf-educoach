"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell,
} from "recharts";
import { Sparkles, Clock, Target, TrendingUp, TrendingDown, Minus, Printer, ListChecks, Gauge, Lightbulb, Flag, ShieldAlert } from "lucide-react";
import type { AnalizVerisi, RaporDonemi } from "@/lib/analiz";
import { RAPOR_DONEMI_ETIKET } from "@/lib/analiz";
import { HEDEFE_YAKINLIK_ETIKET, VERIMLILIK_ETIKET } from "@/lib/types";
import type { AytAlan, HedefeYakinlik } from "@/lib/types";
import { satirTytdeGosterilsinMi, satirAytdeGosterilsinMi } from "@/lib/konu-hakimiyeti";
import type { KonuHakimiyetiSatiri } from "@/lib/konu-hakimiyeti";
import { oncelikSiralamasiOlustur, icgoruMetinleriOlustur, riskSkoruHesapla } from "@/lib/analiz-motoru";
import type { TrendSonucu, HizDogrulukKategorisi, OncelikSatiri, RiskDuzeyi, RiskSonucu } from "@/lib/analiz-motoru";
import type { KohortKarsilastirmaSatiri } from "@/lib/analiz-kohort";
import { hedefNetGuncelle } from "@/app/dashboard/veri-actions";
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

export function AnalizPaneli({
  veri, ogrenciAdi, konuHakimiyetiSatirlari = [], konuHakimiyetiTamGorunum = false, konuHakimiyetiAytAlan = "SAY", hedefDuzenlenebilir = false,
  ogretmenGorunumu = false, kohortKarsilastirma = [],
}: {
  veri: AnalizVerisi; ogrenciAdi?: string; konuHakimiyetiSatirlari?: KonuHakimiyetiSatiri[]; konuHakimiyetiTamGorunum?: boolean; konuHakimiyetiAytAlan?: AytAlan;
  // Analiz Motoru Faz A4 — hedef net'i öğrenci KENDİ girer; AnalizPaneli 4
  // farklı bağlamda (öğrenci/öğretmen-müdür/veli/admin) kullanıldığından bu
  // SADECE öğrencinin kendi dashboard'ından render edilirken true geçilir
  // (bkz. dashboard/page.tsx) — başka birinin verisine bakarken düzenleme
  // kontrolü hiç gösterilmez.
  hedefDuzenlenebilir?: boolean;
  // Analiz Motoru Faz A5 — Katman 6 (kohort) + Katman 7 (risk skoru).
  // Kullanıcı kararı (25.08.2026, açık soru 2): "öğretmen tarafı yeterli" —
  // bu SADECE öğretmen/müdür/admin çağrı noktalarından true geçilir,
  // öğrencinin/velinin kendi görünümünde HİÇ gösterilmez (motivasyon riski).
  ogretmenGorunumu?: boolean;
  kohortKarsilastirma?: KohortKarsilastirmaSatiri[];
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

  // Analiz Motoru Faz A3 — Katman 8 (öncelik motoru) + Katman 9 (kural
  // bazlı içgörü metni). Katman 2'nin çıktısını (konuHakimiyetiSatirlari,
  // zaten prop olarak geliyor) ve Katman 3/4'ün çıktısını (veri.*) girdi
  // alan, YENİ bir sorgu gerektirmeyen saf dönüşümler.
  const oncelikSiralamasi = useMemo(() => oncelikSiralamasiOlustur(konuHakimiyetiSatirlari), [konuHakimiyetiSatirlari]);
  // Kullanıcı bulgusu (25.08.2026) — hiçbir konuda verisi olmayan bir
  // öğrenci için TÜM konular eşit (masterySkoru=null) zayıflıkta sayılır;
  // "ilk 3" listesi bu durumda yanıltıcı bir kesinlik verir (sadece ders
  // ağırlığına göre sıralanmış, gerçek bir öncelik değil) — bu yüzden
  // gösterilmiyor, yerine icgoruMetinleriOlustur'un ürettiği genel/nötr
  // mesaj tek başına kalıyor.
  const hicVeriYok = oncelikSiralamasi.length > 0 && oncelikSiralamasi.every((s) => s.masterySkoru === null);
  const icgoruler = useMemo(() => icgoruMetinleriOlustur({
    denemeTrend: veri.denemeTrendYonu,
    dersTrendleri: veri.dersTrendYonu,
    hizDogruluk: veri.dersHizDogruluk,
    oncelikSiralamasi,
    hedefProjeksiyonlari: veri.hedefProjeksiyonlari,
  }), [veri.denemeTrendYonu, veri.dersTrendYonu, veri.dersHizDogruluk, oncelikSiralamasi, veri.hedefProjeksiyonlari]);

  // Analiz Motoru Faz A5 — Katman 7 (risk skoru) girdisi: Konu Hakimiyeti'nde
  // BEYAN EDİLMİŞ konular arasında bayatlamış (90+ gün) olanların oranı.
  // Hiç beyan yoksa (henüz bu konuda veri girmemiş) null — "bayatlamış"
  // kavramı henüz anlamlı değil.
  const bayatKonuOrani = useMemo(() => {
    const beyanEdilmis = konuHakimiyetiSatirlari.filter((s) => s.hakimiyetSeviyesi !== null);
    return beyanEdilmis.length > 0 ? beyanEdilmis.filter((s) => s.bayat).length / beyanEdilmis.length : null;
  }, [konuHakimiyetiSatirlari]);
  const riskSonucu = useMemo(() => riskSkoruHesapla({
    sonAktiviteGunFarki: veri.sonAktiviteGunFarki,
    denemeTrendYonu: veri.denemeTrendYonu.yon,
    verimlilikTrendYonu: veri.verimlilikTrendYonu.yon,
    bayatKonuOrani,
  }), [veri.sonAktiviteGunFarki, veri.denemeTrendYonu.yon, veri.verimlilikTrendYonu.yon, bayatKonuOrani]);

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

      {ogretmenGorunumu && <OgretmenGorunumuKarti risk={riskSonucu} kohort={kohortKarsilastirma} />}

      <IcgorulerKarti icgoruler={icgoruler} oncelikSiralamasi={hicVeriYok ? [] : oncelikSiralamasi.slice(0, 3)}
        hedefNetTyt={veri.hedefNetTyt} hedefNetAyt={veri.hedefNetAyt} duzenlenebilir={hedefDuzenlenebilir} />

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
                <RTooltip cursor={false} allowEscapeViewBox={{ x: true, y: true }} contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }} labelStyle={{ color: TEXT_MUTED }} itemStyle={{ color: TEXT }} />
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
                <RTooltip shared={false} cursor={false} allowEscapeViewBox={{ x: true, y: true }} formatter={(deger) => [`${deger} dk`, "Konu çalışması"]} contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }} labelStyle={{ color: TEXT_MUTED }} itemStyle={{ color: TEXT }} />
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
                <RTooltip shared={false} cursor={false} allowEscapeViewBox={{ x: true, y: true }} formatter={(deger) => [`${deger} soru`, "Soru çözümü"]} contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }} labelStyle={{ color: TEXT_MUTED }} itemStyle={{ color: TEXT }} />
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
                  <RTooltip cursor={false} allowEscapeViewBox={{ x: true, y: true }} contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }} labelStyle={{ color: TEXT_MUTED }} itemStyle={{ color: TEXT }} formatter={(deger) => [deger, seciliDers]} />
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
                <RTooltip shared={false} cursor={false} allowEscapeViewBox={{ x: true, y: true }} contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }} labelStyle={{ color: TEXT_MUTED }} itemStyle={{ color: TEXT }} />
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
              <RTooltip cursor={false} allowEscapeViewBox={{ x: true, y: true }} contentStyle={{ fontSize: 12, borderRadius: 12, border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT }} labelStyle={{ color: TEXT_MUTED }} itemStyle={{ color: TEXT }}
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

const RISK_ETIKET: Record<RiskDuzeyi, string> = { dusuk: "Düşük", orta: "Orta", yuksek: "Yüksek" };
const RISK_RENK: Record<RiskDuzeyi, string> = { dusuk: MINT, orta: BUTTER, yuksek: BLUSH };
const RISK_BG: Record<RiskDuzeyi, string> = { dusuk: MINT_BG, orta: BUTTER_BG, yuksek: BLUSH_BG };

// Analiz Motoru Faz A5 — Katman 6 (kohort karşılaştırması) + Katman 7
// (risk skoru) vitrin bileşeni. Kullanıcı kararı (25.08.2026, açık soru
// 2): "öğretmen tarafı yeterli" — bu kart SADECE ogretmenGorunumu true
// iken render edilir (öğrenci/veli görünümünde hiç çağrılmaz bile, bkz.
// AnalizPaneli). Bu yüzden içerik boş olsa (risk düşük + kohort verisi
// yok) bile kart GİZLENMİYOR — "risk: düşük" göstermek de bir bilgi
// (öğretmen için güvence), IcgorulerKarti'nin aksine burada "hiçbir şey
// yoksa gizle" mantığı uygulanmıyor.
function OgretmenGorunumuKarti({ risk, kohort }: { risk: RiskSonucu; kohort: KohortKarsilastirmaSatiri[] }) {
  return (
    <div className="sfec-fade rounded-3xl p-5 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: RISK_BG[risk.duzey] }}>
          <ShieldAlert size={14} color={RISK_RENK[risk.duzey]} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Öğretmen Görünümü</span>
        <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold ml-auto">öğrenciye gösterilmez</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: TEXT_MUTED }} className="text-xs font-semibold">Erken uyarı riski:</span>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: RISK_BG[risk.duzey], color: RISK_RENK[risk.duzey] }}>
          {RISK_ETIKET[risk.duzey]}
        </span>
      </div>
      {risk.nedenler.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {risk.nedenler.map((n, i) => (
            <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: TEXT_MUTED }}>
              <span className="mt-0.5 shrink-0">•</span><span>{n}</span>
            </li>
          ))}
        </ul>
      )}
      {kohort.length > 0 && (
        <div className="mt-3 pt-3 flex flex-col gap-1.5" style={{ borderTop: `1px solid ${BORDER}` }}>
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Sınıf içi karşılaştırma</span>
          {kohort.map((k) => (
            <div key={k.tur} className="text-xs" style={{ color: TEXT }}>
              <span className="font-semibold">{k.tur}</span> · son net {k.kendiNet}
              {k.persentil.persentil !== null
                ? <> — sınıfının <span className="font-semibold">%{k.persentil.persentil}</span>&apos;inin üzerinde ({k.persentil.kohortBuyuklugu} sınıf arkadaşıyla karşılaştırıldı)</>
                : <span style={{ color: TEXT_MUTED }}> — karşılaştırma için sınıfta yeterli veri yok</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Analiz Motoru Faz A3 — Katman 8+9'un vitrin bileşeni. "Yapay Zeka
// Analizi" vaadinin (bkz. plan, silinmiş YapayZekaAnaliziPromosu.tsx)
// fiilî karşılığı — ama tamamen kural bazlı, hiçbir LLM çağrısı yok.
// Hiç içerik yoksa (yeterli veri henüz birikmemiş) kart hiç render
// edilmiyor, boş bir kutu göstermiyoruz.
function IcgorulerKarti({ icgoruler, oncelikSiralamasi, hedefNetTyt, hedefNetAyt, duzenlenebilir }: {
  icgoruler: string[]; oncelikSiralamasi: OncelikSatiri[];
  hedefNetTyt: number | null; hedefNetAyt: number | null; duzenlenebilir: boolean;
}) {
  // Düzenlenebilir DEĞİLSE (öğretmen/veli/admin görünümü) ve hiç içerik
  // yoksa kart tamamen gizleniyor. Düzenlenebilirse (öğrencinin kendi
  // görünümü) hedef belirleme her zaman sunuluyor — henüz veri yoksa bile.
  if (!duzenlenebilir && icgoruler.length === 0 && oncelikSiralamasi.length === 0) return null;
  return (
    <div className="sfec-fade rounded-3xl p-5 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(199,182,255,0.15)" }}>
          <Lightbulb size={14} color={LILAC} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">İçgörüler</span>
      </div>
      {icgoruler.length > 0 && (
        <ul className="flex flex-col gap-2" style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {icgoruler.map((metin, i) => (
            <li key={i} className="text-sm flex items-start gap-2" style={{ color: TEXT }}>
              <span style={{ color: LILAC }} className="mt-0.5 shrink-0">•</span>
              <span>{metin}</span>
            </li>
          ))}
        </ul>
      )}
      {icgoruler.length === 0 && duzenlenebilir && (
        <p style={{ color: TEXT_MUTED }} className="text-sm">
          Yeterli veri biriktikçe (deneme/konu/soru girişleri) burada sana özel içgörüler görünecek.
        </p>
      )}
      {oncelikSiralamasi.length > 0 && (
        <div className={`flex flex-col gap-1.5 ${icgoruler.length > 0 ? "mt-4 pt-3" : ""}`} style={icgoruler.length > 0 ? { borderTop: `1px solid ${BORDER}` } : undefined}>
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide mb-0.5">Öncelik sıralaması</span>
          {oncelikSiralamasi.map((s, i) => (
            <div key={`${s.ders}|${s.konu}`} className="flex items-center justify-between gap-2 text-xs">
              <span style={{ color: TEXT }} className="truncate">{i + 1}. {s.konu} <span style={{ color: TEXT_MUTED }}>· {s.ders}</span></span>
              {s.masterySkoru !== null && <span style={{ color: TEXT_MUTED }} className="shrink-0">{s.masterySkoru}/100</span>}
            </div>
          ))}
        </div>
      )}
      {duzenlenebilir && (
        <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${BORDER}` }}>
          <HedefDuzenleyici hedefNetTyt={hedefNetTyt} hedefNetAyt={hedefNetAyt} />
        </div>
      )}
    </div>
  );
}

// Analiz Motoru Faz A4 — öğrenci kendi hedef net'ini burada (Analiz
// Paneli'nin İçgörüler kartı içinde) girer/düzenler. Sadece öğrencinin
// kendi görünümünde render edilir (bkz. hedefDuzenlenebilir).
function HedefDuzenleyici({ hedefNetTyt, hedefNetAyt }: { hedefNetTyt: number | null; hedefNetAyt: number | null }) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [tyt, setTyt] = useState(hedefNetTyt !== null ? String(hedefNetTyt) : "");
  const [ayt, setAyt] = useState(hedefNetAyt !== null ? String(hedefNetAyt) : "");
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function kaydet() {
    setHata(null);
    startTransition(async () => {
      const res = await hedefNetGuncelle(tyt.trim() === "" ? null : Number(tyt), ayt.trim() === "" ? null : Number(ayt));
      if (res.error) setHata(res.error);
      else { setAcik(false); router.refresh(); }
    });
  }

  if (!acik) {
    return (
      <button type="button" onClick={() => setAcik(true)}
        className="sfec-btn text-[11px] font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
        style={{ background: BG1_ALT, color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
        <Flag size={12} />
        {hedefNetTyt === null && hedefNetAyt === null
          ? "Hedef net belirle"
          : `Hedefin: ${hedefNetTyt !== null ? `TYT ${hedefNetTyt}` : ""}${hedefNetTyt !== null && hedefNetAyt !== null ? " · " : ""}${hedefNetAyt !== null ? `AYT ${hedefNetAyt}` : ""} (düzenle)`}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Hedef net (TYT)</span>
          <input type="number" min={0} max={120} value={tyt} onChange={(e) => setTyt(e.target.value)}
            className="rounded-lg px-2.5 py-1.5 text-xs outline-none" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
        </label>
        <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Hedef net (AYT)</span>
          <input type="number" min={0} max={160} value={ayt} onChange={(e) => setAyt(e.target.value)}
            className="rounded-lg px-2.5 py-1.5 text-xs outline-none" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
        </label>
      </div>
      {hata && <p style={{ color: BLUSH }} className="text-[11px] font-semibold">{hata}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setAcik(false)} disabled={pending}
          className="sfec-btn flex-1 text-xs font-bold py-1.5 rounded-xl disabled:opacity-60"
          style={{ background: "transparent", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
          Vazgeç
        </button>
        <button type="button" onClick={kaydet} disabled={pending}
          className="sfec-btn flex-1 text-xs font-bold py-1.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </div>
  );
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
