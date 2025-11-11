// Vista Premium – Şantiye Takip PWA SW (v1.5.1)
// Cache stratejisi:
// - HTML ve app.js için network-first (güncel kod hemen gelsin)
// - CSS & ikonlar & fontlar için stale-while-revalidate
// - Eski cache'leri temizler

const CACHE_NAME = "vista-v1.5.1";
const PRECACHE = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "manifest.json",
  "assets/icon/icon-192.png",
  "assets/icon/icon-512.png",
  "assets/icon/apple-icon-152.png",
  "assets/icon/apple-icon-180.png"
];

// Kurulum: temel dosyaları önbelleğe al
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// Aktivasyon: eski cache'leri sil
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// Yardımcı: network-first
async function networkFirst(request) {
  try {
    const fresh = await fetch(request, { cache: "no-store" });
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

// Yardımcı: stale-while-revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((res) => {
    cache.put(request, res.clone());
    return res;
  }).catch(() => cached);
  return cached || networkPromise;
}

// Fetch yönetişimi
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Sadece GET isteklerini ele al
  if (request.method !== "GET") return;

  // HTML sayfaları & app.js → network-first
  const isHTML =
    request.headers.get("accept")?.includes("text/html") ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/index.html");
  const isAppJS = url.pathname.endsWith("/app.js");

  if (isHTML || isAppJS) {
    event.respondWith(networkFirst(request));
    return;
  }

  // CSS, ikonlar, manifest, Font/CDN → stale-while-revalidate
  const ext = url.pathname.split(".").pop();
  const sWRext = ["css", "png", "jpg", "jpeg", "svg", "webp", "json", "woff", "woff2"];
  if (sWRext.includes(ext) || url.hostname.includes("gstatic.com") || url.hostname.includes("cdnjs.cloudflare.com")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Diğer her şey için cache-first fallback
  event.respondWith(
    caches.match(request).then((c) => c || fetch(request))
  );
});
