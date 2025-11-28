import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

// Accuracy thresholds for enterprise GPS (in meters)
export const GPS_ACCURACY_THRESHOLDS = {
  EXCELLENT: 75,      // Green - GPS/WiFi positioning working well
  GOOD: 150,          // Green - Acceptable for most use cases  
  ACCEPTABLE: 500,    // Yellow - WiFi or degraded positioning
  POOR: 1000,         // Red - Degraded WiFi, may need override
  IP_BASED: 10000,    // IP geolocation detected (>10km accuracy)
  MAX_ALLOWED: 500,   // Maximum accuracy to auto-accept (500m)
  OVERRIDE: 999,      // Special value indicating supervisor override
};

// Detect if position is likely from IP-based geolocation (not WiFi/GPS)
export function isIPBasedGeolocation(accuracy: number | null | undefined): boolean {
  if (accuracy === null || accuracy === undefined) return false;
  return accuracy > GPS_ACCURACY_THRESHOLDS.IP_BASED;
}

// Acquisition timeout settings
const ACQUISITION_SETTINGS = {
  ACCURACY_WAIT_TIMEOUT: 30000,    // Wait up to 30 seconds for WiFi positioning to refine
  INITIAL_TIMEOUT: 15000,          // Initial position timeout
  IMPROVEMENT_THRESHOLD: 0.20,     // 20% improvement to update position
  MIN_SAMPLES_BEFORE_ACCEPT: 1,    // Accept first good sample immediately
  CACHE_DURATION: 60000,           // Cache best fix for 60 seconds
  // Note: Removed IP_BASED_EARLY_EXIT - WiFi positioning often starts with coarse IP-based 
  // readings and refines to 10-100m over 5-15 seconds. Early exit prevents this refinement.
};

// Accuracy status for UI display
export type AccuracyStatus = 'excellent' | 'good' | 'acceptable' | 'poor' | 'ip_based' | 'acquiring' | 'unavailable' | 'override';

export function getAccuracyStatus(accuracy: number | null | undefined): AccuracyStatus {
  if (accuracy === null || accuracy === undefined) return 'unavailable';
  if (accuracy === GPS_ACCURACY_THRESHOLDS.OVERRIDE) return 'override';
  if (accuracy <= GPS_ACCURACY_THRESHOLDS.EXCELLENT) return 'excellent';
  if (accuracy <= GPS_ACCURACY_THRESHOLDS.GOOD) return 'good';
  if (accuracy <= GPS_ACCURACY_THRESHOLDS.ACCEPTABLE) return 'acceptable';
  if (accuracy > GPS_ACCURACY_THRESHOLDS.IP_BASED) return 'ip_based';
  return 'poor';
}

export function getAccuracyColor(status: AccuracyStatus): string {
  switch (status) {
    case 'excellent':
    case 'good':
      return 'text-green-600 dark:text-green-400';
    case 'acceptable':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'poor':
      return 'text-red-600 dark:text-red-400';
    case 'ip_based':
      return 'text-orange-600 dark:text-orange-400';
    case 'acquiring':
      return 'text-blue-600 dark:text-blue-400';
    case 'override':
      return 'text-purple-600 dark:text-purple-400';
    default:
      return 'text-gray-500';
  }
}

export function getAccuracyBgColor(status: AccuracyStatus): string {
  switch (status) {
    case 'excellent':
    case 'good':
      return 'bg-green-100 dark:bg-green-900/30 border-green-500';
    case 'acceptable':
      return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500';
    case 'poor':
      return 'bg-red-100 dark:bg-red-900/30 border-red-500';
    case 'ip_based':
      return 'bg-orange-100 dark:bg-orange-900/30 border-orange-500';
    case 'acquiring':
      return 'bg-blue-100 dark:bg-blue-900/30 border-blue-500';
    case 'override':
      return 'bg-purple-100 dark:bg-purple-900/30 border-purple-500';
    default:
      return 'bg-gray-100 dark:bg-gray-900/30 border-gray-500';
  }
}

export function getAccuracyLabel(status: AccuracyStatus, accuracy?: number): string {
  const formatAccuracy = (acc: number) => {
    if (acc >= 1000) {
      return `±${Math.round(acc / 1000)}km`;
    }
    return `±${Math.round(acc)}m`;
  };
  
  switch (status) {
    case 'excellent':
      return `Excellent (${formatAccuracy(accuracy || 0)})`;
    case 'good':
      return `Good (${formatAccuracy(accuracy || 0)})`;
    case 'acceptable':
      return `Acceptable (${formatAccuracy(accuracy || 0)})`;
    case 'poor':
      return `Poor accuracy (${formatAccuracy(accuracy || 0)}) - WiFi positioning may be unavailable`;
    case 'ip_based':
      return `IP-based location only (${formatAccuracy(accuracy || 0)}) - Enable Windows Location Services`;
    case 'acquiring':
      return 'Acquiring GPS...';
    case 'override':
      return 'Supervisor Override';
    default:
      return 'Location unavailable';
  }
}

// Get detailed guidance for IP-based geolocation
export function getIPBasedGuidance(): string[] {
  return [
    "Windows Location Services appears to be disabled.",
    "To enable WiFi-based positioning:",
    "1. Open Windows Settings → Privacy & Security → Location",
    "2. Turn ON 'Location services'",
    "3. Turn ON 'Let apps access your location'",
    "4. Scroll down and enable location for your browser",
    "5. Refresh this page and try again",
    "",
    "If the issue persists, request a Supervisor Override."
  ];
}

// Enhanced GPS data for Fortune 50 compliance
interface GeolocationState {
  loading: boolean;
  error: string | null;
  coordinates: {
    lat: number;
    lng: number;
    accuracy: number;
    speed: number | null;
    heading: number | null;
    altitude: number | null;
    timestamp: number;
  } | null;
  address: string | null;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unsupported' | 'checking';
  lastUpdated: Date | null;
  isContinuousTracking: boolean;
  trackingSessionId: string | null;
  lastBreadcrumb: Date | null;
  // New accuracy-aware fields
  acquisitionState: 'idle' | 'acquiring' | 'waiting_for_accuracy' | 'acquired';
  sampleCount: number;
  acquisitionStartTime: number | null;
  bestAccuracySeen: number | null;
  accuracyStatus: AccuracyStatus;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  autoStart?: boolean;
  updateInterval?: number;
  breadcrumbInterval?: number;
  enableTracking?: boolean;
  // New accuracy threshold options
  accuracyThreshold?: number;      // Target accuracy to wait for
  maxAccuracyWaitTime?: number;    // Max time to wait for good accuracy
}

const DEFAULT_OPTIONS: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
  autoStart: true,
  updateInterval: 30000,
  breadcrumbInterval: 30000,
  enableTracking: true,
  accuracyThreshold: GPS_ACCURACY_THRESHOLDS.MAX_ALLOWED,
  maxAccuracyWaitTime: ACQUISITION_SETTINGS.ACCURACY_WAIT_TIMEOUT,
};

// Fortune 50 automatic GPS acquisition with accuracy-aware positioning
export function useGeolocation(options: UseGeolocationOptions = {}) {
  const { toast } = useToast();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // Refs for continuous tracking
  const watchIdRef = useRef<number | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const breadcrumbIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>(crypto.randomUUID());
  
  // Refs for accuracy-aware acquisition
  const acquisitionWatchIdRef = useRef<number | null>(null);
  const acquisitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bestPositionRef = useRef<GeolocationPosition | null>(null);
  const sampleCountRef = useRef<number>(0);
  const acquisitionStartRef = useRef<number | null>(null);
  const acquisitionResolveRef = useRef<((value: any) => void) | null>(null);
  const acquisitionResolvedRef = useRef<boolean>(false); // Track if already resolved
  const stateRef = useRef<GeolocationState | null>(null); // Live state ref for interval access
  
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    error: null,
    coordinates: null,
    address: null,
    permissionStatus: 'checking',
    lastUpdated: null,
    isContinuousTracking: false,
    trackingSessionId: sessionIdRef.current,
    lastBreadcrumb: null,
    acquisitionState: 'idle',
    sampleCount: 0,
    acquisitionStartTime: null,
    bestAccuracySeen: null,
    accuracyStatus: 'unavailable',
  });

  // Check permission status
  const checkPermission = useCallback(async () => {
    if (!('permissions' in navigator)) {
      setState(prev => ({ ...prev, permissionStatus: 'unsupported' }));
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      setState(prev => ({ ...prev, permissionStatus: result.state }));
      
      result.addEventListener('change', () => {
        setState(prev => ({ ...prev, permissionStatus: result.state }));
      });
    } catch (err) {
      setState(prev => ({ ...prev, permissionStatus: 'unsupported' }));
    }
  }, []);

  // Save GPS breadcrumb to database for audit trail
  const saveBreadcrumb = useCallback(async (position: GeolocationPosition, acquisitionMetadata?: { 
    method: string; 
    elapsedTime: number; 
    sampleCount: number;
    accuracyStatus: AccuracyStatus;
  }) => {
    try {
      const isMock = (position as any).coords?.isMockLocation || false;
      
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        connectionType: (navigator as any).connection?.effectiveType || 'unknown',
        downlink: (navigator as any).connection?.downlink || null,
      };
      
      const isFallback = (position.coords.latitude === 0 && position.coords.longitude === 0) || 
                        !!(position as any).isFallback;
      
      const breadcrumb = {
        sessionId: sessionIdRef.current,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        altitudeAccuracy: position.coords.altitudeAccuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
        isMock,
        deviceInfo: {
          ...deviceInfo,
          isFallbackLocation: isFallback,
          // Add acquisition metadata for audit
          acquisitionMethod: acquisitionMetadata?.method || 'standard',
          acquisitionElapsedMs: acquisitionMetadata?.elapsedTime || 0,
          acquisitionSamples: acquisitionMetadata?.sampleCount || 1,
          accuracyStatus: acquisitionMetadata?.accuracyStatus || getAccuracyStatus(position.coords.accuracy),
        },
      };
      
      const response = await fetch('/api/location-tracking', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'credentials': 'include' 
        },
        body: JSON.stringify(breadcrumb),
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.error(`[GPS AUDIT FAILURE] Failed to save breadcrumb: HTTP ${response.status}`);
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('[GPS AUDIT FAILURE] Server response:', errorText);
        
        setState(prev => ({ 
          ...prev, 
          error: `GPS tracking error: Failed to save location data (${response.status})` 
        }));
        
        if (toast) {
          toast({
            title: "GPS Tracking Error",
            description: "Location data could not be saved. Contact support if this persists.",
            variant: "destructive"
          });
        }
        
        return false;
      }
      
      const result = await response.json();
      
      setState(prev => ({ 
        ...prev, 
        lastBreadcrumb: new Date(),
        error: null
      }));
      
      console.log('[GPS AUDIT] Breadcrumb saved successfully:', {
        id: result.id,
        geofenceStatus: result.geofenceStatus,
        accuracy: position.coords.accuracy,
        acquisitionMetadata
      });
      
      return true;
    } catch (error) {
      console.error('[GPS AUDIT FAILURE] Network error saving breadcrumb:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'GPS tracking error: Network failure' 
      }));
      return false;
    }
  }, [toast]);

  // Reverse geocode coordinates to get address
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: {
            'Accept-Language': 'en',
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.display_name || null;
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
    return null;
  }, []);

  // Clean up acquisition watcher (does NOT clear resolve ref - that's handled by resolution logic)
  const cleanupAcquisition = useCallback(() => {
    if (acquisitionWatchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(acquisitionWatchIdRef.current);
      acquisitionWatchIdRef.current = null;
    }
    if (acquisitionTimeoutRef.current !== null) {
      clearTimeout(acquisitionTimeoutRef.current);
      acquisitionTimeoutRef.current = null;
    }
  }, []);

  // Safe resolve that ensures we only resolve once
  const safeResolve = useCallback((result: any) => {
    if (!acquisitionResolvedRef.current && acquisitionResolveRef.current) {
      acquisitionResolvedRef.current = true;
      acquisitionResolveRef.current(result);
      acquisitionResolveRef.current = null;
    }
  }, []);

  // Process and update GPS position with accuracy tracking
  const processPosition = useCallback(async (
    position: GeolocationPosition, 
    showToast: boolean = false,
    acquisitionMetadata?: { method: string; elapsedTime: number; sampleCount: number; accuracyStatus: AccuracyStatus }
  ) => {
    const accuracy = position.coords.accuracy;
    const accuracyStatus = getAccuracyStatus(accuracy);
    
    const coordinates = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy,
      speed: position.coords.speed,
      heading: position.coords.heading,
      altitude: position.coords.altitude,
      timestamp: position.timestamp,
    };

    // Get address in parallel (non-blocking)
    const address = await reverseGeocode(coordinates.lat, coordinates.lng);

    setState(prev => ({
      ...prev,
      loading: false,
      coordinates,
      address,
      lastUpdated: new Date(),
      permissionStatus: 'granted',
      acquisitionState: 'acquired',
      accuracyStatus,
      bestAccuracySeen: accuracy,
    }));

    // Show appropriate toast based on accuracy
    if (showToast) {
      if (accuracyStatus === 'poor') {
        toast({
          title: "GPS Active - Low Accuracy",
          description: `Location acquired but accuracy is ${Math.round(accuracy)}m. WiFi positioning may be unavailable.`,
          variant: "destructive"
        });
      } else if (accuracyStatus === 'acceptable') {
        toast({
          title: "GPS Active",
          description: `Location acquired with ${Math.round(accuracy)}m accuracy.`,
          variant: "default"
        });
      } else {
        toast({
          title: "GPS Active",
          description: `Excellent location accuracy: ±${Math.round(accuracy)}m`,
          variant: "default"
        });
      }
    }

    // Save breadcrumb with acquisition metadata
    if (mergedOptions.enableTracking) {
      await saveBreadcrumb(position, acquisitionMetadata);
    }

    return { coordinates, address, cached: false, accuracyStatus };
  }, [reverseGeocode, saveBreadcrumb, toast, mergedOptions.enableTracking]);

  // ACCURACY-AWARE POSITION ACQUISITION
  // Uses watchPosition to collect samples and waits for accuracy threshold
  const acquireAccuratePosition = useCallback(async (showToast: boolean = false): Promise<any> => {
    // Return cached location if fresh enough and accuracy is good
    if (!showToast && state.coordinates && state.lastUpdated) {
      const age = Date.now() - state.lastUpdated.getTime();
      const accuracy = state.coordinates.accuracy;
      
      // Use cache if: fresh enough AND accuracy is acceptable
      if (age < ACQUISITION_SETTINGS.CACHE_DURATION && accuracy <= mergedOptions.accuracyThreshold!) {
        console.log('[GPS] Using cached position:', { age, accuracy });
        return {
          coordinates: state.coordinates,
          address: state.address,
          cached: true,
          accuracyStatus: state.accuracyStatus
        };
      }
    }

    // Check if geolocation is supported
    if (!('geolocation' in navigator)) {
      const error = 'Geolocation is not supported by your browser';
      setState(prev => ({ ...prev, error, permissionStatus: 'unsupported', accuracyStatus: 'unavailable' }));
      return null;
    }

    // Clean up any existing acquisition
    cleanupAcquisition();

    // Initialize acquisition state
    bestPositionRef.current = null;
    sampleCountRef.current = 0;
    acquisitionStartRef.current = Date.now();
    acquisitionResolvedRef.current = false; // Reset resolved flag

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      acquisitionState: 'acquiring',
      sampleCount: 0,
      acquisitionStartTime: Date.now(),
      accuracyStatus: 'acquiring'
    }));

    return new Promise((resolve) => {
      acquisitionResolveRef.current = resolve;
      
      const handlePosition = async (position: GeolocationPosition) => {
        sampleCountRef.current++;
        const currentAccuracy = position.coords.accuracy;
        const elapsedTime = Date.now() - (acquisitionStartRef.current || Date.now());
        
        console.log(`[GPS] Sample ${sampleCountRef.current}: accuracy=${Math.round(currentAccuracy)}m, elapsed=${elapsedTime}ms`);

        // Update state with sample count
        setState(prev => ({ 
          ...prev, 
          sampleCount: sampleCountRef.current,
          acquisitionState: 'waiting_for_accuracy'
        }));

        // Track best position seen
        const bestAccuracy = bestPositionRef.current?.coords.accuracy ?? Infinity;
        if (currentAccuracy < bestAccuracy) {
          bestPositionRef.current = position;
          console.log(`[GPS] New best accuracy: ${Math.round(currentAccuracy)}m`);
        }

        // Check if this is IP-based geolocation (should not be auto-accepted)
        const isIPBased = isIPBasedGeolocation(currentAccuracy);
        
        // Log WiFi refinement progress - don't exit early, let browser refine position
        if (isIPBased) {
          console.log(`[GPS] IP-based reading (${Math.round(currentAccuracy)}m) - waiting for WiFi refinement...`);
        } else if (currentAccuracy > GPS_ACCURACY_THRESHOLDS.ACCEPTABLE) {
          console.log(`[GPS] Moderate accuracy (${Math.round(currentAccuracy)}m) - still improving...`);
        }
        
        // Check if we should accept this position
        const shouldAccept = 
          // NEVER auto-accept IP-based positions (>10km) - require supervisor override
          !isIPBased && (
            // Accuracy threshold met
            currentAccuracy <= mergedOptions.accuracyThreshold! ||
            // Or we have enough samples and accuracy is reasonable
            (sampleCountRef.current >= ACQUISITION_SETTINGS.MIN_SAMPLES_BEFORE_ACCEPT && 
             currentAccuracy <= GPS_ACCURACY_THRESHOLDS.ACCEPTABLE) ||
            // Or timeout approaching and we have something reasonable
            (elapsedTime > mergedOptions.maxAccuracyWaitTime! * 0.8 && 
             bestPositionRef.current && 
             bestPositionRef.current.coords.accuracy <= GPS_ACCURACY_THRESHOLDS.POOR)
          );

        if (shouldAccept && bestPositionRef.current && !acquisitionResolvedRef.current) {
          cleanupAcquisition();
          
          const finalPosition = bestPositionRef.current;
          const finalAccuracy = finalPosition.coords.accuracy;
          const finalStatus = getAccuracyStatus(finalAccuracy);
          
          console.log(`[GPS] Accepting position: accuracy=${Math.round(finalAccuracy)}m, samples=${sampleCountRef.current}, elapsed=${elapsedTime}ms`);
          
          const result = await processPosition(finalPosition, showToast, {
            method: 'accuracy_aware',
            elapsedTime,
            sampleCount: sampleCountRef.current,
            accuracyStatus: finalStatus
          });
          
          safeResolve(result);
        }
      };

      const handleError = (error: GeolocationPositionError) => {
        console.error('[GPS] Acquisition error:', error);
        
        // Don't fail immediately - we might still get a position from watchPosition
        if (sampleCountRef.current === 0 && !acquisitionResolvedRef.current) {
          let errorMessage = 'GPS unavailable. Supervisor override required.';
          let permissionStatus: GeolocationState['permissionStatus'] = state.permissionStatus;
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Enable GPS in browser settings or request supervisor override.';
              permissionStatus = 'denied';
              cleanupAcquisition();
              setState(prev => ({
                ...prev,
                loading: false,
                error: errorMessage,
                permissionStatus,
                acquisitionState: 'idle',
                accuracyStatus: 'unavailable'
              }));
              safeResolve(null);
              break;
            case error.POSITION_UNAVAILABLE:
              // Keep trying via watchPosition
              console.log('[GPS] Position unavailable, continuing to watch...');
              break;
            case error.TIMEOUT:
              // Keep trying via watchPosition
              console.log('[GPS] Timeout, continuing to watch...');
              break;
          }
        }
      };

      // Start watching for positions
      acquisitionWatchIdRef.current = navigator.geolocation.watchPosition(
        handlePosition,
        handleError,
        {
          enableHighAccuracy: mergedOptions.enableHighAccuracy,
          timeout: mergedOptions.timeout,
          maximumAge: mergedOptions.maximumAge,
        }
      );

      // Set maximum acquisition timeout
      acquisitionTimeoutRef.current = setTimeout(async () => {
        // Skip if already resolved
        if (acquisitionResolvedRef.current) {
          return;
        }
        
        console.log(`[GPS] Acquisition timeout after ${mergedOptions.maxAccuracyWaitTime}ms`);
        
        cleanupAcquisition();
        
        // Use best position we got, or fail
        if (bestPositionRef.current) {
          const finalPosition = bestPositionRef.current;
          const finalAccuracy = finalPosition.coords.accuracy;
          const finalStatus = getAccuracyStatus(finalAccuracy);
          const elapsedTime = Date.now() - (acquisitionStartRef.current || Date.now());
          
          // Check if we only have IP-based geolocation
          if (isIPBasedGeolocation(finalAccuracy)) {
            console.log(`[GPS] IP-based geolocation detected (${Math.round(finalAccuracy)}m) - requires supervisor override`);
            
            setState(prev => ({
              ...prev,
              loading: false,
              error: 'IP-based location only. Windows Location Services may be disabled.',
              acquisitionState: 'idle',
              accuracyStatus: 'ip_based',
              coordinates: {
                lat: finalPosition.coords.latitude,
                lng: finalPosition.coords.longitude,
                accuracy: finalAccuracy,
                speed: finalPosition.coords.speed,
                heading: finalPosition.coords.heading,
                altitude: finalPosition.coords.altitude,
                timestamp: finalPosition.timestamp
              }
            }));
            
            if (showToast) {
              toast({
                title: "IP-Based Location Only",
                description: "Windows Location Services appears to be disabled. Enable it in Settings → Privacy → Location, or request a Supervisor Override.",
                variant: "destructive"
              });
            }
            
            safeResolve(null); // Don't auto-accept IP-based positions
            return;
          }
          
          console.log(`[GPS] Timeout - using best position: accuracy=${Math.round(finalAccuracy)}m`);
          
          const result = await processPosition(finalPosition, showToast, {
            method: 'timeout_best_effort',
            elapsedTime,
            sampleCount: sampleCountRef.current,
            accuracyStatus: finalStatus
          });
          
          safeResolve(result);
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'GPS timeout. Enable Windows Location Services or contact supervisor.',
            acquisitionState: 'idle',
            accuracyStatus: 'unavailable'
          }));
          
          if (showToast) {
            toast({
              title: "GPS Unavailable",
              description: "Could not acquire location. Check browser permissions and Windows Location Services.",
              variant: "destructive"
            });
          }
          
          safeResolve(null);
        }
      }, mergedOptions.maxAccuracyWaitTime);
    });
  }, [state.coordinates, state.lastUpdated, state.permissionStatus, state.accuracyStatus, state.address, mergedOptions, cleanupAcquisition, processPosition, toast, safeResolve]);

  // Alias for backward compatibility
  const getCurrentLocation = acquireAccuratePosition;

  // Start continuous GPS tracking with progressive improvement
  const startContinuousTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      return; // Already tracking
    }

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          const currentAccuracy = position.coords.accuracy;
          const bestAccuracy = state.coordinates?.accuracy ?? Infinity;
          
          // Only update if accuracy improved by threshold or is excellent
          const improvementRatio = (bestAccuracy - currentAccuracy) / bestAccuracy;
          const shouldUpdate = 
            currentAccuracy <= GPS_ACCURACY_THRESHOLDS.EXCELLENT ||
            improvementRatio >= ACQUISITION_SETTINGS.IMPROVEMENT_THRESHOLD ||
            !state.coordinates;
          
          if (shouldUpdate) {
            console.log(`[GPS] Continuous tracking update: ${Math.round(currentAccuracy)}m (was ${Math.round(bestAccuracy)}m)`);
            await processPosition(position, false, {
              method: 'continuous',
              elapsedTime: 0,
              sampleCount: 1,
              accuracyStatus: getAccuracyStatus(currentAccuracy)
            });
          }
        },
        (error) => {
          console.error('GPS watch error:', error);
        },
        {
          enableHighAccuracy: mergedOptions.enableHighAccuracy,
          timeout: mergedOptions.timeout,
          maximumAge: mergedOptions.maximumAge,
        }
      );

      setState(prev => ({ ...prev, isContinuousTracking: true }));

      // Set up periodic updates
      if (mergedOptions.updateInterval && updateIntervalRef.current === null) {
        updateIntervalRef.current = setInterval(() => {
          acquireAccuratePosition(false);
        }, mergedOptions.updateInterval);
      }

      // Set up breadcrumb saving
      if (mergedOptions.breadcrumbInterval && breadcrumbIntervalRef.current === null) {
        breadcrumbIntervalRef.current = setInterval(() => {
          if (state.coordinates) {
            const mockPosition = {
              coords: {
                latitude: state.coordinates.lat,
                longitude: state.coordinates.lng,
                accuracy: state.coordinates.accuracy,
                altitude: state.coordinates.altitude,
                altitudeAccuracy: null,
                heading: state.coordinates.heading,
                speed: state.coordinates.speed,
              },
              timestamp: Date.now(),
            } as GeolocationPosition;
            saveBreadcrumb(mockPosition, {
              method: 'periodic',
              elapsedTime: 0,
              sampleCount: 1,
              accuracyStatus: getAccuracyStatus(state.coordinates.accuracy)
            });
          }
        }, mergedOptions.breadcrumbInterval);
      }
    }
  }, [mergedOptions, acquireAccuratePosition, processPosition, saveBreadcrumb, state.coordinates]);

  // Stop continuous GPS tracking
  const stopContinuousTracking = useCallback(() => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (updateIntervalRef.current !== null) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    if (breadcrumbIntervalRef.current !== null) {
      clearInterval(breadcrumbIntervalRef.current);
      breadcrumbIntervalRef.current = null;
    }

    cleanupAcquisition();

    setState(prev => ({ ...prev, isContinuousTracking: false }));
  }, [cleanupAcquisition]);

  // Check permissions on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Keep stateRef updated for interval access (avoids stale closure)
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // AUTOMATIC GPS: Start tracking on mount if enabled
  useEffect(() => {
    if (mergedOptions.autoStart) {
      acquireAccuratePosition(true).then(() => {
        if (mergedOptions.enableTracking) {
          startContinuousTracking();
        }
      });

      // Retry GPS every 60 seconds ONLY if not IP-based (no point retrying IP-based)
      const retryInterval = setInterval(() => {
        // Use stateRef to get current state (avoids stale closure)
        const currentState = stateRef.current;
        if (!currentState) return;
        
        // Don't retry if:
        // 1. We have valid coordinates (not IP-based)
        // 2. It's IP-based geolocation (won't improve without system changes)
        // 3. User has an override
        const hasValidCoords = currentState.coordinates && 
          currentState.accuracyStatus !== 'ip_based';
        const isIPBased = currentState.accuracyStatus === 'ip_based';
        const hasOverride = currentState.accuracyStatus === 'override';
        
        const shouldRetry = 
          (!hasValidCoords && !isIPBased && !hasOverride && currentState.error);
          
        if (shouldRetry) {
          console.log('[GPS] Auto-retry triggered - no valid position and not IP-based');
          acquireAccuratePosition(false);
        } else {
          console.log(`[GPS] Auto-retry skipped - status: ${currentState.accuracyStatus}, coords: ${!!currentState.coordinates}`);
        }
      }, 60000); // Increased to 60 seconds

      return () => {
        clearInterval(retryInterval);
      };
    }
  }, [mergedOptions.autoStart, mergedOptions.enableTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopContinuousTracking();
    };
  }, [stopContinuousTracking]);

  // Request permission and get location (for manual override)
  const requestLocation = useCallback(async () => {
    if (state.permissionStatus === 'denied') {
      toast({
        title: "Location Access Required",
        description: "GPS is required for time tracking. Enable location in browser settings or contact supervisor.",
        variant: "destructive"
      });
      return null;
    }

    return acquireAccuratePosition(true);
  }, [state.permissionStatus, acquireAccuratePosition, toast]);

  // Supervisor override for GPS failure
  const requestSupervisorOverride = useCallback(async (overrideCode: string): Promise<boolean> => {
    const validCodes = ['MGR123', 'SUPER456', 'ADMIN789'];
    
    if (validCodes.includes(overrideCode.toUpperCase())) {
      toast({
        title: "Override Accepted",
        description: "Supervisor override approved. GPS requirement bypassed.",
        variant: "default"
      });
      
      setState(prev => ({
        ...prev,
        coordinates: {
          lat: 0,
          lng: 0,
          accuracy: GPS_ACCURACY_THRESHOLDS.OVERRIDE,
          speed: null,
          heading: null,
          altitude: null,
          timestamp: Date.now(),
        },
        address: "Supervisor Override - Location Not Available",
        error: null,
        permissionStatus: 'granted',
        acquisitionState: 'acquired',
        accuracyStatus: 'override',
      }));
      
      return true;
    }
    
    toast({
      title: "Invalid Override Code",
      description: "Please contact your supervisor for a valid override code.",
      variant: "destructive"
    });
    
    return false;
  }, [toast]);

  // Fallback locations for manual selection when GPS is unavailable
  const getFallbackLocations = useCallback(() => [
    { value: 'office', label: 'Office - Lateral Engineering HQ', lat: -36.9285, lng: 174.8891, address: 'East Tamaki, Auckland' },
    { value: 'workshop', label: 'Workshop - Fabrication', lat: -36.9290, lng: 174.8900, address: 'Workshop Facility, East Tamaki, Auckland' },
    { value: 'site', label: 'Site - Job Location', lat: 0, lng: 0, address: 'On-Site Location' },
    { value: 'remote', label: 'Remote - Working from Home', lat: 0, lng: 0, address: 'Remote Location' }
  ], []);

  // Retry GPS acquisition (resets state and tries again)
  const retryGPS = useCallback(async () => {
    // Reset state
    setState(prev => ({
      ...prev,
      loading: false,
      error: null,
      coordinates: null,
      address: null,
      acquisitionState: 'idle',
      accuracyStatus: 'acquiring',
      sampleCount: 0,
      bestAccuracySeen: null,
      lastUpdated: null
    }));
    
    // Clear any cached position
    bestPositionRef.current = null;
    
    // Try again
    return acquireAccuratePosition(true);
  }, [acquireAccuratePosition]);

  // Check if current position is IP-based geolocation only
  const isIPBasedOnly = state.accuracyStatus === 'ip_based';

  // Fortune 50 clock-in validation: returns whether GPS is valid for payroll
  // This function performs comprehensive validation for time clock operations
  // NOTE: Geofence displacement validation (500m from job site) is performed server-side
  // during the actual clock-in API call, as it requires job assignment context
  const canClockIn = useCallback((): { 
    allowed: boolean; 
    reason: string; 
    requiresOverride: boolean;
    accuracyMeters?: number;
  } => {
    // Override always allowed - supervisor has approved
    if (state.accuracyStatus === 'override') {
      return { 
        allowed: true, 
        reason: 'Supervisor override approved', 
        requiresOverride: false,
        accuracyMeters: GPS_ACCURACY_THRESHOLDS.OVERRIDE
      };
    }

    // Still acquiring GPS - wait for position
    if (state.acquisitionState === 'acquiring' || state.acquisitionState === 'waiting_for_accuracy') {
      return { 
        allowed: false, 
        reason: 'Acquiring GPS location... Please wait.', 
        requiresOverride: false 
      };
    }

    // No coordinates at all - GPS failed completely
    if (!state.coordinates) {
      return { 
        allowed: false, 
        reason: 'GPS location required. Enable location services or request supervisor override.', 
        requiresOverride: true 
      };
    }

    // Validate coordinates are not null/undefined (race condition protection)
    if (state.coordinates.lat === null || state.coordinates.lng === null || 
        state.coordinates.lat === undefined || state.coordinates.lng === undefined) {
      return { 
        allowed: false, 
        reason: 'GPS coordinates incomplete. Retry GPS or request supervisor override.', 
        requiresOverride: true 
      };
    }

    // IP-based geolocation is not acceptable for payroll (>10km accuracy)
    if (state.accuracyStatus === 'ip_based') {
      return { 
        allowed: false, 
        reason: 'IP-based location detected. Enable Windows Location Services or request supervisor override.', 
        requiresOverride: true,
        accuracyMeters: state.coordinates.accuracy
      };
    }

    // Poor accuracy requires override (500m-10km)
    if (state.accuracyStatus === 'poor') {
      return { 
        allowed: false, 
        reason: `GPS accuracy too low (${Math.round(state.coordinates.accuracy)}m). Move to better signal area or request supervisor override.`, 
        requiresOverride: true,
        accuracyMeters: state.coordinates.accuracy
      };
    }

    // Check explicit accuracy threshold (500m max)
    if (state.coordinates.accuracy > GPS_ACCURACY_THRESHOLDS.MAX_ALLOWED) {
      return { 
        allowed: false, 
        reason: `GPS accuracy (${Math.round(state.coordinates.accuracy)}m) exceeds maximum allowed (${GPS_ACCURACY_THRESHOLDS.MAX_ALLOWED}m). Request supervisor override.`, 
        requiresOverride: true,
        accuracyMeters: state.coordinates.accuracy
      };
    }

    // Valid GPS for payroll - all checks passed
    return { 
      allowed: true, 
      reason: `GPS verified: ±${Math.round(state.coordinates.accuracy)}m accuracy`, 
      requiresOverride: false,
      accuracyMeters: state.coordinates.accuracy
    };
  }, [state.accuracyStatus, state.coordinates, state.acquisitionState]);

  return {
    ...state,
    getCurrentLocation,
    acquireAccuratePosition,
    requestLocation,
    requestSupervisorOverride,
    retryGPS,
    isIPBasedOnly,
    startContinuousTracking,
    stopContinuousTracking,
    getFallbackLocations,
    isLocationAvailable: state.permissionStatus === 'granted' && state.coordinates !== null,
    canRequestLocation: state.permissionStatus !== 'denied' && state.permissionStatus !== 'unsupported',
    isGPSRequired: true,
    // New accuracy-aware exports
    accuracyStatus: state.accuracyStatus,
    isAcquiring: state.acquisitionState === 'acquiring' || state.acquisitionState === 'waiting_for_accuracy',
    sampleCount: state.sampleCount,
    getAccuracyStatus,
    getAccuracyColor,
    getAccuracyLabel,
    // Fortune 50 clock-in validation
    canClockIn,
  };
}
