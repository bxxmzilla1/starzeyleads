/* Starzey service worker — precaches the app shell and keeps every
 * page fast with a stale-while-revalidate strategy for assets and a
 * network-first strategy for pages (so fresh content wins online, but
 * everything still opens offline). */
var CACHE = "starzey-v1";

var SHELL = [
  "/",
  "/index.html",
  "/admin/",
  "/admin/index.html",
  "/admin/trackinglinks/",
  "/admin/trackinglinks/index.html",
  "/admin/leads/",
  "/admin/leads/index.html",
  "/assets/admin.css",
  "/assets/store.js",
  "/assets/icon.svg",
  "/manifest.webmanifest"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);

  /* Pages: network first, cached shell as offline fallback. */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
          return response;
        })
        .catch(function () {
          return caches.match(request, { ignoreSearch: true }).then(function (cached) {
            return cached || caches.match("/index.html");
          });
        })
    );
    return;
  }

  /* Same-origin assets + Google Fonts: stale-while-revalidate. */
  var cacheable = url.origin === location.origin ||
                  url.hostname === "fonts.googleapis.com" ||
                  url.hostname === "fonts.gstatic.com";
  if (!cacheable) return;

  event.respondWith(
    caches.match(request).then(function (cached) {
      var refresh = fetch(request).then(function (response) {
        if (response && (response.ok || response.type === "opaque")) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      }).catch(function () { return cached; });
      return cached || refresh;
    })
  );
});
