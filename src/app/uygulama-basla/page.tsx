"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

const ANAHTAR = "sefu_uygulama_basladi_v1";
const degismezAbonelik = () => () => {};
const istemciHazir = () => true;
const sunucuHazir = () => false;
function dahaOnceBasladiMi() {
  try { return localStorage.getItem(ANAHTAR) === "1"; }
  catch { return false; }
}

export default function UygulamaBaslaSayfasi() {
  const router = useRouter();
  const hazir = useSyncExternalStore(degismezAbonelik, istemciHazir, sunucuHazir);
  const basladi = useSyncExternalStore(degismezAbonelik, dahaOnceBasladiMi, sunucuHazir);

  useEffect(() => {
    if (basladi) router.replace("/dashboard");
  }, [basladi, router]);

  function basla() {
    try { localStorage.setItem(ANAHTAR, "1"); } catch { /* Giriş akışı sürer. */ }
    router.push("/dashboard");
  }

  if (!hazir || basladi) return <main id="ana-icerik" className="min-h-dvh" aria-label="Uygulama açılıyor" />;
  return <main id="ana-icerik" className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6 py-12 text-center">
    <Image src="/icon-192.png" alt="SeFu Koç" width={112} height={112} className="rounded-3xl" priority />
    <h1 className="mt-7 text-3xl font-extrabold">SeFu Koç’a hoş geldiniz</h1>
    <p className="mt-4 text-sm leading-6">Çalışma programınız, konu çalışmalarınız ve kurum haberleriniz tek yerde. Mevcut hesabınızla devam edin.</p>
    <button type="button" onClick={basla} className="mt-8 w-full rounded-2xl bg-[#14B8B0] px-7 py-3 font-bold text-white">Kullanmaya Başla</button>
  </main>;
}
