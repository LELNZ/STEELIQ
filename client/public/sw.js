// Service Worker for LEL Steel Fabrication Management System
const CACHE_NAME = 'lel-steel-v3';
const urlsToCache = [
  '/',
  '/assets/index.css',
  '/assets/index.js',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  // Core pages for offline access
  '/time-payroll',
  '/jobs',
  '/mobile-operations',
  '/cutting-optimization',
  '/remnant-management'
];

// Install event - cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching core assets');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() => {
          // Return cached API response when offline
          return caches.match(event.request)
            .then(response => {
              if (response) {
                return response;
              }
              // Return offline status for API calls
              return new Response(
                JSON.stringify({ offline: true, message: 'You are currently offline' }),
                { headers: { 'Content-Type': 'application/json' } }
              );
            });
        })
    );
    return;
  }

  // Handle other requests (assets, pages)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cache the response
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseToCache));
            
            return response;
          });
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Handle background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Handle push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('LEL Steel Update', options)
  );
});

// Sync offline data when connection is restored
async function syncOfflineData() {
  try {
    // Open IndexedDB
    const db = await openDB();
    const tx = db.transaction(['offlineQueue'], 'readonly');
    const store = tx.objectStore('offlineQueue');
    const requests = await store.getAll();

    // Process each queued request
    for (const request of requests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body
        });

        if (response.ok) {
          // Remove from queue if successful
          const deleteTx = db.transaction(['offlineQueue'], 'readwrite');
          await deleteTx.objectStore('offlineQueue').delete(request.id);
        }
      } catch (error) {
        console.error('Failed to sync request:', error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Helper function to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LELSteelOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offlineQueue')) {
        db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}