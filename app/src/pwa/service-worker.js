const CACHE_PREFIX = "cyndy-shell-";
const CACHE_NAME = "__CACHE_NAME__";
const PRECACHE_URLS = __PRECACHE_URLS__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  const cachedResponse = caches.open(CACHE_NAME).then((cache) =>
    request.mode === "navigate"
      ? cache.match("/")
      : cache.match(request, { ignoreVary: true }),
  );
  event.respondWith(cachedResponse.then((cached) => cached ?? fetch(request)));
});
