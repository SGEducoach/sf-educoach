"use client";

import { useState } from "react";
import { UserRoundCog } from "lucide-react";
import { KullaniciDetayYonetimi } from "@/components/yonetici/KullaniciDetayYonetimi";
import type { KullaniciSonuc } from "@/app/yonetici/actions";
import { MINT, MINT_ON, TEXT, BORDER_STRONG } from "@/lib/theme";

// Kullanıcı isteği (26.08.2026): kullanıcı profili görüntülenirken üstte
// "Profili Yönet" butonu — tıklanınca KullaniciArama'daki ile aynı düzenleme
// formu (KullaniciDetayYonetimi) bu sayfada da açılabiliyor.
export function ProfiliYonetToggle({ kullanici }: { kullanici: KullaniciSonuc }) {
  const [acik, setAcik] = useState(false);
  return (
    <div className="flex flex-col items-end gap-3 w-full sm:w-auto">
      <button type="button" onClick={() => setAcik((v) => !v)}
        className="sfec-btn flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold"
        style={{ background: acik ? MINT : "rgba(255,255,255,0.06)", color: acik ? MINT_ON : TEXT, border: `2px solid ${BORDER_STRONG}` }}>
        <UserRoundCog size={14} /> Profili Yönet
      </button>
      {acik && <div className="w-full"><KullaniciDetayYonetimi kullanici={kullanici} /></div>}
    </div>
  );
}
