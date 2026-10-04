"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";

interface KurulumIstemi extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type KurulumDurumu = {
  istem: KurulumIstemi | null;
  kurulu: boolean;
  android: boolean;
  kur: () => Promise<"accepted" | "dismissed" | "unavailable">;
};

const Baglam = createContext<KurulumDurumu | null>(null);
const degismezAbonelik = () => () => {};
const androidMu = () => /Android/i.test(navigator.userAgent);
const sunucuDegeri = () => false;
const gorunumAboneligi = (bildir: () => void) => {
  const gorunum = window.matchMedia("(display-mode: standalone)");
  gorunum.addEventListener("change", bildir);
  return () => gorunum.removeEventListener("change", bildir);
};
const bagimsizGorunum = () => window.matchMedia("(display-mode: standalone)").matches;

export function UygulamaKurulumSaglayici({ children }: { children: React.ReactNode }) {
  const [istem, setIstem] = useState<KurulumIstemi | null>(null);
  const [yeniKuruldu, setYeniKuruldu] = useState(false);
  const android = useSyncExternalStore(degismezAbonelik, androidMu, sunucuDegeri);
  const kurulu = useSyncExternalStore(gorunumAboneligi, bagimsizGorunum, sunucuDegeri) || yeniKuruldu;

  useEffect(() => {
    const kurulumIstemi = (event: Event) => {
      event.preventDefault();
      setIstem(event as KurulumIstemi);
    };
    const kuruldu = () => { setYeniKuruldu(true); setIstem(null); };
    window.addEventListener("beforeinstallprompt", kurulumIstemi);
    window.addEventListener("appinstalled", kuruldu);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", kurulumIstemi);
      window.removeEventListener("appinstalled", kuruldu);
    };
  }, []);

  async function kur(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!istem) return "unavailable";
    const seciliIstem = istem;
    setIstem(null);
    await seciliIstem.prompt();
    return (await seciliIstem.userChoice).outcome;
  }

  return <Baglam.Provider value={{ istem, kurulu, android, kur }}>{children}</Baglam.Provider>;
}

export function useUygulamaKurulumu() {
  const baglam = useContext(Baglam);
  if (!baglam) throw new Error("Uygulama kurulum bağlamı bulunamadı.");
  return baglam;
}
