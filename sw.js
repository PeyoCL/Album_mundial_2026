const CACHE_NAME = 'album-2026-v40'; 

const urlsToCache = [
  './',
  './index.html',
  './style.css?v=40',
  './app.js?v=40',
  './data.js?v=40',
  './manifest.json',
  './icon.svg',
  './logo_fwc.svg',
  './logo_coca_cola.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
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

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 1. Si está en caché, lo devuelve inmediato
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // 2. Si no, lo pide a internet y lo clona ANTES de guardarlo
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
        // Fallback en caso de no haber internet y no estar en caché
      });
    })
  );
});