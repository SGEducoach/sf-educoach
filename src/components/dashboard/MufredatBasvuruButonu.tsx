"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { BookOpenCheck } from "lucide-react";
import { BORDER, TEXT } from "@/lib/theme";

// Form ve konu önerileri her sayfada değil, yalnız ilk tıklamada yüklenir.
// Açılıştan sonra mounted kalır: kapatıp yeniden açmak taslağı silmez.
const BasvuruFormu = dynamic(() => import("./MufredatBasvuruFormu").then((m) => m.MufredatBasvuruFormu), {
  ssr: false, loading: () => <span role="status" className="text-xs" style={{ color: TEXT }}>Başvuru formu yükleniyor…</span>,
});

export function MufredatBasvuruButonu({ satir = false }: { satir?: boolean }) {
  const [acilisSayisi, setAcilisSayisi] = useState(0);
  return <>
    <button type="button" onClick={() => setAcilisSayisi((s) => s + 1)}
      aria-label="Müfredat düzeltme başvurusu" title="Müfredat düzeltme başvurusu"
      className={satir ? "sfec-btn flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-semibold"
        : "sfec-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-full"}
      style={{ color: TEXT, border: satir ? undefined : `2px solid ${BORDER}` }}>
      <BookOpenCheck size={16} aria-hidden="true" />{satir && "Müfredat düzeltme başvurusu"}
    </button>
    {acilisSayisi > 0 && <BasvuruFormu acilisSayisi={acilisSayisi} />}
  </>;
}
