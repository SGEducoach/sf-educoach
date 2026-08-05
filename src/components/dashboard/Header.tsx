import { GraduationCap, LogOut } from "lucide-react";
import { BG0, BORDER, MINT, MINT_ON, SEAFOAM, TEXT, TEXT_MUTED } from "@/lib/theme";
import { signOut } from "@/app/dashboard/actions";
import type { UserRole } from "@/lib/types";

const rolEtiket: Record<UserRole, string> = {
  ogrenci: "Öğrenci",
  veli: "Veli",
  ogretmen: "Öğretmen",
  mudur: "Müdür",
};

export function Header({ ad, role }: { ad: string; role: UserRole }) {
  return (
    <div style={{
      background: `radial-gradient(circle at 12% -30%, #262B4E 0%, ${BG0} 55%)`,
      position: "relative", overflow: "hidden", borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{ position: "absolute", top: -100, right: -50, width: 260, height: 260, borderRadius: "50%", background: "rgba(124,232,176,0.08)" }} />
      <div style={{ position: "absolute", bottom: -120, right: 160, width: 200, height: 200, borderRadius: "50%", background: "rgba(143,198,255,0.08)" }} />

      <div className="max-w-6xl mx-auto px-6 pt-7 pb-6 relative">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div style={{ background: MINT, boxShadow: "0 4px 16px rgba(124,232,176,0.28)" }} className="w-10 h-10 rounded-2xl flex items-center justify-center">
              <GraduationCap size={19} color={MINT_ON} />
            </div>
            <div>
              <div style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="font-bold text-[16px] leading-none tracking-tight">SG EduCoach</div>
              <div style={{ color: SEAFOAM }} className="text-[12px] italic mt-1.5">Çocuklarımızın geleceği için birlikteyiz</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}` }}>
              <span style={{ color: TEXT }} className="text-[12px] font-bold">{ad}</span>
              <span style={{ color: TEXT_MUTED }} className="text-[11px]">· {rolEtiket[role]}</span>
            </div>
            <form action={signOut}>
              <button type="submit" title="Çıkış yap"
                className="sgec-btn w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}` }}>
                <LogOut size={14} color={TEXT_MUTED} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
