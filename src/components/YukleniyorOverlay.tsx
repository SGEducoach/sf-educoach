"use client";

import { Loader2 } from "lucide-react";
import { BG0, TEXT } from "@/lib/theme";

// Bir işlem sürerken ekranın ortasında beliren, tam ekran bir yükleniyor
// göstergesi. Kullanıcının "çalışmıyor" sanıp butona defalarca basmasını
// önlemek için — buton zaten disabled oluyor ama bu görsel olarak çok daha
// belirgin. `visible` false iken hiçbir şey render etmiyor.
export function YukleniyorOverlay({ visible, mesaj }: { visible: boolean; mesaj?: string }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3" style={{ background: "rgba(21,23,42,0.55)", backdropFilter: "blur(1px)" }}>
      <div className="rounded-full p-4" style={{ background: BG0, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
        <Loader2 size={32} color={TEXT} className="animate-spin" />
      </div>
      {mesaj && <span style={{ color: TEXT }} className="text-sm font-semibold">{mesaj}</span>}
    </div>
  );
}
