const CACHE_NAME = 'album-2026-v68';

const urlsToCache = [
  './', 
  './index.html', 
  './style.css?v=68', 
  './data.js?v=68', 
  './album_names_2026_v1.csv?v=68',
  './store.js?v=68', 
  './match.js?v=68', 
  './app.js?v=68',
  './firebase-config.js?v=68',
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