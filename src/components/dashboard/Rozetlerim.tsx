import { Trophy, BookOpen, PenLine, ClipboardList } from "lucide-react";
import type { RozetSeviye } from "@/lib/types";
import { ROZET_SEVIYE_ETIKET } from "@/lib/types";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";

// Rozet sistemi v2: 3 bağımsız kategori (konu/soru/deneme) + bunlardan
// türetilen "genel" (SG EDUCOACH) rozeti. Hepsi CANLI durum — kalıcı değil,
// öğrenci pas geçtiğinde seviye düşebilir. Kazanım/düşüş mantığı tamamen
// DB'de (ogrenci_rozet_durumu RPC, her dashboard yüklemesinde tazeleniyor);
// burada sadece görüntüleniyor.

const SEVIYE_EMOJI: Record<RozetSeviye, string> = { yok: "—", bronz: "🥉", gumus: "🥈", altin: "🥇" };

const KATEGORI_META = {
  konu: { ad: "Konu Çalışma", Icon: BookOpen, renk: MINT },
  soru: { ad: "Soru Çözümü", Icon: PenLine, renk: "#8FC6FF" },
  deneme: { ad: "Deneme", Icon: ClipboardList, renk: "#FFB199" },
} as const;

export interface RozetDurum {
  konu: RozetSeviye;
  soru: RozetSeviye;
  deneme: RozetSeviye;
  genel: RozetSeviye;
}

export function Rozetlerim({ durum }: { durum: RozetDurum }) {
  return (
    <div className="sgec-fade rounded-3xl p-5 print:hidden" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,196,107,0.15)" }}>
          <Trophy size={13} color="#FFC46B" />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Rozetlerim</span>
      </div>

      {/* SG EDUCOACH — en belirgin, en dikkat çekici olan */}
      <div className="rounded-2xl p-4 mb-3 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, rgba(255,196,107,0.18), rgba(255,196,107,0.05))", border: `1px solid rgba(255,196,107,0.35)` }}>
        <span className="text-3xl">{durum.genel === "yok" ? "🏆" : SEVIYE_EMOJI[durum.genel]}</span>
        <div className="flex flex-col">
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-sm font-bold">SG EDUCOACH {ROZET_SEVIYE_ETIKET[durum.genel]}</span>
          <span style={{ color: TEXT_MUTED }} className="text-[11px]">3 kategorinin üçünde de altına ulaşınca kazanılır</span>
        </div>
      </div>

      {/* Kategori rozetleri — birbirine eşit değerde, ayrı görsellikte */}
      <div className="grid grid-cols-3 gap-2.5">
        {(Object.keys(KATEGORI_META) as (keyof typeof KATEGORI_META)[]).map((k) => {
          const meta = KATEGORI_META[k];
          const seviye = durum[k];
          const Icon = meta.Icon;
          return (
            <div key={k} className="rounded-2xl p-3 flex flex-col items-center gap-1 text-center"
              style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}`, opacity: seviye === "yok" ? 0.55 : 1 }}>
              <Icon size={14} color={meta.renk} />
              <span className="text-lg">{SEVIYE_EMOJI[seviye]}</span>
              <span style={{ color: TEXT }} className="text-[10px] font-bold leading-tight">{meta.ad}</span>
              <span style={{ color: seviye === "yok" ? TEXT_MUTED : MINT }} className="text-[9px] font-semibold">{ROZET_SEVIYE_ETIKET[seviye]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
