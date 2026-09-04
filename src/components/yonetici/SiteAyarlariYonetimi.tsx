"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Palette, Power, Settings2 } from "lucide-react";
import { siteKapaliDegistir, siteTemaRengiDegistir } from "@/app/yonetici/actions";
import { SITE_TEMA_PALETI } from "@/lib/site-tema";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// Faz 3 (2026-08-26 kullanıcı isteği) — "Site ayarları kategorisi
// eklenecek. Burada site açık kapalı butonu yer alacak. Site kapalıyken
// ekranda sadece logo yer alacak..." (bkz. SiteBakimdaEkrani, proxy.ts).
export function SiteAyarlariYonetimi({ kapaliBaslangic, temaRengiBaslangic }: { kapaliBaslangic: boolean; temaRengiBaslangic: string }) {
  const router = useRouter();
  const [kapali, setKapali] = useState(kapaliBaslangic);
  const [temaRengi, setTemaRengi] = useState(temaRengiBaslangic);
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<string | null>(null);

  function degistir() {
    const yeni = !kapali;
    if (yeni && !window.confirm("Site bakıma alınsın mı? Admin dışındaki tüm roller (öğrenci/veli/öğretmen/müdür) siteyi kullanamaz.")) return;
    setMesaj(null);
    startTransition(async () => {
      const r = await siteKapaliDegistir(yeni);
      if (r.error) return setMesaj(`Hata: ${r.error}`);
      setKapali(yeni);
      setMesaj(yeni ? "Site bakıma alındı." : "Site tekrar açıldı.");
      router.refresh();
    });
  }

  function renkSec(renk: string) {
    if (renk === temaRengi) return;
    setMesaj(null);
    startTransition(async () => {
      const r = await siteTemaRengiDegistir(renk);
      if (r.error) return setMesaj(`Hata: ${r.error}`);
      setTemaRengi(renk);
      setMesaj("Site teması güncellendi.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <Settings2 size={16} color={TEXT_MUTED} />
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Site ayarları</h2>
      </div>
      <div className="mt-3 rounded-2xl p-4" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div style={{ color: TEXT }} className="text-sm font-bold">Site {kapali ? "bakımda" : "açık"}</div>
            <p style={{ color: TEXT_MUTED }} className="text-xs mt-0.5 max-w-md">
              {kapali
                ? "Öğrenci/veli/öğretmen/müdür rolleri şu anda sadece logo ve bakım yazısı görüyor. Siz (admin) etkilenmezsiniz."
                : "Site normal çalışıyor. Bakıma aldığınızda tüm roller (admin hariç) bakım ekranıyla karşılanır."}
            </p>
          </div>
          <button type="button" disabled={pending} onClick={degistir}
            className="sfec-btn shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold disabled:opacity-60"
            style={{ background: kapali ? MINT : BG0, color: kapali ? MINT_ON : BLUSH, border: `2px solid ${kapali ? MINT : BLUSH}` }}>
            <Power size={13} /> {pending ? "İşleniyor..." : kapali ? "Siteyi aç" : "Siteyi bakıma al"}
          </button>
        </div>
      </div>
      <div className="mt-3 rounded-2xl p-4" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
        <div style={{ color: TEXT }} className="text-sm font-bold flex items-center gap-1.5">
          <Palette size={14} /> Tema rengi
        </div>
        <p style={{ color: TEXT_MUTED }} className="text-xs mt-0.5 max-w-md">
          Sitenin koyu ana temasının zemin rengini seçin. Koyudan açığa
          sıralanan pastel tonlar gece kullanımında gözü yormaz. Seçim tüm
          kullanıcılar için anında geçerli olur.
        </p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {SITE_TEMA_PALETI.map((t) => {
            const aktif = t.renk === temaRengi;
            return (
              <button
                key={t.renk}
                type="button"
                disabled={pending}
                onClick={() => renkSec(t.renk)}
                title={t.ad}
                aria-label={`Tema rengi: ${t.ad}`}
                className="relative flex flex-col items-center gap-1 disabled:opacity-60"
              >
                <span
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 40,
                    height: 40,
                    background: t.renk,
                    border: `2px solid ${aktif ? MINT : BORDER}`,
                    boxShadow: aktif ? `0 0 0 3px ${MINT}` : "none",
                  }}
                >
                  {aktif && <Check size={16} color={MINT} />}
                </span>
                <span style={{ color: aktif ? TEXT : TEXT_MUTED }} className="text-[10px] font-semibold">
                  {t.ad}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {mesaj && <p style={{ color: mesaj.startsWith("Hata") ? BLUSH : MINT }} className="text-xs font-semibold mt-2">{mesaj}</p>}
    </div>
  );
}
