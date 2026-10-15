// Offline support for the home-screen app. Hashed build assets are cached (cache-first, they never change under
// one name); the page and everything else is network-first AND skips the browser HTTP cache (GitHub Pages sends
// max-age=600, which served old index.html / version.json for up to 10 minutes). Old caches are dropped on activate.
// v2: a deploy keeps the last builds' hashed files, so a cached asset is never needed from a removed build.
const CACHE = 'omm-v2';

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
    e.respondWith(fetch(req.url, { cache: 'reload', credentials: 'same-origin' }).then(put).catch(() => caches.match(req).then((r) => r ?? caches.match('./'))));
  } else {
    e.respondWith(caches.match(req).then((r) => r ?? fetch(req).then(put)));
  }
});
