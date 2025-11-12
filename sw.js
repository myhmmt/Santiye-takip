// Vista Premium – Şantiye Takip v1.4.1
const CACHE = "vista-v1.4.1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./assets/icon/icon-192.png",
  "./assets/icon/icon-512.png",
  "./assets/icon/apple-icon-152.png",
  "./assets/icon/apple-icon-180.png",
  "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
];

// Kurulum (önbelleğe alma)
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Eski cache'leri temizle
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// İstek yakalama
self.addEventListener("fetch", (e) => {
  const req = e.request;
  // Firestore gibi dinamik istekleri hariç tut
  if (req.url.includes("firestore.googleapis.com")) return;
  
  e.respondWith(
    caches.match(req).then(cached =>
      cached ||
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return resp;
      }).catch(() => cached)
    )
  );
});
