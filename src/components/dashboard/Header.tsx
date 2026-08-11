import Image from "next/image";
import { LogOut } from "lucide-react";
import { BG0, BORDER, SEAFOAM, TEXT, TEXT_MUTED } from "@/lib/theme";
import { signOut } from "@/app/dashboard/actions";
import { MesajlarimIkonu } from "@/components/dashboard/MesajlarimIkonu";
import type { UserRole } from "@/lib/types";
import { MobilAltNavigasyon } from "@/components/dashboard/MobilAltNavigasyon";

const rolEtiket: Record<UserRole, string> = {
  ogrenci: "Öğrenci",
  veli: "Veli",
  ogretmen: "Öğretmen",
  mudur: "Müdür",
  admin: "Yönetici",
};

export function Header({ ad, role, okunmamisMesajSayisi = 0 }: { ad: string; role: UserRole; okunmamisMesajSayisi?: number }) {
  return (
    <header className="sticky top-0 z-[100] isolate overflow-clip print:hidden" style={{
      background: `radial-gradient(circle at 12% -30%, #DDF7F3 0%, ${BG0} 55%)`,
      borderBottom: `2px solid ${BORDER}`,
          }}>
      <div className="pointer-events-none" style={{ position: "absolute", top: -100, right: -50, width: 260, height: 260, borderRadius: "50%", background: "rgba(124,232,176,0.08)" }} />
      <div className="pointer-events-none" style={{ position: "absolute", bottom: -120, right: 160, width: 200, height: 200, borderRadius: "50%", background: "rgba(143,198,255,0.08)" }} />

      <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 sm:py-4 relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0" style={{ boxShadow: "0 4px 16px rgba(124,232,176,0.28)" }}>
              <Image src="/logo.png" alt="SG EduCoach" width={40} height={40} className="w-full h-full object-cover" priority />
            </div>
            <div>
              <div style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="font-bold text-[16px] leading-none tracking-tight">SG EduCoach</div>
              <div style={{ color: SEAFOAM }} className="hidden sm:block text-[12px] italic mt-1.5">Her zaman bir adım ötesini düşün</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
              <span style={{ color: TEXT }} className="text-[12px] font-bold">{ad}</span>
              <span style={{ color: TEXT_MUTED }} className="text-[11px]">· {rolEtiket[role]}</span>
            </div>
            {(role === "ogrenci" || role === "veli") && <MesajlarimIkonu baslangicSayisi={okunmamisMesajSayisi} />}
            <form action={signOut}>
              <button type="submit" title="Çıkış yap"
                className="sgec-btn w-11 h-11 sm:w-8 sm:h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
                <LogOut size={14} color={TEXT_MUTED} />
              </button>
            </form>
          </div>
        </div>
      </div>
      <MobilAltNavigasyon role={role} />
    </header>
  );
}
