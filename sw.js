// Offline support for the home-screen app. Hashed build assets are cached forever (cache-first);
// the page itself is network-first so a new deploy is picked up the next time the app opens online.
const CACHE = 'omm-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const put = (res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  };
  if (req.mode === 'navigate' || !req.url.includes('/assets/')) {
    e.respondWith(fetch(req).then(put).catch(() => caches.match(req).then((r) => r ?? caches.match('./'))));
  } else {
    e.respondWith(caches.match(req).then((r) => r ?? fetch(req).then(put)));
  }
});
