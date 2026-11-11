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
const VAPID_KEY = "BEhgC96f5OJYpRYXkYsiMJElBJacXzVFyTd0zALZK7MzVsWjkHhNvr58iFaWCyw7TM0cdn9-D_ka4Ok_vCXSGn4";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJzU3MiL_o9PjkF4h-prSw-P8vLVfJqGFXM7pFJOPzIzJXaGmu6z6oK0oJl54a6bQy0Q/exec";

const $ = (id) => document.getElementById(id);
const button = $("enableButton");
const app = initializeApp(firebaseConfig);
let messaging = null;
let serviceWorkerRegistration = null;
let foregroundListenerAttached = false;

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
function setActiveUi(message = "Perangkat ini sudah terdaftar untuk menerima notifikasi.") {
  setStatus("Notifikasi aktif", true);
  button.textContent = "Notifikasi Aktif";
  button.disabled = true;
  $("hint").textContent = message;
  $("permissionState").textContent = Notification.permission;
  $("workerState").textContent = "Aktif";
}
async function registerToken(token) {
  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ Type: "FcmRegister", Token: token, UserAgent: navigator.userAgent })
  });
}
async function prepareMessaging() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("Browser ini tidak mendukung push notification.");
  }
  if (!(await isSupported())) throw new Error("Firebase Messaging tidak didukung browser ini.");

  messaging = messaging || getMessaging(app);
  serviceWorkerRegistration = await navigator.serviceWorker.register("./firebase-messaging-sw.js", { scope: "./" });
  await navigator.serviceWorker.ready;

  if (!foregroundListenerAttached) {
    onMessage(messaging, async (payload) => {
      const title = payload.notification?.title || "Tryo Plugin Manager";
      const body = payload.notification?.body || "Ada notifikasi baru.";
      try {
        const registration = serviceWorkerRegistration || await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body, icon: "./icon.svg", badge: "./icon.svg",
          tag: "tryo-plugin-notification",
          data: { url: payload.data?.url || "./" }
        });
      } catch (error) {
        console.error("Gagal menampilkan notifikasi foreground:", error);
        toast(title + ": " + body);
      }
    });
    foregroundListenerAttached = true;
  }
  return serviceWorkerRegistration;
}
async function activateNotifications(requestPermission) {
  const registration = await prepareMessaging();
  let permission = Notification.permission;
  if (requestPermission && permission !== "granted") permission = await Notification.requestPermission();
  $("permissionState").textContent = permission;
  if (permission !== "granted") throw new Error("Izin notifikasi belum diberikan.");

  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) throw new Error("FCM Token belum berhasil dibuat.");
  await registerToken(token);
  setActiveUi("Perangkat ini sudah terdaftar. Status akan dipulihkan otomatis saat halaman dibuka kembali.");
  return token;
}

$("browserState").textContent = /Android/i.test(navigator.userAgent) ? "Android" : "Browser";
$("permissionState").textContent = "Notification" in window ? Notification.permission : "Tidak didukung";
$("workerState").textContent = "serviceWorker" in navigator ? "Didukung" : "Tidak didukung";

if (!window.isSecureContext) {
  setStatus("HTTPS diperlukan");
  button.disabled = true;
  $("hint").textContent = "Buka aplikasi melalui alamat HTTPS GitHub Pages.";
} else if ("Notification" in window && Notification.permission === "granted") {
  activateNotifications(false).catch((error) => {
    console.error("Pemulihan notifikasi gagal:", error);
    setStatus("Perlu aktivasi ulang");
    button.disabled = false;
    button.textContent = "Aktifkan Notifikasi";
    $("hint").textContent = error.message || "Aktifkan kembali notifikasi perangkat ini.";
  });
}

button.addEventListener("click", async () => {
  button.disabled = true;
  button.textContent = "Mengaktifkan…";
  try {
    await activateNotifications(true);
    toast("Notifikasi berhasil diaktifkan pada perangkat ini.");
  } catch (error) {
    console.error(error);
    setStatus("Belum berhasil diaktifkan");
    toast(error.message || "Terjadi kesalahan.");
    button.disabled = false;
    button.textContent = "Coba Lagi";
  }
});
