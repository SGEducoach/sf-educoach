"use client";

import { Loader2 } from "lucide-react";
import { BG1, BORDER_STRONG, MINT, TEXT } from "@/lib/theme";

// Bir işlem sürerken ekranın sağ alt köşesinde beliren küçük bir yükleniyor
// rozeti. Bulgu 07 — önceden tüm ekranı kaplayan, çok yüksek katmanda
// (z-500) bir gösterge vardı; bu, örn. "Plan eklendi ✓" gibi anlık bir
// onay kutusunun tam o sırada belirmesi durumunda onu tamamen gizliyor,
// overlay kapandığında da onayın kendi süresi zaten dolmuş oluyordu.
// Köşeye küçültülmüş rozet hem hâlâ görünür bir "sürüyor" sinyali verir
// hem de altındaki hiçbir şeyi kapatmaz. `visible` false iken hiçbir şey
// render etmiyor.
export function YukleniyorOverlay({ visible, mesaj }: { visible: boolean; mesaj?: string }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[500] flex items-center gap-2.5 rounded-full py-2.5 pl-3 pr-4 sm:bottom-6 sm:right-6"
      style={{ background: BG1, border: `2px solid ${BORDER_STRONG}`, boxShadow: "0 8px 24px rgba(13,148,136,0.22)" }}
      aria-live="polite" aria-busy="true">
      <Loader2 size={18} color={MINT} className="animate-spin shrink-0" />
      <span style={{ color: TEXT }} className="text-xs font-semibold">{mesaj ?? "İşlem sürüyor..."}</span>
    </div>
  );
}
