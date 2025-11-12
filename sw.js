// Vista Premium – Şantiye Takip v1.4.1 Service Worker
const CACHE = "vista-v1.4.1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  // App ikonları
  "./assets/icon/icon-192.png",
  "./assets/icon/icon-512.png",
  "./assets/icon/apple-icon-152.png",
  "./assets/icon/apple-icon-180.png",
  // PDF için kütüphane
  "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;

  // Firestore ağ isteklerine asla müdahale etme
  if (req.url.includes("firestore.googleapis.com")) return;

  // Navigasyon isteklerinde offline yedek: index.html
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Diğer istekler: Cache First, ardından ağdan getirip cache'e koy (SW-R)
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        // CORS kısıtlı cevaplar cache’lenemeyebilir; hatayı yutma
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return resp;
      }).catch(() => cached);
    })
  );
});
