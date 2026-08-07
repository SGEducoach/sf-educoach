"use client";

import { pushAbonelikKaydet } from "@/app/dashboard/push-actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// BildirimAyarlari.tsx'teki "Bildirimleri Aç" akışıyla aynı mantık — soft-ask
// pop-up'ının (HosgeldinPopuplari) da aynı aboneliği tetikleyebilmesi için
// paylaşılan bir yere çıkarıldı.
export async function pushAbonelikAc(): Promise<{ error: string | null }> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { error: "Bu tarayıcı bildirimleri desteklemiyor." };
  }
  try {
    const izin = await Notification.requestPermission();
    if (izin !== "granted") return { error: "Bildirim izni verilmedi." };

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
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Bildirimler açılamadı." };
  }
}
