import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { moderatorluOkullarGetir } from "@/app/yonetici/moderatorler-actions";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED } from "@/lib/theme";

// Admin panelinde "Moderatörler" bölümü — okul isimleriyle sıralanır,
// bir okula tıklayınca o okulun moderatör paneline (/moderator?okul=...)
// gidilir (bkz. moderator/page.tsx).
export async function ModeratorlerListesi() {
  const { okullar } = await moderatorluOkullarGetir();

  return (
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold mb-1">Moderatörler</h2>
      <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">Bir okula tıklayınca o okulun moderatör paneli açılır.</p>
      {okullar.length === 0
        ? <p style={{ color: TEXT_MUTED }} className="text-sm">Henüz moderatörü olan bir okul yok.</p>
        : (
          <div className="flex flex-col gap-2">
            {okullar.map((o) => (
              <Link key={o.schoolId} href={`/moderator?okul=${o.schoolId}`}
                className="sfec-btn flex items-center justify-between gap-2 rounded-2xl p-3.5"
                style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck size={16} color={TEXT_MUTED} className="shrink-0" />
                  <div className="min-w-0">
                    <div style={{ color: TEXT }} className="text-sm font-bold truncate">{o.okulAdi}</div>
                    <div style={{ color: TEXT_MUTED }} className="text-xs truncate">{o.moderatorler.map((m) => m.ad).join(", ")}</div>
                  </div>
                </div>
                <ChevronRight size={16} color={TEXT_MUTED} className="shrink-0" />
              </Link>
            ))}
          </div>
        )}
    </div>
  );
}
