"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { pushAbonelikKaydet, pushAbonelikSil } from "@/app/dashboard/push-actions";

type Durum = "kontrolEdiliyor" | "desteklenmiyor" | "anaEkranaEklenmeli" | "kapali" | "reddedildi" | "acik";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function BildirimAyarlari() {
  const [durum, setDurum] = useState<Durum>("kontrolEdiliyor");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    kontrolEt();
  }, []);

  async function kontrolEt() {
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
  }

  async function ac() {
    setHata(null);
    setYukleniyor(true);
    try {
      const izin = await Notification.requestPermission();
      if (izin !== "granted") {
        setDurum("reddedildi");
        setYukleniyor(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("VAPID anahtarı tanımlı değil.");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = sub.toJSON();
      const res = await pushAbonelikKaydet({
        endpoint: json.endpoint!,
        keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
      });
      if (res.error) throw new Error(res.error);
      setDurum("acik");
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Bildirimler açılamadı.");
    } finally {
      setYukleniyor(false);
    }
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

  if (durum === "kontrolEdiliyor" || durum === "desteklenmiyor") return null;

  return (
    <div className="sgec-fade rounded-2xl px-4 py-3 flex items-center justify-between flex-wrap gap-2 print:hidden" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: durum === "acik" ? MINT_BG : "rgba(255,255,255,0.06)" }}>
          {durum === "acik" ? <BellRing size={14} color={MINT} /> : <Bell size={14} color={TEXT_MUTED} />}
        </div>
        <div>
          <div style={{ color: TEXT }} className="text-[13px] font-semibold">
            {durum === "anaEkranaEklenmeli" && "Bildirim almak için ana ekrana ekleyin"}
            {durum === "reddedildi" && "Bildirim izni reddedilmiş"}
            {durum === "kapali" && "Bildirimler kapalı"}
            {durum === "acik" && "Bildirimler açık"}
          </div>
          {durum === "anaEkranaEklenmeli" && (
            <div style={{ color: TEXT_MUTED }} className="text-[11px] mt-0.5">Safari&apos;de Paylaş → &quot;Ana Ekrana Ekle&quot;yi kullanın.</div>
          )}
          {durum === "reddedildi" && (
            <div style={{ color: TEXT_MUTED }} className="text-[11px] mt-0.5">Tarayıcı site ayarlarından bildirim iznini açabilirsiniz.</div>
          )}
          {hata && <div style={{ color: BLUSH }} className="text-[11px] mt-0.5">{hata}</div>}
        </div>
      </div>

      {(durum === "kapali" || durum === "acik") && (
        <button onClick={durum === "acik" ? kapat : ac} disabled={yukleniyor}
          className="sgec-btn flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full disabled:opacity-60"
          style={{
            background: durum === "acik" ? "transparent" : MINT,
            color: durum === "acik" ? TEXT_MUTED : MINT_ON,
            border: durum === "acik" ? `1px solid ${BORDER_STRONG}` : "none",
          }}>
          {durum === "acik" ? <BellOff size={13} /> : <Bell size={13} />}
          {yukleniyor ? "..." : durum === "acik" ? "Kapat" : "Bildirimleri Aç"}
        </button>
      )}
    </div>
  );
}
