"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useUygulamaKurulumu } from "@/components/UygulamaKurulumBaglami";

export default function UygulamaSayfasi() {
  const { istem, kurulu, android, kur } = useUygulamaKurulumu();
  const [mesaj, setMesaj] = useState("");

  async function kurulumBaslat() {
    const sonuc = await kur();
    if (sonuc === "dismissed") setMesaj("Kurulum onaylanmadı. Chrome menüsünden ‘Uygulamayı yükle’ seçeneğini kullanabilirsiniz.");
    if (sonuc === "unavailable") setMesaj("Kurulum isteği açılamadı. Chrome menüsünden ‘Uygulamayı yükle’ seçeneğini deneyin.");
    if (sonuc === "accepted") setMesaj("Kurulum tamamlandığında SeFu Koç simgesinden uygulamayı açın.");
  }

  return <main id="ana-icerik" className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-5 py-12 text-center">
    <Image src="/icon-192.png" alt="SeFu Koç" width={96} height={96} className="rounded-3xl" priority />
    <h1 className="mt-6 text-3xl font-extrabold">SeFu Koç cebinizde</h1>
    <p className="mt-3 text-sm leading-6">Mevcut hesabınızı ve çalışma verilerinizi Android telefonunuzda kullanın. Web sitesi aynı şekilde çalışmaya devam eder.</p>
    <p className="mt-2 text-xs">Bu sürüm tarayıcıdan kurulur; APK dosyası indirmez veya Play Store&apos;a yönlendirmez.</p>

    {kurulu ? <>
      <p className="mt-8 text-sm">Uygulama hazır.</p>
      <Link href="/uygulama-basla" className="mt-4 rounded-2xl bg-[#14B8B0] px-7 py-3 font-bold text-white">Kullanmaya Başla</Link>
    </> : istem && android ? <>
      <button type="button" onClick={kurulumBaslat} className="mt-8 rounded-2xl bg-[#14B8B0] px-7 py-3 font-bold text-white">Android uygulamasını kur</button>
      <p className="mt-3 text-xs">Telefonunuz kurulum için onay isteyebilir.</p>
    </> : <>
      <p className="mt-8 rounded-2xl bg-[#F0F7F8] p-4 text-sm leading-6">
        {android ? "Android'de Chrome menüsünü (⋮) açıp ‘Uygulamayı yükle’ veya ‘Ana ekrana ekle’ seçeneğine dokunun." : "Android telefonda Chrome ile bu sayfayı açın. iPhone'da Safari paylaşım menüsünden ‘Ana Ekrana Ekle’ seçeneğini kullanın."}
      </p>
      <Link href="/dashboard" className="mt-4 rounded-2xl bg-[#14B8B0] px-7 py-3 font-bold text-white">Web üzerinden devam et</Link>
    </>}
    {mesaj && <p role="status" className="mt-4 text-sm">{mesaj}</p>}
    <Link href="/" className="mt-8 text-sm underline">Ana sayfaya dön</Link>
  </main>;
}
