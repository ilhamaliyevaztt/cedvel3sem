/* Service Worker — saytın bütün resurslarını keşləyir və internetsiz işlədіr. */
'use strict';

var VERSION = 'v1.0.4';
var CACHE = 'cedvel-' + VERSION;
var RUNTIME = 'cedvel-runtime-' + VERSION;

/* Saytın işləməsi üçün vacib olan bütün fayllar */
var SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/data.js',
  './js/store.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/favicon-16.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      /* Hər faylı ayrıca yükləyirik: biri alınmasa da qalanları keşlənir */
      return Promise.all(SHELL.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () {
          return null;
        });
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE && key !== RUNTIME) return caches.delete(key);
        return null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', function (event) {
  var data = event.data || {};
  if (data.type === 'skip-waiting') {
    self.skipWaiting();
  }
});

/* Şəbəkə → keş, alınmasa keşdən (oflayn) */
function networkFirst(request) {
  return fetch(request).then(function (response) {
    if (response && response.status === 200 && response.type === 'basic') {
      var copy = response.clone();
      caches.open(RUNTIME).then(function (cache) { cache.put(request, copy); });
    }
    return response;
  }).catch(function () {
    return caches.match(request, { ignoreSearch: true }).then(function (hit) {
      return hit || caches.match('./index.html');
    });
  });
}

/* Keş → şəbəkə (statik resurslar üçün sürətli) */
function cacheFirst(request) {
  return caches.match(request, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return fetch(request).then(function (response) {
      if (response && response.status === 200) {
        var copy = response.clone();
        caches.open(RUNTIME).then(function (cache) { cache.put(request, copy); });
      }
      return response;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;

  if (request.method !== 'GET') return;

  var url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  if (url.origin !== self.location.origin) return;

  /* Səhifə açılışı: əvvəl şəbəkə, oflayn olanda keşdən */
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  var path = url.pathname;

  if (/\.(?:css|js|png|jpg|jpeg|svg|webp|ico|json|woff2?|ttf)$/i.test(path)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
