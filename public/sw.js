// SG EduCoach — Web Push service worker

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let veri;
  try {
    veri = event.data.json();
  } catch {
    veri = { title: "SG EduCoach", body: event.data.text() };
  }

  const baslik = veri.title || "SG EduCoach";
  const secenekler = {
    body: veri.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: veri.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(baslik, secenekler));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const hedefUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(hedefUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(hedefUrl);
    })
  );
});
