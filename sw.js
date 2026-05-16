const CACHE_NAME = 'album-2026-v27'; 

const urlsToCache = [
  './',
  './index.html',
  './style.css?v=27',
  './app.js?v=27',
  './data.js?v=27',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Archivos locales que son críticos
      cache.addAll(urlsToCache);
      
      // Archivos externos de las librerías QR. Se cachean de forma segura
      // sin bloquear la instalación si la red falla.
      cache.add('https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.1/qrcode.min.js').catch(()=>{});
      cache.add('https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js').catch(()=>{});
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
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});
