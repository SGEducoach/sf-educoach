"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Radio } from "lucide-react";
import { tgDenemeAkisiOlustur } from "@/lib/tg-denemeleri";
import type { TgDenemeIlani } from "@/lib/tg-deneme-ilanlari";

// Ana Sayfa'ya TG Denemeleri canlı akışı (28.08.2026 kullanıcı isteği):
// "kendi anasayfa karşılamımız sabit diğerleri süreleri içerisinde dönsün,
// dışarıdan bakan adam burada neler döndüğünü görsün" — ana slider'ın
// (hero) ALTINDA, bilinçli olarak KÜÇÜK/ikincil bir şerit. Aynı birleşik
// veri kaynağını (statik takvimler + admin ilanları) kullanıyor — bkz.
// TgDenemeleri.tsx (dashboard içi tam sürüm). Deneme onayı bekleyen: sadece
// LOKALDE gösterip kullanıcı onayı bekleniyor, henüz canlıya alınmadı.
const LACIVERT = "#0F2540";
const TURKUAZ = "#14B8B0";
const METIN_GRI = "#5A6472";
const GECIS_SURESI_MS = 4500;

export function AnaSayfaTgAkisi({ dbIlanlar }: { dbIlanlar: TgDenemeIlani[] }) {
  const [aktif, setAktif] = useState(0);
  const haberler = tgDenemeAkisiOlustur(dbIlanlar).slice(0, 8);
  const haber = haberler[aktif % Math.max(1, haberler.length)];

  useEffect(() => {
    if (haberler.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const zamanlayici = window.setInterval(() => setAktif((i) => (i + 1) % haberler.length), GECIS_SURESI_MS);
    return () => window.clearInterval(zamanlayici);
  }, [haberler.length]);

  if (haberler.length === 0) return null;

  return (
    <section className="border-y border-[#E4E9EE] bg-[#F7FAFB] px-5 py-8 sm:h-full sm:border-y-0 sm:bg-transparent sm:px-0 sm:py-0">
      {/* Görsel soldaki yüksekliği kullanır; tarih ve başlık sağında
          ortalanır. Mobilde görsel ve başlık alt alta kalır. */}
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:h-full sm:max-w-none sm:gap-1.5">
          <div className="flex shrink-0 items-center gap-2">
            <Radio size={15} color={TURKUAZ} aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: TURKUAZ }}>Platformda Şu An</span>
          </div>
        <div className="flex flex-col gap-4 sm:min-h-0 sm:flex-1 sm:gap-3">
          <div key={haber.id} className="sfec-tg-haber-gir flex flex-col items-center gap-3 sm:min-h-0 sm:flex-1 sm:flex-row sm:items-stretch">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl sm:aspect-auto sm:min-h-24 sm:w-1/2 sm:shrink-0" style={{ background: "#E4E9EE" }}>
              {haber.dosyaTipi === "pdf" ? (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: METIN_GRI }}>PDF</div>
              ) : (
                // Performans (2026-09-04): remotePatterns eklendiğinden artık
                // next/image kullanılabiliyor — kartın altında kalan küçük
                // görsel, lazy yeterli.
                <Image src={haber.gorsel} alt="" fill className="object-contain" sizes="(max-width: 640px) 90vw, 40vw" />
              )}
            </div>
            <div className="flex w-full min-w-0 flex-col gap-3 text-center sm:min-h-0 sm:flex-1">
              <div className="flex flex-col justify-center sm:min-h-0 sm:flex-1 sm:overflow-y-auto">
                <div className="text-[11px] font-bold" style={{ color: TURKUAZ }}>{haber.tarihEtiketi}</div>
                <h3 className="mt-0.5 text-sm font-bold sm:text-base" style={{ color: LACIVERT }}>{haber.baslik}</h3>
              </div>
              {haber.aciklama && (
                <p className="max-h-16 shrink-0 overflow-y-auto whitespace-pre-line break-words text-center text-xs leading-4" style={{ color: METIN_GRI }}>
                  {haber.aciklama}
                </p>
              )}
            </div>
          </div>
        </div>

        {haberler.length > 1 && (
          <div className="flex shrink-0 items-center justify-center gap-1.5">
            {haberler.map((h, i) => (
              <button key={h.id} type="button" onClick={() => setAktif(i)} aria-label={`${i + 1}. habere git`} aria-current={i === aktif ? "true" : undefined}
                className="sfec-btn h-1.5 rounded-full" style={{ width: i === aktif ? 16 : 6, background: i === aktif ? TURKUAZ : "#D5DCE1" }} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
