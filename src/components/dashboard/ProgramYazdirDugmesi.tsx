"use client";

import { Printer } from "lucide-react";

// Çıktı sayfasının kendi yazdırma düğmesi — yazdırırken gizlenir.
export function ProgramYazdirDugmesi() {
  return (
    <button type="button" onClick={() => window.print()} className="sfec-yazdir-dugme">
      <Printer size={14} /> Yazdır / PDF kaydet
    </button>
  );
}
