import Image from "next/image";
import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { BG0, BG1_ALT, BORDER, SEAFOAM, TEXT, TEXT_MUTED } from "@/lib/theme";
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
      background: `radial-gradient(circle at 12% -30%, ${BG1_ALT} 0%, ${BG0} 55%)`,
      borderBottom: `2px solid ${BORDER}`,
    }}>
      <div className="pointer-events-none" style={{ position: "absolute", top: -100, right: -50, width: 260, height: 260, borderRadius: "50%", background: "rgba(124,232,176,0.08)" }} />
      <div className="pointer-events-none" style={{ position: "absolute", bottom: -120, right: 160, width: 200, height: 200, borderRadius: "50%", background: "rgba(143,198,255,0.08)" }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-4 sm:pt-5 sm:pb-5 relative">
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" title="Ana sayfaya dön" className="rounded-full shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(124,232,176,0.28)" }}>
                <Image src="/logo.png" alt="SeFu Koç" width={40} height={40} className="w-full h-full object-cover" priority />
              </div>
            </Link>
            {/* Logo yanındaki isim + slogan artık telefonda da görünüyor —
                sağdaki ikon kalabalığı mobilde tek bir hamburger menüye
                toplandığı için yer sorunu kalmadı. */}
            <div>
              <SeFuMarkaAdi className="font-bold text-[15px] sm:text-[16px] leading-none tracking-tight block" />
              <div className="text-[11px] sm:text-[12px] italic mt-1.5 truncate max-w-[150px] sm:max-w-none"><SeFuSlogan /></div>
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
            {moderatorMu && <Link href="/moderator" title="Moderatör paneli" className="sfec-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(13,148,136,0.12)", border: `2px solid ${BORDER}` }}><ShieldCheck size={16} color={SEAFOAM}/></Link>}
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
