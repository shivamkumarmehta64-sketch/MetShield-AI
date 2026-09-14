/**
 * MetShield AI — Service Worker (PWA Offline Support)
 * Version: metshield-ai-v1
 *
 * Strategies:
 * - Cache-first for static assets (CSS, JS, fonts, images)
 * - Network-first for API routes (/api/weather, /api/telemetry)
 * - Offline fallback for failed API requests and navigation
 * - Pre-caches landing page, dashboard, mobile interface, and audit report
 */

const CACHE_NAME = 'metshield-ai-v1';

const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/mobile',
  '/audit-report',
  '/manifest.json',
  '/metshield-logo.jpg',
  '/favicon.ico',
];

// Install Event: Pre-cache core application routes and static essentials
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_URLS);
      } catch (err) {
        console.warn('[SW] Pre-cache addAll encountered an error, falling back to resilient individual caching:', err);
        await Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((e) => {
              console.warn(`[SW] Could not precache ${url}:`, e);
            })
          )
        );
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up previous cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Check if request is for static assets (CSS, JS, fonts, images)
function isStaticAsset(request, url) {
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    return true;
  }
  if (url.pathname.startsWith('/_next/static/')) {
    return true;
  }
  return /\.(?:css|js|woff2?|ttf|eot|otf|png|jpe?g|svg|gif|webp|ico|avif)$/i.test(url.pathname);
}

// Fetch Event
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Ignore non-http/https schemes (e.g. chrome-extension://)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 1. Network-first strategy for API routes (/api/weather, /api/telemetry, etc.)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: try exact cached API response
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          // Try matching ignoring search query params
          const cachedWithoutSearch = await caches.match(request, { ignoreSearch: true });
          if (cachedWithoutSearch) {
            return cachedWithoutSearch;
          }

          // Fallback JSON payload when both network and cache are unavailable
          const fallbackData = {
            offline: true,
            success: false,
            status: 'offline',
            packets: [],
            message: 'Network connection unavailable. Operating in MetShield AI offline mode.',
            timestamp: new Date().toISOString(),
          };

          return new Response(JSON.stringify(fallbackData), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'X-Offline-Fallback': 'true',
            },
          });
        })
    );
    return;
  }

  // 2. Cache-first strategy for static assets (CSS, JS, fonts, images)
  if (isStaticAsset(request, url)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Navigation requests (HTML pages): Network-first with cache & offline fallback
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }

          const pathMatch = await caches.match(url.pathname);
          if (pathMatch) {
            return pathMatch;
          }

          const dashboardFallback = await caches.match('/dashboard');
          if (dashboardFallback) {
            return dashboardFallback;
          }

          const rootFallback = await caches.match('/');
          if (rootFallback) {
            return rootFallback;
          }

          return new Response(
            '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>MetShield AI Offline</title><style>body{font-family:sans-serif;background:#030712;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column}h1{color:#38bdf8}p{color:#94a3b8}</style></head><body><h1>MetShield AI Offline</h1><p>You are currently offline. Please reconnect to access real-time telemetry.</p></body></html>',
            {
              status: 200,
              headers: { 'Content-Type': 'text/html' },
            }
          );
        })
    );
    return;
  }

  // 4. Default: Cache-first, fallback to network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
      );
    })
  );
});
