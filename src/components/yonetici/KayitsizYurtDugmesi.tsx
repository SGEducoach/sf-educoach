"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BedDouble } from "lucide-react";
import { kayitsizYurtDurumuKaydet } from "@/app/yonetici/on-kayitli-eslesme-actions";
import { BLUSH, BORDER_STRONG, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

// Admin: hesapsız öğrencinin yurt öğrencisi işareti (kullanıcı isteği 28.10.2026).
export function KayitsizYurtDugmesi({ schoolId, listeId, yurtta, numarasiVar }: { schoolId: string; listeId: string; yurtta: boolean; numarasiVar: boolean }) {
  const router = useRouter();
  const [deger, setDeger] = useState(yurtta);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!numarasiVar) return <span className="text-[11px]" style={{ color: TEXT_MUTED }} title="Yurt işareti için okul numarası gerekir">Numara yok</span>;
  function degistir() {
    const yeni = !deger;
    setHata(null);
    setDeger(yeni);
    startTransition(async () => {
      const r = await kayitsizYurtDurumuKaydet(schoolId, [listeId], yeni);
      if (r.error) { setDeger(!yeni); setHata(r.error); return; }
      router.refresh();
    });
  }
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button type="button" onClick={degistir} disabled={pending} aria-pressed={deger}
        className="sfec-btn inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold disabled:opacity-50"
        style={deger ? { background: MINT_BG, color: TEXT, border: `1px solid ${MINT}` } : { color: TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
        <BedDouble size={12} aria-hidden="true" /> {deger ? "Yurt öğrencisi" : "Yurtta değil"}
      </button>
      {hata && <span className="text-[10px]" style={{ color: BLUSH }}>{hata}</span>}
    </span>
  );
}
