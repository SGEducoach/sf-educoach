import Image from "next/image";
import { LogOut } from "lucide-react";
import type { UserRole } from "@/lib/types";

const rolEtiket: Record<UserRole, string> = {
  ogrenci: "Öğrenci",
  veli: "Veli",
  ogretmen: "Öğretmen",
  mudur: "Müdür",
  admin: "Yönetici",
};

export function Header({ ad, role, okunmamisMesajSayisi = 0 }: { ad: string; role: UserRole; okunmamisMesajSayisi?: number }) {
  return (
    <div className="print:hidden relative overflow-hidden" style={{
      background: `radial-gradient(circle at 12% -30%, #262B4E 0%, var(--background, #0d1f1e) 55%)`,
    }}>
      <div style={{ position: "absolute", top: -100, right: -50, width: 260, height: 260, borderRadius: "50%", background: "rgba(124,232,176,0.08)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -120, right: 160, width: 200, height: 200, borderRadius: "50%", background: "rgba(143,198,255,0.08)", pointerEvents: "none" }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-5 relative">
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          {/* Logo ve Slogan Bölümü */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0" style={{ boxShadow: "0 4px 16px rgba(124,232,176,0.28)" }}>
              <Image src="/logo.png" alt="SG EduCoach" width={40} height={40} className="w-full h-full object-cover" priority />
            </div>
            <div>
              <div style={{ color: "var(--text, #ffffff)", fontFamily: "var(--font-baloo)" }} className="font-bold text-[15px] sm:text-[16px] leading-none tracking-tight">SG EduCoach</div>
              <div style={{ color: "var(--seafoam, #8fe6b0)" }} className="text-[11px] sm:text-[12px] italic mt-1.5">Her zaman bir adım ötesini düşün</div>
            </div>
          </div>

          {/* Kullanıcı Bilgisi ve İşlemler (Mobilde kaybolmaması için esnek ve düzenli) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid var(--border, rgba(255,255,255,0.1))` }}>
              <span style={{ color: "var(--text, #ffffff)" }} className="text-[11px] sm:text-[12px] font-bold truncate max-w-[120px] sm:max-w-none">{ad}</span>
              <span style={{ color: "var(--text-muted, #94a3b8)" }} className="text-[10px] sm:text-[11px]">· {rolEtiket[role]}</span>
            </div>
            {(role === "ogrenci" || role === "veli") && <MesajlarimIkonu baslangicSayisi={okunmamisMesajSayisi} />}
            <form action={signOut}>
              <button type="submit" title="Çıkış yap"
                className="sgec-btn w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid var(--border, rgba(255,255,255,0.1))` }}>
                <LogOut size={14} color="var(--text-muted, #94a3b8)" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}