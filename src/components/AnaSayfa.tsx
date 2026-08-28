"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { anaSayfaDosyaUrl, type AnaSayfaSliderGorseli } from "@/lib/ana-sayfa";
import { AnaSayfaTgAkisi } from "@/components/AnaSayfaTgAkisi";
import type { TgDenemeIlani } from "@/lib/tg-deneme-ilanlari";

// Ana Sayfa (27.08.2026 kullanıcı isteği) — GirisKarsilamaSayfasi.tsx'in
// (rol vitrin ekranı) yerini alan, tamamen farklı bir "kurumsal" tasarım:
// header + tam genişlik slider + tanıtım metni. Metinler/görseller/slider
// süresi admin panelinden (Site Ayarları → Ana Sayfa Ayarları) yönetiliyor
// — bkz. src/lib/ana-sayfa.ts, src/app/yonetici/actions.ts.
const LACIVERT = "#0F2540";
const TURKUAZ = "#14B8B0";
const BEYAZ = "#FFFFFF";
const METIN_GRI = "#3F4B5A";

// "Etiket: metin" satırlarını (kullanıcının taslağındaki "Müdürler ve Okul
// Yönetimi: ...", "Kurs Eğitimcileri: ...", "Veliler: ..." gibi) etiketi
// kalın+turkuaz vurgulu göstermek için ayrıştırıyor — admin serbest metin
// yazdığı için bu deseni bulamazsa satır olduğu gibi (düz paragraf)
// gösteriliyor, hiçbir şey kırılmıyor.
function paragrafGoster(paragraf: string, index: number) {
  const eslesme = paragraf.match(/^([^:\n]{2,40}):\s([\s\S]+)$/);
  if (eslesme) {
    return (
      <p key={index} className="text-base leading-relaxed sm:text-lg" style={{ color: METIN_GRI }}>
        <span className="font-bold" style={{ color: TURKUAZ }}>{eslesme[1]}:</span> {eslesme[2]}
      </p>
    );
  }
  return <p key={index} className="text-base leading-relaxed sm:text-lg" style={{ color: METIN_GRI }}>{paragraf}</p>;
}

function Slider({ gorseller, gecisSaniye }: { gorseller: AnaSayfaSliderGorseli[]; gecisSaniye: number }) {
  const [aktif, setAktif] = useState(0);
  const dokunmaBaslangici = useRef<number | null>(null);

  useEffect(() => {
    if (gorseller.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const zamanlayici = window.setInterval(() => setAktif((i) => (i + 1) % gorseller.length), gecisSaniye * 1000);
    return () => window.clearInterval(zamanlayici);
  }, [gorseller.length, gecisSaniye]);

  function git(index: number) {
    setAktif((index + gorseller.length) % gorseller.length);
  }

  function dokunmaBitti(x: number) {
    if (dokunmaBaslangici.current === null) return;
    const fark = x - dokunmaBaslangici.current;
    dokunmaBaslangici.current = null;
    if (Math.abs(fark) < 45) return;
    git(aktif + (fark < 0 ? 1 : -1));
  }

  // Admin henüz görsel yüklemediyse kırık bir slider yerine düz bir
  // marka rengi zemin gösteriliyor — sayfanın geri kalanı yine çalışıyor.
  if (gorseller.length === 0) {
    return <div className="h-[38vh] w-full sm:h-[52vh]" style={{ background: `linear-gradient(120deg, ${LACIVERT} 0%, ${TURKUAZ} 100%)` }} />;
  }

  return (
    <div className="relative h-[38vh] w-full overflow-hidden sm:h-[52vh]"
      onTouchStart={(e) => { dokunmaBaslangici.current = e.changedTouches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => dokunmaBitti(e.changedTouches[0]?.clientX ?? 0)}>
      {gorseller.map((g, i) => (
        <div key={g.id} className="absolute inset-0 transition-opacity duration-700" style={{ opacity: i === aktif ? 1 : 0 }} aria-hidden={i !== aktif}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image harici Storage domainini reddediyor (bkz. TgDenemeleri.tsx) */}
          <img src={anaSayfaDosyaUrl(g.dosyaYolu)} alt="" className="h-full w-full object-cover" />
        </div>
      ))}
      {gorseller.length > 1 && (
        <>
          <button type="button" onClick={() => git(aktif - 1)} aria-label="Önceki görsel"
            className="sfec-btn absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full sm:left-6"
            style={{ background: "rgba(15,37,64,0.55)" }}>
            <ChevronLeft size={20} color={BEYAZ} />
          </button>
          <button type="button" onClick={() => git(aktif + 1)} aria-label="Sonraki görsel"
            className="sfec-btn absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full sm:right-6"
            style={{ background: "rgba(15,37,64,0.55)" }}>
            <ChevronRight size={20} color={BEYAZ} />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {gorseller.map((g, i) => (
              <button key={g.id} type="button" onClick={() => git(i)} aria-label={`${i + 1}. görsele git`} aria-current={i === aktif ? "true" : undefined}
                className="sfec-btn h-2.5 rounded-full" style={{ width: i === aktif ? 22 : 9, background: i === aktif ? TURKUAZ : "rgba(255,255,255,0.6)" }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function AnaSayfa({ baslik, govde, sliderGecisSaniye, sliderGorselleri, tgIlanlar }: {
  baslik: string; govde: string; sliderGecisSaniye: number; sliderGorselleri: AnaSayfaSliderGorseli[]; tgIlanlar: TgDenemeIlani[];
}) {
  const paragraflar = govde.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <div style={{ background: BEYAZ }} className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-4 sm:px-10">
        <Image src="/logo.png" alt="SeFu Koç" width={512} height={512} className="h-10 w-auto object-contain sm:h-12" priority />
        <div className="flex-1" />
        <Link href="/login" className="sfec-btn rounded-full px-6 py-2.5 text-sm font-bold" style={{ background: TURKUAZ, color: BEYAZ }}>
          GİRİŞ YAP
        </Link>
      </header>

      <Slider gorseller={sliderGorselleri} gecisSaniye={sliderGecisSaniye} />

      <AnaSayfaTgAkisi dbIlanlar={tgIlanlar} />

      <section className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="text-balance text-2xl font-extrabold leading-tight sm:text-3xl" style={{ color: LACIVERT, fontFamily: "var(--font-baloo)" }}>
          {baslik}
        </h1>
        {paragraflar.map(paragrafGoster)}
      </section>

      <footer className="mt-auto px-5 py-6 text-center text-xs sm:px-10" style={{ color: METIN_GRI }}>
        © {new Date().getFullYear()} SeFu Koç. Tüm hakları saklıdır.
      </footer>
    </div>
  );
}
