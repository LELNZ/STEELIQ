import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      })
      .catch(err => {
        console.log('ServiceWorker registration failed:', err);
      });
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
