import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import type { BugunKarti } from "@/lib/ortaokul-bugun";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, BUTTER, BUTTER_BG, MINT, MINT_BG, MINT_ON, SKY, SKY_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

// Ortaokul "Bugün" ekranı (tasarım belgesi §6).
//
// İlkeler: aynı anda en fazla üç iş, her kartta TEK eylem, son tarih yerine
// yaşa uygun ifade ("Bugün", "Yarın"), akademik eksikte kırmızı YOK
// (§21.2 — kırmızı yalnız sistem hatası için).

const TUR_RENK: Record<BugunKarti["tur"], { arka: string; yazi: string }> = {
  "bugun-teslim": { arka: MINT_BG, yazi: MINT },
  "gecikmis": { arka: BUTTER_BG, yazi: BUTTER },
  "yarin": { arka: SKY_BG, yazi: SKY },
  "yaklasan": { arka: BG1_ALT, yazi: TEXT_MUTED },
};

export function OrtaokulBugun({ ad, sinif, mesaj, kartlar, bugunTamamlanan, bugunBekleyen }: {
  ad: string;
  sinif: string | null;
  mesaj: string;
  kartlar: BugunKarti[];
  bugunTamamlanan: number;
  bugunBekleyen: number;
}) {
  const toplam = bugunTamamlanan + bugunBekleyen;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
              Merhaba {ad.split(" ")[0]}
            </h1>
            <p className="mt-0.5 text-sm" style={{ color: TEXT_MUTED }}>
              {sinif ? `${sinif} · ` : ""}{mesaj}
            </p>
          </div>
          {toplam > 0 && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ background: MINT_BG, border: `2px solid ${BORDER}` }}>
              <CheckCircle2 size={14} color={MINT} />
              <span className="text-xs font-bold" style={{ color: TEXT }}>{bugunTamamlanan} / {toplam}</span>
            </div>
          )}
        </div>
      </div>

      {kartlar.length === 0 ? (
        <div className="rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p className="text-sm font-semibold" style={{ color: TEXT }}>Şu an bekleyen bir işin yok.</p>
          <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
            İstersen derslerine göz atabilir ya da kendine bir çalışma planlayabilirsin.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/dashboard/ortaokul-dersler"
              className="sfec-btn rounded-xl px-4 py-2 text-xs font-bold"
              style={{ background: MINT, color: MINT_ON }}>Derslerim</Link>
            <Link href="/dashboard/planlar"
              className="sfec-btn rounded-xl px-4 py-2 text-xs font-bold"
              style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>Planım</Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {kartlar.map((k) => {
            const renk = TUR_RENK[k.tur];
            return (
              <Link key={k.atamaId} href="/dashboard/gorevler"
                className="sfec-btn flex items-center gap-3 rounded-3xl p-4"
                style={{ background: BG1, border: `2px solid ${BORDER}` }}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: renk.arka, color: renk.yazi }}>{k.ders}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: renk.arka, color: renk.yazi }}>{k.zamanEtiketi}</span>
                  </div>
                  <div className="mt-1.5 truncate text-sm font-bold" style={{ color: TEXT }}>{k.baslik}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: TEXT_MUTED }}>
                    {k.sureEtiketi && <span className="flex items-center gap-1"><Clock size={11} /> {k.sureEtiketi}</span>}
                    {k.ogretmenAdi && <span>{k.ogretmenAdi}</span>}
                  </div>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold"
                  style={{ background: MINT, color: MINT_ON }}>
                  {k.eylem} <ArrowRight size={13} />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
