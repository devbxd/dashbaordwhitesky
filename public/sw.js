// App-shell cache only - never touches API data. Static files (HTML/CSS/JS/fonts/icons)
// are served network-first so a fresh deploy is picked up immediately when online, and
// fall back to the last cached copy when there's no connection at all. API requests are
// left alone here - the app itself decides what to do when one of those fails offline
// (see the OFFLINE SUPPORT block in app.js).
const CACHE_NAME = 'msc-app-shell-v1';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/css/app.css',
  '/css/tabler-icons.min.css',
  '/js/app.js',
  '/fonts/tabler-icons/tabler-icons.woff2',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
  );
});
