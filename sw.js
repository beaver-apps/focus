/* Beaver Focus service worker: the app works offline, updates wait for you, notifications open the app.
   The build writes VERSION and FILES; a new build means a new VERSION, so the page shows "New version ready". */
const VERSION = 'bf-989dcc674362';                     // filled in by the build (a hash of every file)
const FILES = ["./","assets/gif-DqgbZLqQ.js","assets/index-_o5mraCq.js","assets/silkscreen-latin-CtPo2yA5.woff2","icons/apple-touch-icon.png","icons/favicon-32.png","icons/favicon.svg","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","index.html","manifest.webmanifest","studio.html"];
const RELEASE = "v2.3 · Polyglot Paws";                     // e.g. "v2.1 · Name Tags"
// the Chinese / Japanese pixel fonts aren't precached (most people never need them): kept here once they're used,
// in their own cache that survives updates
const LAZY_CACHE = 'bf-lazy-fonts-v1', LAZY = /\/fonts\/fusion-pixel\/[^/]+\.woff2$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => {
    if (!self.registration.active) return self.skipWaiting();        // very first install: take over right away
  }));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== LAZY_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('message', e => {
  if (e.data === 'skip-waiting') self.skipWaiting();                        // the user tapped "update"
  if (e.data === 'release' && e.ports[0]) e.ports[0].postMessage(RELEASE);  // the page asks which version this is
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // GitHub sync etc. go straight to the network
  if (LAZY.test(url.pathname)) {                                                // a CJK font: from its cache, else fetch and keep it
    e.respondWith(caches.open(LAZY_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(hit => hit || fetch(req).catch(() =>
    req.mode === 'navigate' ? caches.match('index.html') : Response.error())));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
