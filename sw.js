const CACHE_NAME = 'vista-v1.5.1';
const ASSETS = [
  'index.html','style.css','app.js','manifest.json',
  'assets/icons/icon-192.png','assets/icons/icon-512.png',
  'assets/icons/apple-icon-152.png','assets/icons/apple-icon-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
