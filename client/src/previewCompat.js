// Preview Pane Compatibility Layer
// This file provides compatibility for environments that don't support ES modules

(function() {
  // Check if we're in a context that doesn't support modules
  const isPreviewPane = !window.ResizeObserver || !('noModule' in document.createElement('script'));
  
  // Add error handling
  window.addEventListener('error', function(e) {
    console.error('Global error:', e);
    
    // If it's a module loading error, show a fallback UI
    if (e.message && e.message.includes('module')) {
      const root = document.getElementById('root');
      if (root && !root.hasChildNodes()) {
        root.innerHTML = `
          <div style="padding: 2rem; font-family: system-ui; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #ef4444;">Loading Error</h1>
            <p>The application is having trouble loading in the preview pane.</p>
            <p style="margin-top: 1rem;">
              <a href="${window.location.href}" target="_blank" style="color: #3b82f6; text-decoration: underline;">
                Open in new tab
              </a> for the best experience.
            </p>
            <details style="margin-top: 2rem;">
              <summary style="cursor: pointer;">Technical Details</summary>
              <pre style="background: #f3f4f6; padding: 1rem; margin-top: 0.5rem; overflow: auto;">${e.message}</pre>
            </details>
          </div>
        `;
      }
    }
  });

  // Add a fallback loader
  if (typeof window !== 'undefined') {
    let checkCount = 0;
    const maxChecks = 50; // 5 seconds
    
    const checkApp = setInterval(function() {
      checkCount++;
      const root = document.getElementById('root');
      
      if (root && !root.hasChildNodes() && checkCount > 10) {
        // Give the app some time to load, then show status
        root.innerHTML = `
          <div style="padding: 2rem; text-align: center; font-family: system-ui;">
            <h2 style="color: #1e40af;">LEL Steel</h2>
            <div style="margin: 2rem 0;">
              <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            </div>
            <p style="color: #6b7280;">Loading application...</p>
            <style>
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            </style>
          </div>
        `;
      }
      
      if (checkCount >= maxChecks) {
        clearInterval(checkApp);
      }
    }, 100);
  }
})();