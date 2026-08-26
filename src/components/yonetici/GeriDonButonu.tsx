"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BG1, TEXT_MUTED, BORDER_STRONG } from "@/lib/theme";

// Kullanıcı bulgusu (26.08.2026): kullanıcı profilinden "Kullanıcılara dön"
// sabit href="/yonetici/kullanicilar" ile YENİ bir sayfaya gidiyordu — bu da
// KullaniciArama'nın state'ini (seçili kurum/rol/sınıf/arama metni) sıfırlayıp
// her seferinde kurum seçim ekranına düşürüyordu. router.back() ile gerçek
// tarayıcı geçmişine dönülüyor; Next.js App Router bu durumda önceki
// sayfanın client bileşen state'ini (router cache'te tutulduğu sürece)
// koruyor, yani kullanıcı kaldığı filtreli listeye geri dönüyor.
export function GeriDonButonu() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="sfec-btn inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full px-3 text-xs font-bold"
      style={{ background: BG1, color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}
    >
      <ArrowLeft size={15} /> Kullanıcılara dön
    </button>
  );
}
