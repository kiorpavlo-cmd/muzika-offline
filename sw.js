const CACHE_NAME = 'muzika-shell-v1';
const APP_FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './Muzika.mobileconfig',
  './assets/icon.svg',
  './assets/icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request, { cache: 'no-cache' });
        if (fresh.ok) (await caches.open(CACHE_NAME)).put('./index.html', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match(request)) || (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Refresh the app shell from the network first; use the last saved copy when offline.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    try {
      const fresh = await fetch(request, { cache: 'no-cache' });
      if (fresh.ok) (await caches.open(CACHE_NAME)).put(request, fresh.clone());
      return fresh;
    } catch {
      return cached || Response.error();
    }
  })());
});
