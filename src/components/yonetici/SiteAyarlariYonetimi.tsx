"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, Settings2 } from "lucide-react";
import { siteKapaliDegistir } from "@/app/yonetici/actions";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// Faz 3 (2026-08-26 kullanıcı isteği) — "Site ayarları kategorisi
// eklenecek. Burada site açık kapalı butonu yer alacak. Site kapalıyken
// ekranda sadece logo yer alacak..." (bkz. SiteBakimdaEkrani, proxy.ts).
export function SiteAyarlariYonetimi({ kapaliBaslangic }: { kapaliBaslangic: boolean }) {
  const router = useRouter();
  const [kapali, setKapali] = useState(kapaliBaslangic);
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
      {mesaj && <p style={{ color: mesaj.startsWith("Hata") ? BLUSH : MINT }} className="text-xs font-semibold mt-2">{mesaj}</p>}
    </div>
  );
}
