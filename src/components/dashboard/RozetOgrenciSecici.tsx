"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { RozetOgrencisi } from "@/lib/rozet-gorunumu";
import { BG1_ALT, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// Bulgu 05 — önceden gerçek bir <form method="get"> tam sayfa (tarayıcı)
// yönlendirmesi yapıyordu: eski sayfa kapanıp yenisinin HTML'i sunucudan
// gelene kadar kısa bir beyaz ekran oluşuyordu. router.push ile sayfa hiç
// kapanmadan, sadece arama parametreleri güncellenip veri tazeleniyor.
export function RozetOgrenciSecici({ action, ogrenciler, siniflar, seciliSinifId, seciliOgrenciId, gizliAlanlar }: {
  action: string;
  ogrenciler: RozetOgrencisi[];
  siniflar: { id: string; ad: string }[];
  seciliSinifId: string;
  seciliOgrenciId?: string;
  gizliAlanlar: Record<string, string>;
}) {
  const router = useRouter();
  const [sinifId, setSinifId] = useState(seciliSinifId);
  const filtreliOgrenciler = useMemo(() => sinifId === "tumu" ? ogrenciler : ogrenciler.filter((ogrenci) => ogrenci.sinifId === sinifId), [ogrenciler, sinifId]);
  const seciliGecerli = filtreliOgrenciler.some((ogrenci) => ogrenci.id === seciliOgrenciId);
  const [ogrenciId, setOgrenciId] = useState(seciliGecerli ? seciliOgrenciId : filtreliOgrenciler[0]?.id);
  const etkinOgrenciId = filtreliOgrenciler.some((ogrenci) => ogrenci.id === ogrenciId) ? ogrenciId : filtreliOgrenciler[0]?.id;

  function git(e: React.FormEvent) {
    e.preventDefault();
    if (!etkinOgrenciId) return;
    const params = new URLSearchParams({ ...gizliAlanlar, sinif: sinifId, ogrenci: etkinOgrenciId });
    router.push(`${action}?${params.toString()}`);
  }

  return (
    <form onSubmit={git} className="mt-5 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(150px,0.55fr)_minmax(0,1fr)_auto]">
      <label>
        <span className="sr-only">Sınıf seçin</span>
        <select name="sinif" value={sinifId} onChange={(event) => { setSinifId(event.target.value); setOgrenciId(undefined); }}
          className="w-full rounded-xl px-3 py-3 text-sm font-semibold outline-none" style={{ color: TEXT, background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
          <option value="tumu">Tüm sınıflar</option>
          {siniflar.map((sinif) => <option key={sinif.id} value={sinif.id}>{sinif.ad}</option>)}
        </select>
      </label>
      <label className="relative min-w-0">
        <Search size={15} color={TEXT_MUTED} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
        <span className="sr-only">Öğrenci seçin</span>
        <select name="ogrenci" value={etkinOgrenciId ?? ""} onChange={(event) => setOgrenciId(event.target.value)}
          className="w-full appearance-none rounded-xl py-3 pl-9 pr-3 text-sm font-semibold outline-none"
          style={{ color: TEXT, background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
          {filtreliOgrenciler.map((ogrenci) => <option key={ogrenci.id} value={ogrenci.id}>{ogrenci.ad} · #{ogrenci.okulNo}</option>)}
        </select>
      </label>
      <button type="submit" disabled={!etkinOgrenciId} className="sfec-btn rounded-xl px-5 py-3 text-sm font-extrabold disabled:opacity-45" style={{ color: MINT_ON, background: MINT }}>
        Rozetleri göster
      </button>
    </form>
  );
}
