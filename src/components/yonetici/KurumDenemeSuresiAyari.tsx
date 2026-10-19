"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { kurumDenemeSuresiAyarla } from "@/app/yonetici/kurum-yetki-actions";
import { suresiDolduMu } from "@/lib/deneme-suresi";
import { BG0, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_ON, BLUSH, TEXT, TEXT_MUTED } from "@/lib/theme";

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function KurumDenemeSuresiAyari({ okulId, bitis }: { okulId: string; bitis: string | null }) {
  const router = useRouter();
  const [deger, setDeger] = useState(isoToLocalInput(bitis));
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<string | null>(null);
  const doldu = suresiDolduMu(bitis);

  function kaydet(bitisIso: string | null) {
    setMesaj(null);
    startTransition(async () => {
      const sonuc = await kurumDenemeSuresiAyarla(okulId, bitisIso);
      if (sonuc.error) return setMesaj(`Hata: ${sonuc.error}`);
      setMesaj("Kaydedildi.");
      router.refresh();
    });
  }

  function tarihKaydet() {
    const tarih = new Date(deger);
    if (!Number.isFinite(tarih.getTime())) return setMesaj("Hata: Geçerli bir bitiş tarihi girin.");
    kaydet(tarih.toISOString());
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
      <div className="mb-1 flex items-center gap-2">
        <Clock size={16} color={doldu ? BLUSH : MINT} />
        <h2 className="text-sm font-bold" style={{ color: TEXT }}>Deneme süresi</h2>
      </div>
      <p className="mb-3 text-xs" style={{ color: TEXT_MUTED }}>
        {bitis
          ? `${doldu ? "Süre doldu" : "Bitiş"}: ${new Date(bitis).toLocaleString("tr-TR")}. Bu tarihten sonra bu kuruma bağlı kullanıcılar giriş yapamaz.`
          : "Bu kurum için deneme süresi sınırı yok. Tarih girildiğinde yalnız bu kuruma uygulanır."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input type="datetime-local" aria-label="Deneme bitiş tarihi ve saati" value={deger} onChange={(e) => setDeger(e.target.value)}
          className="rounded-xl px-3 py-2 text-sm outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <button type="button" disabled={pending || !deger} onClick={tarihKaydet}
          className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          Kaydet
        </button>
        <button type="button" disabled={pending || !bitis} onClick={() => { setDeger(""); kaydet(null); }}
          className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          Süreyi kaldır
        </button>
      </div>
      {mesaj && <p role="status" className="mt-2 text-xs font-semibold" style={{ color: mesaj.startsWith("Hata") ? BLUSH : MINT }}>{mesaj}</p>}
    </div>
  );
}
