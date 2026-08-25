"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { dershaneDenemeSuresiAyarla } from "@/app/yonetici/actions";
import { BG0, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_ON, BLUSH, TEXT, TEXT_MUTED } from "@/lib/theme";

// Datetime-local input'un beklediği format (yerel saat, saniyesiz).
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DershaneDenemeSuresiAyari({ bitis, doldu }: { bitis: string | null; doldu: boolean }) {
  const router = useRouter();
  const [deger, setDeger] = useState(isoToLocalInput(bitis));
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<string | null>(null);

  function kaydet(bitisIso: string | null) {
    setMesaj(null);
    startTransition(async () => {
      const sonuc = await dershaneDenemeSuresiAyarla(bitisIso);
      if (sonuc.error) return setMesaj(`Hata: ${sonuc.error}`);
      setMesaj("Kaydedildi.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-3xl p-5" style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <Clock size={16} color={doldu ? BLUSH : MINT} />
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Dershane deneme süresi</h2>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-xs mb-3">
        {bitis
          ? `${doldu ? "Süre doldu" : "Bitiş"}: ${new Date(bitis).toLocaleString("tr-TR")} — bu tarihten sonra dershane rolleri (öğrenci/veli/öğretmen/müdür) "deneme süreniz sona erdi" ekranıyla karşılanır.`
          : "Şu an süre sınırı yok — dershane modülü süresiz açık."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input type="datetime-local" value={deger} onChange={(e) => setDeger(e.target.value)}
          className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <button type="button" disabled={pending || !deger} onClick={() => kaydet(new Date(deger).toISOString())}
          className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          Kaydet
        </button>
        <button type="button" disabled={pending} onClick={() => { setDeger(""); kaydet(null); }}
          className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          Süreyi kaldır
        </button>
      </div>
      {mesaj && <p style={{ color: mesaj.startsWith("Hata") ? BLUSH : MINT }} className="text-xs font-semibold mt-2">{mesaj}</p>}
    </div>
  );
}
