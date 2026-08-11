"use strict";

const CACHE_VERSION = "__CACHE_VERSION__";
const STATIC_CACHE = "freepdf-static-" + CACHE_VERSION;
const RUNTIME_CACHE = "freepdf-runtime-" + CACHE_VERSION;
const PRECACHE_URLS = /*__PRECACHE_URLS__*/[];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(STATIC_CACHE).then(function (cache) {
    return cache.addAll(PRECACHE_URLS);
  }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return key.startsWith("freepdf-") && key !== STATIC_CACHE && key !== RUNTIME_CACHE;
    }).map(function (key) {
      return caches.delete(key);
    }));
  }).then(function () {
    return self.clients.claim();
  }));
});

self.addEventListener("fetch", function (event) {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(function (response) {
      const copy = response.clone();
      caches.open(RUNTIME_CACHE).then(function (cache) { cache.put(request, copy); });
      return response;
    }).catch(function () {
      return caches.match(request).then(function (cached) {
        return cached || caches.match("/offline");
      });
    }));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(caches.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response.ok) {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      });
    }));
  }
});
