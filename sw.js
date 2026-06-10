const CACHE_NAME = 'album-2026-v74';

const urlsToCache = [
  './', 
  './index.html', 
  './style.css?v=74', 
  './data.js?v=74', 
  './album_names_2026_v1.csv?v=74',
  './store.js?v=74', 
  './match.js?v=74', 
  './app.js?v=74',
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