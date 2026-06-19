const CACHE = 'calitrack-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './assets/ding.mp3',
  './css/base.css',
  './css/components.css',
  './css/workout.css',
  './css/meals.css',
  './css/schedule.css',
  './css/notes.css',
  './css/today.css',
  './css/data.css',
  './css/body.css',
  './css/challenges.css',
  './js/state.js',
  './js/utils.js',
  './js/workout.js',
  './js/meals.js',
  './js/schedule.js',
  './js/notes.js',
  './js/data.js',
  './js/today.js',
  './js/body.js',
  './js/challenges.js',
  './js/summary.js',
  './js/init.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first (bypassing HTTP cache), fall back to SW cache only if offline
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
