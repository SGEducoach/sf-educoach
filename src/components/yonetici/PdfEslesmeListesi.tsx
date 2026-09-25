"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import {
  pdfEslesmeAta, pdfEslesmeOgrencileriGetir, pdfEslesmeReddet,
  type PdfEslesmeBekleyeni, type PdfEslesmeOgrencisi,
} from "@/app/yonetici/pdf-eslesme-actions";
import { adlarBenzerMi } from "@/lib/ad-benzerligi";
import { BG0, BG1_ALT, BORDER, BORDER_STRONG, BLUSH, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

const TUM_SINIFLAR = "";
const SINIFSIZ = "__sinifsiz__";

function ogrenciEtiketi(o: PdfEslesmeOgrencisi) {
  return o.sinif ? `${o.ad} · ${o.sinif}` : o.ad;
}

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
  const [ogrenciler, setOgrenciler] = useState<PdfEslesmeOgrencisi[] | null>(null);
  const [secilenId, setSecilenId] = useState("");
  const [arama, setArama] = useState("");
  const [sinif, setSinif] = useState(TUM_SINIFLAR);
  const [mesaj, setMesaj] = useState<string | null>(null);

  async function ogrencileriYukle() {
    if (ogrenciler) return;
    const sonuc = await pdfEslesmeOgrencileriGetir(bekleyen.schoolId);
    setOgrenciler(sonuc.ogrenciler);
  }

  // Kullanıcı isteği (25.09.2026): tüm okul tek listede geliyordu — sınıfa
  // göre süzülebiliyor, PDF'teki ada benzeyenler de en üstte öneriliyor.
  const siniflar = [...new Set((ogrenciler ?? []).map((o) => o.sinif).filter((s): s is string => !!s))]
    .sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
  const sinifsizVar = (ogrenciler ?? []).some((o) => !o.sinif);
  const aramaKucuk = arama.toLocaleLowerCase("tr-TR");
  const filtrelenmis = (ogrenciler ?? []).filter((o) =>
    (sinif === TUM_SINIFLAR || (sinif === SINIFSIZ ? !o.sinif : o.sinif === sinif)) &&
    o.ad.toLocaleLowerCase("tr-TR").includes(aramaKucuk));
  const onerilenler = filtrelenmis.filter((o) => adlarBenzerMi(bekleyen.adSoyadHam, o.ad));
  const digerleri = filtrelenmis.filter((o) => !onerilenler.includes(o));

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
        <select value={sinif} onChange={(e) => { setSinif(e.target.value); setSecilenId(""); }} onFocus={ogrencileriYukle}
          aria-label="Sınıfa göre süz"
          className="text-xs px-3 py-2 rounded-xl outline-none"
          style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          <option value={TUM_SINIFLAR}>Tüm sınıflar</option>
          {siniflar.map((s) => <option key={s} value={s}>{s}</option>)}
          {sinifsizVar && <option value={SINIFSIZ}>Sınıfsız</option>}
        </select>
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
          <option value="">{ogrenciler ? `Öğrenci seçin (${filtrelenmis.length})` : "Yükleniyor..."}</option>
          {onerilenler.length > 0 && (
            <optgroup label="Önerilen (ada benzeyen)">
              {onerilenler.map((o) => <option key={o.id} value={o.id}>{ogrenciEtiketi(o)}</option>)}
            </optgroup>
          )}
          {onerilenler.length > 0
            ? <optgroup label="Diğer öğrenciler">
                {digerleri.map((o) => <option key={o.id} value={o.id}>{ogrenciEtiketi(o)}</option>)}
              </optgroup>
            : digerleri.map((o) => <option key={o.id} value={o.id}>{ogrenciEtiketi(o)}</option>)}
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
