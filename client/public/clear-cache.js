// Force unregister old service worker and reload
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
      console.log("Service worker unregistered");
    }
  }).then(() => {
    // Clear all caches
    if ("caches" in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
          console.log("Cache cleared:", name);
        });
      });
    }
  });
}
