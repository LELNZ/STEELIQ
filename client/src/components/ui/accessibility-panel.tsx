import { Settings, Eye, Type, Move, Volume2, Keyboard, Focus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAccessibility } from "@/hooks/useAccessibility";
import { useEffect, useState } from "react";

export function AccessibilityPanel() {
  const [open, setOpen] = useState(false);
  const {
    settings,
    updateSetting,
    resetSettings,
    announce
  } = useAccessibility();

  // Listen for keyboard shortcut to open panel
  useEffect(() => {
    const handleToggle = () => setOpen(prev => !prev);
    window.addEventListener('toggle-accessibility-menu', handleToggle);
    return () => window.removeEventListener('toggle-accessibility-menu', handleToggle);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Accessibility Settings"
          data-testid="button-accessibility"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Accessibility Settings</DialogTitle>
          <DialogDescription>
            Customize your experience with these accessibility features. Press Alt+A to toggle this menu.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* High Contrast */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="high-contrast" className="flex-1">
                <span>High Contrast</span>
                <p className="text-sm text-muted-foreground">
                  Increase color contrast for better visibility
                </p>
              </Label>
            </div>
            <Switch
              id="high-contrast"
              checked={settings.highContrast}
              onCheckedChange={(checked) => {
                updateSetting('highContrast', checked);
                announce(`High contrast ${checked ? 'enabled' : 'disabled'}`);
              }}
              aria-label="Toggle high contrast mode"
              data-testid="switch-high-contrast"
            />
          </div>

          <Separator />

          {/* Large Text */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="large-text" className="flex-1">
                <span>Large Text</span>
                <p className="text-sm text-muted-foreground">
                  Increase text size for better readability
                </p>
              </Label>
            </div>
            <Switch
              id="large-text"
              checked={settings.largeText}
              onCheckedChange={(checked) => {
                updateSetting('largeText', checked);
                announce(`Large text ${checked ? 'enabled' : 'disabled'}`);
              }}
              aria-label="Toggle large text mode"
              data-testid="switch-large-text"
            />
          </div>

          <Separator />

          {/* Reduce Motion */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              <Move className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="reduce-motion" className="flex-1">
                <span>Reduce Motion</span>
                <p className="text-sm text-muted-foreground">
                  Minimize animations and transitions
                </p>
              </Label>
            </div>
            <Switch
              id="reduce-motion"
              checked={settings.reduceMotion}
              onCheckedChange={(checked) => {
                updateSetting('reduceMotion', checked);
                announce(`Reduce motion ${checked ? 'enabled' : 'disabled'}`);
              }}
              aria-label="Toggle reduce motion"
              data-testid="switch-reduce-motion"
            />
          </div>

          <Separator />

          {/* Screen Reader Mode */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="screen-reader" className="flex-1">
                <span>Screen Reader Mode</span>
                <p className="text-sm text-muted-foreground">
                  Optimize for screen reader compatibility
                </p>
              </Label>
            </div>
            <Switch
              id="screen-reader"
              checked={settings.screenReaderMode}
              onCheckedChange={(checked) => {
                updateSetting('screenReaderMode', checked);
                announce(`Screen reader mode ${checked ? 'enabled' : 'disabled'}`);
              }}
              aria-label="Toggle screen reader mode"
              data-testid="switch-screen-reader"
            />
          </div>

          <Separator />

          {/* Keyboard Navigation */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              <Keyboard className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="keyboard-nav" className="flex-1">
                <span>Enhanced Keyboard Navigation</span>
                <p className="text-sm text-muted-foreground">
                  Navigate using keyboard shortcuts
                </p>
              </Label>
            </div>
            <Switch
              id="keyboard-nav"
              checked={settings.keyboardNavigation}
              onCheckedChange={(checked) => {
                updateSetting('keyboardNavigation', checked);
                announce(`Keyboard navigation ${checked ? 'enabled' : 'disabled'}`);
              }}
              aria-label="Toggle keyboard navigation"
              data-testid="switch-keyboard-nav"
            />
          </div>

          <Separator />

          {/* Focus Indicators */}
          <div className="flex items-center justify-between space-x-2">
            <div className="flex items-center space-x-2">
              <Focus className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="focus-indicators" className="flex-1">
                <span>Focus Indicators</span>
                <p className="text-sm text-muted-foreground">
                  Show clear focus outlines on interactive elements
                </p>
              </Label>
            </div>
            <Switch
              id="focus-indicators"
              checked={settings.focusIndicators}
              onCheckedChange={(checked) => {
                updateSetting('focusIndicators', checked);
                announce(`Focus indicators ${checked ? 'enabled' : 'disabled'}`);
              }}
              aria-label="Toggle focus indicators"
              data-testid="switch-focus-indicators"
            />
          </div>

          <Separator />

          {/* Keyboard Shortcuts */}
          <div className="rounded-lg bg-muted p-3">
            <h4 className="font-medium mb-2">Keyboard Shortcuts</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li><kbd>Alt + A</kbd> - Toggle this menu</li>
              <li><kbd>Alt + H</kbd> - Toggle high contrast</li>
              <li><kbd>Alt + L</kbd> - Toggle large text</li>
              <li><kbd>Alt + M</kbd> - Toggle reduce motion</li>
              <li><kbd>Tab</kbd> - Navigate forward</li>
              <li><kbd>Shift + Tab</kbd> - Navigate backward</li>
              <li><kbd>Enter/Space</kbd> - Activate buttons</li>
              <li><kbd>Escape</kbd> - Close dialogs</li>
            </ul>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => {
                resetSettings();
                announce('Accessibility settings reset to defaults');
              }}
              data-testid="button-reset-accessibility"
            >
              Reset to Defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}