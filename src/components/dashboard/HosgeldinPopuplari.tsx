"use client";

import { useEffect, useState } from "react";
import { Heart, Smartphone, BellOff, BellRing, X } from "lucide-react";
import { BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { pushAbonelikAc } from "@/lib/push-subscribe";
import type { UserRole } from "@/lib/types";

const HOSGELDIN_ANAHTAR = "sgec_hosgeldin_kapatildi_v1";
const HATIRLATMA_ANAHTAR = "sgec_hatirlatma_kapatildi_v1";
const BILDIRIM_ANAHTAR = "sgec_bildirim_softask_kapatildi_v1";

type Asama = "hosgeldin" | "hatirlatma" | "bildirim" | null;

function kapatildiMi(anahtar: string): boolean {
  try { return localStorage.getItem(anahtar) === "1"; } catch { return false; }
}

// Veli ve öğrenciye, dashboard'a her girişte (kalıcı olarak kapatmadıkları
// sürece) sırayla pop-up gösterir: hoşgeldin/tanıtım → ana ekrana ekleme
// hatırlatması → (sadece veli) bildirim izni için soft-ask. Tarayıcının
// çıplak izin diyaloğunu doğrudan göstermek yerine önce "neden" sorusunu
// sorup kabul oranını artırmak için.
export function HosgeldinPopuplari({ role }: { role: UserRole }) {
  const [asama, setAsama] = useState<Asama>(null);

  useEffect(() => {
    if (role !== "veli" && role !== "ogrenci") return;
    if (typeof window === "undefined") return;
    if (!kapatildiMi(HOSGELDIN_ANAHTAR)) { setAsama("hosgeldin"); return; }
    if (!kapatildiMi(HATIRLATMA_ANAHTAR)) { setAsama("hatirlatma"); return; }
    if (role === "veli" && !kapatildiMi(BILDIRIM_ANAHTAR)) { setAsama("bildirim"); }
  }, [role]);

  if (role !== "veli" && role !== "ogrenci") return null;

  function siradakiAsama(): Asama {
    if (asama === "hosgeldin") {
      if (!kapatildiMi(HATIRLATMA_ANAHTAR)) return "hatirlatma";
    }
    if (asama === "hosgeldin" || asama === "hatirlatma") {
      if (role === "veli" && !kapatildiMi(BILDIRIM_ANAHTAR)) return "bildirim";
    }
    return null;
  }

  function anahtarGetir(a: Asama): string {
    if (a === "hosgeldin") return HOSGELDIN_ANAHTAR;
    if (a === "hatirlatma") return HATIRLATMA_ANAHTAR;
    return BILDIRIM_ANAHTAR;
  }

  function sonrakiyeGec(kaliciMi: boolean) {
    if (kaliciMi) {
      try { localStorage.setItem(anahtarGetir(asama), "1"); } catch { /* yoksay */ }
    }
    setAsama(siradakiAsama());
  }

  if (!asama) return null;

  const selamlama = role === "veli" ? "Sayın Veli," : "Sevgili Öğrencim,";
  const cumle1 = role === "veli"
    ? "Öğrencilerim için yoğun mesai ve emek harcadığım uygulamayı ücretsiz olarak sunuyorum."
    : "Sizler için yoğun mesai ve emek harcadığım uygulamayı ücretsiz olarak sunuyorum.";
  const cumle2 = "Faydalı olması dileğiyle...";

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="sgec-fade rounded-3xl p-6 max-w-sm w-full relative" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <button type="button" onClick={() => sonrakiyeGec(false)}
          className="sgec-btn absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <X size={13} color={TEXT_MUTED} />
        </button>

        {asama === "hosgeldin" && (
          <>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(255,159,180,0.15)" }}>
              <Heart size={18} color="#FF9FB4" />
            </div>
            <p style={{ color: TEXT }} className="text-sm leading-relaxed mb-1">{selamlama}</p>
            <p style={{ color: TEXT }} className="text-sm leading-relaxed mb-1">{cumle1}</p>
            <p style={{ color: TEXT }} className="text-sm leading-relaxed mb-4">{cumle2}</p>
            <p style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base text-right mb-4 font-bold">S. Güler</p>
          </>
        )}

        {asama === "hatirlatma" && (
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

        {asama === "bildirim" && <BildirimSoftAsk onTamamlandi={() => sonrakiyeGec(true)} />}

        {asama !== "bildirim" && (
          <div className="flex gap-2">
            <button type="button" onClick={() => sonrakiyeGec(true)}
              className="sgec-btn flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
              <BellOff size={13} /> Bir daha gösterme
            </button>
            <button type="button" onClick={() => sonrakiyeGec(false)}
              className="sgec-btn flex-1 text-xs font-bold py-2 rounded-xl" style={{ background: MINT, color: MINT_ON }}>
              Tamam
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Çıplak tarayıcı izin diyaloğundan önce "neden" sorusunu soran soft-ask —
// kabul oranını artırmak için (bkz. dokümandaki 10.3 Soft-Ask akışı).
function BildirimSoftAsk({ onTamamlandi }: { onTamamlandi: () => void }) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function ac() {
    setHata(null);
    setYukleniyor(true);
    const res = await pushAbonelikAc();
    setYukleniyor(false);
    if (res.error) { setHata(res.error); return; }
    onTamamlandi();
  }

  return (
    <>
      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(124,232,176,0.15)" }}>
        <BellRing size={18} color={MINT} />
      </div>
      <p style={{ color: TEXT }} className="text-sm leading-relaxed mb-1 font-semibold">
        Öğrencinizin durumunu sürekli takip etmek ister misiniz?
      </p>
      <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed mb-4">
        Veri girişi yapmadığında ve rozet kazandığında size anında bildirim gönderelim.
      </p>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold mb-3">{hata}</div>}
      <div className="flex gap-2">
        <button type="button" onClick={onTamamlandi} disabled={yukleniyor}
          className="sgec-btn flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl disabled:opacity-60" style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
          <BellOff size={13} /> Şimdi değil
        </button>
        <button type="button" onClick={ac} disabled={yukleniyor}
          className="sgec-btn flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          <BellRing size={13} /> {yukleniyor ? "Açılıyor..." : "Bildirimleri Aç"}
        </button>
      </div>
    </>
  );
}
