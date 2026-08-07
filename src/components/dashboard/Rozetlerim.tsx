import { Award } from "lucide-react";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";

const BADGE_SIRASI = ["bronz", "gumus", "altin"] as const;
type BadgeId = (typeof BADGE_SIRASI)[number];
const BADGE_META: Record<BadgeId, { emoji: string; ad: string; esik: number }> = {
  bronz: { emoji: "🥉", ad: "Bronz", esik: 15 },
  gumus: { emoji: "🥈", ad: "Gümüş", esik: 20 },
  altin: { emoji: "🥇", ad: "Altın", esik: 30 },
};

// Son 30 gün içindeki aktif gün sayısına göre kazanılan rozetler — kazanım
// mantığı DB'de (rozet_kontrol_et RPC, her veri girişinden sonra tetiklenir),
// burada sadece görüntüleniyor.
export function Rozetlerim({ kazanilanlar, aktifGun }: { kazanilanlar: string[]; aktifGun: number }) {
  const siradaki = BADGE_SIRASI.find((b) => !kazanilanlar.includes(b));

  return (
    <div className="sgec-fade rounded-3xl p-5 print:hidden" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,196,107,0.15)" }}>
          <Award size={13} color="#FFC46B" />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Rozetlerim</span>
        <span style={{ color: TEXT_MUTED }} className="text-[11px]">— son 30 gün</span>
      </div>

      <div className="flex gap-2.5 mb-3">
        {BADGE_SIRASI.map((b) => {
          const meta = BADGE_META[b];
          const kazanildi = kazanilanlar.includes(b);
          return (
            <div key={b} className="flex-1 rounded-2xl p-3 flex flex-col items-center gap-1 text-center"
              style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}`, opacity: kazanildi ? 1 : 0.35 }}>
              <span className="text-2xl">{meta.emoji}</span>
              <span style={{ color: TEXT }} className="text-[11px] font-bold">{meta.ad}</span>
              <span style={{ color: TEXT_MUTED }} className="text-[9px]">{meta.esik} gün</span>
            </div>
          );
        })}
      </div>

      {siradaki && (
        <div className="rounded-xl p-2.5" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
          <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
            <span style={{ color: TEXT_MUTED }}>Sıradaki: {BADGE_META[siradaki].emoji} {BADGE_META[siradaki].ad}</span>
            <span style={{ color: MINT }}>{aktifGun}/{BADGE_META[siradaki].esik} gün</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full" style={{ background: MINT, width: `${Math.min(100, (aktifGun / BADGE_META[siradaki].esik) * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
