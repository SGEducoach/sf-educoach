"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Search } from "lucide-react";
import type { KapsamSatiri } from "@/lib/rehber-kapsam-listesi";
import { BAYRAK_SINIRI, NET_DUSUS_ESIGI, SESSIZ_GUN, ozetHesapla, satirAgirligi, type Bayrak } from "@/lib/rehber-bayrak";
import { BG1, BG1_ALT, BORDER, BLUSH, BLUSH_BG, BUTTER, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";

// Rehber Radarı Adım 2 — sorumlu olunan tüm düzeyler tek tabloda.
// YORUM YOK, ham gerçek: gerekçeli bayraklar ("net düşüyor" uyarısı,
// "hiç giriş yapmamış") Adım 3'e ait. Burada rehber kendi kararını verir.
//
// Satır → mevcut öğrenci analizi (?bolum=ozet&sinif=&ogrenci=), yani zaten
// var olan drill-down. Liste yönlendirir, analiz anlatır.

type Siralama = "dikkat" | "ad" | "sonHareket" | "net" | "acikGorev";

// Bayrak rozeti. Ağırlık EKRANDA GÖSTERİLMEZ — Adım 3 ilkesi: bayrak bir
// SEBEP söyler, puan vermez. Sıralama ağırlığı kullanır, görüntü gerekçeyi.
function BayrakRozetleri({ bayraklar }: { bayraklar: Bayrak[] }) {
  if (bayraklar.length === 0) return <span className="text-xs" style={{ color: TEXT_MUTED }}>—</span>;
  const gosterilen = bayraklar.slice(0, BAYRAK_SINIRI);
  const kalan = bayraklar.length - gosterilen.length;
  return (
    <span className="flex flex-wrap items-center gap-1">
      {gosterilen.map((b) => (
        <span
          key={b.kod}
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={b.seviye === "kritik"
            ? { background: BLUSH_BG, color: BLUSH }
            : { color: TEXT_MUTED, border: `1px solid ${BORDER}` }}
        >
          {b.metin}
        </span>
      ))}
      {kalan > 0 && <span className="text-[10px]" style={{ color: TEXT_MUTED }}>+{kalan} daha</span>}
    </span>
  );
}

function YonIsareti({ yon }: { yon: KapsamSatiri["yon"] }) {
  if (yon === "yukari") return <ArrowUp size={14} color={MINT} aria-label="yükseliyor" />;
  if (yon === "asagi") return <ArrowDown size={14} color={BLUSH} aria-label="düşüyor" />;
  if (yon === "sabit") return <ArrowRight size={14} color={TEXT_MUTED} aria-label="sabit" />;
  return <span style={{ color: TEXT_MUTED }} className="text-xs">—</span>;
}

function hareketMetni(satir: KapsamSatiri): string {
  if (satir.sonHareketGun === null) return "hiç";
  if (satir.sonHareketGun === 0) return "bugün";
  if (satir.sonHareketGun === 1) return "dün";
  return `${satir.sonHareketGun} gün önce`;
}

function hareketRengi(satir: KapsamSatiri): string {
  if (satir.sonHareketGun === null) return BLUSH;
  if (satir.sonHareketGun >= SESSIZ_GUN) return BUTTER;
  return TEXT;
}

export function RehberKapsamListesi({ satirlar, seviyeler }: { satirlar: KapsamSatiri[]; seviyeler: string[] }) {
  const [arama, setArama] = useState("");
  const [sinifSuzgeci, setSinifSuzgeci] = useState("");
  const [yalnizSessiz, setYalnizSessiz] = useState(false);
  const [siralama, setSiralama] = useState<Siralama>("dikkat");

  const siniflar = useMemo(
    () => [...new Set(satirlar.map((s) => s.sinifAdi))].sort((a, b) => a.localeCompare(b, "tr", { numeric: true })),
    [satirlar],
  );

  const gorunen = useMemo(() => {
    const aramaKucuk = arama.trim().toLocaleLowerCase("tr-TR");
    const suzulmus = satirlar.filter((s) => {
      if (sinifSuzgeci && s.sinifAdi !== sinifSuzgeci) return false;
      if (yalnizSessiz && s.sonHareketGun !== null && s.sonHareketGun < SESSIZ_GUN) return false;
      if (aramaKucuk && !s.ad.toLocaleLowerCase("tr-TR").includes(aramaKucuk)
        && !(s.okulNo ?? "").includes(aramaKucuk)) return false;
      return true;
    });
    const sirali = [...suzulmus];
    // Varsayılan: en ağır bayrak önce. Tek KRİTİK bayrak, üç hafif bayraktan
    // önce gelir (bkz. satirAgirligi) — rehber önce gerçekten kopmuş
    // öğrenciyi görsün. Eşitlikte ada göre, sıra kararlı kalsın.
    if (siralama === "dikkat") sirali.sort((a, b) => satirAgirligi(b.bayraklar) - satirAgirligi(a.bayraklar) || a.ad.localeCompare(b.ad, "tr"));
    if (siralama === "ad") sirali.sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
    // "Hiç iz yok" EN BAŞA gelir — rehberin en çok ilgilenmesi gereken grup.
    if (siralama === "sonHareket") sirali.sort((a, b) => (b.sonHareketGun ?? Number.MAX_SAFE_INTEGER) - (a.sonHareketGun ?? Number.MAX_SAFE_INTEGER));
    // Net sıralamasında denemesi olmayanlar sona düşer (net yokluğu 0 değildir).
    if (siralama === "net") sirali.sort((a, b) => (a.sonDenemeNeti ?? -Infinity) === (b.sonDenemeNeti ?? -Infinity) ? 0 : (b.sonDenemeNeti ?? -Infinity) - (a.sonDenemeNeti ?? -Infinity));
    if (siralama === "acikGorev") sirali.sort((a, b) => b.acikGorev - a.acikGorev);
    return sirali;
  }, [satirlar, arama, sinifSuzgeci, yalnizSessiz, siralama]);

  const ozet = useMemo(() => ozetHesapla(satirlar.map((s) => s.bayraklar)), [satirlar]);

  if (seviyeler.length === 0) {
    return (
      <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p className="text-sm" style={{ color: TEXT_MUTED }}>
          Henüz sorumlu olduğunuz sınıf düzeyi atanmadı. Kurum moderatörünüz Rehberlik Servisi ekranından atama yapmalı.
        </p>
      </div>
    );
  }

  return (
    <section className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Kapsamım</h2>
        <span className="text-xs" style={{ color: TEXT_MUTED }}>
          {seviyeler.map((s) => `${s}. sınıf`).join(", ")} · {satirlar.length} öğrenci
          {ozet.bayrakli > 0 && <> · <strong style={{ color: BLUSH }}>{ozet.bayrakli} dikkat gerektiren</strong></>}
        </span>
      </div>

      {/* Özet: aynı satırlardan türüyor, EK SORGU YOK. "Bu hafta ne var?"
          sorusunu tek bakışta cevaplıyor. */}
      {ozet.bayrakli > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {([
            ["Hesabını hiç açmamış", ozet.hesapAcilmamis, true],
            ["Hiç veri girmemiş", ozet.hicVeriYok, true],
            [`${SESSIZ_GUN}+ gündür sessiz`, ozet.sessiz, false],
            ["Neti düşen", ozet.netDususu, false],
            ["Görevi birikmiş", ozet.gorevBirikmis, false],
          ] as [string, number, boolean][]).filter(([, adet]) => adet > 0).map(([etiket, adet, kritik]) => (
            <span key={etiket} className="rounded-2xl px-3 py-1.5 text-xs" style={{ background: BG1_ALT }}>
              <strong style={{ color: kritik ? BLUSH : BUTTER }}>{adet}</strong>
              <span style={{ color: TEXT_MUTED }}> {etiket}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
          <Search size={13} color={TEXT_MUTED} />
          <input
            value={arama} onChange={(e) => setArama(e.target.value)}
            placeholder="Ad veya okul no" aria-label="Öğrenci ara"
            className="bg-transparent text-xs outline-none" style={{ color: TEXT, width: 140 }}
          />
        </div>
        <select
          value={sinifSuzgeci} onChange={(e) => setSinifSuzgeci(e.target.value)} aria-label="Sınıf süzgeci"
          className="rounded-full px-3 py-1.5 text-xs" style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER}` }}
        >
          <option value="">Tüm sınıflar</option>
          {siniflar.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={siralama} onChange={(e) => setSiralama(e.target.value as Siralama)} aria-label="Sıralama"
          className="rounded-full px-3 py-1.5 text-xs" style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER}` }}
        >
          <option value="dikkat">Önce dikkat gerektirenler</option>
          <option value="sonHareket">En uzun süre sessiz olan önce</option>
          <option value="ad">Ada göre</option>
          <option value="net">Son deneme netine göre</option>
          <option value="acikGorev">Açık görev sayısına göre</option>
        </select>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs" style={{ color: TEXT, border: `1px solid ${BORDER}` }}>
          <input type="checkbox" checked={yalnizSessiz} onChange={(e) => setYalnizSessiz(e.target.checked)} />
          Yalnızca sessizler ({SESSIZ_GUN}+ gün)
        </label>
      </div>

      {gorunen.length === 0 ? (
        <p className="mt-4 text-xs" style={{ color: TEXT_MUTED }}>Bu süzgeçlere uyan öğrenci yok.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr style={{ color: TEXT_MUTED }} className="text-[11px] uppercase tracking-wider">
                <th className="pb-2 pr-3 font-semibold">Öğrenci</th>
                <th className="pb-2 pr-3 font-semibold">Sınıf</th>
                <th className="pb-2 pr-3 font-semibold">Dikkat</th>
                <th className="pb-2 pr-3 font-semibold">Son hareket</th>
                <th className="pb-2 pr-3 font-semibold">Son deneme neti</th>
                <th className="pb-2 pr-3 font-semibold">Yön</th>
                <th className="pb-2 font-semibold">Açık görev</th>
              </tr>
            </thead>
            <tbody>
              {gorunen.map((s) => (
                <tr key={s.ogrenciId} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td className="py-2 pr-3">
                    <Link
                      href={`/dashboard?bolum=ozet&sinif=${s.sinifId ?? ""}&ogrenci=${s.ogrenciId}`}
                      className="text-sm font-semibold hover:underline" style={{ color: TEXT }}
                    >
                      {s.ad}
                    </Link>
                    {s.okulNo && <span className="ml-1.5 text-[11px]" style={{ color: TEXT_MUTED }}>#{s.okulNo}</span>}
                  </td>
                  <td className="py-2 pr-3 text-xs" style={{ color: TEXT_MUTED }}>{s.sinifAdi}</td>
                  <td className="py-2 pr-3"><BayrakRozetleri bayraklar={s.bayraklar} /></td>
                  <td className="py-2 pr-3 text-xs font-semibold" style={{ color: hareketRengi(s) }}>{hareketMetni(s)}</td>
                  <td className="py-2 pr-3 text-xs" style={{ color: TEXT }}>
                    {s.sonDenemeNeti ?? <span style={{ color: TEXT_MUTED }}>—</span>}
                    {s.denemeSayisi > 0 && <span className="ml-1 text-[11px]" style={{ color: TEXT_MUTED }}>({s.denemeSayisi} deneme)</span>}
                  </td>
                  <td className="py-2 pr-3"><YonIsareti yon={s.yon} /></td>
                  <td className="py-2 text-xs" style={{ color: s.acikGorev > 0 ? TEXT : TEXT_MUTED }}>{s.acikGorev}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-[11px]" style={{ color: TEXT_MUTED }}>
        Bayraklar bir sebep söyler, puan vermez: &quot;Hesabını hiç açmamış&quot; ile &quot;hiç veri girmemiş&quot; ayrı şeylerdir —
        birincisi erişim, ikincisi kullanım sorunudur. Neti düşen bayrağı yalnızca {NET_DUSUS_ESIGI} netten fazla düşüşte yanar.
        &quot;Son hareket&quot; konu çalışması, soru çözümü ve deneme kayıtlarının en yenisidir. Yön, son denemenin kendinden önceki
        iki denemenin ortalamasıyla karşılaştırılmasıdır; tek denemede yön gösterilmez. Öğrenci adına tıklayınca analiz sayfası açılır.
      </p>
    </section>
  );
}
