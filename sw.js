/* ------------------------------------------------------------------
   Lumen Studio — service worker
   Offline-first app shell, but always tries the network for the page
   itself so a new push goes live on the very next open.

   VERSION and BUILD are rewritten automatically by scripts/release.mjs.
   Do not edit them by hand — and if you change the precache list below,
   run `npm run validate` so CI catches anything that does not exist.
   ------------------------------------------------------------------ */
const VERSION = 'v1.8.0';
const BUILD = 12;
const CACHE = 'lumen-' + VERSION;

const CORE = [
  './',
  './index.html',
  './pixels.js',
  './pixel-worker.js',
  './version.json',
  './manifest.webmanifest',
  './icons/logo-mark.png',
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

/* This worker's own version record. It is precached, so it works offline. */
async function versionInfo() {
  try {
    const res = await caches.match('./version.json');
    if (res) return await res.json();
  } catch (e) { /* fall through */ }
  return { version: null, build: null };
}

/* Tell every open page which version this worker is running, so the app can
   say "a newer version is available" instead of silently running old code. */
async function announceVersion() {
  const info = await versionInfo();
  if (!info.version) return;
  try {
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

/* The page can ask for an immediate takeover, or for the version.
   "get-version" carries a message port so the page gets a direct reply and
   never has to wait for a broadcast that may never come. */
self.addEventListener('message', event => {
  const data = event.data;
  if (data === 'skipWaiting') { self.skipWaiting(); return; }

  const wantsVersion = data === 'check-version' || (data && data.type === 'get-version');
  if (!wantsVersion) return;

  const reply = versionInfo().then(info => {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ version: info.version, build: info.build });
    } else {
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
        .then(cs => cs.forEach(c => c.postMessage({ type: 'lumen-version', version: info.version, build: info.build })));
    }
  });
  if (event.waitUntil) event.waitUntil(reply);
});
