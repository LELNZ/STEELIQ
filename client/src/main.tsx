import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Service Worker Registration with Cache Clearing
const isDevelopment = 
  window.location.hostname === 'localhost' || 
  window.location.hostname.includes('.replit.dev') ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0';

// CRITICAL: Clear all caches and force new service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      console.log('[Main] Clearing all caches and service workers...');
      
      // First, clear ALL caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log(`[Main] Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
        console.log('[Main] All caches cleared');
      }
      
      // Unregister ALL existing service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        console.log('[Main] Unregistering service worker:', registration.scope);
        await registration.unregister();
      }
      
      // In development, register our bypass service worker to prevent caching
      if (isDevelopment) {
        console.log('[Main] Registering development bypass service worker...');
        const registration = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
          scope: '/'
        });
        
        // Force immediate activation
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        
        // Listen for cache cleared message
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data && event.data.type === 'CACHE_CLEARED') {
            console.log('[Main] Cache cleared by service worker, version:', event.data.version);
            // Force a soft reload to get fresh content
            if (!window.__reloadTriggered) {
              window.__reloadTriggered = true;
              window.location.reload();
            }
          }
        });
        
        console.log('[Main] Development service worker registered (no caching)');
      } else {
        console.log('[Main] Production mode - service worker disabled for now');
      }
      
    } catch (err) {
      console.error('[Main] Service worker setup failed:', err);
    }
  });
}

// Handle app install prompt
let deferredPrompt: any;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Store the event so it can be triggered later
  window.dispatchEvent(new CustomEvent('appInstallAvailable'));
});

// Export install function for use in components
(window as any).installApp = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    deferredPrompt = null;
  }
};

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Root element not found!");
  document.body.innerHTML = "<h1>Error: Root element not found</h1>";
} else {
  try {
    console.log("Attempting to render React app...");
    createRoot(rootElement).render(<App />);
    console.log("React app render initiated");
  } catch (error) {
    console.error("Failed to render React app:", error);
    rootElement.innerHTML = `<h1>Error loading application</h1><pre>${error}</pre>`;
  }
}
