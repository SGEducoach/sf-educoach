"use client";

import { useState, useTransition } from "react";
import { Check, Clock, RotateCcw, User } from "lucide-react";
import type { GorevDurumu, GorevGrubu, OrtaokulGorevKarti } from "@/lib/ortaokul-gorevler";
import { ortaokulGoreviGeriAl, ortaokulGoreviTamamla } from "@/app/dashboard/ortaokul-gorev-actions";
import {
  BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, BUTTER, BUTTER_BG, MINT, MINT_BG, MINT_ON,
  PEACH, PEACH_BG, SKY, SKY_BG, TEXT, TEXT_MUTED,
} from "@/lib/theme";

// Ortaokul "Görevlerim" (tasarım belgesi §8).
//
// "Bugün" ekranı en fazla üç iş gösterir; burası tam liste. Gruplar zamana
// göre: bugün önce, gecikmişler ikinci — gizlenmiyor ama öğrenciyi borç
// listesiyle karşılamıyor.
//
// §21.2: akademik durumda KIRMIZI YOK. "Gecikti" sıcak nötr tonla
// (PEACH) gösteriliyor; kırmızı yalnız sistem hatası için (aşağıdaki hata
// satırı).

const DURUM_RENK: Record<GorevDurumu, { arka: string; yazi: string }> = {
  bugun: { arka: MINT_BG, yazi: MINT },
  gecikti: { arka: PEACH_BG, yazi: PEACH },
  yarin: { arka: SKY_BG, yazi: SKY },
  yaklasan: { arka: BUTTER_BG, yazi: BUTTER },
  tamamlandi: { arka: BG1_ALT, yazi: TEXT_MUTED },
};

export function OrtaokulGorevlerim({ gruplar }: { gruplar: GorevGrubu[] }) {
  const [hata, setHata] = useState<string | null>(null);

  if (gruplar.length === 0) {
    return (
      <div className="rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p className="text-sm font-semibold" style={{ color: TEXT }}>Şu an listende bir iş yok.</p>
        <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
          Öğretmenin görev verdiğinde burada görünecek.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {hata && (
        <div className="rounded-2xl px-4 py-2.5 text-xs font-semibold"
          style={{ background: BG1_ALT, color: BLUSH, border: `2px solid ${BORDER_STRONG}` }}>
          {hata}
        </div>
      )}
      {gruplar.map((grup) => (
        <section key={grup.anahtar} className="flex flex-col gap-2.5">
          <div>
            <h2 className="text-sm font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
              {grup.baslik}
              <span className="ml-1.5 text-xs font-semibold" style={{ color: TEXT_MUTED }}>({grup.gorevler.length})</span>
            </h2>
            {grup.aciklama && <p className="mt-0.5 text-[11px]" style={{ color: TEXT_MUTED }}>{grup.aciklama}</p>}
          </div>
          {grup.gorevler.map((k) => <GorevSatiri key={k.atamaId} kart={k} onHata={setHata} />)}
        </section>
      ))}
    </div>
  );
}

function GorevSatiri({ kart, onHata }: { kart: OrtaokulGorevKarti; onHata: (h: string | null) => void }) {
  const [pending, startTransition] = useTransition();
  const renk = DURUM_RENK[kart.durum];
  const bitti = kart.durum === "tamamlandi";

  function degistir() {
    onHata(null);
    startTransition(async () => {
      const res = bitti ? await ortaokulGoreviGeriAl(kart.atamaId) : await ortaokulGoreviTamamla(kart.atamaId);
      if (res.error) onHata(res.error);
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-3xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: renk.arka, color: renk.yazi }}>{kart.ders}</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: renk.arka, color: renk.yazi }}>{kart.zamanEtiketi}</span>
        </div>
        <div className="mt-1.5 text-sm font-bold" style={{ color: bitti ? TEXT_MUTED : TEXT }}>{kart.baslik}</div>
        {/* Öğretmenin alt başlığı/notu: işin ne olduğu bazen tam olarak
            burada yazıyor ("sayfa 42-48"), konu adında değil. */}
        {kart.aciklama && (
          <div className="mt-0.5 text-[11px]" style={{ color: bitti ? TEXT_MUTED : TEXT }}>{kart.aciklama}</div>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: TEXT_MUTED }}>
          {kart.sureEtiketi && <span className="flex items-center gap-1"><Clock size={11} /> {kart.sureEtiketi}</span>}
          {kart.ogretmenAdi && <span className="flex items-center gap-1"><User size={11} /> {kart.ogretmenAdi}</span>}
        </div>
      </div>
      {/* Her kartta TEK eylem (§6.2): ya bitir ya geri al. */}
      <button type="button" onClick={degistir} disabled={pending}
        className="sfec-btn flex shrink-0 items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60"
        style={bitti
          ? { background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }
          : { background: MINT, color: MINT_ON }}>
        {bitti ? <><RotateCcw size={13} /> Geri al</> : <><Check size={13} /> Bitirdim</>}
      </button>
    </div>
  );
}
