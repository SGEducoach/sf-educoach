"use client";

import { useState, useTransition } from "react";
import { ogrenciHedefiniGuncelle } from "@/app/dashboard/profil-actions";
import { BORDER, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

export function OgrenciHedefDuzenleyici({ ilkHedef, etiket }: { ilkHedef: string; etiket: string }) {
  const [hedef, setHedef] = useState(ilkHedef);
  const [kayitli, setKayitli] = useState(ilkHedef);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return <div className="mt-4 flex flex-col gap-2">
    <label htmlFor="ogrenci-hedef" className="text-xs font-semibold" style={{ color: TEXT }}>{etiket}</label>
    <div className="flex flex-wrap gap-2">
      <input id="ogrenci-hedef" type="text" maxLength={120} value={hedef} onChange={(e) => { setHedef(e.target.value); setMesaj(null); }}
        placeholder={`${etiket} yaz`} className="min-w-0 flex-1 rounded-xl px-3 py-2 text-sm" style={{ color: TEXT, border: `2px solid ${BORDER}` }} />
      <button type="button" disabled={pending || hedef.trim() === kayitli.trim()}
        onClick={() => startTransition(async () => {
          const sonuc = await ogrenciHedefiniGuncelle(hedef);
          if (sonuc.error) setMesaj(sonuc.error);
          else { setKayitli(hedef.trim()); setMesaj("Hedefin kaydedildi."); }
        })}
        className="rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </div>
    {mesaj && <p role="status" className="text-xs" style={{ color: TEXT_MUTED }}>{mesaj}</p>}
  </div>;
}
