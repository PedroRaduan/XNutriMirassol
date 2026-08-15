/*
 * Administrative PWA service worker. It deliberately has no fetch handler:
 * administrative pages, API responses and customer data are always fetched
 * from the server and are never kept in an offline cache.
 */
self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
