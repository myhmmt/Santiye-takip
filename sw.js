/* Vista Premium – Şantiye Takip
 * Service Worker v1.1 (cache-busting: vp-shell-v1-1)
 */
const CACHE_NAME = "vp-shell-v1-1";

// Uygulama kabuğu (app shell) – çevrimdışı çalışması için
const APP_SHELL = [
  "/Santiye-takip/",
  "/Santiye-takip/index.html",
  "/Santiye-takip/style.css",
  "/Santiye-takip/manifest.json",

  // İkonlar
  "/Santiye-takip/assets/icons/icon-192.png",
  "/Santiye-takip/assets/icons/icon-512.png",
  "/Santiye-takip/assets/icons/apple-icon-152.png",
  "/Santiye-takip/assets/icons/apple-icon-180.png",

  // Harici (runtime’da da SW üzerinden cachelenecek ama burada önbelleğe almak hızlı hissettirir)
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
  "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js"
];

// Install – app shell’i önbelleğe al
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate – eski cache’leri temizle
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Yardımcı: isSameOrigin
const isSameOrigin = (url) => {
  try {
    const u = new URL(url);
    return u.origin === self.location.origin;
  } catch {
    return false;
  }
};

// Fetch stratejileri:
// - App shell & yerel statik dosyalar: Cache-first
// - Harici CDN (fonts, cdnjs, gstatic): Stale-While-Revalidate
// - Gezinti (navigation) istekleri: SPA fallback (index.html), ama çevrimdışıysa cache’deki index’i ver
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Yalnızca GET isteklerini ele al
  if (request.method !== "GET") return;

  const reqUrl = new URL(request.url);

  // SPA navigasyonları (GitHub Pages alt yolunda)
  const isNavigation =
    request.mode === "navigate" ||
    (request.destination === "" && request.headers.get("accept")?.includes("text/html"));

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // başarılı online yanıtı döndür ve (istersen) runtime cache’e koyma
          return res;
        })
        .catch(async () => {
          // offline ise cache’teki index.html’i ver
          const cache = await caches.open(CACHE_NAME);
          return cache.match("/Santiye-takip/index.html");
        })
    );
    return;
  }

  // Aynı origin’den statikler: Cache-first
  if (isSameOrigin(request.url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          // Başarılıysa cache’e koy
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        });
      })
    );
    return;
  }

  // Harici CDN: Stale-While-Revalidate
  // fonts.googleapis.com / fonts.gstatic.com / cdnjs.cloudflare.com / gstatic
  if (
    /fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|gstatic\.com/.test(
      reqUrl.host
    )
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            cache.put(request, res.clone());
            return res;
          })
          .catch(() => null);
        return cached || network;
      })
    );
    return;
  }

  // Diğer GET istekleri: network-first, offline’da varsa cache’e düş
  event.respondWith(
    fetch(request)
      .then((res) => res)
      .catch(() => caches.match(request))
  );
});
