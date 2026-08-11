"use client";

import { useState, useTransition } from "react";
import { Megaphone, Send } from "lucide-react";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

const MAKS_UZUNLUK = 500;

export interface KapsamSecenegi {
  deger: string;
  etiket: string;
}

// Öğrenci + bağlı veliye push bildirimi olarak giden serbest metin duyuru.
// Kapsam (kime gideceği) tamamen server-side belirleniyor/doğrulanıyor —
// bu bileşen sadece mesajı (ve seçiliyse bir kapsam değerini) alıp verilen
// `gonder` action'ına iletiyor. kapsamSecenekleri verilmezse (öğretmen,
// admin) kapsam seçici hiç gösterilmiyor — o rollerde kapsam zaten sabit.
export function DuyuruFormu({
  baslik, aciklama, gonder, kapsamSecenekleri,
}: {
  baslik: string;
  aciklama: string;
  gonder: (mesaj: string, kapsam?: string) => Promise<{ error: string | null; ogrenciSayisi: number; veliSayisi: number }>;
  kapsamSecenekleri?: KapsamSecenegi[];
}) {
  const [mesaj, setMesaj] = useState("");
  const [kapsam, setKapsam] = useState(kapsamSecenekleri?.[0]?.deger ?? "");
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function gonderTikla(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasari(null);
    const temiz = mesaj.trim();
    if (!temiz) return setHata("Mesaj boş olamaz.");
    startTransition(async () => {
      const res = await gonder(temiz, kapsamSecenekleri ? kapsam : undefined);
      if (res.error) return setHata(res.error);
      setBasari(`Gönderildi — ${res.ogrenciSayisi} öğrenci, ${res.veliSayisi} veliye ulaştı.`);
      setMesaj("");
    });
  }

  return (
    <div className="sgec-fade rounded-3xl p-5 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: MINT_BG }}>
          <Megaphone size={13} color={MINT} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">{baslik}</span>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-[11px] mb-3">{aciklama}</p>
      <form onSubmit={gonderTikla} className="flex flex-col gap-2">
        {kapsamSecenekleri && kapsamSecenekleri.length > 0 && (
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Kime gitsin</span>
            <select value={kapsam} onChange={(e) => setKapsam(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
              {kapsamSecenekleri.map((k) => <option key={k.deger} value={k.deger}>{k.etiket}</option>)}
            </select>
          </label>
        )}
        <textarea
          value={mesaj}
          onChange={(e) => setMesaj(e.target.value.slice(0, MAKS_UZUNLUK))}
          rows={2}
          placeholder="örn. Sevgili öğrenciler, yarınki denemede başarılar dilerim."
          className="text-sm px-3 py-2 rounded-xl outline-none resize-none"
          style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}
        />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span style={{ color: TEXT_MUTED }} className="text-[10px]">{mesaj.length}/{MAKS_UZUNLUK}</span>
          <button type="submit" disabled={pending || !mesaj.trim()}
            className="sgec-btn flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full disabled:opacity-50"
            style={{ background: MINT, color: MINT_ON }}>
            <Send size={13} /> {pending ? "Gönderiliyor..." : "Bildirim olarak gönder"}
          </button>
        </div>
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        {basari && <div style={{ color: MINT }} className="text-xs font-semibold">{basari}</div>}
      </form>
    </div>
  );
}
