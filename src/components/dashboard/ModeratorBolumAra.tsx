"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { BG1, BG1_ALT, BORDER, TEXT, TEXT_MUTED } from "@/lib/theme";

type Bolum = { href: string; etiket: string };

// Moderatör menüsünde gerçekten gösterilen bağlantıları arar; kurum türüne
// göre gizlenen deneme bölümlerini arama sonuçlarına eklemez.
export function ModeratorBolumAra() {
  const pathname = usePathname();
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [arama, setArama] = useState("");
  const [bolumler, setBolumler] = useState<Bolum[]>([]);

  if (!pathname.startsWith("/moderator")) return null;

  function ac() {
    const nav = document.querySelector('nav[aria-label="Moderatör bölümleri"]');
    setBolumler(Array.from(nav?.querySelectorAll("a[href]") ?? []).map((baglanti) => ({
      href: (baglanti as HTMLAnchorElement).getAttribute("href") ?? "",
      etiket: baglanti.textContent?.trim() ?? "",
    })).filter((bolum) => bolum.href && bolum.etiket));
    setArama("");
    setAcik(true);
  }

  const anahtar = arama.trim().toLocaleLowerCase("tr-TR");
  const sonuclar = bolumler.filter((bolum) => bolum.etiket.toLocaleLowerCase("tr-TR").includes(anahtar));

  return (
    <div className="relative hidden lg:block">
      <button type="button" onClick={ac} className="sfec-btn flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
        style={{ color: TEXT, background: BG1_ALT, border: `1px solid ${BORDER}` }}>
        <Search size={14} aria-hidden="true" /> Bölüm ara
      </button>
      {acik && (
        <div className="absolute right-0 top-10 z-[200] w-72 rounded-2xl p-2 shadow-xl" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
          <label htmlFor="moderator-bolum-ara" className="sr-only">Bölüm ara</label>
          <input id="moderator-bolum-ara" autoFocus type="search" value={arama} onChange={(olay) => setArama(olay.target.value)}
            onKeyDown={(olay) => { if (olay.key === "Escape") setAcik(false); }}
            placeholder="Bölüm ara" className="mb-2 h-10 w-full rounded-xl px-3 text-sm outline-none"
            style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER}` }} />
          <div className="max-h-72 overflow-y-auto">
            {sonuclar.map((bolum) => (
              <button key={bolum.href} type="button" onClick={() => { setAcik(false); router.push(bolum.href); }}
                className="sfec-btn block min-h-10 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold" style={{ color: TEXT }}>
                {bolum.etiket}
              </button>
            ))}
            {sonuclar.length === 0 && <p className="px-3 py-2 text-sm" style={{ color: TEXT_MUTED }}>Eşleşen bölüm yok.</p>}
          </div>
          <button type="button" onClick={() => setAcik(false)} className="sfec-btn mt-1 w-full rounded-xl px-3 py-2 text-xs" style={{ color: TEXT_MUTED }}>Kapat</button>
        </div>
      )}
    </div>
  );
}
