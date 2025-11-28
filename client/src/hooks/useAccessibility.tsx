import { useEffect, useState, useCallback } from 'react';

interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
}

const ACCESSIBILITY_KEY = 'steeliq-accessibility';

export function useAccessibility() {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Load saved settings or use defaults
    const saved = localStorage.getItem(ACCESSIBILITY_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    
    // Check system preferences
    return {
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      largeText: false,
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      screenReaderMode: false,
      keyboardNavigation: true,
      focusIndicators: true
    };
  });

  // Apply accessibility settings to document
  useEffect(() => {
    const root = document.documentElement;
    
    // High Contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Large Text
    if (settings.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
    
    // Reduce Motion
    if (settings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    
    // Screen Reader Mode
    if (settings.screenReaderMode) {
      root.setAttribute('aria-live', 'polite');
    } else {
      root.removeAttribute('aria-live');
    }
    
    // Keyboard Navigation
    if (settings.keyboardNavigation) {
      root.classList.add('keyboard-nav');
    } else {
      root.classList.remove('keyboard-nav');
    }
    
    // Focus Indicators
    if (settings.focusIndicators) {
      root.classList.add('focus-visible');
    } else {
      root.classList.remove('focus-visible');
    }
    
    // Save to localStorage
    localStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(settings));
  }, [settings]);

  // Toggle individual settings
  const toggleHighContrast = useCallback(() => {
    setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }));
  }, []);

  const toggleLargeText = useCallback(() => {
    setSettings(prev => ({ ...prev, largeText: !prev.largeText }));
  }, []);

  const toggleReduceMotion = useCallback(() => {
    setSettings(prev => ({ ...prev, reduceMotion: !prev.reduceMotion }));
  }, []);

  const toggleScreenReaderMode = useCallback(() => {
    setSettings(prev => ({ ...prev, screenReaderMode: !prev.screenReaderMode }));
  }, []);

  const toggleKeyboardNavigation = useCallback(() => {
    setSettings(prev => ({ ...prev, keyboardNavigation: !prev.keyboardNavigation }));
  }, []);

  const toggleFocusIndicators = useCallback(() => {
    setSettings(prev => ({ ...prev, focusIndicators: !prev.focusIndicators }));
  }, []);

  // Update single setting
  const updateSetting = useCallback((key: keyof AccessibilitySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings({
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      largeText: false,
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      screenReaderMode: false,
      keyboardNavigation: true,
      focusIndicators: true
    });
  }, []);

  // Announce to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  // Keyboard shortcuts handler
  useEffect(() => {
    if (!settings.keyboardNavigation) return;

    const handleKeyboard = (e: KeyboardEvent) => {
      // Alt + A: Toggle accessibility menu
      if (e.altKey && e.key === 'a') {
        e.preventDefault();
        const event = new CustomEvent('toggle-accessibility-menu');
        window.dispatchEvent(event);
      }
      
      // Alt + H: Toggle high contrast
      if (e.altKey && e.key === 'h') {
        e.preventDefault();
        toggleHighContrast();
        announce('High contrast ' + (!settings.highContrast ? 'enabled' : 'disabled'));
      }
      
      // Alt + L: Toggle large text
      if (e.altKey && e.key === 'l') {
        e.preventDefault();
        toggleLargeText();
        announce('Large text ' + (!settings.largeText ? 'enabled' : 'disabled'));
      }
      
      // Alt + M: Toggle reduce motion
      if (e.altKey && e.key === 'm') {
        e.preventDefault();
        toggleReduceMotion();
        announce('Reduce motion ' + (!settings.reduceMotion ? 'enabled' : 'disabled'));
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [settings, toggleHighContrast, toggleLargeText, toggleReduceMotion, announce]);

  return {
    settings,
    updateSetting,
    toggleHighContrast,
    toggleLargeText,
    toggleReduceMotion,
    toggleScreenReaderMode,
    toggleKeyboardNavigation,
    toggleFocusIndicators,
    resetSettings,
    announce
  };
}