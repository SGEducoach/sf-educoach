"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bot } from "lucide-react";
import { BG0, MINT, MINT_ON, TEXT } from "@/lib/theme";

// Kullanıcı isteği (27.08.2026, revize): sayfa SADECE bir vitrin — rol
// seçimi, "Kayıt ol" linki, Einstein maskotu hepsi kaldırıldı. Gerçek
// etkileşim tek bir yerden başlıyor: "Giriş" butonu. Fotoğraflar ve
// cümleler kullanıcı hiçbir şeye dokunmadan 5 saniyede bir SÜREKLİ
// döngüde değişiyor. Masaüstünde üç fotoğraf yan yana durur, sırası gelen
// büyüyüp belirginleşir; mobilde tek fotoğraf akar (bkz. sm: breakpoint
// ile ikisi arasında geçiş).
type Rol = "ogrenci" | "ogretmen" | "veli";

const ROLLER: { id: Rol; ad: string; foto: string; cumle: string }[] = [
  {
    id: "ogrenci", ad: "Öğrenci", foto: "/landing/ogrenci.jpg",
    cumle: "Hedeflerini belirle, gelişimini takip et ve sana özel yönlendirmelerle başarıya daha emin adımlarla ilerle.",
  },
  {
    id: "ogretmen", ad: "Öğretmen", foto: "/landing/ogretmen.jpg",
    cumle: "Öğrencilerinin gelişimini tek yerden izle, ihtiyaçlarını erkenden fark et ve doğru zamanda destek ol.",
  },
  {
    id: "veli", ad: "Veli", foto: "/landing/veli.jpg",
    cumle: "Çocuğunun eğitim sürecini yakından takip et, gelişimini görünür kıl ve geleceğine bilinçli şekilde rehberlik et.",
  },
];

const DONGU_SURESI_MS = 5000;

export function GirisKarsilamaSayfasi() {
  const [aktifIndex, setAktifIndex] = useState(0);

  useEffect(() => {
    const zamanlayici = setInterval(() => {
      setAktifIndex((i) => (i + 1) % ROLLER.length);
    }, DONGU_SURESI_MS);
    return () => clearInterval(zamanlayici);
  }, []);

  const aktif = ROLLER[aktifIndex];

  return (
    <div style={{ minHeight: "100vh", background: BG0 }} className="flex flex-col sm:flex-row">
      {/* Sol — sadece logo + slogan, dikey ortalanmış */}
      <div className="flex items-center justify-center px-6 py-8 sm:w-[300px] sm:shrink-0 sm:py-10">
        <div className="text-center sm:text-left">
          <Image src="/logo-login.png" alt="SeFu Koç" width={1153} height={965} className="mx-auto h-20 w-auto object-contain sm:mx-0" priority />
          <p style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="mt-4 text-lg font-bold leading-snug">
            Her zaman bir adım ötesini düşün
          </p>
        </div>
      </div>

      {/* Sağ — vitrin: fotoğraf(lar) + cümle + Giriş, dikey ortalanmış tek blok */}
      <div className="flex flex-1 flex-col justify-center px-4 py-6 sm:px-8 sm:py-10">
        {/* Masaüstü/tablet: üç fotoğraf yan yana, aktif olan büyür */}
        <div className="mx-auto hidden w-full max-w-3xl items-stretch gap-3 sm:flex lg:gap-4">
          {ROLLER.map((r, i) => {
            const seciliMi = i === aktifIndex;
            return (
              <div key={r.id} className="relative overflow-hidden rounded-3xl transition-all duration-700 ease-out"
                style={{ flex: seciliMi ? 2.3 : 1, opacity: seciliMi ? 1 : 0.35, aspectRatio: "4 / 3" }}>
                <Image src={r.foto} alt={`${r.ad} SeFu Koç kullanırken`} fill sizes="(max-width: 1024px) 33vw, 380px" className="object-cover" priority={i === 0} />
              </div>
            );
          })}
        </div>

        {/* Mobil: tek fotoğraf akıyor */}
        <div key={`mobil-foto-${aktif.id}`} className="sfec-tg-haber-gir relative aspect-[4/3] w-full overflow-hidden rounded-3xl sm:hidden">
          <Image src={aktif.foto} alt={`${aktif.ad} SeFu Koç kullanırken`} fill sizes="100vw" className="object-cover" priority />
        </div>

        <p key={`cumle-${aktif.id}`} className="sfec-tg-haber-gir mx-auto mt-6 w-full max-w-xl text-center text-base italic leading-relaxed"
          style={{ color: TEXT }}>
          {aktif.cumle}
        </p>

        <Link href={`/login?rol=${aktif.id}`}
          className="sfec-btn mx-auto mt-10 flex items-center gap-2 rounded-full px-7 py-3" style={{ background: MINT, color: MINT_ON }}>
          <Bot size={18} />
          <span className="text-base font-bold">Giriş</span>
        </Link>
      </div>
    </div>
  );
}
