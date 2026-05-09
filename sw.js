// 1. CAMBIA ESTE NOMBRE CADA VEZ QUE ACTUALICES TU APP (v1, v2, v3, etc.)
const CACHE_NAME = 'album-2026-v2'; 

const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './manifest.json',
  './icon.svg'
];

// Instalar y guardar en caché
self.addEventListener('install', event => {
  // Obliga al Service Worker a instalarse inmediatamente
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Activar y limpiar cachés antiguos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Si el caché antiguo no es el actual, lo borra
            return caches.delete(cacheName); 
          }
        })
      );
    })
  );
  // Toma el control de la página inmediatamente
  return self.clients.claim(); 
});

// Interceptar peticiones
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
