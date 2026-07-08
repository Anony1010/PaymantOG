/**
 * GASHAM - Service Worker
 * Offline dəstək və caching üçün
 */

const CACHE = 'gasham-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/css/style.css',
  '/css/admin.css',
  '/js/firebase-config.js',
  '/js/app.js',
  '/js/admin.js',
  '/manifest.json'
];

// Install - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip Firebase and CDN requests
  const url = new URL(event.request.url);
  if (url.hostname.includes('firebase') || url.hostname.includes('unpkg') || url.hostname.includes('gstatic')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
