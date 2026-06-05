const CACHE_NAME = 'album-2026-v70';

const urlsToCache = [
  './', 
  './index.html', 
  './style.css?v=70', 
  './data.js?v=70', 
  './album_names_2026_v1.csv?v=70',
  './store.js?v=70', 
  './match.js?v=70', 
  './app.js?v=70',
  './firebase-config.js?v=70',
  './manifest.json', 
  './icon.svg', 
  './logo_fwc.svg', 
  './logo_coca_cola.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;
        return fetch(event.request);
      })
  );
});