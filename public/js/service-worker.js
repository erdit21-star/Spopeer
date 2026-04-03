/**
 * Service Worker - Offline Support & Cache Management
 * Handles caching strategies and offline functionality
 */

const CACHE_NAME = 'spopeer-cache-v1';
const ASSETS_CACHE = 'spopeer-assets-v1';
const API_CACHE = 'spopeer-api-v1';
const _STALE_WHILE_REVALIDATE_TTL = 5 * 60 * 1000; // 5 minutes

const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/api.js',
  '/js/marketplace-service.js',
  '/js/profile-sync-service.js',
  '/js/performance-service.js',
  '/pages/marketplace/marketplace.html'
];

/**
 * Install event - cache critical assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching critical assets');
      return cache.addAll(CRITICAL_ASSETS);
    })
  );
  self.skipWaiting();
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && 
                   cacheName !== ASSETS_CACHE && 
                   cacheName !== API_CACHE;
          })
          .map((cacheName) => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

/**
 * Fetch event - implement caching strategies
 * - Network First for API calls (try network, fallback to cache)
 * - Cache First for assets (check cache, fallback to network)
 * - Stale While Revalidate for listings (serve cache, update in background)
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API requests - Network First strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Asset requests (JS, CSS, images) - Cache First strategy
  if (isAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // HTML pages - Stale While Revalidate strategy
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(staleWhileRevalidateStrategy(request));
    return;
  }

  // Default - Network First
  event.respondWith(networkFirstStrategy(request));
});

/**
 * Network First Strategy
 * Try network first, fallback to cache if offline
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Return offline response
    return new Response('Offline - Please connect to internet', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

/**
 * Cache First Strategy
 * Check cache first, fallback to network
 */
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(ASSETS_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    return new Response('Asset not available offline', {
      status: 404,
      statusText: 'Not Found'
    });
  }
}

/**
 * Stale While Revalidate Strategy
 * Return cached version immediately, update in background
 */
async function staleWhileRevalidateStrategy(request) {
  const cached = await caches.match(request);

  // Fetch in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok && request.method === 'GET') {
      const cache = caches.open(CACHE_NAME);
      cache.then((c) => c.put(request, response.clone()));
    }
    return response;
  });

  // Return cached or network response
  return cached || fetchPromise;
}

/**
 * Check if URL is an asset (CSS, JS, images, fonts)
 */
function isAsset(pathname) {
  const assetExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg',
    '.woff', '.woff2', '.ttf', '.eot', '.webp'
  ];
  
  return assetExtensions.some(ext => pathname.endsWith(ext));
}

/**
 * Background sync for offline messages
 * Retry failed API calls when connection restored
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncPendingMessages());
  }
});

async function syncPendingMessages() {
  try {
    const db = await openIndexedDB();
    const pendingMessages = await getPendingMessages(db);
    
    for (const message of pendingMessages) {
      try {
        await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });
        
        // Remove from pending on success
        await removePendingMessage(db, message.id);
      } catch (error) {
        console.error('Failed to sync message:', error);
      }
    }
  } catch (error) {
    console.error('Sync error:', error);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SpopeerDB');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getPendingMessages(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingMessages'], 'readonly');
    const store = transaction.objectStore('pendingMessages');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function removePendingMessage(db, messageId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingMessages'], 'readwrite');
    const store = transaction.objectStore('pendingMessages');
    const request = store.delete(messageId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

