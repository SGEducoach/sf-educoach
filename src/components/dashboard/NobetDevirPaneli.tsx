"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { nobetDevret } from "@/app/dashboard/nobet-devir-actions";
import type { YurtNobetGorevi } from "@/lib/ders-programi";
import { BG0, BG1_ALT, BLUSH, BORDER, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

type Secenek = { id: string; etiket: string };

export function YurtNobetDevirPaneli({
  yurtNobetleri,
  ogretmenler,
}: {
  yurtNobetleri: YurtNobetGorevi[];
  ogretmenler: { id: string; ad: string; brans: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [seciliNobet, setSeciliNobet] = useState("");
  const [hedefOgretmenId, setHedefOgretmenId] = useState("");
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const secenekler = useMemo<Secenek[]>(() =>
    yurtNobetleri.map((n) => ({
      id: n.id,
      etiket: new Date(`${n.tarih}T12:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", weekday: "short" }),
    })), [yurtNobetleri]);

  if (secenekler.length === 0) return null;

  function devret() {
    const nobet = secenekler.find((s) => s.id === seciliNobet);
    const ogretmen = ogretmenler.find((o) => o.id === hedefOgretmenId);
    if (!nobet || !ogretmen) {
      setHata("Nöbetinizi ve devredeceğiniz öğretmeni seçin.");
      return;
    }
    if (!window.confirm(`${nobet.etiket} nöbeti ${ogretmen.ad} öğretmene devredilsin mi? İşlem doğrudan uygulanacaktır.`)) return;

    setHata(null);
    setMesaj(null);
    startTransition(async () => {
      const sonuc = await nobetDevret({ nobetId: nobet.id, hedefOgretmenId });
      if (sonuc.error) return setHata(sonuc.error);
      setMesaj(sonuc.warning ?? `Nöbet ${ogretmen.ad} öğretmene devredildi ve bildirim gönderildi.`);
      setSeciliNobet("");
      setHedefOgretmenId("");
      router.refresh();
    });
  }

  return (
    <div className="mt-4 rounded-2xl p-3 sm:p-4" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <ArrowRightLeft size={15} color={MINT} />
        <h3 className="text-sm font-bold" style={{ color: TEXT }}>Yurt nöbetimi devret</h3>
      </div>
      <p className="mt-1 text-[11px] leading-5" style={{ color: TEXT_MUTED }}>
        Yalnızca kendi yurt nöbetinizi aynı okuldaki aktif bir öğretmene devredebilirsiniz. Devir doğrudan uygulanır ve öğretmene bildirim gönderilir.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] sm:items-end">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Nöbetiniz</span>
          <select value={seciliNobet} onChange={(e) => setSeciliNobet(e.target.value)} disabled={pending}
            className="min-w-0 rounded-xl px-3 py-2.5 text-xs outline-none disabled:opacity-60"
            style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }}>
            <option value="">Nöbet seçin</option>
            {secenekler.map((s) => <option key={s.id} value={s.id}>{s.etiket}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Devredilecek öğretmen</span>
          <select value={hedefOgretmenId} onChange={(e) => setHedefOgretmenId(e.target.value)} disabled={pending || ogretmenler.length === 0}
            className="min-w-0 rounded-xl px-3 py-2.5 text-xs outline-none disabled:opacity-60"
            style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }}>
            <option value="">Öğretmen seçin</option>
            {ogretmenler.map((o) => <option key={o.id} value={o.id}>{o.ad}{o.brans ? ` · ${o.brans}` : ""}</option>)}
          </select>
        </label>
        <button type="button" onClick={devret} disabled={pending || ogretmenler.length === 0}
          className="sfec-btn inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold disabled:opacity-50"
          style={{ background: MINT, color: MINT_ON }}>
          <ArrowRightLeft size={14} /> {pending ? "Devrediliyor..." : "Devret"}
        </button>
      </div>
      {ogretmenler.length === 0 && <p className="mt-2 text-xs" style={{ color: TEXT_MUTED }}>Devredilebilecek başka aktif öğretmen bulunamadı.</p>}
      {hata && <p className="mt-2 text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
      {mesaj && <p className="mt-2 text-xs font-semibold" style={{ color: MINT }}>{mesaj}</p>}
    </div>
  );
}
