/* MyLife Service Worker — RC4.4 (P6)
   Cache-first para el shell; network-first para version.json.
   CACHE_VERSION separado de APP_VERSION (§17-18). */
const CACHE = "mylife-3.7.0-v1";
const SHELL = ["./automatic.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  /* version.json: red primero (para detectar actualizaciones), caché de respaldo */
  if (url.pathname.endsWith("version.json")) {
    e.respondWith(
      fetch(e.request).then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  /* navegación y shell: caché primero, red de respaldo, index como fallback */
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) =>
      hit ||
      fetch(e.request).then((r) => {
        if (r.ok && url.origin === location.origin) {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return r;
      }).catch(() =>
        e.request.mode === "navigate" ? caches.match("./automatic.html") : Response.error()
      )
    )
  );
});
