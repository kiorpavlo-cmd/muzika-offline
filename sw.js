const CACHE_NAME = 'muzika-shell-v3';
const STAGING_PREFIX = 'muzika-refresh-staging-';
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

async function downloadAppShell(cacheName) {
  const cache = await caches.open(cacheName);
  const stamp = Date.now();

  for (const [index, asset] of APP_FILES.entries()) {
    const cacheUrl = new URL(asset, self.registration.scope);
    const networkUrl = new URL(cacheUrl);
    networkUrl.searchParams.set('__offline_refresh', `${stamp}-${index}`);
    const response = await fetch(networkUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`asset-download-failed:${asset}`);
    await cache.put(cacheUrl.href, response);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    downloadAppShell(CACHE_NAME)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) =>
        (key.startsWith('muzika-shell-') && key !== CACHE_NAME) || key.startsWith(STAGING_PREFIX)
      ).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function refreshAppShell() {
  const stagingName = `${STAGING_PREFIX}${Date.now()}`;
  try {
    await downloadAppShell(stagingName);

    const staging = await caches.open(stagingName);
    const active = await caches.open(CACHE_NAME);
    for (const asset of APP_FILES) {
      const cacheUrl = new URL(asset, self.registration.scope);
      const response = await staging.match(cacheUrl.href);
      if (!response) throw new Error(`asset-missing:${asset}`);
      await active.put(cacheUrl.href, response);
    }

    const names = await caches.keys();
    await Promise.all(names.filter((name) =>
      (name.startsWith('muzika-shell-') && name !== CACHE_NAME) ||
      (name.startsWith(STAGING_PREFIX) && name !== stagingName)
    ).map((name) => caches.delete(name)));
    return true;
  } finally {
    await caches.delete(stagingName);
  }
}

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'FORCE_REFRESH_OFFLINE_SHELL') return;
  const replyPort = event.ports?.[0];
  event.waitUntil(
    refreshAppShell().then(
      () => replyPort?.postMessage({ ok: true }),
      () => replyPort?.postMessage({ ok: false })
    )
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    try {
      const fresh = await fetch(request, { cache: 'no-cache' });
      if (fresh.ok) {
        const cacheUrl = request.mode === 'navigate'
          ? new URL('./', self.registration.scope)
          : new URL(request.url);
        cacheUrl.search = '';
        await cache.put(cacheUrl.href, fresh.clone());
      }
      return fresh;
    } catch {
      if (cached) return cached;
      if (request.mode === 'navigate') {
        return (await cache.match(new URL('./index.html', self.registration.scope))) || Response.error();
      }
      return Response.error();
    }
  })());
});
