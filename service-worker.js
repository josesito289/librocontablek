// service-worker.js — caché "app shell" para que la app abra y funcione sin conexión.
// IMPORTANTE: sube la versión de CACHE_NAME cada vez que cambies archivos del shell
// (ver CHANGELOG.md) para que los usuarios reciban la actualización.

const CACHE_NAME = "anchetas-contable-v1.0.0";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/store.js",
  "./js/utils.js",
  "./js/formula.js",
  "./js/combobox.js",
  "./js/tabDiario.js",
  "./js/tabCostos.js",
  "./js/tabProductos.js",
  "./fonts/poppins-latin-500-normal.woff2",
  "./fonts/poppins-latin-600-normal.woff2",
  "./fonts/poppins-latin-700-normal.woff2",
  "./fonts/inter-latin-400-normal.woff2",
  "./fonts/inter-latin-500-normal.woff2",
  "./fonts/inter-latin-600-normal.woff2",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Estrategia: cache-first para el app shell, con actualización en segundo plano
// (stale-while-revalidate) cuando hay conexión disponible.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached || caches.match("./index.html"));
      return cached || network;
    })
  );
});
