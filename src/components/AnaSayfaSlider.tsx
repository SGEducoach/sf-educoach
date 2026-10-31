"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { anaSayfaDosyaUrl, type AnaSayfaSliderGorseli } from "@/lib/ana-sayfa";
import styles from "./AnaSayfaSlider.module.css";

// Kartın destedeki yeri: ortadaki etkin görsel, iki yanında komşuları; kalanlar arkada gizli.
function konum(index: number, aktif: number, adet: number): "orta" | "sol" | "sag" | "gizli" {
  const fark = (index - aktif + adet) % adet;
  if (fark === 0) return "orta";
  if (adet > 1 && fark === 1) return "sag";
  if (adet > 2 && fark === adet - 1) return "sol";
  return "gizli";
}

export function AnaSayfaSlider({ gorseller, gecisSaniye }: { gorseller: AnaSayfaSliderGorseli[]; gecisSaniye: number }) {
  const [secili, setSecili] = useState(0);
  const [duraklatildi, setDuraklatildi] = useState(false);
  const [uzerinde, setUzerinde] = useState(false);
  const [odakta, setOdakta] = useState(false);
  const dokunma = useRef<number | null>(null);
  const aktif = gorseller.length ? secili % gorseller.length : 0;

  useEffect(() => {
    if (gorseller.length < 2 || duraklatildi || uzerinde || odakta) return;
    const tercih = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(() => {
      if (!tercih.matches && !document.hidden) setSecili(i => (i + 1) % gorseller.length);
    }, Math.max(3, gecisSaniye) * 1000);
    return () => window.clearInterval(timer);
  }, [gorseller.length, gecisSaniye, duraklatildi, uzerinde, odakta]);

  function git(i: number) { if (gorseller.length) setSecili((i + gorseller.length) % gorseller.length); }
  if (!gorseller.length) return <div className={styles.bos} aria-label="Tanıtım görselleri henüz eklenmedi" />;

  return <section className={styles.slider} aria-label="Tanıtım görselleri" aria-roledescription="slayt gösterisi"
    onMouseEnter={() => setUzerinde(true)} onMouseLeave={() => setUzerinde(false)}
    onFocusCapture={() => setOdakta(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOdakta(false); }}
    onKeyDown={e => {
      if (e.key === "ArrowRight") { e.preventDefault(); git(aktif + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); git(aktif - 1); }
    }}>
    <div className={styles.sahne} onTouchStart={e => { dokunma.current = e.changedTouches[0]?.clientX ?? null; }}
      onTouchEnd={e => {
        const x = e.changedTouches[0]?.clientX;
        if (dokunma.current !== null && x !== undefined && Math.abs(x - dokunma.current) > 45) git(aktif + (x < dokunma.current ? 1 : -1));
        dokunma.current = null;
      }}>
      {gorseller.map((g, index) => {
        const yer = konum(index, aktif, gorseller.length);
        return <button key={g.id} type="button" className={styles.kart} data-konum={yer}
          aria-label={yer === "orta" ? `${index + 1}. görsel` : `${index + 1}. görsele geç`}
          aria-current={yer === "orta" ? "true" : undefined} tabIndex={yer === "gizli" ? -1 : 0}
          onClick={() => git(index)}>
          {/* Performans (2026-09-04): next/image ile otomatik boyutlandırma + modern
              format; kart mutlak konumlu olduğundan fill kullanılıyor. Destede ilk
              görünen 3 kart öncelikli (LCP), kalanlar lazy. */}
          <Image src={anaSayfaDosyaUrl(g.dosyaYolu)} alt="" fill draggable={false}
            sizes="(max-width: 640px) 80vw, 660px" priority={index < 3} />
        </button>;
      })}
    </div>
    {gorseller.length > 1 && <div className={styles.kontroller}>
      <button type="button" onClick={() => git(aktif - 1)} aria-label="Önceki görsel"><ChevronLeft size={17} /></button>
      <span className={styles.sayac} aria-live={duraklatildi || odakta ? "polite" : "off"}>{aktif + 1} / {gorseller.length}</span>
      <button type="button" onClick={() => git(aktif + 1)} aria-label="Sonraki görsel"><ChevronRight size={17} /></button>
      <button type="button" onClick={() => setDuraklatildi(v => !v)} aria-label={duraklatildi ? "Otomatik geçişi başlat" : "Otomatik geçişi duraklat"}>
        {duraklatildi ? <Play size={14} /> : <Pause size={14} />}
      </button>
    </div>}
  </section>;
}
