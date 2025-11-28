// STEELIQ Service Worker - Development Safe Version
// This version completely bypasses caching in development environments

const VERSION = 'steeliq-dev-bypass-v1';
const isDevelopment = 
  self.location.hostname === 'localhost' || 
  self.location.hostname.includes('.replit.dev') ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '0.0.0.0';

// Install event - clear everything and claim control
self.addEventListener('install', event => {
  console.log(`[Service Worker] Installing ${VERSION}`);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      // Delete ALL existing caches to force fresh content
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log(`[Service Worker] Deleting cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[Service Worker] All caches cleared, skipping waiting');
      return self.skipWaiting();
    })
  );
});

// Activate event - take control and clear everything again
self.addEventListener('activate', event => {
  console.log(`[Service Worker] Activating ${VERSION}`);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      // Delete ALL caches again to ensure complete refresh
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log(`[Service Worker] Removing cache on activate: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[Service Worker] Taking control of all clients');
      // Force all tabs to use this service worker immediately
      return self.clients.claim();
    }).then(() => {
      // Send message to all clients to reload
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'CACHE_CLEARED',
            version: VERSION
          });
        });
      });
    })
  );
});

// Fetch event - ALWAYS go to network in development
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Check if this is an API request
  const isApiRequest = url.pathname.startsWith('/api/');
  
  // In development, NEVER cache, ALWAYS fetch fresh
  if (isDevelopment) {
    // For API requests, pass through without modifying credentials
    if (isApiRequest) {
      event.respondWith(
        fetch(request).catch(error => {
          console.error('[Service Worker] API request failed:', error);
          throw error;
        })
      );
      return;
    }
    
    // For non-API requests, use no-store cache
    event.respondWith(
      fetch(request, {
        cache: 'no-store'
      }).catch(error => {
        console.error('[Service Worker] Network request failed:', error);
        // Return a basic offline page for navigation requests
        if (request.mode === 'navigate') {
          return new Response(
            `<!DOCTYPE html>
            <html>
            <head>
              <title>Offline</title>
              <style>
                body { 
                  font-family: system-ui; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  height: 100vh; 
                  margin: 0;
                  background: #f5f5f5;
                }
                .container { 
                  text-align: center; 
                  padding: 2rem;
                  background: white;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h1 { color: #333; }
                p { color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>Connection Lost</h1>
                <p>Please check your internet connection and refresh the page.</p>
              </div>
            </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html' }
            }
          );
        }
        throw error;
      })
    );
    return;
  }

  // Production mode (for future use) - minimal caching
  // For API requests, pass through without modifying
  if (isApiRequest) {
    event.respondWith(fetch(request));
    return;
  }
  
  // For non-API requests, still bypass everything to ensure fresh content
  event.respondWith(
    fetch(request).catch(() => {
      // Only try cache as absolute last resort
      return caches.match(request);
    })
  );
});

// Listen for skip waiting message
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_ALL_CACHES') {
    caches.keys().then(cacheNames => {
      Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      ).then(() => {
        console.log('[Service Worker] All caches cleared by request');
        event.ports[0].postMessage({ success: true });
      });
    });
  }
});

console.log(`[Service Worker] Script loaded. Version: ${VERSION}, Environment: ${isDevelopment ? 'DEVELOPMENT (No Caching)' : 'PRODUCTION'}`);