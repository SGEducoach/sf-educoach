import Image from "next/image";
import { BG0, TEXT_MUTED } from "@/lib/theme";

// Site bakım modu (2026-08-26 kullanıcı isteği) — "Site kapalıyken ekranda
// sadece logo yer alacak ve sitenin bakımda olduğunu belirten bir yazı yer
// alacak." Bilinçli olarak DenemeSuresiSonaErdiEkrani'ndan daha sade (kart/
// ikon/slogan yok) — istenen tam olarak bu: logo + tek satır.
export function SiteBakimdaEkrani() {
  return (
    <div style={{ minHeight: "100vh", background: BG0 }} className="flex items-center justify-center px-4">
      <div className="flex flex-col items-center text-center gap-4">
        <Image src="/logo.png" alt="SeFu Koç" width={1258} height={837} className="sfec-brand-logo h-20 w-auto max-w-full object-contain" priority />
        <p className="text-sm font-semibold" style={{ color: TEXT_MUTED }}>Site şu anda bakımda. Kısa süre içinde tekrar hizmetinizdeyiz.</p>
      </div>
    </div>
  );
}
