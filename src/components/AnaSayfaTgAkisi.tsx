"use client";

import { useEffect, useState } from "react";
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
  const haber = haberler[aktif];

  useEffect(() => {
    if (haberler.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const zamanlayici = window.setInterval(() => setAktif((i) => (i + 1) % haberler.length), GECIS_SURESI_MS);
    return () => window.clearInterval(zamanlayici);
  }, [haberler.length]);

  if (haberler.length === 0) return null;

  return (
    <section className="border-y px-5 py-8 sm:px-10" style={{ borderColor: "#E4E9EE", background: "#F7FAFB" }}>
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="flex items-center gap-2">
          <Radio size={15} color={TURKUAZ} aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: TURKUAZ }}>Platformda Şu An</span>
        </div>

        <div key={haber.id} className="sfec-tg-haber-gir flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-32" style={{ background: "#E4E9EE" }}>
            {haber.dosyaTipi === "pdf" ? (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold" style={{ color: METIN_GRI }}>PDF</div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- next/image harici Storage domainini reddediyor (bkz. TgDenemeleri.tsx)
              <img src={haber.gorsel} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="text-[11px] font-bold" style={{ color: TURKUAZ }}>{haber.tarihEtiketi}</div>
            <h3 className="mt-0.5 truncate text-sm font-bold sm:text-base" style={{ color: LACIVERT }}>{haber.baslik}</h3>
          </div>
        </div>

        {haberler.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 sm:justify-start">
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
