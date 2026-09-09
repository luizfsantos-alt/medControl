const VERSION = 'medcontrol-v1.1.0';
const NETWORK_TIMEOUT_MS = 2500;

const PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/app.js',
  'js/state.js',
  'js/ui.js',
  'js/util.js',
  'assets/icon-192.png',
  'assets/icon-512.png',
];

const CODE_EXTENSIONS = ['.html', '.js', '.css', '.webmanifest'];

function isCode(url) {
  return CODE_EXTENSIONS.some((ext) => url.pathname.endsWith(ext)) || url.pathname.endsWith('/');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

function networkWithTimeout(request) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('timeout'));
      }
    }, NETWORK_TIMEOUT_MS);

    fetch(request).then(
      (response) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(response);
        }
      },
      (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      },
    );
  });
}

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const response = await networkWithTimeout(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return cache.match('index.html');
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(isCode(url) ? networkFirst(event.request) : cacheFirst(event.request));
});
