"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp } from "lucide-react";
import { yurtNobetiPdfYukle } from "@/app/dashboard/nobet-program-actions";
import type { YurtNobetiYuklemeOzeti } from "@/lib/nobet-yukleme";
import { BG0, BG1, BLUSH, BLUSH_BG, BORDER, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

export function YurtNobetPdfPaneli() {
  const girdi = useRef<HTMLInputElement>(null);
  const [dosya, setDosya] = useState<File | null>(null);
  const [bildir, setBildir] = useState(true);
  const [ozet, setOzet] = useState<YurtNobetiYuklemeOzeti | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function yukle() {
    if (!dosya) return;
    const form = new FormData();
    form.set("dosya", dosya);
    form.set("bildir", bildir ? "evet" : "hayir");
    setHata(null);
    setOzet(null);
    startTransition(async () => {
      const sonuc = await yurtNobetiPdfYukle(form);
      if (sonuc.error) { setHata(sonuc.error); return; }
      setOzet(sonuc.ozet);
      setDosya(null);
      if (girdi.current) girdi.current.value = "";
    });
  }

  return <section className="sfec-section rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
    <h2 className="text-base font-bold" style={{ color: TEXT }}>Yurt Nöbet Listesi</h2>
    <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
      Belletmen nöbet listesi PDF&apos;ini yükleyin. PDF&apos;teki tarih aralığı yenilenir; diğer dönemler korunur.
    </p>
    <input ref={girdi} type="file" accept="application/pdf" disabled={pending}
      onChange={(e) => setDosya(e.target.files?.[0] ?? null)}
      className="mt-4 w-full rounded-xl px-3 py-2 text-xs file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-bold file:bg-[var(--sfec-mint)] file:text-[var(--sfec-mint-on)]" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }} />
    <label className="mt-3 flex items-center gap-2 text-xs" style={{ color: TEXT_MUTED }}>
      <input type="checkbox" checked={bildir} disabled={pending} onChange={(e) => setBildir(e.target.checked)} />
      Listedeki öğretmenlere nöbetlerinin yüklendiğini bildir
    </label>
    {dosya && <div className="mt-3 flex items-center gap-2">
      <button type="button" onClick={yukle} disabled={pending}
        className="sfec-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50"
        style={{ background: MINT, color: MINT_ON }}>
        <FileUp size={14} /> {pending ? "Yükleniyor…" : "Nöbet listesini yükle"}
      </button>
      <button type="button" disabled={pending} onClick={() => { setDosya(null); if (girdi.current) girdi.current.value = ""; }}
        className="sfec-btn rounded-xl px-3 py-2 text-xs" style={{ color: TEXT_MUTED }}>Vazgeç</button>
    </div>}
    {hata && <p role="alert" className="mt-3 rounded-xl p-3 text-xs" style={{ background: BLUSH_BG, color: TEXT, border: `1px solid ${BLUSH}` }}>{hata}</p>}
    {ozet && <div role="status" className="mt-3 rounded-xl p-3 text-xs" style={{ background: MINT_BG, color: TEXT, border: `1px solid ${MINT}` }}>
      {ozet.ilkTarih} – {ozet.sonTarih} · {ozet.gorev} görev · {ozet.ogretmen} öğretmen · {ozet.eslesen} hesap eşleşti · {ozet.bildirilen} bildirim
      {ozet.uyarilar.length > 0 && <ul className="mt-2 list-disc pl-4">{ozet.uyarilar.map((u, i) => <li key={i}>{u}</li>)}</ul>}
    </div>}
  </section>;
}
