"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const ZAMAN_ASIMI_MS = 30 * 60 * 1000;
const SON_HAREKET_ANAHTARI = "sfec_yetkili_son_hareket";

export function OturumZamanAsimi({ aktif }: { aktif: boolean }) {
  useEffect(() => {
    if (!aktif) return;
    const supabase = createClient();
    const simdiKaydet = () => sessionStorage.setItem(SON_HAREKET_ANAHTARI, String(Date.now()));
    if (!sessionStorage.getItem(SON_HAREKET_ANAHTARI)) simdiKaydet();
    let sonKayit = 0;
    const hareketKaydet = () => {
      const simdi = Date.now();
      if (simdi - sonKayit < 15_000) return;
      sonKayit = simdi;
      simdiKaydet();
    };
    const olaylar: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart"];
    olaylar.forEach((olay) => window.addEventListener(olay, hareketKaydet, { passive: true }));
    const kontrol = window.setInterval(async () => {
      const sonHareket = Number(sessionStorage.getItem(SON_HAREKET_ANAHTARI) ?? Date.now());
      if (Date.now() - sonHareket < ZAMAN_ASIMI_MS) return;
      window.clearInterval(kontrol);
      sessionStorage.removeItem(SON_HAREKET_ANAHTARI);
      await supabase.auth.signOut();
      window.location.replace("/login?neden=zaman-asimi");
    }, 15_000);
    return () => {
      window.clearInterval(kontrol);
      olaylar.forEach((olay) => window.removeEventListener(olay, hareketKaydet));
    };
  }, [aktif]);
  return null;
}
