"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { dershaneSinifEkle } from "@/app/dashboard/actions";
import { BG0, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

// DERSHANE MODU — müdür kendi şubelerini (haftaiçi/haftasonu etiketiyle)
// kendi kurabiliyor (okulda bu admin-only) — öğrenci roster'ına atanacak
// bir sınıf olmadan öğrenci eklenemediği için gerekli.
export function DershaneSinifEkleFormu() {
  const router = useRouter();
  const [seviye, setSeviye] = useState<"9" | "10" | "11" | "12">("11");
  const [sube, setSube] = useState("");
  const [program, setProgram] = useState<"haftaici" | "haftasonu">("haftaici");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setYukleniyor(true);
    const sonuc = await dershaneSinifEkle({ seviye, sube, program });
    setYukleniyor(false);
    if (sonuc.error) return setHata(sonuc.error);
    setSube("");
    router.refresh();
  }

  return (
    <form onSubmit={ekle} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1">
        <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Seviye</span>
        <select value={seviye} onChange={(e) => setSeviye(e.target.value as typeof seviye)}
          className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          {(["9", "10", "11", "12"] as const).map((s) => <option key={s} value={s}>{s}. Sınıf</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Şube</span>
        <input required value={sube} placeholder="örn. A" onChange={(e) => setSube(e.target.value)}
          className="w-20 text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
      </label>
      <label className="flex flex-col gap-1">
        <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Program</span>
        <select value={program} onChange={(e) => setProgram(e.target.value as typeof program)}
          className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          <option value="haftaici">Hafta İçi</option>
          <option value="haftasonu">Hafta Sonu</option>
        </select>
      </label>
      <button type="submit" disabled={yukleniyor}
        className="sfec-btn flex items-center gap-1 text-sm font-bold px-3 py-2.5 rounded-xl disabled:opacity-60"
        style={{ background: MINT, color: MINT_ON }}>
        <Plus size={15} /> {yukleniyor ? "Ekleniyor..." : "Şube ekle"}
      </button>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold basis-full">{hata}</div>}
    </form>
  );
}
