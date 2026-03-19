const CACHE_NAME = 'justtools-v1';
const ASSETS = [
  'index.html',
  'common.css',
  'common.js',
  'manifest.json',
  'favicon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
