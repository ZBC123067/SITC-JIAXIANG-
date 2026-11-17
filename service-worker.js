const CACHE_NAME = "sitc-jiaxiang-mobile-shell-v18";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./admin.html",
  "./deploy-check.html",
  "./VERSION.txt",
  "./manifest.webmanifest",
  "./assets/mobile-v2.css",
  "./assets/mobile-v2.js",
  "./assets/booking.css",
  "./assets/customer-account.css",
  "./assets/config.js",
  "./assets/admin.js",
  "./assets/admin.css",
  "./assets/admin-price-periods.css",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./data/fallback-public.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function cacheResponse(request, response) {
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, fallback) {
  try {
    // Shell files must never be satisfied by an old HTTP cache entry. Query
    // versioning in index.html plus this policy makes a deployment self-heal.
    const response = await fetch(request, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await cacheResponse(request, response);
  } catch {
    return (await caches.match(request)) || (fallback && await caches.match(fallback)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  if (!sameOrigin) {
    event.respondWith(fetch(request).catch(async () => (await caches.match(request)) || Response.error()));
    return;
  }

  const isShellFile = /\.(?:html|css|js)$/.test(url.pathname) || url.pathname.endsWith("/");
  if (isShellFile) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cached) => cached || cacheResponse(request, await fetch(request)))
  );
});
