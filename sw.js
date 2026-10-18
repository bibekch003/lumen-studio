/* ------------------------------------------------------------------
   Lumen Studio — service worker
   Offline-first app shell, but always tries the network for the page
   itself so a new push goes live on the very next open.

   VERSION and BUILD are rewritten automatically by scripts/release.mjs.
   Do not edit them by hand — and if you change the precache list below,
   run `npm run validate` so CI catches anything that does not exist.
   ------------------------------------------------------------------ */
const VERSION = 'v1.0.0';
const BUILD = 1;
const CACHE = 'lumen-' + VERSION;

const CORE = [
  './',
  './index.html',
  './version.json',
  './manifest.webmanifest',
  './icons/icon-64.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

/* install: precache the shell, then take over immediately */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

/* Tell every open page which version this worker is running, so the app can
   say "a newer version is available" instead of silently running old code. */
async function announceVersion() {
  try {
    const res = await caches.match('./version.json');
    if (!res) return;
    const info = await res.json();
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    clients.forEach(c => c.postMessage({ type: 'lumen-version', version: info.version, build: info.build }));
  } catch (e) { /* nothing to announce */ }
}

/* activate: drop caches from previous versions, then announce */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    await announceVersion();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  /* Page loads: network first (so updates land instantly), cache as fallback. */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  /* Everything else (icons, fonts): cache first, refresh in the background. */
  event.respondWith(
    caches.match(req).then(cached => {
      const fromNetwork = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || fromNetwork;
    })
  );
});

/* let the page ask for an immediate takeover, or for the version */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
  if (event.data === 'check-version') announceVersion();
});
