"use client";

import { useEffect, useState } from "react";
import { Clock3, Moon, Sun } from "lucide-react";
import { BG1_ALT, BORDER, TEXT_MUTED } from "@/lib/theme";

type TemaTercihi = "otomatik" | "acik" | "koyu";
const TEMA_ANAHTARI = "sfec_tema_tercihi";
const TEMA_OLAYI = "sfec-tema-degisti";

function kayitliTercih(): TemaTercihi {
  const tercih = localStorage.getItem(TEMA_ANAHTARI);
  return tercih === "acik" || tercih === "koyu" ? tercih : "otomatik";
}

function istanbulSaatiKoyuMu() {
  const parcalar = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", hour12: false, timeZone: "Europe/Istanbul" }).formatToParts(new Date());
  const saat = Number(parcalar.find((parca) => parca.type === "hour")?.value ?? "12");
  return saat < 7 || saat >= 19;
}

function temayiUygula(tercih: TemaTercihi) {
  const tema = tercih === "otomatik" ? (istanbulSaatiKoyuMu() ? "koyu" : "acik") : tercih;
  document.documentElement.dataset.theme = tema;
  document.documentElement.style.colorScheme = tema === "koyu" ? "dark" : "light";
}

export function TemaDenetimi() {
  useEffect(() => {
    const yenile = () => temayiUygula(kayitliTercih());
    yenile();
    const zamanlayici = window.setInterval(yenile, 60_000);
    window.addEventListener(TEMA_OLAYI, yenile);
    return () => { window.clearInterval(zamanlayici); window.removeEventListener(TEMA_OLAYI, yenile); };
  }, []);
  return null;
}

export function TemaButonu() {
  const [tercih, setTercih] = useState<TemaTercihi>("otomatik");
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setTercih(kayitliTercih()));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const sonraki: Record<TemaTercihi, TemaTercihi> = { otomatik: "acik", acik: "koyu", koyu: "otomatik" };
  const etiket: Record<TemaTercihi, string> = { otomatik: "Tema: Otomatik", acik: "Tema: Açık", koyu: "Tema: Koyu" };
  const Icon = tercih === "otomatik" ? Clock3 : tercih === "acik" ? Sun : Moon;

  function degistir() {
    const yeni = sonraki[tercih];
    localStorage.setItem(TEMA_ANAHTARI, yeni);
    setTercih(yeni);
    temayiUygula(yeni);
    window.dispatchEvent(new Event(TEMA_OLAYI));
  }

  return <button type="button" onClick={degistir} title={`${etiket[tercih]} - değiştirmek için dokunun`} aria-label={etiket[tercih]} className="sfec-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8" style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}><Icon size={15} color={TEXT_MUTED}/></button>;
}
