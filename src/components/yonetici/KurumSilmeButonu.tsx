"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { kurumKaliciSil, kurumSilmeOzeti } from "@/app/yonetici/kurum-sil-actions";
import { BG0, BLUSH, BORDER_STRONG, TEXT, TEXT_MUTED } from "@/lib/theme";

type Ozet = Awaited<ReturnType<typeof kurumSilmeOzeti>>;

export function KurumSilmeButonu({ schoolId, onDeleted }: { schoolId: string; onDeleted: () => void }) {
  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [yazilan, setYazilan] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ac() {
    setHata(null);
    startTransition(async () => {
      const sonuc = await kurumSilmeOzeti(schoolId);
      if (sonuc.error) return setHata(sonuc.error);
      setYazilan("");
      setOzet(sonuc);
    });
  }

  function sil() {
    if (!ozet || yazilan !== ozet.ad) return;
    setHata(null);
    startTransition(async () => {
      const sonuc = await kurumKaliciSil(schoolId, ozet.ad);
      if (sonuc.error) return setHata(sonuc.error);
      setOzet(null);
      onDeleted();
    });
  }

  return <div className="w-full">
    {!ozet && <button type="button" disabled={pending} onClick={ac}
      className="sfec-btn flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold disabled:opacity-50"
      style={{ color: BLUSH, border: `1px solid ${BORDER_STRONG}` }}><Trash2 size={12} /> Hesabı sil</button>}
    {ozet && <div className="mt-2 rounded-xl p-3 text-xs" style={{ background: BG0, border: `1px solid ${BLUSH}`, color: TEXT }}>
      <p className="font-bold">{ozet.tur}: {ozet.ad}</p>
      <p className="mt-1" style={{ color: TEXT_MUTED }}>
        {ozet.ogrenci} öğrenci ve {ozet.ogretmen} öğretmen/koç hesabı ile bu hesaba bağlı veriler kalıcı olarak silinir.
        Yalnız bu hesaba bağlı veliler de silinir. Bu işlem geri alınamaz.
      </p>
      <label className="mt-3 block font-semibold">Onaylamak için hesabın adını aynen yazın
        <input value={yazilan} onChange={(e) => setYazilan(e.target.value)} autoComplete="off"
          className="mt-1 w-full rounded-lg px-2 py-1.5" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` }} />
      </label>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={pending || yazilan !== ozet.ad} onClick={sil}
          className="rounded-lg px-3 py-1.5 font-bold disabled:opacity-50" style={{ background: BLUSH, color: "white" }}>Kalıcı olarak sil</button>
        <button type="button" disabled={pending} onClick={() => { setOzet(null); setHata(null); }}
          className="rounded-lg px-3 py-1.5 font-bold" style={{ border: `1px solid ${BORDER_STRONG}` }}>Vazgeç</button>
      </div>
    </div>}
    {hata && <p role="alert" className="mt-2 text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
  </div>;
}
