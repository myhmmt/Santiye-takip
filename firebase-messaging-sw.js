// Firebase Messaging Service Worker (background push)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Aynı config (gizli değil; frontend için güvenli)
firebase.initializeApp({
  apiKey: "AIzaSyAdvmca8C-RXTrnvhH4dEX1bFhYrMlyhSE",
  authDomain: "santiye-takip-83874.firebaseapp.com",
  projectId: "santiye-takip-83874",
  storageBucket: "santiye-takip-83874.firebasestorage.app",
  messagingSenderId: "893666575482",
  appId: "1:893666575482:web:762be4fb7feea74a7aa7c3"
});

const messaging = firebase.messaging();

// FCM arka plan bildirimi
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Şantiye Takip';
  const options = {
    body: payload.notification?.body || 'Yeni not eklendi',
    icon: '/icons/icon-192.png', // yoksa otomatik yok sayılır
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

// Bildirim tıklanınca uygulamayı öne getir
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
      const url = '/';
      for (const client of allClients) {
        if (client.url.includes(url)) return client.focus();
      }
      return clients.openWindow(url);
    })()
  );
});
