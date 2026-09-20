"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Trash2 } from "lucide-react";
import { ogrenciYonetimKaydiSil } from "@/app/yonetici/actions";
import type { OgrenciKayitTuru } from "@/app/yonetici/actions";
import { BG1, BLUSH, BORDER, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";

export interface YoneticiOgrenciVeriKaydi {
  id: string;
  tur: OgrenciKayitTuru;
  metin: string;
}

export function OgrenciVeriKayitlari({ gruplar }: {
  gruplar: { baslik: string; kayitlar: YoneticiOgrenciVeriKaydi[] }[];
}) {
  const router = useRouter();
  const [silinenler, setSilinenler] = useState<Set<string>>(new Set());
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sil(kayit: YoneticiOgrenciVeriKaydi) {
    if (!window.confirm(`Bu ${kayit.tur} kaydı kalıcı olarak silinsin mi?\n\n${kayit.metin}`)) return;
    setHata(null);
    startTransition(async () => {
      const sonuc = await ogrenciYonetimKaydiSil(kayit.id, kayit.tur);
      if (sonuc.error) return setHata(sonuc.error);
      setSilinenler((mevcut) => new Set(mevcut).add(kayit.id));
      router.refresh();
    });
  }

  return (
    <>
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {gruplar.map((grup) => {
          const gorunenler = grup.kayitlar.filter((kayit) => !silinenler.has(kayit.id));
          return (
            <div key={grup.baslik} className="rounded-2xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
              <h3 className="mb-3 text-sm font-bold" style={{ color: TEXT }}>{grup.baslik}</h3>
              <div className="sfec-liste max-h-96 overflow-y-auto">
                {gorunenler.length === 0 && <span className="text-xs" style={{ color: TEXT_MUTED }}>Kayıt yok.</span>}
                {gorunenler.map((kayit) => (
                  <div key={kayit.id} className="sfec-liste-satiri flex items-start gap-2 px-2 py-2.5 text-xs" style={{ color: TEXT_MUTED }}>
                    <Clock3 size={13} color={MINT} className="mt-0.5 shrink-0" />
                    <span className="min-w-0 flex-1">{kayit.metin}</span>
                    <button type="button" onClick={() => sil(kayit)} disabled={pending} title="Bu kaydı kalıcı olarak sil"
                      className="sfec-btn inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold disabled:opacity-50"
                      style={{ color: BLUSH, border: `1px solid ${BLUSH}` }}>
                      <Trash2 size={11} /> Sil
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
      {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
    </>
  );
}
