const CACHE_NAME = 'album-2026-v25'; 

const urlsToCache = [
  './',
  './index.html',
  './style.css?v=25',
  './app.js?v=25',
  './data.js?v=25',
  './manifest.json',
  './icon.svg',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); 
          }
        })
      );
    })
  );
  return self.clients.claim(); 
});

// NUEVA ESTRATEGIA: "Stale-While-Revalidate"
// Muestra la app rápido desde el caché, pero en segundo plano descarga la última versión
// para el próximo uso. Esto evita que el usuario se quede estancado en versiones viejas.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
