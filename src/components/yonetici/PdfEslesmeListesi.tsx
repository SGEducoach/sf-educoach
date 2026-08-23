"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import {
  pdfEslesmeAta, pdfEslesmeOgrencileriGetir, pdfEslesmeReddet,
  type PdfEslesmeBekleyeni,
} from "@/app/yonetici/pdf-eslesme-actions";
import { BG0, BG1_ALT, BORDER, BORDER_STRONG, BLUSH, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

export function PdfEslesmeListesi({ bekleyenler }: { bekleyenler: PdfEslesmeBekleyeni[] }) {
  return (
    <div className="flex flex-col gap-3">
      {bekleyenler.map((b) => <PdfEslesmeSatiri key={b.id} bekleyen={b} />)}
    </div>
  );
}

function PdfEslesmeSatiri({ bekleyen }: { bekleyen: PdfEslesmeBekleyeni }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ogrenciler, setOgrenciler] = useState<{ id: string; ad: string }[] | null>(null);
  const [secilenId, setSecilenId] = useState("");
  const [arama, setArama] = useState("");
  const [mesaj, setMesaj] = useState<string | null>(null);

  async function ogrencileriYukle() {
    if (ogrenciler) return;
    const sonuc = await pdfEslesmeOgrencileriGetir(bekleyen.schoolId);
    setOgrenciler(sonuc.ogrenciler);
  }

  const filtrelenmis = (ogrenciler ?? []).filter((o) => o.ad.toLocaleLowerCase("tr-TR").includes(arama.toLocaleLowerCase("tr-TR")));

  return (
    <div className="rounded-2xl p-4" style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div style={{ color: TEXT }} className="text-sm font-bold">{bekleyen.adSoyadHam}</div>
          <div style={{ color: TEXT_MUTED }} className="text-xs">
            {bekleyen.okulAdi} · {bekleyen.yayinevi} · {bekleyen.tarih} · {bekleyen.tur}
          </div>
          <div style={{ color: TEXT_MUTED }} className="mt-1 text-[11px]">
            {bekleyen.dersSonuclari.map((d) => `${d.ders}: ${d.dogru}D/${d.yanlis}Y`).join(" · ")}
          </div>
        </div>
        <button type="button" disabled={pending} onClick={() => {
          if (!window.confirm("Bu satır reddedilsin mi?")) return;
          startTransition(async () => {
            const r = await pdfEslesmeReddet(bekleyen.id);
            setMesaj(r.error ? `Hata: ${r.error}` : "Reddedildi.");
            if (!r.error) router.refresh();
          });
        }} className="sfec-btn shrink-0 flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold" style={{ color: BLUSH, border: `2px solid ${BORDER_STRONG}` }}>
          <X size={12} /> Reddet
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={arama} onFocus={ogrencileriYukle}
          onChange={(e) => { setArama(e.target.value); ogrencileriYukle(); }}
          placeholder="Öğrenci ara..."
          className="text-xs px-3 py-2 rounded-xl outline-none flex-1 min-w-[160px]"
          style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}
        />
        <select value={secilenId} onChange={(e) => setSecilenId(e.target.value)} onFocus={ogrencileriYukle}
          className="text-xs px-3 py-2 rounded-xl outline-none min-w-[160px]"
          style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          <option value="">{ogrenciler ? "Öğrenci seçin" : "Yükleniyor..."}</option>
          {filtrelenmis.map((o) => <option key={o.id} value={o.id}>{o.ad}</option>)}
        </select>
        <button type="button" disabled={pending || !secilenId} onClick={() => startTransition(async () => {
          const r = await pdfEslesmeAta(bekleyen.id, secilenId);
          setMesaj(r.error ? `Hata: ${r.error}` : "Eşleştirildi.");
          if (!r.error) router.refresh();
        })} className="sfec-btn flex items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>
          <Check size={12} /> Ata
        </button>
      </div>
      {mesaj && <div style={{ color: mesaj.startsWith("Hata") ? BLUSH : MINT }} className="mt-2 text-[11px] font-semibold">{mesaj}</div>}
    </div>
  );
}
