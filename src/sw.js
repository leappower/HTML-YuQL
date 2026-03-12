// sw.js - Service Worker for caching language files
// Implements offline caching and intelligent cache management

const CACHE_NAME = 'language-cache-v1';
const LANGUAGE_FILES_CACHE = 'language-files-v1';

// List of language files to cache
const LANGUAGE_FILES = [
  './assets/lang/zh-CN.json',
  './assets/lang/zh-TW.json',
  './assets/lang/en.json',
  './assets/lang/ja.json',
  './assets/lang/ko.json',
  './assets/lang/es.json',
  './assets/lang/fr.json',
  './assets/lang/de.json',
  './assets/lang/it.json',
  './assets/lang/pt.json',
  './assets/lang/ru.json',
  './assets/lang/ar.json',
  './assets/lang/he.json',
  './assets/lang/th.json',
  './assets/lang/vi.json',
  './assets/lang/id.json',
  './assets/lang/ms.json',
  './assets/lang/fil.json',
  './assets/lang/nl.json',
  './assets/lang/pl.json',
  './assets/lang/tr.json'
];

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
  if (url.pathname.startsWith('/assets/lang/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      caches.open(LANGUAGE_FILES_CACHE).then((cache) => {
        // Try to get from cache first
        return cache.match(event.request).then((cachedResponse) => {
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

            // Cache fetched resource
            cache.put(event.request, responseToCache).catch(err => {
              console.warn('[SW] Failed to cache language file:', err);
            });

            console.log('[SW] Language file cached:', url.pathname);
            return networkResponse;
          }).catch((error) => {
            console.error('[SW] Network fetch failed, trying fallback:', error);

            // Fallback: try to serve Chinese (zh-CN) as universal fallback
            if (!url.pathname.includes('/zh-CN.json')) {
              const fallbackUrl = url.pathname.replace(/\/[^\/]+\.json$/, '/zh-CN.json');
              const fallbackRequest = new Request(fallbackUrl, event.request);

              return cache.match(fallbackRequest).then((fallbackResponse) => {
                if (fallbackResponse) {
                  console.log('[SW] Serving fallback language (zh-CN) from cache');
                  return fallbackResponse;
                }
                throw error;
              });
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

// Helper function to cache a specific language file
async function cacheLanguageFile(language) {
  try {
    const cache = await caches.open(LANGUAGE_FILES_CACHE);
    const url = `./assets/lang/${language}.json`;

    const response = await fetch(url);
    if (response.ok) {
      await cache.put(url, response);
      console.log('[SW] Successfully cached language:', language);
      return true;
    }
    return false;
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
        const match = file.match(/\/([^\/]+)\.json$/);
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
