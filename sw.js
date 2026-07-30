/* PRANA service worker — offline-first cache for a fully static PWA */
const CACHE = 'prana-v28';
const ASSETS = [
  './',
  './index.html',
  './data.js',
  './manifest.webmanifest',
  './fonts/JetBrainsMono-Regular.ttf',
  './fonts/JetBrainsMono-Bold.ttf',
  './icons/icon-256.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // network-first for same-origin navigations, cache-first for everything else
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => {
      const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((r) => {
      if (r.ok && r.type === 'basic') { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return r;
    }).catch(() => cached))
  );
});
