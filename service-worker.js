self.addEventListener("install", () => {
  console.log("Service Worker: installed");
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  console.log("Service Worker: active");
  return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).then((resp) => {
          return caches.open("santiye-cache").then((cache) => {
            cache.put(event.request, resp.clone());
            return resp;
          });
        })
      );
    })
  );
});
