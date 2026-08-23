"use client";

import { School, BookOpenCheck } from "lucide-react";
import type { KurumTuru } from "@/lib/types";
import { BORDER, MINT, MINT_ON, TEXT_MUTED } from "@/lib/theme";

const SECENEKLER: { id: KurumTuru; ad: string; icon: typeof School }[] = [
  { id: "okul", ad: "Okul", icon: School },
  { id: "dershane", ad: "Dershane", icon: BookOpenCheck },
];

// Login/Signup'ın en üstünde, rol seçiminden önce gösterilen okul/dershane
// toggle'ı — mevcut rol-pill görünümüyle birebir aynı (bkz. LoginForm.tsx).
export function KurumTuruSecici({ deger, onChange }: { deger: KurumTuru; onChange: (t: KurumTuru) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
      {SECENEKLER.map((s) => {
        const Icon = s.icon;
        const aktif = deger === s.id;
        return (
          <button key={s.id} type="button" onClick={() => onChange(s.id)}
            className="sfec-btn flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-[12px] font-bold"
            style={{ background: aktif ? MINT : "transparent", color: aktif ? MINT_ON : TEXT_MUTED }}>
            <Icon size={13} /> {s.ad}
          </button>
        );
      })}
    </div>
  );
}
