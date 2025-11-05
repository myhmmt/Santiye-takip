const CACHE = "vista-v1.3";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./assets/icon/icon-192.png",
  "./assets/icon/icon-512.png",
  "./assets/icon/apple-icon-152.png",
  "./assets/icon/apple-icon-180.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
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
  const { request } = e;
  // Network-first for dynamic (Firestore not cached here)
  if (request.url.includes("firestore.googleapis.com")) return;
  e.respondWith(
    caches.match(request).then(cached => 
      cached || fetch(request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
        return resp;
      }).catch(() => cached)
    )
  );
});
