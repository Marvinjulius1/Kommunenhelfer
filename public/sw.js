/**
 * Service Worker – bewusst schlicht und datensparsam.
 *  - Statische Dateien (JS/CSS/Wappen): Cache-first
 *  - Seiten: Network-first, offline → /offline
 *  - API-Aufrufe und Formulardaten werden NIE zwischengespeichert.
 */
const VERSION = "v1";
const STATIC = `static-${VERSION}`;
const PAGES = `pages-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll(["/offline"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/tenants/") || url.pathname.startsWith("/pwa-icon/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline")));
  }
});

// ---------------------------------------------------------------------------
// Push-Benachrichtigungen (Inhalte sind bewusst allgemein – keine persönlichen Daten)
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  let d = { titel: "Bürgerservice", text: "Es gibt Neuigkeiten.", url: "/" };
  try {
    d = { ...d, ...event.data.json() };
  } catch {}
  event.waitUntil(self.registration.showNotification(d.titel, { body: d.text, icon: "/pwa-icon/192", badge: "/pwa-icon/192", data: { url: d.url } }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((liste) => {
      const offen = liste.find((c) => c.url.startsWith(self.location.origin));
      if (offen) return offen.navigate(url).then((c) => c && c.focus());
      return self.clients.openWindow(url);
    }),
  );
});
