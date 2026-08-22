import Image from "next/image";
import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { BORDER, BORDER_STRONG, MINT, MINT_BG, NAV_BG, TEXT, TEXT_MUTED } from "@/lib/theme";
import { signOut } from "@/app/dashboard/actions";
import { MesajlarimIkonu } from "@/components/dashboard/MesajlarimIkonu";
import { BildirimAyarlari } from "@/components/dashboard/BildirimAyarlari";
import type { UserRole } from "@/lib/types";
import { MobilAltNavigasyon } from "@/components/dashboard/MobilAltNavigasyon";
import { MobilMenu } from "@/components/dashboard/MobilMenu";
import { OturumZamanAsimi } from "@/components/OturumZamanAsimi";
import { TemaButonu } from "@/components/TemaDenetimi";
import { SeFuMarkaAdi, SeFuSlogan } from "@/components/SeFuWordmark";

const rolEtiket: Record<UserRole, string> = {
  ogrenci: "Öğrenci",
  veli: "Veli",
  ogretmen: "Öğretmen",
  mudur: "Müdür",
  admin: "Yönetici",
};

export function Header({ ad, role, okunmamisMesajSayisi = 0, mobilNavigasyon = true, moderatorMu = false, rolEtiketi }: { ad: string; role: UserRole; okunmamisMesajSayisi?: number; mobilNavigasyon?: boolean; moderatorMu?: boolean; rolEtiketi?: string }) {
  return (
    <>
    <OturumZamanAsimi aktif={role === "admin" || moderatorMu} />
    <header className="sticky top-0 z-[100] isolate overflow-clip print:hidden" style={{
      background: NAV_BG,
      borderBottom: `2px solid ${BORDER_STRONG}`,
    }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-4 sm:pt-5 sm:pb-5 relative">
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/dashboard" title="Ana sayfaya dön" className="shrink-0">
              <Image src="/logo.png" alt="SeFu Koç" width={800} height={395} className="sfec-brand-logo h-10 sm:h-12 w-auto object-contain" priority />
            </Link>
            <div className="min-w-0">
              <SeFuMarkaAdi className="block text-base sm:text-lg font-extrabold leading-none truncate" />
              <div className="text-[10px] sm:text-[12px] italic mt-1 truncate max-w-[150px] sm:max-w-none"><SeFuSlogan /></div>
            </div>
          </div>

          {/* Masaüstü (sm+): ikonlar doğrudan yan yana. Telefon: tek hamburger
              menü (MobilMenu, kendi içinde sm:hidden) — birçok sitede olduğu
              gibi basılınca header'ın altına doğru açılıyor. */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
              <span style={{ color: TEXT }} className="text-[12px] font-bold truncate max-w-[160px]">{ad}</span>
              <span style={{ color: TEXT_MUTED }} className="text-[11px] shrink-0">· {rolEtiketi ?? rolEtiket[role]}</span>
            </div>
            {moderatorMu && <Link href="/moderator" title="Moderatör paneli" className="sfec-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: MINT_BG, border: `2px solid ${BORDER}` }}><ShieldCheck size={16} color={MINT}/></Link>}
            <TemaButonu />
            <BildirimAyarlari />
            {(role === "ogrenci" || role === "veli") && <MesajlarimIkonu baslangicSayisi={okunmamisMesajSayisi} />}
            <form action={signOut}>
              <button type="submit" title="Çıkış yap"
                className="sfec-btn w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
                <LogOut size={14} color={TEXT_MUTED} />
              </button>
            </form>
          </div>

          <MobilMenu ad={ad} role={role} okunmamisMesajSayisi={okunmamisMesajSayisi} moderatorMu={moderatorMu} rolEtiketi={rolEtiketi} />
        </div>
      </div>
      {mobilNavigasyon && <MobilAltNavigasyon role={role} />}
    </header>
    </>
  );
}
