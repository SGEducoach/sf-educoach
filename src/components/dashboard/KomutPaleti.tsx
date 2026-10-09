"use client";

// KOMUT PALETİ (görsel yenileme 2/4, kullanıcı kararı 09.10.2026).
//
// NEDEN: gezinme tek yoldan yapılıyordu — listeyi gözle tara, tıkla.
// Masaüstünde 8-12 kalem, admin'de gruplu daha uzun bir liste, mobilde ise
// 288 piksellik açılır panelde kaydırma. Yazarak gitmek üçünü de kısaltıyor.
//
// KAPSAM BİLİNÇLİ OLARAK DAR: yalnızca MENÜ BÖLÜMLERİ aranıyor, öğrenci
// değil. Öğrenci araması sunucuya gitmeyi, yetki süzmeyi ve her tuşta istek
// atmayı gerektirir; bu ayrı bir iştir. Palet burada menünün kendisinden
// besleniyor, yani yeni bir bölüm eklendiğinde ayrıca bakım istemiyor.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { KurumTuru, UserRole } from "@/lib/types";
import type { DashboardBolumu } from "@/lib/dashboard-navigation";
import { dashboardMenusu } from "@/lib/dashboard-navigation";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

export interface PaletKalemi {
  bolum: DashboardBolumu;
  etiket: string;
  href: string;
}

/** Türkçe arama: büyük/küçük ve aksan farkı eşleşmeyi bozmasın. */
function anahtar(metin: string): string {
  return metin
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i").replaceAll("ş", "s").replaceAll("ğ", "g")
    .replaceAll("ü", "u").replaceAll("ö", "o").replaceAll("ç", "c");
}

// Sıralama ÜÇ kademeli. Yalnızca "dizginin başı" bakılırsa "on" yazan
// kullanıcıya "Bekleyen onaylar" yerine "Konu Haritası" çıkıyor (K-on-u);
// aradığı kelime etiketin ikinci kelimesi olduğunda liste yanıltıyor ve
// Enter yanlış bölüme götürüyor. Bu yüzden KELİME BAŞLANGICI ikinci
// kademe olarak araya giriyor.
function kademe(etiket: string, a: string): number {
  const e = anahtar(etiket);
  if (e.startsWith(a)) return 0;
  if (e.split(/\s+/).some((kelime) => kelime.startsWith(a))) return 1;
  if (e.includes(a)) return 2;
  return 3;
}

export function paletKalemleriniSuz(kalemler: PaletKalemi[], sorgu: string): PaletKalemi[] {
  const a = anahtar(sorgu.trim());
  if (!a) return kalemler;
  return kalemler
    .map((k, sira) => ({ k, d: kademe(k.etiket, a), sira }))
    .filter((x) => x.d < 3)
    // Aynı kademedekiler menüdeki sırasını korur — liste her yazışta
    // yeniden karışmasın.
    .sort((x, y) => x.d - y.d || x.sira - y.sira)
    .map((x) => x.k);
}

export function KomutPaleti({ role, kurumTuru, brans, grupMu = false, kademe, okulRehberi = false, tetikleyiciStili = "tus" }: {
  role: UserRole;
  kurumTuru?: KurumTuru;
  brans?: string;
  grupMu?: boolean;
  kademe?: "ortaokul" | "lise" | "ikisi" | null;
  okulRehberi?: boolean;
  /** "tus": masaüstü arama kutusu · "ikon": mobil başlıktaki ikon düğmesi. */
  tetikleyiciStili?: "tus" | "ikon";
}) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [sorgu, setSorgu] = useState("");
  const [secili, setSecili] = useState(0);

  const kalemler = useMemo<PaletKalemi[]>(
    () => dashboardMenusu(role, kurumTuru, brans, grupMu, kademe, okulRehberi)
      .map((o) => ({ bolum: o.bolum, etiket: o.etiket, href: o.href })),
    [role, kurumTuru, brans, grupMu, kademe, okulRehberi],
  );
  const sonuclar = useMemo(() => paletKalemleriniSuz(kalemler, sorgu), [kalemler, sorgu]);

  // Ctrl/Cmd+K her yerden açar. Girdi alanındayken de çalışır (kasıtlı):
  // kullanıcı bir formu doldururken de bölüm değiştirmek isteyebilir.
  useEffect(() => {
    function tus(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAcik((v) => { if (!v) { setSorgu(""); setSecili(0); } return !v; });
      }
    }
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, []);

  // Sıfırlama AÇILIŞ ANINDA yapılıyor, efektte değil: efekt içinde senkron
  // setState "cascading renders" uyarısı veriyor (react-hooks/set-state-in-effect).
  // Odak için de efekt gerekmiyor — girdi yalnızca palet açıkken monte
  // ediliyor, autoFocus yeterli.
  function ac() {
    setSorgu("");
    setSecili(0);
    setAcik(true);
  }

  function git(kalem: PaletKalemi | undefined) {
    if (!kalem) return;
    setAcik(false);
    router.push(kalem.href);
  }

  return (
    <>
      {tetikleyiciStili === "tus" ? (
        <button type="button" onClick={ac}
          className="sfec-btn flex min-h-11 w-full items-center gap-2.5 rounded-2xl px-3.5 text-left text-[13px] font-semibold"
          style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}`, color: TEXT_MUTED }}>
          <Search size={15} aria-hidden="true" />
          <span className="flex-1">Bölüm ara</span>
          <kbd className="rounded-md px-1.5 py-0.5 text-[10px] font-extrabold"
            style={{ background: BG1, border: `1px solid ${BORDER}`, color: TEXT_MUTED }}>Ctrl K</kbd>
        </button>
      ) : (
        <button type="button" onClick={ac} aria-label="Bölüm ara"
          className="sfec-btn flex h-11 w-11 items-center justify-center rounded-2xl"
          style={{ background: BG1_ALT, border: `1px solid ${BORDER}`, color: TEXT_MUTED }}>
          <Search size={17} aria-hidden="true" />
        </button>
      )}

      {acik && (
        <div className="fixed inset-0 flex items-start justify-center px-4 pt-[12vh]" style={{ zIndex: "var(--z-modal)" }}>
          <button type="button" aria-label="Paleti kapat" onClick={() => setAcik(false)}
            className="fixed inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div role="dialog" aria-label="Bölüm ara" aria-modal="true"
            className="sfec-fade relative w-full max-w-md overflow-hidden rounded-3xl"
            style={{ background: BG1, border: `1px solid ${BORDER_STRONG}` }}>
            <div className="flex items-center gap-2.5 px-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <Search size={16} color={TEXT_MUTED} aria-hidden="true" />
              <label htmlFor="komut-paleti-girdi" className="sr-only">Bölüm ara</label>
              <input id="komut-paleti-girdi" autoFocus type="text" value={sorgu} autoComplete="off"
                onChange={(e) => { setSorgu(e.target.value); setSecili(0); }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setAcik(false); return; }
                  if (e.key === "ArrowDown") { e.preventDefault(); setSecili((i) => Math.min(i + 1, sonuclar.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setSecili((i) => Math.max(i - 1, 0)); }
                  else if (e.key === "Enter") { e.preventDefault(); git(sonuclar[secili]); }
                }}
                placeholder="Bölüm adı yazın"
                className="min-h-12 flex-1 bg-transparent text-[15px] font-semibold outline-none"
                style={{ color: TEXT }} />
            </div>

            <div className="max-h-[46vh] overflow-y-auto p-2">
              {sonuclar.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px]" style={{ color: TEXT_MUTED }}>Eşleşen bölüm yok.</p>
              ) : sonuclar.map((k, i) => (
                <button key={k.href} type="button" onClick={() => git(k)} onMouseEnter={() => setSecili(i)}
                  className="sfec-btn flex min-h-11 w-full items-center rounded-xl px-3 text-left text-[14px] font-bold"
                  style={{
                    background: i === secili ? MINT_BG : "transparent",
                    color: i === secili ? TEXT : TEXT_MUTED,
                    border: `1px solid ${i === secili ? MINT : "transparent"}`,
                  }}>
                  {k.etiket}
                </button>
              ))}
            </div>

            <div className="flex gap-4 px-4 py-2.5 text-[11px] font-semibold"
              style={{ borderTop: `1px solid ${BORDER}`, color: TEXT_MUTED }}>
              <span>↑↓ gez</span><span>↵ aç</span><span>esc kapat</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
