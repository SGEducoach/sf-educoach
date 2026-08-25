"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BedDouble } from "lucide-react";
import { yurtNobetiKaydet } from "@/app/dashboard/ders-programi-actions";
import { YURT_NOBETI_SIRA_SAYISI, YURT_NOBETI_SUTUN_SAYISI } from "@/lib/ders-programi";
import type { YurtNobetiSatiri } from "@/lib/ders-programi";
import { bugununTarihiTR } from "@/lib/tarih";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

// Yurt Nöbeti (2026-08-25 kullanıcı isteği, "okul için sadece") — 2 sütun
// × 6 bölümlük basit bir tarih defteri, öğretmen kendi nöbet tarihlerini
// kendisi girer (bkz. migration 0066 yorumu — "Girdiğim sınıflar ve
// derslerim" ile aynı öz-yönetim deseni). Boş şablon: veri zamanla girilir.
export function YurtNobetiTablosu({ satirlar, duzenlenebilir = true }: { satirlar: YurtNobetiSatiri[]; duzenlenebilir?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const harita = new Map<string, YurtNobetiSatiri>();
  for (const s of satirlar) harita.set(`${s.sutun}|${s.sira}`, s);
  const bugun = bugununTarihiTR();

  function degistir(sutun: number, sira: number, tarih: string) {
    startTransition(async () => {
      await yurtNobetiKaydet(sutun, sira, tarih || null);
      router.refresh();
    });
  }

  return (
    <div className="rounded-3xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="mb-3 flex items-center gap-2">
        <BedDouble size={15} color={TEXT_MUTED} />
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-sm font-bold">Yurt Nöbeti</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: YURT_NOBETI_SUTUN_SAYISI }, (_, i) => i + 1).map((sutun) => (
          <div key={sutun} className="flex flex-col gap-1.5">
            {Array.from({ length: YURT_NOBETI_SIRA_SAYISI }, (_, i) => i + 1).map((sira) => {
              const kayit = harita.get(`${sutun}|${sira}`);
              // Tutulmuş nöbet (tarihi geçmiş) renk değiştirsin — MINT ile
              // "tamamlandı" hissi, uygulamanın geri kalanındaki
              // DURUM_RENK.tamamlandi deseniyle aynı (bkz. Gorevlerim.tsx).
              const tutuldu = !!kayit?.tarih && kayit.tarih < bugun;
              if (!duzenlenebilir) {
                return (
                  <div key={sira} className="text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ border: `2px solid ${tutuldu ? MINT : BORDER_STRONG}`, background: tutuldu ? MINT_BG : BG0, color: kayit?.tarih ? TEXT : TEXT_MUTED }}>
                    {kayit?.tarih ? new Date(`${kayit.tarih}T00:00:00`).toLocaleDateString("tr-TR") : "—"}
                  </div>
                );
              }
              return (
                <input key={sira} type="date" disabled={pending} defaultValue={kayit?.tarih ?? ""}
                  onBlur={(e) => degistir(sutun, sira, e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg outline-none disabled:opacity-60"
                  style={{ border: `2px solid ${tutuldu ? MINT : BORDER_STRONG}`, background: tutuldu ? MINT_BG : BG0, color: TEXT }} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
