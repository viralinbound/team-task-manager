// Workboard service worker: pages always come from the network (data is live and private);
// if the phone is offline, show a small "you're offline" page instead of the browser error.
const CACHE = "workboard-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return; // leave data, images and API calls alone
  e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE)));
});
