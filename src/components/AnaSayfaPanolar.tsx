"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, FileText } from "lucide-react";
import type { AnaSayfaPanoIlani } from "@/lib/ana-sayfa-panolar";

const TURKUAZ = "#14B8B0", LACIVERT = "#0F2540", GRI = "#5A6472";

export function AnaSayfaPanolar({ ilanlar }: { ilanlar: AnaSayfaPanoIlani[] }) {
  const [aktif, setAktif] = useState(0);
  useEffect(() => {
    if (ilanlar.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const zamanlayici = window.setInterval(() => setAktif((i) => (i + 1) % ilanlar.length), 8000);
    return () => window.clearInterval(zamanlayici);
  }, [ilanlar.length]);
  const ilan = ilanlar[aktif % Math.max(ilanlar.length, 1)];

  return <section className="flex h-72 min-w-0 flex-col overflow-hidden rounded-3xl border border-[#DDE7EA] bg-[#F7FAFB] p-5 shadow-sm" aria-label="Kurum panoları">
    <div className="min-w-0">
      <p className="truncate text-[11px] font-extrabold uppercase tracking-[.12em]" style={{ color: LACIVERT }}>
        {ilan?.kurumAdi ?? "Kurum panoları"}
      </p>
      <div className="mt-1 flex items-center gap-2"><CalendarDays size={16} color={TURKUAZ}/><h2 className="text-xs font-bold uppercase tracking-[.14em]" style={{ color: TURKUAZ }}>Pano</h2></div>
    </div>
    {ilan ? <div key={ilan.id} className="sfec-tg-haber-gir my-auto flex min-h-0 gap-4 overflow-hidden rounded-2xl bg-white p-3">
      <a href={ilan.dosyaUrl} target="_blank" rel="noopener noreferrer" aria-label={`${ilan.baslik} dosyasını aç`}
        className="grid h-32 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#E9F6F5] sm:w-28">
        {ilan.dosyaTipi === "resim" ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage alan adı next/image allowlist'inde yok.
          <img src={ilan.dosyaUrl} alt="" className="h-full w-full object-cover" />
        ) : <FileText size={32} color={TURKUAZ} aria-hidden="true" />}
      </a>
      <div className="min-w-0 overflow-hidden">
        <p className="text-[11px] font-bold" style={{ color: TURKUAZ }}>{ilan.tarih}</p>
        <h3 className="mt-1 overflow-hidden text-sm font-extrabold leading-5" style={{ color: LACIVERT, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}>{ilan.baslik}</h3>
        {ilan.aciklama && <p className="mt-1 overflow-hidden text-xs leading-5" style={{ color: GRI, display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}>{ilan.aciklama}</p>}
        <a href={ilan.dosyaUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold" style={{ color: TURKUAZ }}>
          {ilan.dosyaTipi === "pdf" ? "PDF’i aç" : "Afişi aç"}<ExternalLink size={12} aria-hidden="true" />
        </a>
      </div>
    </div> : <p className="my-auto text-center text-sm" style={{ color: GRI }}>Panolarda henüz güncel bir paylaşım yok.</p>}
    {ilanlar.length > 1 && <div className="flex items-center justify-center gap-2" aria-label="Pano geçişleri">
      <button type="button" onClick={() => setAktif((i) => (i - 1 + ilanlar.length) % ilanlar.length)} aria-label="Önceki pano paylaşımı" className="grid h-8 w-8 place-items-center rounded-full border border-[#D5DCE1] bg-white"><ChevronLeft size={16}/></button>
      <span className="text-xs font-bold tabular-nums" style={{ color: GRI }}>{aktif + 1} / {ilanlar.length}</span>
      <button type="button" onClick={() => setAktif((i) => (i + 1) % ilanlar.length)} aria-label="Sonraki pano paylaşımı" className="grid h-8 w-8 place-items-center rounded-full border border-[#D5DCE1] bg-white"><ChevronRight size={16}/></button>
    </div>}
  </section>;
}
