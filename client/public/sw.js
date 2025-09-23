
const CACHE_NAME = 'cruz-vermelha-v1';
const urlsToCache = [
  '/',
  '/src/main.tsx',
  '/src/index.css',
  'https://imgur.com/V4f4OIL.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
