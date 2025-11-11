// sw.js — v1.6.1
const CACHE_NAME = "vista-pwa-v161";
const ASSETS = [
  "./", "index.html", "style.css", "app.js", "manifest.json",
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
  const req = e.request;
  // network-first (icmal verisi gibi dinamik kısımlar güncel kalsın)
  e.respondWith(
    fetch(req).then(res=>{
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c=>c.put(req, copy));
      return res;
    }).catch(()=>caches.match(req))
  );
});
