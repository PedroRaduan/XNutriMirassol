/*
 * PDV PWA service worker. Requests stay network-only: sales, customer data,
 * inventory and API responses are never stored in an offline cache.
 */
self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
