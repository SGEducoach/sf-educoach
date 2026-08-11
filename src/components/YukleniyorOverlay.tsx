"use client";

import { Loader2 } from "lucide-react";
import { BG1, BORDER_STRONG, MINT, TEXT } from "@/lib/theme";

// Bir işlem sürerken ekranın ortasında beliren, tam ekran bir yükleniyor
// göstergesi. Kullanıcının "çalışmıyor" sanıp butona defalarca basmasını
// önlemek için — buton zaten disabled oluyor ama bu görsel olarak çok daha
// belirgin. `visible` false iken hiçbir şey render etmiyor.
export function YukleniyorOverlay({ visible, mesaj }: { visible: boolean; mesaj?: string }) {
  if (!visible) return null;
  return (
    <div className="sgec-loading-overlay fixed inset-0 z-[500] flex flex-col items-center justify-center gap-3" aria-live="polite" aria-busy="true">
      <div className="rounded-full p-4" style={{ background: BG1, border: `2px solid ${BORDER_STRONG}`, boxShadow: "0 8px 24px rgba(13,148,136,0.22)" }}>
        <Loader2 size={34} color={MINT} className="animate-spin" />
      </div>
      {mesaj && <span style={{ color: TEXT }} className="text-sm font-semibold">{mesaj}</span>}
    </div>
  );
}
