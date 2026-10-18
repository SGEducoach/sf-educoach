"use client";

// Kurum dışı belletmen başvuruları (Faz 4): admin onaylar ya da reddeder.
import { useEffect, useState, useTransition } from "react";
import { BedDouble } from "lucide-react";
import { BG1, BG1_ALT, BLUSH, BORDER, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { belletmenBasvurulariGetir, belletmenKarari, type BelletmenBasvurusu } from "@/app/yonetici/belletmen-actions";

const DURUM: Record<BelletmenBasvurusu["durum"], string> = { bekliyor: "Onay bekliyor", onaylandi: "Onaylandı", reddedildi: "Reddedildi" };

export function BelletmenBasvurulari() {
  const [veri, setVeri] = useState<{ error: string | null; basvurular: BelletmenBasvurusu[] } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let iptal = false;
    void belletmenBasvurulariGetir().then((v) => { if (!iptal) setVeri(v); });
    return () => { iptal = true; };
  }, []);

  function karar(id: string, k: "onaylandi" | "reddedildi") {
    setHata(null);
    start(async () => {
      const r = await belletmenKarari(id, k);
      if (r.error) setHata(r.error);
      else setVeri(await belletmenBasvurulariGetir());
    });
  }

  const bekleyen = veri?.basvurular.filter((b) => b.durum === "bekliyor") ?? [];
  const digerleri = veri?.basvurular.filter((b) => b.durum !== "bekliyor") ?? [];

  const satir = (b: BelletmenBasvurusu) => (
    <div key={b.id} className="flex flex-wrap items-center gap-3 rounded-2xl p-3" style={{ background: BG1_ALT }}>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold" style={{ color: TEXT }}>{b.ad} <span className="text-xs font-normal" style={{ color: TEXT_MUTED }}>· {b.cinsiyet === "kadin" ? "Kadın" : "Erkek"}</span></div>
        <div className="text-[11px]" style={{ color: TEXT_MUTED }}>{b.okul} · {b.email}{b.telefon ? ` · ${b.telefon}` : ""} · {new Date(b.createdAt).toLocaleDateString("tr-TR")}</div>
      </div>
      {b.durum === "bekliyor" ? (
        <div className="flex gap-2">
          <button type="button" disabled={pending} onClick={() => karar(b.id, "onaylandi")} className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>Onayla</button>
          <button type="button" disabled={pending} onClick={() => { if (window.confirm(`${b.ad} başvurusu reddedilsin mi?`)) karar(b.id, "reddedildi"); }}
            className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ color: BLUSH, border: `1px solid ${BORDER}` }}>Reddet</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold" style={{ color: b.durum === "onaylandi" ? MINT : BLUSH }}>{DURUM[b.durum]}</span>
          <button type="button" disabled={pending} onClick={() => karar(b.id, b.durum === "onaylandi" ? "reddedildi" : "onaylandi")}
            className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: TEXT_MUTED, border: `1px solid ${BORDER}` }}>
            {b.durum === "onaylandi" ? "Erişimi kapat" : "Onayla"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <section className="flex flex-col gap-4 rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <BedDouble size={16} color={MINT} aria-hidden="true" />
        <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Belletmen Başvuruları</h2>
      </div>
      <p className="text-xs" style={{ color: TEXT_MUTED }}>
        Kurum dışı belletmenler ayrı kayıt sayfasından başvurur. Onaylanan belletmen kurumda göreve başlar; panelinde yalnız yoklama ve nöbet bilgileri (takas dahil) bulunur.
      </p>
      {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
      {!veri && <p className="text-xs" style={{ color: TEXT_MUTED }}>Yükleniyor…</p>}
      {veri?.error && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{veri.error}</p>}
      {veri && !veri.error && (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Onay Bekleyenler ({bekleyen.length})</span>
            {bekleyen.length === 0 ? <p className="text-xs" style={{ color: TEXT_MUTED }}>Bekleyen başvuru yok.</p> : bekleyen.map(satir)}
          </div>
          {digerleri.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Sonuçlananlar</span>
              {digerleri.map(satir)}
            </div>
          )}
        </>
      )}
    </section>
  );
}
