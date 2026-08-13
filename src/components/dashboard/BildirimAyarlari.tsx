"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellOff, BellRing, X } from "lucide-react";
import { BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { pushAbonelikSil } from "@/app/dashboard/push-actions";
import { pushAbonelikAc } from "@/lib/push-subscribe";

type Durum = "kontrolEdiliyor" | "desteklenmiyor" | "anaEkranaEklenmeli" | "kapali" | "reddedildi" | "acik";

// Header'daki diğer ikonlar (tema, mesajlar) gibi küçük bir zil ikonu —
// tıklanınca açılan bir kutuda durum ve "aç/kapat" seçeneği gösteriliyor.
// Önceden sayfanın en üstünde tam genişlik bir banner olarak duruyordu, her
// girişte göze batıyordu — artık sadece ihtiyaç olunca açılıyor. Durum ne
// olursa olsun (kontrol ediliyor, desteklenmiyor, izin reddedilmiş, kapalı,
// açık) ikon her zaman görünür — sadece içeriği duruma göre değişiyor.
export function BildirimAyarlari() {
  const [durum, setDurum] = useState<Durum>("kontrolEdiliyor");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [acik, setAcik] = useState(false);

  const kontrolEt = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setDurum("desteklenmiyor");
      return;
    }

    const iosMu = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standaloneMi =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (iosMu && !standaloneMi) {
      setDurum("anaEkranaEklenmeli");
      return;
    }

    if (Notification.permission === "denied") {
      setDurum("reddedildi");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setDurum(sub ? "acik" : "kapali");
    } catch {
      setDurum("kapali");
    }
  }, []);

  useEffect(() => {
    // Mount'ta tarayıcının bildirim/service-worker durumunu okuyup buna göre
    // state'i güncelliyor — bu, harici bir sistemle (Notification/ServiceWorker
    // API) senkronize olmanın kurallı yolu; kural burada yanlış pozitif veriyor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    kontrolEt();
  }, [kontrolEt]);

  async function ac() {
    setHata(null);
    setYukleniyor(true);
    const res = await pushAbonelikAc();
    setYukleniyor(false);
    if (res.error) {
      if (Notification.permission === "denied") setDurum("reddedildi");
      setHata(res.error);
      return;
    }
    setDurum("acik");
  }

  async function kapat() {
    setYukleniyor(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await pushAbonelikSil(sub.endpoint);
        await sub.unsubscribe();
      }
      setDurum("kapali");
    } finally {
      setYukleniyor(false);
    }
  }

  const Ikon = durum === "acik" ? BellRing : (durum === "reddedildi" || durum === "desteklenmiyor") ? BellOff : Bell;
  const ikonRengi = durum === "acik" ? MINT : durum === "reddedildi" ? BLUSH : TEXT_MUTED;

  return (
    <div className="relative">
      <button type="button" onClick={() => setAcik((v) => !v)} title="Bildirim ayarları"
        className="sfec-btn h-11 w-11 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: durum === "acik" ? MINT_BG : "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
        <Ikon size={16} color={ikonRengi} />
      </button>

      {acik && createPortal(
        <div className="fixed inset-0 z-[400]" onClick={() => setAcik(false)}>
          <div
            className="sfec-fade absolute right-4 top-16 sm:right-6 w-[min(320px,calc(100vw-2rem))] rounded-2xl p-4"
            style={{ background: BG1, border: `2px solid ${BORDER_STRONG}`, boxShadow: "0 12px 30px rgba(0,0,0,0.28)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span style={{ color: TEXT }} className="text-sm font-bold pr-2">
                {durum === "kontrolEdiliyor" && "Bildirim durumu kontrol ediliyor..."}
                {durum === "desteklenmiyor" && "Bu tarayıcı bildirimleri desteklemiyor"}
                {durum === "anaEkranaEklenmeli" && "Bildirim almak için ana ekrana ekleyin"}
                {durum === "reddedildi" && "Bildirim izni reddedilmiş"}
                {durum === "kapali" && "Bildirimler kapalı"}
                {durum === "acik" && "Bildirimler açık"}
              </span>
              <button type="button" onClick={() => setAcik(false)} aria-label="Kapat"
                className="sfec-btn shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                <X size={12} color={TEXT_MUTED} />
              </button>
            </div>
            {durum === "desteklenmiyor" && (
              <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">Farklı bir tarayıcı veya cihaz deneyebilirsiniz.</p>
            )}
            {durum === "anaEkranaEklenmeli" && (
              <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">Safari&apos;de Paylaş → &quot;Ana Ekrana Ekle&quot;yi kullanın.</p>
            )}
            {durum === "reddedildi" && (
              <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">Tarayıcı site ayarlarından bildirim iznini açabilirsiniz.</p>
            )}
            {hata && <p style={{ color: BLUSH }} className="text-xs mt-1">{hata}</p>}

            {(durum === "kapali" || durum === "acik") && (
              <button onClick={durum === "acik" ? kapat : ac} disabled={yukleniyor}
                className="sfec-btn mt-3 flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full disabled:opacity-60"
                style={{
                  background: durum === "acik" ? "transparent" : MINT,
                  color: durum === "acik" ? TEXT_MUTED : MINT_ON,
                  border: durum === "acik" ? `2px solid ${BORDER_STRONG}` : "none",
                }}>
                {durum === "acik" ? <BellOff size={13} /> : <Bell size={13} />}
                {yukleniyor ? "..." : durum === "acik" ? "Kapat" : "Bildirimleri Aç"}
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
