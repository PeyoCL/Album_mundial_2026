const CACHE_NAME = 'album-2026-v28'; 

const urlsToCache = [
  './',
  './index.html',
  './style.css?v=28',
  './app.js?v=28',
  './data.js?v=28',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      cache.addAll(urlsToCache);
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
