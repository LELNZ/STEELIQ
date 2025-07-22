import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download, Smartphone } from 'lucide-react';

export function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;
    
    if (isInstalled) {
      return;
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Don't show prompt if already dismissed recently
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Listen for install prompt
    const handleInstallAvailable = () => {
      setIsInstallable(true);
      setTimeout(() => setShowPrompt(true), 3000); // Show after 3 seconds
    };

    window.addEventListener('appInstallAvailable', handleInstallAvailable);

    // For iOS, always show the prompt after delay
    if (isIOSDevice) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => {
      window.removeEventListener('appInstallAvailable', handleInstallAvailable);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      // Can't programmatically install on iOS, just show instructions
      return;
    }

    try {
      await (window as any).installApp();
      setShowPrompt(false);
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="shadow-lg border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Smartphone className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">Install LEL Steel App</h3>
              {isIOS ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Install this app on your iPhone:
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-1 ml-4">
                    <li>1. Tap the Share button <span className="inline-block w-4 h-4 text-blue-600">⎘</span></li>
                    <li>2. Scroll down and tap "Add to Home Screen"</li>
                    <li>3. Tap "Add" in the top right</li>
                  </ol>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Install for quick access, offline use, and a native app experience
                </p>
              )}
              <div className="flex gap-2 mt-3">
                {!isIOS && (
                  <Button 
                    size="sm" 
                    onClick={handleInstall}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Install Now
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleDismiss}
                >
                  {isIOS ? 'Got it' : 'Not now'}
                </Button>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}