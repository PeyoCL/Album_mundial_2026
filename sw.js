const CACHE_NAME = 'album-2026-v57';

const urlsToCache = [
  './', 
  './index.html', 
  './style.css?v=57', 
  './data.js?v=57', 
  './album_names_2026_v1.csv?v=57',
  './store.js?v=57', 
  './match.js?v=57', 
  './app.js?v=57',
  './firebase-config.js?v=57',
  './manifest.json', 
  './icon.svg', 
  './logo_fwc.svg', 
  './logo_coca_cola.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => { if (cacheName !== CACHE_NAME) return caches.delete(cacheName); })
    ))
  );
  return self.clients.claim(); 
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') return networkResponse;
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => { cache.put(event.request, responseToCache); });
        return networkResponse;
      }).catch(() => {});
    })
  );
});