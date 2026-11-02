"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { nobetTakasKarari, nobetTakasTalepleriGetir, type NobetTakasTalebi } from "@/app/dashboard/nobet-devir-actions";
import { BG1, BG1_ALT, BLUSH, BLUSH_BG, BORDER, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

export function YurtTakasTalepleri() {
  const router = useRouter();
  const [talepler, setTalepler] = useState<NobetTakasTalebi[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let iptal = false;
    void nobetTakasTalepleriGetir().then((sonuc) => {
      if (iptal) return;
      setTalepler(sonuc.talepler);
      setHata(sonuc.error);
      setYukleniyor(false);
    });
    return () => { iptal = true; };
  }, []);

  function kararVer(talep: NobetTakasTalebi, karar: "onaylandi" | "reddedildi") {
    if (!window.confirm(`${talep.tarih} · ${talep.devredenAdi} → ${talep.devralanAdi} takas talebi ${karar === "onaylandi" ? "onaylansın" : "reddedilsin"} mi?`)) return;
    setHata(null);
    startTransition(async () => {
      const sonuc = await nobetTakasKarari(talep.id, karar);
      if (sonuc.error) { setHata(sonuc.error); return; }
      setTalepler((liste) => liste.filter((t) => t.id !== talep.id));
      router.refresh();
    });
  }

  return <section className="sfec-section rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
    <h2 className="text-base font-bold" style={{ color: TEXT }}>Yurt Nöbeti Takas Talepleri</h2>
    <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>Öğretmenin istediği devir, siz onaylayana kadar nöbet listesine uygulanmaz.</p>
    {hata && <p role="alert" className="mt-3 rounded-xl p-3 text-xs" style={{ background: BLUSH_BG, color: TEXT, border: `1px solid ${BLUSH}` }}>{hata}</p>}
    {yukleniyor && <p className="mt-4 text-xs" style={{ color: TEXT_MUTED }}>Talepler yükleniyor…</p>}
    {!yukleniyor && !hata && talepler.length === 0 && <p className="mt-4 text-xs" style={{ color: TEXT_MUTED }}>Bekleyen takas talebi yok.</p>}
    <div className="mt-4 space-y-2">
      {talepler.map((talep) => <div key={talep.id} className="flex flex-wrap items-center gap-2 rounded-xl p-3" style={{ background: BG1_ALT }}>
        <span className="min-w-0 flex-1 text-xs font-semibold" style={{ color: TEXT }}>
          {talep.tarih} · {talep.devredenAdi} → {talep.devralanAdi}
        </span>
        <button type="button" disabled={pending} onClick={() => kararVer(talep, "onaylandi")}
          className="sfec-btn rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>Onayla</button>
        <button type="button" disabled={pending} onClick={() => kararVer(talep, "reddedildi")}
          className="sfec-btn rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ background: BLUSH_BG, color: TEXT, border: `1px solid ${BLUSH}` }}>Reddet</button>
      </div>)}
    </div>
  </section>;
}
