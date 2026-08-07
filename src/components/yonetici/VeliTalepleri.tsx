"use client";

import { useEffect, useState, useTransition } from "react";
import { UserCheck, Check, X, Copy } from "lucide-react";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH, LILAC } from "@/lib/theme";
import { veliTalepleriGetir, veliTalebiAdminOnayla, veliTalebiReddet, type VeliTalebiSonuc } from "@/app/yonetici/actions";

const DURUM_ETIKET: Record<VeliTalebiSonuc["durum"], string> = {
  bekliyor: "Bekliyor", onaylandi: "Onaylandı", reddedildi: "Reddedildi", kullanildi: "Kullanıldı",
};
const DURUM_RENK: Record<VeliTalebiSonuc["durum"], string> = {
  bekliyor: "#FFC46B", onaylandi: MINT, reddedildi: BLUSH, kullanildi: TEXT_MUTED,
};

// Normalde onay ilgili sınıf öğretmenine ait — admin sadece görünürlük +
// öğretmen ulaşılamıyorsa manuel müdahale için burada.
export function VeliTalepleri() {
  const [talepler, setTalepler] = useState<VeliTalebiSonuc[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    veliTalepleriGetir().then((res) => {
      if (res.error) return setHata(res.error);
      setTalepler(res.talepler);
    });
  }, []);

  function satirGuncelle(id: string, patch: Partial<VeliTalebiSonuc>) {
    setTalepler((t) => t?.map((x) => (x.id === id ? { ...x, ...patch } : x)) ?? null);
  }

  const bekleyenler = talepler?.filter((t) => t.durum === "bekliyor") ?? [];
  const digerleri = talepler?.filter((t) => t.durum !== "bekliyor") ?? [];

  return (
    <div className="sgec-fade rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(199,182,255,0.15)" }}>
          <UserCheck size={13} color={LILAC} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Veli talepleri</span>
        {bekleyenler.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,196,107,0.15)", color: "#FFC46B" }}>
            {bekleyenler.length} bekliyor
          </span>
        )}
      </div>

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold mb-2">{hata}</div>}

      {talepler === null ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Yükleniyor...</p>
      ) : talepler.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Henüz veli talebi yok.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {[...bekleyenler, ...digerleri].map((t) => (
            <TalepSatiri key={t.id} talep={t} onGuncelle={(patch) => satirGuncelle(t.id, patch)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TalepSatiri({ talep, onGuncelle }: { talep: VeliTalebiSonuc; onGuncelle: (patch: Partial<VeliTalebiSonuc>) => void }) {
  const [hata, setHata] = useState<string | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [onayPending, startOnayTransition] = useTransition();
  const [redPending, startRedTransition] = useTransition();

  function onayla() {
    if (!window.confirm(`${talep.veliAd} adlı velinin talebi onaylansın mı? Bir kod üretilecek.`)) return;
    setHata(null);
    startOnayTransition(async () => {
      const res = await veliTalebiAdminOnayla(talep.id);
      if (res.error) return setHata(res.error);
      onGuncelle({ durum: "onaylandi", kod: res.kod });
    });
  }

  function reddet() {
    if (!window.confirm(`${talep.veliAd} adlı velinin talebi reddedilsin mi?`)) return;
    setHata(null);
    startRedTransition(async () => {
      const res = await veliTalebiReddet(talep.id);
      if (res.error) return setHata(res.error);
      onGuncelle({ durum: "reddedildi" });
    });
  }

  function kodKopyala() {
    if (!talep.kod) return;
    navigator.clipboard?.writeText(talep.kod).then(() => {
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    });
  }

  return (
    <div className="rounded-xl px-3.5 py-2.5 flex flex-col gap-2" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div style={{ color: TEXT }} className="text-sm font-semibold">
            {talep.veliAd} <span style={{ color: TEXT_MUTED }} className="font-normal text-xs">· {talep.ogrenciAd} velisi</span>
            <span className="text-[10px] font-bold ml-2 px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: DURUM_RENK[talep.durum] }}>
              {DURUM_ETIKET[talep.durum]}
            </span>
          </div>
          <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">
            {[talep.veliTelefon, talep.okulAdi, talep.sinifAdi, new Date(talep.createdAt).toLocaleDateString("tr-TR")].filter(Boolean).join(" · ")}
          </div>
        </div>
        {talep.durum === "bekliyor" && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={onayla} disabled={onayPending}
              className="sgec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full disabled:opacity-60"
              style={{ background: MINT, color: MINT_ON }}>
              <Check size={11} /> Onayla
            </button>
            <button type="button" onClick={reddet} disabled={redPending}
              className="sgec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full disabled:opacity-60"
              style={{ background: "rgba(255,255,255,0.06)", color: BLUSH, border: `1px solid ${BORDER_STRONG}` }}>
              <X size={11} /> Reddet
            </button>
          </div>
        )}
      </div>

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}

      {talep.durum === "onaylandi" && talep.kod && (
        <div className="rounded-xl p-2.5 flex items-center justify-between gap-2 flex-wrap" style={{ background: MINT_BG, border: `1px solid ${MINT}` }}>
          <div className="text-xs" style={{ color: TEXT }}>Kod: <strong>{talep.kod}</strong></div>
          <button type="button" onClick={kodKopyala}
            className="sgec-btn shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
            style={{ background: MINT, color: MINT_ON }}>
            {kopyalandi ? <><Check size={12} /> Kopyalandı</> : <><Copy size={12} /> Kopyala</>}
          </button>
        </div>
      )}
    </div>
  );
}
