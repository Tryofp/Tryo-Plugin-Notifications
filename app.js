import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyCBVAhsqyzR9dFoAjq5JKTpDor7oDg4ZL8",
  authDomain: "tryo-plugin-notifications.firebaseapp.com",
  projectId: "tryo-plugin-notifications",
  storageBucket: "tryo-plugin-notifications.firebasestorage.app",
  messagingSenderId: "627574821915",
  appId: "1:627574821915:web:5ad557baa9659009d054be"
};

// Public VAPID key from Firebase Cloud Messaging settings.
const VAPID_KEY = "BEhgC96f5OJYpRYXkYsiMJElBJacXzVFyTd0zALZK7MzVsWjkHhNvr58iFaWCyw7TM0cdn9-D_ka4Ok_vCXSGn4";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJzU3MiL_o9PjkF4h-prSw-P8vLVfJqGFXM7pFJOPzIzJXaGmu6z6oK0oJl54a6bQy0Q/exec";

const $ = (id) => document.getElementById(id);
const button = $("enableButton");

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 4200);
}

function setStatus(message, ok = false) {
  $("statusText").textContent = message;
  $("statusDot").classList.toggle("ok", ok);
}

$("browserState").textContent = /Android/i.test(navigator.userAgent) ? "Android" : "Browser";
$("permissionState").textContent = "Notification" in window ? Notification.permission : "Tidak didukung";
$("workerState").textContent = "serviceWorker" in navigator ? "Didukung" : "Tidak didukung";

if (!window.isSecureContext) {
  setStatus("HTTPS diperlukan");
  button.disabled = true;
  $("hint").textContent = "Buka aplikasi melalui alamat HTTPS GitHub Pages.";
}

button.addEventListener("click", async () => {
  button.disabled = true;
  button.textContent = "Mengaktifkan…";

  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      throw new Error("Browser ini tidak mendukung push notification.");
    }

    const supported = await isSupported();
    if (!supported) throw new Error("Firebase Messaging tidak didukung browser ini.");

    const permission = await Notification.requestPermission();
    $("permissionState").textContent = permission;

    if (permission !== "granted") {
      throw new Error("Izin notifikasi belum diberikan.");
    }

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const registration = await navigator.serviceWorker.register("./firebase-messaging-sw.js", {
      scope: "./"
    });
    await navigator.serviceWorker.ready;
    $("workerState").textContent = "Aktif";

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (!token) throw new Error("FCM Token belum berhasil dibuat.");

    // Apps Script web apps do not expose a reliable CORS response to browser fetch.
    // A text/plain no-cors request avoids preflight; the server stores the token in Sheets.
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        Type: "FcmRegister",
        Token: token,
        UserAgent: navigator.userAgent
      })
    });

    setStatus("Permintaan pendaftaran terkirim", true);
    toast("Token perangkat sudah dikirim ke server. Aktifkan ulang jika notifikasi belum masuk.");
    button.textContent = "Notifikasi Aktif";
    $("hint").textContent = "Perangkat ini terhubung langsung ke Firebase melalui Apps Script.";

    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || "Tryo Plugin Manager";
      const body = payload.notification?.body || "Ada notifikasi baru.";
      toast(title + ": " + body);
    });
  } catch (error) {
    console.error(error);
    setStatus("Belum berhasil diaktifkan");
    toast(error.message || "Terjadi kesalahan.");
    button.disabled = false;
    button.textContent = "Coba Lagi";
  }
});

if ("Notification" in window && Notification.permission === "granted") {
  $("permissionState").textContent = "granted";
}