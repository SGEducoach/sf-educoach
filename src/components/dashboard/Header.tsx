import Image from "next/image";
import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/dashboard/actions";
import { MesajlarimIkonu } from "@/components/dashboard/MesajlarimIkonu";
import type { UserRole } from "@/lib/types";
import { MobilAltNavigasyon } from "@/components/dashboard/MobilAltNavigasyon";
import { OturumZamanAsimi } from "@/components/OturumZamanAsimi";
import { TemaButonu } from "@/components/TemaDenetimi";

const rolEtiket: Record<UserRole, string> = {
  ogrenci: "Öğrenci",
  veli: "Veli",
  ogretmen: "Öğretmen",
  mudur: "Müdür",
  admin: "Yönetici",
};

// Not: Header her zaman koyu lacivert (#262B4E → #0d1f1e) zeminde — bilinçli
// bir marka tasarımı, sitenin genel açık/koyu tema anahtarından bağımsız
// (o yüzden yazı renkleri de sabit beyaz/açık tonlarda, var(--sgec-text) gibi
// tema değişkenlerine bağlı değil).
export function Header({ ad, role, okunmamisMesajSayisi = 0, mobilNavigasyon = true, moderatorMu = false, rolEtiketi }: { ad: string; role: UserRole; okunmamisMesajSayisi?: number; mobilNavigasyon?: boolean; moderatorMu?: boolean; rolEtiketi?: string }) {
  return (
    <>
    <OturumZamanAsimi aktif={role === "admin" || moderatorMu} />
    <header className="sticky top-0 z-[100] isolate overflow-clip print:hidden" style={{
      background: `radial-gradient(circle at 12% -30%, #262B4E 0%, #0d1f1e 55%)`,
    }}>
      <div className="pointer-events-none" style={{ position: "absolute", top: -100, right: -50, width: 260, height: 260, borderRadius: "50%", background: "rgba(124,232,176,0.08)" }} />
      <div className="pointer-events-none" style={{ position: "absolute", bottom: -120, right: 160, width: 200, height: 200, borderRadius: "50%", background: "rgba(143,198,255,0.08)" }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-4 sm:pt-5 sm:pb-5 relative">
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <Link href="/dashboard" title="Ana sayfaya dön" className="sgec-btn flex items-center gap-3 rounded-xl">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0" style={{ boxShadow: "0 4px 16px rgba(124,232,176,0.28)" }}>
              <Image src="/logo.png" alt="SG EduCoach" width={40} height={40} className="w-full h-full object-cover" priority />
            </div>
            <div>
              <div style={{ color: "#ffffff", fontFamily: "var(--font-baloo)" }} className="font-bold text-[15px] sm:text-[16px] leading-none tracking-tight">SG EduCoach</div>
              <div style={{ color: "#8fe6b0" }} className="hidden sm:block text-[12px] italic mt-1.5">Her zaman bir adım ötesini düşün</div>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" }}>
              <span style={{ color: "#ffffff" }} className="text-[11px] sm:text-[12px] font-bold truncate max-w-[120px] sm:max-w-none">{ad}</span>
              <span style={{ color: "#b7c4d6" }} className="text-[10px] sm:text-[11px]">· {rolEtiketi ?? rolEtiket[role]}</span>
            </div>
            {moderatorMu && <Link href="/moderator" title="Moderatör paneli" className="sgec-btn flex h-11 w-11 items-center justify-center rounded-full sm:h-8 sm:w-8" style={{ background: "rgba(13,148,136,0.16)", border: "1px solid rgba(255,255,255,0.14)" }}><ShieldCheck size={16} color="#8fe6b0"/></Link>}
            <TemaButonu />
            {(role === "ogrenci" || role === "veli") && <MesajlarimIkonu baslangicSayisi={okunmamisMesajSayisi} />}
            <form action={signOut}>
              <button type="submit" title="Çıkış yap"
                className="sgec-btn w-11 h-11 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" }}>
                <LogOut size={14} color="#b7c4d6" />
              </button>
            </form>
          </div>
        </div>
      </div>
      {mobilNavigasyon && <MobilAltNavigasyon role={role} />}
    </header>
    </>
  );
}
