import Link from "next/link";
import { BG1, BORDER, MINT, MINT_ON, TEXT_MUTED } from "@/lib/theme";

// Admin sayfalarının üst sekmeleri (İletişim, Kurumları Yönet — 20.10.2026).
// Sekme adresi sunucuda kurulur; yalnız açık sekmenin verisi yüklenir.
export interface YoneticiSekmesi { deger: string; etiket: string; href: string; sayi?: number }

export function YoneticiSekmeleri({ sekmeler, secili, etiket }: { sekmeler: YoneticiSekmesi[]; secili: string; etiket: string }) {
  return (
    <nav aria-label={etiket} className="inline-flex max-w-full flex-wrap gap-1 self-start rounded-2xl p-1" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      {sekmeler.map((s) => {
        const aktif = s.deger === secili;
        return (
          <Link key={s.deger} href={s.href} aria-current={aktif ? "page" : undefined}
            className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold"
            style={aktif ? { background: MINT, color: MINT_ON } : { color: TEXT_MUTED }}>
            {s.etiket}
            {!!s.sayi && (
              <span className="rounded-full px-1.5 text-[10px] font-black" style={aktif ? { background: MINT_ON, color: MINT } : { background: MINT, color: MINT_ON }}>{s.sayi}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
