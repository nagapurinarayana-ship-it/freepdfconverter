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
      if (!response.ok) return response;

      const copy = response.clone();
      event.waitUntil(caches.open(RUNTIME_CACHE).then(function (cache) {
        return cache.put(request, copy);
      }));
      return response;
    }).catch(function () {
      return caches.match(request).then(function (cached) {
        return cached || caches.match("/offline").then(function (offline) {
          return offline || caches.match("/offline.html");
        });
      });
    }));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    // Assets contain the application JavaScript and CSS. They must not be
    // served cache-first: stable image-tool entry URLs can otherwise keep an
    // older picker/runtime forever on a device even after a new deployment.
    // Prefer the live deployment and retain the previous response only as an
    // offline fallback.
    event.respondWith(fetch(request).then(function (response) {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(RUNTIME_CACHE).then(function (cache) {
          return cache.put(request, copy);
        }));
      }
      return response;
    }).catch(function () {
      return caches.match(request);
    }));
  }
});

// Deploy the exact known-good d9 baseline to production.
