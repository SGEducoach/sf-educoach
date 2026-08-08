"use client";

import { useState, useTransition } from "react";
import { Megaphone, Send } from "lucide-react";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

const MAKS_UZUNLUK = 500;

// Öğrenci + bağlı veliye push bildirimi olarak giden serbest metin duyuru.
// Kapsam (kime gideceği) tamamen server-side belirleniyor — bu bileşen
// sadece mesajı alıp verilen `gonder` action'ına iletiyor, admin/müdür/
// öğretmen sürümleri arasındaki tek fark hangi action'ın bağlandığı.
export function DuyuruFormu({
  baslik, aciklama, gonder,
}: {
  baslik: string;
  aciklama: string;
  gonder: (mesaj: string) => Promise<{ error: string | null; ogrenciSayisi: number; veliSayisi: number }>;
}) {
  const [mesaj, setMesaj] = useState("");
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
      const res = await gonder(temiz);
      if (res.error) return setHata(res.error);
      setBasari(`Gönderildi — ${res.ogrenciSayisi} öğrenci, ${res.veliSayisi} veliye ulaştı.`);
      setMesaj("");
    });
  }

  return (
    <div className="sgec-fade rounded-3xl p-5 print:hidden" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: MINT_BG }}>
          <Megaphone size={13} color={MINT} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">{baslik}</span>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-[11px] mb-3">{aciklama}</p>
      <form onSubmit={gonderTikla} className="flex flex-col gap-2">
        <textarea
          value={mesaj}
          onChange={(e) => setMesaj(e.target.value.slice(0, MAKS_UZUNLUK))}
          rows={2}
          placeholder="örn. Sevgili öğrenciler, yarınki denemede başarılar dilerim."
          className="text-sm px-3 py-2 rounded-xl outline-none resize-none"
          style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}
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
