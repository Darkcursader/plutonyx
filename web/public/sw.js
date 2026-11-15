// Portions of this code were generated with the assistance of an SI tool (Claude) and reviewed by Team PlutonyX.
// Service worker: after the first visit the game works offline (with the archived NASA data).
// Big static files are served from the cache first; the page itself is fetched fresh when online.
const CACHE = 'plutonyx-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // NASA requests always go to the network
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(e.request);
    const fromNet = fetch(e.request).then((r) => { if (r.ok) cache.put(e.request, r.clone()); return r; });
    if (hit && /\/(assets|terrain|ground|models|art)\//.test(url.pathname)) { fromNet.catch(() => {}); return hit; }
    try { return await fromNet; } catch { return hit || Response.error(); }
  })());
});
