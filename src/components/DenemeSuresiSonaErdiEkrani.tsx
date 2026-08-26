import Image from "next/image";
import { AlertTriangle } from "lucide-react";
import { BG0, BG1, BORDER_STRONG, TEXT, TEXT_MUTED, BUTTER, BUTTER_BG } from "@/lib/theme";
import { SeFuMarkaAdi, SeFuSlogan } from "@/components/SeFuWordmark";
import { DENEME_SURESI_SONA_ERDI_MESAJI } from "@/lib/deneme-suresi";

// Dershane 1 haftalık deneme süresi doldu (bkz. deneme-suresi.ts,
// migration 0065) — dashboard/page.tsx'ten tüm dashboard shell'i
// (Header/menü dahil) YERİNE render ediliyor, tek başına bir tam ekran.
export function DenemeSuresiSonaErdiEkrani() {
  return (
    <div style={{ minHeight: "100vh", background: BG0 }} className="flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <Image src="/logo.png" alt="SeFu Koç" width={1258} height={837} className="sfec-brand-logo h-20 w-auto max-w-full object-contain mb-2" priority />
        <SeFuMarkaAdi as="h1" className="text-xl font-extrabold leading-none" />
        <p className="text-xs mt-1 italic mb-6"><SeFuSlogan /></p>

        <div className="w-full rounded-3xl p-6 flex flex-col items-center gap-3" style={{ background: BG1, border: `2px solid ${BORDER_STRONG}` }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: BUTTER_BG }}>
            <AlertTriangle size={20} color={BUTTER} />
          </div>
          <p style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">{DENEME_SURESI_SONA_ERDI_MESAJI}</p>
          <p style={{ color: TEXT_MUTED }} className="text-xs">Sorularınız için kurumunuzun yetkilisiyle iletişime geçebilirsiniz.</p>
        </div>
      </div>
    </div>
  );
}
