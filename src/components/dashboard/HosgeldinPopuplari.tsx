"use client";

import { useEffect, useState } from "react";
import { Smartphone, BellOff, BellRing } from "lucide-react";
import { BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { pushAbonelikAc } from "@/lib/push-subscribe";
import type { UserRole } from "@/lib/types";
import { MaskotKonusmaBalonu } from "@/components/dashboard/MaskotKonusmaBalonu";
import { SeFuLogo } from "@/components/SeFuWordmark";

const HATIRLATMA_ANAHTAR = "sfec_hatirlatma_kapatildi_v1";
const BILDIRIM_ANAHTAR = "sfec_bildirim_softask_kapatildi_v1";

type Asama = "hatirlatma" | "bildirim" | null;

function kapatildiMi(anahtar: string): boolean {
  try { return localStorage.getItem(anahtar) === "1"; } catch { return false; }
}

// Veli ve öğrenciye, dashboard'a her girişte (kalıcı olarak kapatmadıkları
// sürece) sırayla pop-up gösterir: ana ekrana ekleme hatırlatması → (sadece
// veli) bildirim izni için soft-ask. Tarayıcının çıplak izin diyaloğunu
// doğrudan göstermek yerine önce "neden" sorusunu sorup kabul oranını
// artırmak için. (Eskiden ilk aşamada "S. Güler" imzalı bir karşılama
// mesajı da vardı, kaldırıldı.)
export function HosgeldinPopuplari({ role }: { role: UserRole }) {
  const [asama, setAsama] = useState<Asama>(null);

  useEffect(() => {
    if (role !== "veli" && role !== "ogrenci") return;
    if (typeof window === "undefined") return;
    const zamanlayici = window.setTimeout(() => {
      if (!kapatildiMi(HATIRLATMA_ANAHTAR)) { setAsama("hatirlatma"); return; }
      if (role === "veli" && !kapatildiMi(BILDIRIM_ANAHTAR)) { setAsama("bildirim"); }
    }, 0);
    return () => window.clearTimeout(zamanlayici);
  }, [role]);

  if (role !== "veli" && role !== "ogrenci") return null;

  function siradakiAsama(): Asama {
    if (asama === "hatirlatma") {
      if (role === "veli" && !kapatildiMi(BILDIRIM_ANAHTAR)) return "bildirim";
    }
    return null;
  }

  function anahtarGetir(a: Asama): string {
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

  return (
    <MaskotKonusmaBalonu onKapat={() => sonrakiyeGec(false)} ariaLabel="Giriş bilgilendirmesi">
      <div className="pt-1">
        {/* Kullanıcı isteği (27.08.2026): "ilk logo kaldırılacak, metin
            [...], sağ en alta da SeFu logosu gelecek" + "Tamam butonuna
            tıklandığında mesaj kapansın ve bir daha görünmesin" — ayrı bir
            "Bir daha gösterme" butonu yerine tek "Tamam" butonu artık her
            zaman kalıcı kapatıyor (sonrakiyeGec(true)). */}
        {asama === "hatirlatma" && (
          <>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: MINT_BG }}>
              <Smartphone size={18} color={MINT} />
            </div>
            <p style={{ color: TEXT }} className="text-sm leading-relaxed mb-1">
              SeFu Koç&apos;tan en iyi şekilde yararlanmak için telefonunuzun ana ekranına eklemeyi ve bildirimleri açmayı unutmayın.
            </p>
            <div className="mb-4 flex justify-end">
              <SeFuLogo className="h-6 w-auto max-w-20" />
            </div>
          </>
        )}

        {asama === "bildirim" && <BildirimSoftAsk onTamamlandi={() => sonrakiyeGec(true)} />}

        {asama === "hatirlatma" && (
          <button type="button" onClick={() => sonrakiyeGec(true)}
            className="sfec-btn w-full text-xs font-bold py-2 rounded-xl" style={{ background: MINT, color: MINT_ON }}>
            Tamam
          </button>
        )}
      </div>
    </MaskotKonusmaBalonu>
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
      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: MINT_BG }}>
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
          className="sfec-btn flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl disabled:opacity-60" style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
          <BellOff size={13} /> Şimdi değil
        </button>
        <button type="button" onClick={ac} disabled={yukleniyor}
          className="sfec-btn flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          <BellRing size={13} /> {yukleniyor ? "Açılıyor..." : "Bildirimleri Aç"}
        </button>
      </div>
    </>
  );
}
