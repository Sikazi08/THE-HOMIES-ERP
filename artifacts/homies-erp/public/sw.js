// Kill-switch service worker.
// A previous version of this app shipped an offline-first PWA service worker
// that cached the app shell and queued data locally. That behaviour prevented
// sales (and other operations) from reaching the Supabase database.
//
// This replacement service worker does the opposite: it deletes every cache,
// unregisters itself, and forces any open tab to reload from the network so
// the app always talks directly to the server / Supabase. Once it has run, no
// service worker remains registered.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch (err) {
        // ignore cache errors
      }
      try {
        await self.registration.unregister();
      } catch (err) {
        // ignore unregister errors
      }
      try {
        await self.clients.claim();
      } catch (err) {
        // ignore claim errors
      }
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })(),
  );
});
