const CACHE_NAME = "vista-pwa-v16";
const ASSETS = [
  "/", "index.html", "style.css", "app.js", "manifest.json",
  "assets/icon/icon-192.png", "assets/icon/icon-512.png",
  "assets/icon/apple-icon-180.png", "assets/icon/apple-icon-152.png"
];

self.addEventListener("install", (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e)=>{
  e.respondWith(
    caches.match(e.request).then(cached=>cached || fetch(e.request))
  );
});
