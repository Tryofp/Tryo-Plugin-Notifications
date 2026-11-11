importScripts("https://www.gstatic.com/firebasejs/13.2.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.2.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCBVAhsqyzR9dFoAjq5JKTpDor7oDg4ZL8",
  authDomain: "tryo-plugin-notifications.firebaseapp.com",
  projectId: "tryo-plugin-notifications",
  storageBucket: "tryo-plugin-notifications.firebasestorage.app",
  messagingSenderId: "627574821915",
  appId: "1:627574821915:web:5ad557baa9659009d054be"
});

const messaging = firebase.messaging();

// Notification payloads are displayed automatically by the Firebase Messaging SDK
// while the page is in the background. Do not call showNotification again here,
// otherwise the same push can be displayed twice.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
    }
    await clients.openWindow(target);
  })());
});
