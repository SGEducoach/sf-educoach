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
  const [hareketAzalt, setHareketAzalt] = useState(false);
  const [gizli, setGizli] = useState(false);
  const dokunma = useRef<number | null>(null);
  const aktif = gorseller.length ? secili % gorseller.length : 0;

  useEffect(() => {
    const tercih = window.matchMedia("(prefers-reduced-motion: reduce)");
    const guncelle = () => { setHareketAzalt(tercih.matches); setGizli(document.hidden); };
    guncelle();
    tercih.addEventListener("change", guncelle);
    document.addEventListener("visibilitychange", guncelle);
    return () => { tercih.removeEventListener("change", guncelle); document.removeEventListener("visibilitychange", guncelle); };
  }, []);

  // İlerleme şeridi (kullanıcı isteği 01.11.2026): duraklatınca hem zamanlayıcı hem şerit
  // animasyonu durur, devam edince ikisi de KALDIĞI YERDEN sürer — eskisi gibi her
  // duraklatmada süre baştan başlasaydı şerit ile görsel birbirinden kayardı.
  const oynuyor = gorseller.length > 1 && !duraklatildi && !uzerinde && !odakta && !hareketAzalt && !gizli;
  const sureMs = Math.max(3, gecisSaniye) * 1000;
  const kalan = useRef(sureMs);
  const adet = gorseller.length;

  // Görsel değişince süre baştan (bu etki aşağıdakinden önce çalışmalı: önce eski koşunun
  // temizliği kalan süreyi düşer, sonra burada sıfırlanır, sonra yeni koşu başlar).
  useEffect(() => { kalan.current = sureMs; }, [aktif, sureMs]);
  useEffect(() => {
    if (!oynuyor) return;
    const baslangic = performance.now();
    const zamanlayici = window.setTimeout(() => setSecili((aktif + 1) % adet), kalan.current);
    return () => { window.clearTimeout(zamanlayici); kalan.current = Math.max(0, kalan.current - (performance.now() - baslangic)); };
  }, [oynuyor, aktif, adet]);

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
      <div className={styles.serit} aria-hidden="true">
        {gorseller.map((g, index) => (
          <span key={g.id} className={styles.parca}>
            <i className={index < aktif ? styles.dolu : index === aktif ? styles.akan : undefined}
              style={index === aktif ? { animationDuration: `${sureMs}ms`, animationPlayState: oynuyor ? "running" : "paused" } : undefined} />
          </span>
        ))}
      </div>
      <span className={styles.sayac} aria-live={duraklatildi || odakta ? "polite" : "off"}>{aktif + 1} / {gorseller.length}</span>
      <button type="button" onClick={() => git(aktif + 1)} aria-label="Sonraki görsel"><ChevronRight size={17} /></button>
      <button type="button" onClick={() => setDuraklatildi(v => !v)} aria-label={duraklatildi ? "Otomatik geçişi başlat" : "Otomatik geçişi duraklat"}>
        {duraklatildi ? <Play size={14} /> : <Pause size={14} />}
      </button>
    </div>}
  </section>;
}
