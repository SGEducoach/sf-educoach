"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, Save } from "lucide-react";
import { yurtNobetiKaydet } from "@/app/dashboard/ders-programi-actions";
import { YURT_NOBETI_SIRA_SAYISI, YURT_NOBETI_SUTUN_SAYISI } from "@/lib/ders-programi";
import type { YurtNobetiSatiri } from "@/lib/ders-programi";
import { bugununTarihiTR } from "@/lib/tarih";
import { BG0, BG1, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// Yurt Nöbeti (2026-08-25 kullanıcı isteği, "okul için sadece") — 2 sütun
// × 6 bölümlük basit bir tarih defteri, öğretmen kendi nöbet tarihlerini
// kendisi girer (bkz. migration 0066 yorumu — "Girdiğim sınıflar ve
// derslerim" ile aynı öz-yönetim deseni). Boş şablon: veri zamanla girilir.
//
// 2026-08-25 kullanıcı isteği (Faz 1, madde 3): hücreler artık her
// onBlur'da anında kaydetmiyor ("anında kaydetmesin") — tüm değişiklikler
// yerel taslak state'inde tutulup sağ altta beliren "Kaydet" butonuna
// basılınca TEK SEFERDE (sadece değişen hücreler) gönderiliyor.
function anahtar(sutun: number, sira: number) {
  return `${sutun}-${sira}`;
}

export function YurtNobetiTablosu({ satirlar, duzenlenebilir = true }: { satirlar: YurtNobetiSatiri[]; duzenlenebilir?: boolean }) {
  const router = useRouter();
  const [kaydediliyor, startTransition] = useTransition();
  const bugun = bugununTarihiTR();

  const kayitliHarita = useMemo(() => {
    const h = new Map<string, string>();
    for (const s of satirlar) h.set(anahtar(s.sutun, s.sira), s.tarih ?? "");
    return h;
  }, [satirlar]);

  const [taslak, setTaslak] = useState<Record<string, string>>({});
  const [hata, setHata] = useState<string | null>(null);

  function degerOku(sutun: number, sira: number): string {
    const k = anahtar(sutun, sira);
    return k in taslak ? taslak[k] : (kayitliHarita.get(k) ?? "");
  }

  function degistir(sutun: number, sira: number, tarih: string) {
    setHata(null);
    setTaslak((onceki) => ({ ...onceki, [anahtar(sutun, sira)]: tarih }));
  }

  const degisenler = Object.entries(taslak).filter(([k, v]) => (kayitliHarita.get(k) ?? "") !== v);
  const kirliMi = degisenler.length > 0;

  function kaydet() {
    if (!kirliMi) return;
    setHata(null);
    startTransition(async () => {
      const sonuclar = await Promise.all(
        degisenler.map(([k, tarih]) => {
          const [sutun, sira] = k.split("-").map(Number);
          return yurtNobetiKaydet(sutun, sira, tarih || null);
        })
      );
      const ilkHata = sonuclar.find((r) => r.error);
      if (ilkHata) return setHata(ilkHata.error);
      setTaslak({});
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
              const tarih = degerOku(sutun, sira);
              // Tutulmuş nöbet (tarihi geçmiş) renk değiştirsin — MINT ile
              // "tamamlandı" hissi, uygulamanın geri kalanındaki
              // DURUM_RENK.tamamlandi deseniyle aynı (bkz. Gorevlerim.tsx).
              const tutuldu = !!tarih && tarih < bugun;
              if (!duzenlenebilir) {
                return (
                  <div key={sira} className="text-xs px-2.5 py-1.5 rounded-lg"
                    style={{ border: `2px solid ${tutuldu ? MINT : BORDER_STRONG}`, background: tutuldu ? MINT_BG : BG0, color: tarih ? TEXT : TEXT_MUTED }}>
                    {tarih ? new Date(`${tarih}T00:00:00`).toLocaleDateString("tr-TR") : "—"}
                  </div>
                );
              }
              const degisti = anahtar(sutun, sira) in taslak && taslak[anahtar(sutun, sira)] !== (kayitliHarita.get(anahtar(sutun, sira)) ?? "");
              return (
                <input key={sira} type="date" disabled={kaydediliyor} value={tarih}
                  onChange={(e) => degistir(sutun, sira, e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg outline-none disabled:opacity-60"
                  style={{ border: `2px solid ${degisti ? TEXT : tutuldu ? MINT : BORDER_STRONG}`, background: tutuldu ? MINT_BG : BG0, color: TEXT }} />
              );
            })}
          </div>
        ))}
      </div>

      {duzenlenebilir && (
        <div className="mt-3 flex items-center justify-end gap-2">
          {hata && <span style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</span>}
          <button type="button" onClick={kaydet} disabled={!kirliMi || kaydediliyor}
            className="sfec-btn flex items-center gap-1.5 text-[12px] font-bold px-4 py-2 rounded-full disabled:opacity-50"
            style={{ background: MINT, color: MINT_ON }}>
            <Save size={13} /> {kaydediliyor ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      )}
    </div>
  );
}
