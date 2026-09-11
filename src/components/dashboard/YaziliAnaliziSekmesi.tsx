"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Lock, Plus, Trash2 } from "lucide-react";
import { YaziliAnaliziWizard } from "@/components/dashboard/YaziliAnaliziWizard";
import { yaziliSinavlariniListele, yaziliSinavSil, type YaziliSinavOzeti } from "@/app/dashboard/yazili-rapor-actions";
import { dersGorunenAd, GECME_NOTU } from "@/lib/yazili-rapor-hesap";
import { YAZILI_KILIT_MESAJI, yaziliOlcumMesaji, type YaziliErisim } from "@/lib/yazili-erisim-hesap";
import { BG1_ALT, BLUSH, BORDER_STRONG, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";

const tarihTR = (iso: string) => {
  const [yil, ay, gun] = iso.split("-");
  return `${gun}.${ay}.${yil}`;
};
const sayi = (v: number) => v.toLocaleString("tr-TR", { maximumFractionDigits: 1 });

// Kullanıcı bulgusu (11.09.2026): "kaydedildi ama nerede olduğunu göremedim".
// Yazılı Analizi sekmesi önce kaydedilen yazılıları listeliyor; her satır A4
// raporunu (/dashboard/yazili-analizi/[id]) açıyor, yanındaki çöp kutusu
// yazılıyı siliyor. Dürüstlük engeli (lib/yazili-erisim.ts) kapalıysa yalnızca
// kilit mesajı görünür; ölçüm süresinde listenin üstünde uyarı durur.
export function YaziliAnaliziSekmesi({
  sinifOptions,
  dersOptions,
}: {
  sinifOptions?: { id: string; ad: string }[];
  dersOptions?: string[];
} = {}) {
  const [gorunum, setGorunum] = useState<"liste" | "yeni">("liste");
  const [sinavlar, setSinavlar] = useState<YaziliSinavOzeti[] | null>(null);
  const [erisim, setErisim] = useState<YaziliErisim | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [silinenId, setSilinenId] = useState<string | null>(null);
  const [yukleniyor, startYukleme] = useTransition();
  const [, startSilme] = useTransition();

  // Bu Next.js sürümünde useEffect'ten çağrılan server action'lar
  // startTransition içinde olmalı (bkz. KullaniciArama yorumu).
  const yukle = useCallback(() => {
    startYukleme(async () => {
      const sonuc = await yaziliSinavlariniListele();
      setHata(sonuc.error);
      setErisim(sonuc.erisim);
      setSinavlar(sonuc.sinavlar);
    });
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const sil = (s: YaziliSinavOzeti) => {
    const onay = window.confirm(
      `"${s.ad}" (${s.sinifAdi}, ${tarihTR(s.tarih)}) silinsin mi?\n\nSoru puanları ve rapor da silinir. Bu işlem geri alınamaz.`
    );
    if (!onay) return;
    setHata(null);
    setSilinenId(s.id);
    startSilme(async () => {
      const sonuc = await yaziliSinavSil(s.id);
      setSilinenId(null);
      if (sonuc.error) {
        setHata(sonuc.error);
        return;
      }
      setSinavlar((onceki) => onceki?.filter((x) => x.id !== s.id) ?? onceki);
    });
  };

  if (erisim && !erisim.izinli) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl p-8 text-center" role="alert"
        style={{ border: `1px solid ${BORDER_STRONG}`, background: BG1_ALT }}>
        <Lock size={28} color={BLUSH} />
        <p className="max-w-lg text-base font-bold leading-relaxed" style={{ color: TEXT }}>{YAZILI_KILIT_MESAJI}</p>
      </div>
    );
  }

  const olcumUyarisi = erisim?.olcumDonemi ? (
    <p className="rounded-xl p-3 text-sm" style={{ border: `1px solid ${BORDER_STRONG}`, color: TEXT_MUTED }} role="note">
      {yaziliOlcumMesaji(erisim.engelBaslangic)}
    </p>
  ) : null;

  if (gorunum === "yeni") {
    return (
      <div className="flex flex-col gap-4">
        <button type="button" onClick={() => { setGorunum("liste"); yukle(); }}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold" style={{ color: TEXT_MUTED }}>
          <ArrowLeft size={16} /> Kaydedilen yazılılar
        </button>
        {olcumUyarisi}
        <YaziliAnaliziWizard sinifOptions={sinifOptions} dersOptions={dersOptions} onKaydedildi={yukle} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: TEXT }}>Yazılı analizi</h1>
          <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>Kaydedilen yazılılar ve soru analizi raporları.</p>
        </div>
        <button type="button" onClick={() => setGorunum("yeni")} disabled={!erisim}
          className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60">
          <Plus size={16} /> Yeni yazılı analizi
        </button>
      </div>

      {olcumUyarisi}
      {hata && <p className="text-sm" style={{ color: BLUSH }} role="alert">{hata}</p>}

      {sinavlar === null || (yukleniyor && sinavlar.length === 0) ? (
        <p className="text-sm" style={{ color: TEXT_MUTED }}>Yükleniyor…</p>
      ) : sinavlar.length === 0 ? (
        <p className="rounded-xl p-4 text-sm" style={{ border: `1px dashed ${BORDER_STRONG}`, color: TEXT_MUTED }}>
          Henüz kaydedilmiş yazılı analizi yok. &quot;Yeni yazılı analizi&quot; ile ilkini başlatın.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sinavlar.map((s) => {
            const siliniyor = silinenId === s.id;
            return (
              <li key={s.id} className="flex items-stretch gap-2" style={{ opacity: siliniyor ? 0.5 : 1 }}>
                <Link href={`/dashboard/yazili-analizi/${s.id}`}
                  className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 rounded-xl p-3"
                  style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
                  <div className="min-w-0">
                    <p className="text-sm font-bold" style={{ color: TEXT }}>{s.ad}</p>
                    <p className="text-xs" style={{ color: TEXT_MUTED }}>
                      {dersGorunenAd(s.ders)} · {s.sinifAdi} · {tarihTR(s.tarih)} · {s.ogrenciSayisi} öğrenci
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums" style={{ color: TEXT_MUTED }}>
                    {s.ortalama !== null && (
                      <span>Ortalama <strong style={{ color: TEXT }}>{sayi(s.ortalama)}</strong>{s.maxToplam !== 100 && ` / ${s.maxToplam}`}</span>
                    )}
                    {s.basariYuzdesi !== null && (
                      <span>Başarı <strong style={{ color: s.basariYuzdesi < GECME_NOTU ? BLUSH : MINT }}>%{sayi(s.basariYuzdesi)}</strong></span>
                    )}
                    <span className="inline-flex items-center gap-1 font-bold" style={{ color: MINT }}>
                      <FileText size={14} /> Raporu aç
                    </span>
                  </div>
                </Link>
                <button type="button" onClick={() => sil(s)} disabled={siliniyor}
                  aria-label={`${s.ad} yazılısını sil`} title="Yazılıyı sil"
                  className="inline-flex shrink-0 items-center justify-center rounded-xl px-3 disabled:opacity-60"
                  style={{ border: `1px solid ${BLUSH}`, color: BLUSH }}>
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
