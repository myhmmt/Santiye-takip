/* eslint-disable no-undef */
// Service Worker: Web Push (Firebase Messaging - compat)

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// !!! Burayı kendi config'inle aynı bırak
firebase.initializeApp({
  apiKey: "AIzaSyAdvmca8C-RXTrnvhH4dEX1bFhYrMlyhSE",
  authDomain: "santiye-takip-83874.firebaseapp.com",
  projectId: "santiye-takip-83874",
  storageBucket: "santiye-takip-83874.firebasestorage.app",
  messagingSenderId: "893666575482",
  appId: "1:893666575482:web:762be4fb7feea74a7aa7c3"
});

const messaging = firebase.messaging();

// Arka planda gelen mesaj (uygulama kapalıyken)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Şantiye Takip";
  const body  = payload.notification?.body  || "Yeni güncelleme var";
  const url   = (payload.data && payload.data.click_action) || "https://myhmmt.github.io/Santiye-takip/";

  self.registration.showNotification(title, {
    body,
    icon: "icons/icon-192.png", // varsa
    data: { url }
  });
});

// Bildirime tıklayınca siteye git
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "https://myhmmt.github.io/Santiye-takip/";
  event.waitUntil(clients.matchAll({ type: "window" }).then((clientsArr) => {
    const had = clientsArr.find(c => c.url.includes("Santiye-takip") && "focus" in c);
    if (had) return had.focus();
    return clients.openWindow(url);
  }));
});
