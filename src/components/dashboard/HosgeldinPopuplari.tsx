"use client";

import { useEffect, useState } from "react";
import { Heart, Smartphone, BellOff, X } from "lucide-react";
import { BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import type { UserRole } from "@/lib/types";

const HOSGELDIN_ANAHTAR = "sgec_hosgeldin_kapatildi_v1";
const HATIRLATMA_ANAHTAR = "sgec_hatirlatma_kapatildi_v1";

// Veli ve öğrenciye, dashboard'a her girişte (kalıcı olarak kapatmadıkları
// sürece) sırayla iki pop-up gösterir: önce hoşgeldin/tanıtım mesajı, o
// kapatılınca ana ekrana ekleme/bildirim hatırlatması.
export function HosgeldinPopuplari({ role, ad }: { role: UserRole; ad: string }) {
  const [asama, setAsama] = useState<"hosgeldin" | "hatirlatma" | null>(null);

  useEffect(() => {
    if (role !== "veli" && role !== "ogrenci") return;
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(HOSGELDIN_ANAHTAR) !== "1") { setAsama("hosgeldin"); return; }
      if (localStorage.getItem(HATIRLATMA_ANAHTAR) !== "1") { setAsama("hatirlatma"); }
    } catch { /* localStorage kullanılamıyorsa pop-up hiç gösterilmez, sorun değil */ }
  }, [role]);

  if (role !== "veli" && role !== "ogrenci") return null;

  function sonrakiyeGec(kapatilanAnahtar: string, kaliciMi: boolean) {
    if (kaliciMi) {
      try { localStorage.setItem(kapatilanAnahtar, "1"); } catch { /* yoksay */ }
    }
    if (asama === "hosgeldin") {
      const hatirlatmaKalici = (() => { try { return localStorage.getItem(HATIRLATMA_ANAHTAR) === "1"; } catch { return false; } })();
      setAsama(hatirlatmaKalici ? null : "hatirlatma");
    } else {
      setAsama(null);
    }
  }

  if (!asama) return null;

  const selamlama = role === "veli" ? "Sayın Veli," : "Sevgili Öğrencim,";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="sgec-fade rounded-3xl p-6 max-w-sm w-full relative" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <button type="button" onClick={() => sonrakiyeGec(asama === "hosgeldin" ? HOSGELDIN_ANAHTAR : HATIRLATMA_ANAHTAR, false)}
          className="sgec-btn absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <X size={13} color={TEXT_MUTED} />
        </button>

        {asama === "hosgeldin" ? (
          <>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(255,159,180,0.15)" }}>
              <Heart size={18} color="#FF9FB4" />
            </div>
            <p style={{ color: TEXT }} className="text-sm leading-relaxed mb-1">{selamlama}</p>
            <p style={{ color: TEXT }} className="text-sm leading-relaxed mb-4">
              {ad ? `${ad}, ` : ""}uygulamayı tüm öğrencilerim için ücretsiz olarak sunuyorum.
            </p>
            <p style={{ color: TEXT_MUTED }} className="text-xs text-right mb-4 italic">— S. Güler</p>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(124,232,176,0.15)" }}>
              <Smartphone size={18} color={MINT} />
            </div>
            <p style={{ color: TEXT }} className="text-sm leading-relaxed mb-1">
              SG EduCoach&apos;tan en iyi şekilde yararlanmak için telefonunuzun ana ekranına eklemeyi ve bildirimleri açmayı unutmayınız.
            </p>
            <p style={{ color: TEXT_MUTED }} className="text-xs text-right mb-4 font-semibold">SG EDUCOACH EKİBİ</p>
          </>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={() => sonrakiyeGec(asama === "hosgeldin" ? HOSGELDIN_ANAHTAR : HATIRLATMA_ANAHTAR, true)}
            className="sgec-btn flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
            <BellOff size={13} /> Bir daha gösterme
          </button>
          <button type="button" onClick={() => sonrakiyeGec(asama === "hosgeldin" ? HOSGELDIN_ANAHTAR : HATIRLATMA_ANAHTAR, false)}
            className="sgec-btn flex-1 text-xs font-bold py-2 rounded-xl" style={{ background: MINT, color: MINT_ON }}>
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
