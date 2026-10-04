// SeFu Koç — Web Push service worker

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("sefu-offline-v1").then((cache) => cache.add("/offline.html")));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Yalnızca ağ erişimi başarısız olan sayfa gezintilerinde genel yardım
// ekranını göster. Hesap sayfaları ve öğrenci verileri önbelleğe alınmaz.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(async () =>
    (await caches.match("/offline.html")) || Response.error()
  ));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let veri;
  try {
    veri = event.data.json();
  } catch {
    veri = { title: "SeFu Koç", body: event.data.text() };
  }

  const baslik = veri.title || "SeFu Koç";
  const secenekler = {
    body: veri.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // bildirimId: yurt nöbeti kademeli hatırlatması gibi "okunana kadar
    // sıradakini gönderme" mantığı olan bildirimlerde dolu geliyor (bkz.
    // /api/cron/yurt-nobeti-bildirim) — tıklanınca aşağıda okundu işaretleniyor.
    data: { url: veri.url || "/dashboard", bildirimId: veri.bildirimId || null },
  };

  event.waitUntil(self.registration.showNotification(baslik, secenekler));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const hedefUrl = event.notification.data?.url || "/dashboard";
  const bildirimId = event.notification.data?.bildirimId;

  const okunduIsaretle = bildirimId
    ? fetch("/api/bildirim/okundu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: bildirimId }),
      }).catch(() => {})
    : Promise.resolve();

  event.waitUntil(
    Promise.all([
      okunduIsaretle,
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(hedefUrl) && "focus" in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(hedefUrl);
      }),
    ])
  );
});
