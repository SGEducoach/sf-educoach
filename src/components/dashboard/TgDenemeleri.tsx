"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Pause, Play } from "lucide-react";
import { TG_DENEME_HABERLERI } from "@/lib/tg-denemeleri";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

const GECIS_SURESI = 5_000;

export function TgDenemeleri({ bugun }: { bugun: string }) {
  const [aktif, setAktif] = useState(0);
  const [otomatik, setOtomatik] = useState(true);
  const [etkilesimde, setEtkilesimde] = useState(false);
  const dokunmaBaslangici = useRef<number | null>(null);
  const haberler = TG_DENEME_HABERLERI.slice(0, 10);
  const haber = haberler[aktif];

  useEffect(() => {
    if (!otomatik || etkilesimde || haberler.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const zamanlayici = window.setTimeout(() => setAktif((mevcut) => (mevcut + 1) % haberler.length), GECIS_SURESI);
    return () => window.clearTimeout(zamanlayici);
  }, [aktif, etkilesimde, haberler.length, otomatik]);

  function git(index: number) {
    setAktif((index + haberler.length) % haberler.length);
  }

  function dokunmaBitti(x: number) {
    if (dokunmaBaslangici.current === null) return;
    const fark = x - dokunmaBaslangici.current;
    dokunmaBaslangici.current = null;
    if (Math.abs(fark) < 45) return;
    git(aktif + (fark < 0 ? 1 : -1));
  }

  const gecti = haber.sonTarih < bugun;

  return (
    <section className="sfec-fade flex min-h-full flex-col gap-4" aria-labelledby="tg-denemeleri-baslik">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: TEXT_MUTED }}>
            <CalendarDays size={14} color={MINT} aria-hidden="true" /> Türkiye geneli sınav haberleri
          </div>
          <h1 id="tg-denemeleri-baslik" className="text-2xl font-extrabold sm:text-3xl" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
            TG Denemeler
          </h1>
          <p className="mt-1 max-w-2xl text-sm" style={{ color: TEXT_MUTED }}>
            Genel takvimler ve yaklaşan deneme afişleri. Dokunmadığınızda haberler 5 saniyede bir ilerler.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOtomatik((deger) => !deger)}
          className="sfec-btn inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold"
          style={{ background: otomatik ? MINT_BG : BG1, color: TEXT, border: `1px solid ${otomatik ? MINT : BORDER_STRONG}` }}
          aria-pressed={!otomatik}
        >
          {otomatik ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
          {otomatik ? "Otomatik akışı durdur" : "Otomatik akışı başlat"}
        </button>
      </div>

      {/* Haber akışı imleçleri (manuel ileri/geri + nokta göstergeleri) —
          kullanıcı isteğiyle üstteki duyuru/başlık bloğunun hemen altına
          taşındı, önceden sağ paneldeki kart içeriğinin en altındaydı. */}
      <div className="flex items-center justify-between gap-3 px-1">
        <button type="button" onClick={() => git(aktif - 1)} aria-label="Önceki haber" className="sfec-btn flex h-11 w-11 items-center justify-center rounded-full" style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
          <ChevronLeft size={19} aria-hidden="true" />
        </button>
        <div className="flex flex-wrap justify-center gap-1.5" aria-label="Haber seçimi">
          {haberler.map((oge, index) => (
            <button
              key={oge.id}
              type="button"
              onClick={() => git(index)}
              aria-label={`${index + 1}. habere git: ${oge.baslik}`}
              aria-current={index === aktif ? "true" : undefined}
              className="sfec-btn h-2.5 rounded-full"
              style={{ width: index === aktif ? 24 : 10, background: index === aktif ? MINT : BORDER_STRONG }}
            />
          ))}
        </div>
        <button type="button" onClick={() => git(aktif + 1)} aria-label="Sonraki haber" className="sfec-btn flex h-11 w-11 items-center justify-center rounded-full" style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
          <ChevronRight size={19} aria-hidden="true" />
        </button>
      </div>

      <div
        className="relative overflow-hidden rounded-[1.75rem]"
        style={{ background: BG1, border: `1px solid ${BORDER}`, boxShadow: "var(--sfec-card-shadow)" }}
        onMouseEnter={() => setEtkilesimde(true)}
        onMouseLeave={() => setEtkilesimde(false)}
        onFocusCapture={() => setEtkilesimde(true)}
        onBlurCapture={(olay) => {
          if (!olay.currentTarget.contains(olay.relatedTarget as Node | null)) setEtkilesimde(false);
        }}
        onTouchStart={(olay) => { dokunmaBaslangici.current = olay.changedTouches[0]?.clientX ?? null; }}
        onTouchEnd={(olay) => dokunmaBitti(olay.changedTouches[0]?.clientX ?? 0)}
      >
        <div className="grid min-h-[32rem] lg:grid-cols-[minmax(0,1fr)_19rem]" aria-live="polite">
          <div className="relative flex min-h-[28rem] items-center justify-center overflow-hidden p-4 sm:p-6 lg:min-h-[42rem]" style={{ background: BG1_ALT }}>
            <Image
              key={haber.id}
              src={haber.gorsel}
              alt={haber.alt}
              width={haber.genislik}
              height={haber.yukseklik}
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="sfec-tg-haber-gir max-h-[72dvh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              preload={aktif === 0}
            />
            {gecti && (
              <div className="absolute bottom-8 right-7 rotate-[-9deg] rounded-xl border-[5px] border-white bg-red-700 px-5 py-2 text-2xl font-black tracking-[0.16em] text-white shadow-[0_8px_24px_rgba(0,0,0,0.55)] sm:bottom-10 sm:right-10 sm:text-3xl" aria-label="Bu denemenin tarihi geçti">
                GEÇTİ
              </div>
            )}
          </div>

          <aside className="flex flex-col border-t p-5 sm:p-6 lg:border-l lg:border-t-0" style={{ borderColor: BORDER }}>
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ background: MINT_BG, color: TEXT }}>
                {haber.kategori}
              </span>
              <span className="text-sm font-extrabold tabular-nums" style={{ color: TEXT }}>
                {aktif + 1}<span style={{ color: TEXT_MUTED }}>/{haberler.length}</span>
              </span>
            </div>

            <div key={haber.id} className="sfec-tg-haber-gir my-auto py-8">
              <div className="mb-3 text-xs font-bold" style={{ color: MINT }}>{haber.tarihEtiketi}</div>
              <h2 className="text-xl font-extrabold leading-tight sm:text-2xl" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{haber.baslik}</h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>{haber.aciklama}</p>
              {haber.kaynakHref && (
                <a href={haber.kaynakHref} target="_blank" rel="noreferrer" className="sfec-btn mt-5 inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}>
                  Takvimi PDF olarak aç <ExternalLink size={13} aria-hidden="true" />
                </a>
              )}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
