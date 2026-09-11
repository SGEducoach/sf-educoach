"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { YaziliAnaliziWizard } from "@/components/dashboard/YaziliAnaliziWizard";
import { yaziliSinavlariniListele, type YaziliSinavOzeti } from "@/app/dashboard/yazili-rapor-actions";
import { dersGorunenAd, GECME_NOTU } from "@/lib/yazili-rapor-hesap";
import { BG1_ALT, BLUSH, BORDER_STRONG, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";

const tarihTR = (iso: string) => {
  const [yil, ay, gun] = iso.split("-");
  return `${gun}.${ay}.${yil}`;
};
const sayi = (v: number) => v.toLocaleString("tr-TR", { maximumFractionDigits: 1 });

// Kullanıcı bulgusu (11.09.2026): "kaydedildi ama nerede olduğunu göremedim".
// Yazılı Analizi sekmesi artık önce kaydedilen yazılıları listeliyor; her
// satır A4 raporunu (/dashboard/yazili-analizi/[id]) açıyor. Yeni analiz
// sihirbazı "Yeni yazılı analizi" ile açılıyor.
export function YaziliAnaliziSekmesi({
  sinifOptions,
  dersOptions,
}: {
  sinifOptions?: { id: string; ad: string }[];
  dersOptions?: string[];
} = {}) {
  const [gorunum, setGorunum] = useState<"liste" | "yeni">("liste");
  const [sinavlar, setSinavlar] = useState<YaziliSinavOzeti[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, startYukleme] = useTransition();

  // Bu Next.js sürümünde useEffect'ten çağrılan server action'lar
  // startTransition içinde olmalı (bkz. KullaniciArama yorumu).
  const yukle = useCallback(() => {
    startYukleme(async () => {
      const sonuc = await yaziliSinavlariniListele();
      setHata(sonuc.error);
      setSinavlar(sonuc.sinavlar);
    });
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  if (gorunum === "yeni") {
    return (
      <div className="flex flex-col gap-4">
        <button type="button" onClick={() => { setGorunum("liste"); yukle(); }}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold" style={{ color: TEXT_MUTED }}>
          <ArrowLeft size={16} /> Kaydedilen yazılılar
        </button>
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
        <button type="button" onClick={() => setGorunum("yeni")} className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold">
          <Plus size={16} /> Yeni yazılı analizi
        </button>
      </div>

      {hata && <p className="text-sm" style={{ color: BLUSH }} role="alert">{hata}</p>}

      {sinavlar === null || (yukleniyor && sinavlar.length === 0) ? (
        <p className="text-sm" style={{ color: TEXT_MUTED }}>Yükleniyor…</p>
      ) : sinavlar.length === 0 ? (
        <p className="rounded-xl p-4 text-sm" style={{ border: `1px dashed ${BORDER_STRONG}`, color: TEXT_MUTED }}>
          Henüz kaydedilmiş yazılı analizi yok. &quot;Yeni yazılı analizi&quot; ile ilkini başlatın.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sinavlar.map((s) => (
            <li key={s.id}>
              <Link href={`/dashboard/yazili-analizi/${s.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-3"
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
