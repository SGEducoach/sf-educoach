import Link from "next/link";
import { BedDouble, Megaphone, MessageSquareShare, School } from "lucide-react";
import { BG1, BORDER, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { duyuruAdresi, type DuyuruAlani, type DuyuruSecenekleri, type DuyuruTuru } from "@/lib/duyuru-alanlari";

// Duyurular bölümünün sekmeleri (kullanıcı isteği 19.10.2026): üstte Site
// İçi / WhatsApp, altında Genel Duyurular / Yurt Duyuruları. Yalnız birden
// çok seçenek olan satır çizilir; kimin neyi göreceği duyuruSecenekleri'nde.
export function DuyuruTuruSekmeleri({ tur, alan, secenekler }: { tur: DuyuruTuru; alan: DuyuruAlani; secenekler: DuyuruSecenekleri }) {
  const turler = ([
    { deger: "site", etiket: "Site İçi Duyurular", Ikon: Megaphone },
    { deger: "whatsapp", etiket: "WhatsApp Duyuruları", Ikon: MessageSquareShare },
  ] as const).filter((t) => secenekler[t.deger].length > 0);
  const alanlar = ([
    { deger: "genel", etiket: "Genel Duyurular", Ikon: School },
    { deger: "yurt", etiket: "Yurt Duyuruları", Ikon: BedDouble },
  ] as const).filter((a) => secenekler[tur].includes(a.deger));
  if (turler.length < 2 && alanlar.length < 2) return null;
  return (
    <div className="mb-4 flex flex-col items-start gap-2">
      {turler.length > 1 && (
        <nav aria-label="Duyuru türü" className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl p-1" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          {turler.map(({ deger, etiket, Ikon }) => {
            const aktif = deger === tur;
            // Tür değişince o türün ilk bölümü açılır; aynı bölüm varsa korunur.
            const hedefAlan = secenekler[deger].includes(alan) ? alan : secenekler[deger][0];
            return (
              <Link key={deger} href={duyuruAdresi(deger, hedefAlan)} aria-current={aktif ? "page" : undefined}
                className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold"
                style={aktif ? { background: MINT, color: MINT_ON } : { color: TEXT_MUTED }}>
                <Ikon size={14} aria-hidden="true" /> {etiket}
              </Link>
            );
          })}
        </nav>
      )}
      {alanlar.length > 1 && (
        <nav aria-label="Duyuru bölümü" className="inline-flex max-w-full flex-wrap gap-1.5">
          {alanlar.map(({ deger, etiket, Ikon }) => {
            const aktif = deger === alan;
            return (
              <Link key={deger} href={duyuruAdresi(tur, deger)} aria-current={aktif ? "page" : undefined}
                className="sfec-btn inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold"
                style={aktif ? { background: MINT_BG, color: TEXT, outline: `2px solid ${MINT}`, outlineOffset: -2 } : { background: BG1, color: TEXT_MUTED, border: `1px solid ${BORDER}` }}>
                <Ikon size={13} aria-hidden="true" /> {etiket}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
