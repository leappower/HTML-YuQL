// sw.js - Service Worker for caching language files
// Implements offline caching and intelligent cache management

const CACHE_NAME = 'language-cache-v1';
const LANGUAGE_FILES_CACHE = 'language-files-v2';

// UI translation files (small, ~16KB each) — cached on install for instant first render
// Product translation files (large, ~130KB each) — cached on first use
const UI_LANGUAGE_FILES = [
  './assets/lang/zh-CN-ui.json',
  './assets/lang/zh-TW-ui.json',
  './assets/lang/en-ui.json',
  './assets/lang/ar-ui.json',
  './assets/lang/he-ui.json',
  './assets/lang/de-ui.json',
  './assets/lang/es-ui.json',
  './assets/lang/fr-ui.json',
  './assets/lang/it-ui.json',
  './assets/lang/nl-ui.json',
  './assets/lang/pl-ui.json',
  './assets/lang/pt-ui.json',
  './assets/lang/ru-ui.json',
  './assets/lang/tr-ui.json',
  './assets/lang/ja-ui.json',
  './assets/lang/ko-ui.json',
  './assets/lang/id-ui.json',
  './assets/lang/ms-ui.json',
  './assets/lang/fil-ui.json',
  './assets/lang/th-ui.json',
  './assets/lang/vi-ui.json',
  './assets/lang/hi-ui.json',
  './assets/lang/my-ui.json',
  './assets/lang/km-ui.json',
  './assets/lang/lo-ui.json',
];

// Keep a flat list for install-time pre-caching (UI files only — fast to cache)
const LANGUAGE_FILES = UI_LANGUAGE_FILES;

// Install event - cache language files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');

  event.waitUntil(
    caches.open(LANGUAGE_FILES_CACHE).then((cache) => {
      console.log('[SW] Caching language files...');
      return cache.addAll(LANGUAGE_FILES).then(() => {
        console.log('[SW] All language files cached successfully');
      }).catch((error) => {
        console.error('[SW] Failed to cache language files:', error);
        // Cache individually to avoid one failure blocking all
        return Promise.allSettled(
          LANGUAGE_FILES.map(file => {
            return cache.add(file).catch(err => {
              console.warn(`[SW] Failed to cache ${file}:`, err);
            });
          })
        );
      });
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Keep only current cache
          if (cacheName !== LANGUAGE_FILES_CACHE && cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle language file requests
  // Match both absolute (/assets/lang/...) and relative (./assets/lang/...) URL forms
  if ((url.pathname.startsWith('/assets/lang/') || url.pathname.includes('/assets/lang/')) && url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(LANGUAGE_FILES_CACHE).then((cache) => {
        // Normalize cache key: strip query string so pre-cached entries always hit
        // (fetch may carry ?ts= or other params that must not create separate cache entries)
        const normalizedRequest = new Request(url.origin + url.pathname, { headers: event.request.headers });

        // Try to get from cache first (ignoreSearch as extra safety net)
        return cache.match(normalizedRequest, { ignoreSearch: true }).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[SW] Serving language file from cache:', url.pathname);
            return cachedResponse;
          }

          // Not in cache, fetch from network
          console.log('[SW] Fetching language file from network:', url.pathname);
          return fetch(event.request).then((networkResponse) => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              console.warn('[SW] Invalid network response for:', url.pathname);
              return networkResponse;
            }

            // Clone response
            const responseToCache = networkResponse.clone();

            // Store with normalized key (no query string) to match pre-cached entries
            cache.put(normalizedRequest, responseToCache).catch(err => {
              console.warn('[SW] Failed to cache language file:', err);
            });

            console.log('[SW] Language file cached:', url.pathname);
            return networkResponse;
          }).catch((error) => {
            console.error('[SW] Network fetch failed, trying fallback:', error);

            // Fallback: try to serve Chinese (zh-CN) ui file as universal fallback
            if (!url.pathname.includes('/zh-CN-ui.json')) {
              const lang = url.pathname.match(/\/([^/]+?)(?:-ui|-product)?\.json$/);
              const fallbackUrl = lang
                ? url.pathname.replace(/\/[^/]+\.json$/, '/zh-CN-ui.json')
                : null;

              if (fallbackUrl) {
                const fallbackRequest = new Request(fallbackUrl, event.request);

                return cache.match(fallbackRequest).then((fallbackResponse) => {
                  if (fallbackResponse) {
                    console.log('[SW] Serving fallback language (zh-CN-ui) from cache');
                    return fallbackResponse;
                  }
                  throw error;
                });
              }
            }

            throw error;
          });
        });
      })
    );
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
  case 'SKIP_WAITING':
    console.log('[SW] Skip waiting requested');
    self.skipWaiting();
    break;

  case 'CACHE_LANGUAGE':
    console.log('[SW] Cache language requested:', payload.language);
    cacheLanguageFile(payload.language).catch(err => {
      console.error('[SW] Failed to cache language:', err);
    });
    break;

  case 'CLEAR_CACHE':
    console.log('[SW] Clear cache requested');
    clearLanguageCache();
    break;

  case 'GET_CACHE_STATUS':
    getCacheStatus().then(status => {
      event.ports[0].postMessage({ type: 'CACHE_STATUS', payload: status });
    });
    break;

  default:
    console.warn('[SW] Unknown message type:', type);
  }
});

// Helper function to cache UI + product files for a specific language
async function cacheLanguageFile(language) {
  try {
    const cache = await caches.open(LANGUAGE_FILES_CACHE);
    const urls = [
      `/assets/lang/${language}-ui.json`,
      `/assets/lang/${language}-product.json`,
    ];

    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
          console.log('[SW] Successfully cached:', url);
          return true;
        }
        return false;
      })
    );

    return results.some(r => r.status === 'fulfilled' && r.value === true);
  } catch (error) {
    console.error('[SW] Error caching language file:', error);
    return false;
  }
}

// Helper function to clear language cache
async function clearLanguageCache() {
  try {
    const cache = await caches.open(LANGUAGE_FILES_CACHE);
    const keys = await cache.keys();
    await Promise.all(keys.map(key => cache.delete(key)));
    console.log('[SW] Language cache cleared');
    return true;
  } catch (error) {
    console.error('[SW] Error clearing language cache:', error);
    return false;
  }
}

// Helper function to get cache status
async function getCacheStatus() {
  try {
    const cache = await caches.open(LANGUAGE_FILES_CACHE);
    const keys = await cache.keys();
    const cachedFiles = keys.map(key => key.url);

    return {
      totalLanguages: LANGUAGE_FILES.length,
      cachedLanguages: cachedFiles.length,
      cachedFiles: cachedFiles.map(file => {
        // Match both {lang}-ui.json and {lang}-product.json formats
        const match = file.match(/\/([^/]+?)(?:-ui|-product)?\.json$/);
        return match ? match[1] : file;
      }),
      cacheSize: keys.reduce((total, key) => {
        // Note: size may not be available in all browsers
        return total + (key.size || 0);
      }, 0)
    };
  } catch (error) {
    console.error('[SW] Error getting cache status:', error);
    return {
      totalLanguages: 0,
      cachedLanguages: 0,
      cachedFiles: [],
      cacheSize: 0
    };
  }
}
