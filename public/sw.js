const CACHE = 'mamuska-os-v1';
const CORE = ['/', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => { self.clients.claim(); });

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return; // los datos siempre van a la red, nunca a caché
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
