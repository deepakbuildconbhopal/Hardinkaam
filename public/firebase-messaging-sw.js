// Firebase Cloud Messaging Background Service Worker for HARDINKAAM PWA
// Provides background push notifications when the app is inactive or closed.

/* eslint-disable no-undef */
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp({
        apiKey: "AIzaSyAB3PNle9jCiRyfSpXgSGL9A31ledJrHVk",
        authDomain: "hardinkaam-5cc6a.firebaseapp.com",
        projectId: "hardinkaam-5cc6a",
        storageBucket: "hardinkaam-5cc6a.firebasestorage.app",
        messagingSenderId: "188713428379",
        appId: "1:188713428379:web:9f48a483eaf442b8f02d3e"
      });
    }

    const messaging = firebase.messaging();

    // Background Message Handler
    messaging.onBackgroundMessage((payload) => {
      try {
        const title = payload.notification?.title || payload.data?.title || 'HARDINKAAM Update';
        const body = payload.notification?.body || payload.data?.body || payload.data?.message || 'You have a new update.';
        const icon = payload.notification?.icon || '/pwa-192x192.png';
        const badge = '/favicon-32x32.png';
        const targetUrl = payload.data?.url || payload.data?.link || (payload.data?.bookingId ? `/#booking_${payload.data.bookingId}` : '/');

        const notificationOptions = {
          body,
          icon,
          badge,
          tag: payload.data?.tag || payload.data?.bookingId || 'hardinkaam-push',
          data: {
            url: targetUrl,
            bookingId: payload.data?.bookingId || '',
            type: payload.data?.type || '',
            receivedAt: new Date().toISOString()
          },
          vibrate: [150, 80, 150]
        };

        return self.registration.showNotification(title, notificationOptions);
      } catch (err) {
        console.warn('[firebase-messaging-sw] Failed to show background notification:', err);
      }
    });
  }
} catch (swInitErr) {
  console.warn('[firebase-messaging-sw] Service worker initialization note:', swInitErr);
}

// Notification Click Handler: Focus or open the app window
self.addEventListener('notificationclick', (event) => {
  try {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        // Check if an app window/tab is already open
        for (const client of windowClients) {
          if (client.url && client.url.includes(self.location.origin) && 'focus' in client) {
            if ('navigate' in client && targetUrl !== '/') {
              client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        // If no window is open, open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
    );
  } catch (clickErr) {
    console.warn('[firebase-messaging-sw] Notification click error:', clickErr);
  }
});
