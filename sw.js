/* ------------------------------------------------------------------
   Lumen Studio — service worker
   Offline-first app shell, but always tries the network for the page
   itself so a new push goes live on the very next open.

   Bump VERSION when you change the precache list.
   ------------------------------------------------------------------ */
const VERSION = 'v1';
const CACHE = 'lumen-' + VERSION;

const CORE = [
  './',
  './index.html',
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

/* activate: drop caches from previous versions */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
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

/* let the page ask for an immediate takeover */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
