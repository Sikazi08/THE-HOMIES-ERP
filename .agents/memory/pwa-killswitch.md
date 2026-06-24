---
name: PWA / service-worker kill-switch
description: How to fully remove offline/PWA behavior once a service worker has been deployed to users' browsers
---

# Removing offline/PWA from homies-erp (and any deployed web artifact)

Deleting the PWA plugin from source is NOT enough. A Workbox/PWA service worker
that was once deployed stays **registered in users' browsers** and keeps serving
the cached, offline-first app shell — which can stop writes (e.g. sales) from
ever reaching the server/Supabase. Serving no `sw.js` (404) does not evict it:
per spec the browser keeps the existing registration when the update fetch fails.

**Why:** users reported sales never appearing in any DB; root cause was a stale
registered SW intercepting/caching the app, not the DB or FK constraints.

**How to apply — kill-switch pattern:**
- Ship a replacement `sw.js` at the *same URL* the old one used. For homies-erp
  the base path is `/homies-erp/`, so put it in `artifacts/homies-erp/public/sw.js`
  (Vite copies `public/` to the served root → `/homies-erp/sw.js`).
- The kill-switch: on `install` → `skipWaiting()`; on `activate` → delete all
  caches, `registration.unregister()`, `clients.claim()`, then
  `clients.matchAll({ type:"window", includeUncontrolled:true })` and
  `client.navigate(client.url)` to force-reload every open tab.
- Belt-and-suspenders: in `src/main.tsx`, on load call
  `navigator.serviceWorker.getRegistrations()` → unregister each, and clear
  `caches.keys()`.
- The browser fetches the SW script (bypassing HTTP cache) on the next
  navigation in scope, so the kill-switch activates on the user's next visit.
- Build uses `emptyOutDir: true`, so a fresh `vite build` wipes stale
  registerSW.js / manifest.webmanifest / workbox-*.js automatically. Republish
  for it to reach production.
- Optional: remove `public/sw.js` after a stable release window once the stale
  SW population is confirmed gone.
