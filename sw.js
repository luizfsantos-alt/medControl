const VERSION = 'medcontrol-v1.1.1';
const NETWORK_TIMEOUT_MS = 2500;

const PRECACHE = [
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
  return CODE_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      // um a um, para que um único arquivo com problema não derrube a
      // instalação inteira; cache: 'reload' força ida à rede, sem aceitar
      // uma cópia antiga do próprio cache HTTP do navegador.
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: 'reload' }));
          } catch {
            /* aquele arquivo fica de fora do precache; o app segue funcionando */
          }
        }),
      );
    })(),
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

    fetch(request, { cache: 'reload' }).then(
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

async function networkFirst(request, cacheKey) {
  const cache = await caches.open(VERSION);
  try {
    const response = await networkWithTimeout(request);
    if (response && response.ok) cache.put(cacheKey, response.clone());
    return response;
  } catch {
    const cached = await cache.match(cacheKey);
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
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    const fresh = new Request('index.html', { cache: 'reload' });
    event.respondWith(networkFirst(fresh, 'index.html'));
    return;
  }

  if (isCode(url)) {
    event.respondWith(networkFirst(request, request));
    return;
  }

  event.respondWith(cacheFirst(request));
});
