const CACHE_NAME = 'de-prep-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  // Natural Science JSONs (2013-2017) – 6 subjects × 5 years = 30 files
  '/data/biology_2013.json',
  '/data/biology_2014.json',
  '/data/biology_2015.json',
  '/data/biology_2016.json',
  '/data/biology_2017.json',
  '/data/chemistry_2013.json',
  '/data/chemistry_2014.json',
  '/data/chemistry_2015.json',
  '/data/chemistry_2016.json',
  '/data/chemistry_2017.json',
  '/data/physics_2013.json',
  '/data/physics_2014.json',
  '/data/physics_2015.json',
  '/data/physics_2016.json',
  '/data/physics_2017.json',
  '/data/mathematics_2013.json',
  '/data/mathematics_2014.json',
  '/data/mathematics_2015.json',
  '/data/mathematics_2016.json',
  '/data/mathematics_2017.json',
  '/data/english_2013.json',
  '/data/english_2014.json',
  '/data/english_2015.json',
  '/data/english_2016.json',
  '/data/english_2017.json',
  '/data/aptitude_2013.json',
  '/data/aptitude_2014.json',
  '/data/aptitude_2015.json',
  '/data/aptitude_2016.json',
  '/data/aptitude_2017.json',
  // Social Science JSONs (2013-2017) – 5 subjects × 5 years = 25 files
  '/data/history_2013.json',
  '/data/history_2014.json',
  '/data/history_2015.json',
  '/data/history_2016.json',
  '/data/history_2017.json',
  '/data/geography_2013.json',
  '/data/geography_2014.json',
  '/data/geography_2015.json',
  '/data/geography_2016.json',
  '/data/geography_2017.json',
  '/data/economics_2013.json',
  '/data/economics_2014.json',
  '/data/economics_2015.json',
  '/data/economics_2016.json',
  '/data/economics_2017.json',
  '/data/mathematics_2013.json',   // Social Science also has mathematics – duplicate? It's same filename, so it will be cached once.
  '/data/mathematics_2014.json',
  '/data/mathematics_2015.json',
  '/data/mathematics_2016.json',
  '/data/mathematics_2017.json',
  '/data/english_2013.json',        // Duplicate also – will be cached once.
  '/data/english_2014.json',
  '/data/english_2015.json',
  '/data/english_2016.json',
  '/data/english_2017.json',
  '/data/aptitude_2013.json',
  '/data/aptitude_2014.json',
  '/data/aptitude_2015.json',
  '/data/aptitude_2016.json',
  '/data/aptitude_2017.json'
];

// Deduplicate the array (remove duplicates) – optional but safe
const uniqueUrls = [...new Map(urlsToCache.map(url => [url, url])).values()];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(uniqueUrls))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});