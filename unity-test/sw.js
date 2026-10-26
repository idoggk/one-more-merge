// OMM service worker. The page shell is NEVER cached here: index.html, the manifest and this file always come from the network
// (cache: "no-store"), so a template fix reaches the home-screen app on its next launch. Only the big Unity files under Build/ are
// cached, in a cache named after the build; their URLs carry ?v=<build> so a new build never reads an old file.
// db19a67 is replaced at stage time (tools/stage-unity-test.mjs).
const REV = "db19a67";
const CACHE = "omm-" + REV;

self.addEventListener("install", function () { self.skipWaiting(); });

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\/Build\/[^/]+$/.test(url.pathname) && !/\.html?$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) { if (res && res.ok) cache.put(req, res.clone()); return res; });
        });
      })
    );
    return;
  }
  // everything else (HTML, "/", manifest, sw.js, icons): network only, never stored
  event.respondWith(fetch(req.url, { cache: "no-store", credentials: "same-origin" }));
});
