// Minimal Service Worker — PWA kurulum/tam ekran için yeterli
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// İstersen burada offline cache de ekleyebiliriz; şimdilik pass-through:
self.addEventListener('fetch', () => { /* no-op */ });
