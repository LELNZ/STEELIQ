import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export const GPS_ACCURACY_THRESHOLDS = {
  EXCELLENT: 75,
  GOOD: 150,
  ACCEPTABLE: 500,
  POOR: 1000,
  IP_BASED: 10000,
  MAX_ALLOWED: 500,
  OVERRIDE: 999,
};

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
    if (acc >= 1000) return `±${Math.round(acc / 1000)}km`;
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
      return `Poor (${formatAccuracy(accuracy || 0)})`;
    case 'ip_based':
      return `IP-based (${formatAccuracy(accuracy || 0)})`;
    case 'acquiring':
      return 'Acquiring...';
    case 'override':
      return 'Supervisor Override';
    default:
      return 'Unavailable';
  }
}

export function isIPBasedGeolocation(accuracy: number | null | undefined): boolean {
  if (accuracy === null || accuracy === undefined) return false;
  return accuracy > GPS_ACCURACY_THRESHOLDS.IP_BASED;
}

interface Coordinates {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  altitude: number | null;
  timestamp: number;
}

interface GeolocationState {
  loading: boolean;
  error: string | null;
  coordinates: Coordinates | null;
  address: string | null;
  permissionStatus: 'prompt' | 'granted' | 'denied' | 'unsupported' | 'checking';
  lastUpdated: Date | null;
  accuracyStatus: AccuracyStatus;
  sampleCount: number;
  isAcquiring: boolean;
}

interface GeolocationContextType extends GeolocationState {
  requestLocation: () => Promise<void>;
  retryGPS: () => Promise<void>;
  clearLocation: () => void;
  setOverride: (lat: number, lng: number, address: string) => void;
  getFallbackLocations: () => Array<{value: string; label: string; lat: number; lng: number; address: string}>;
  isLocationAvailable: boolean;
  isIPBasedOnly: boolean;
  isContinuousTracking: boolean;
}

const GeolocationContext = createContext<GeolocationContextType | null>(null);

const CACHE_DURATION_BY_ACCURACY = {
  excellent: 60000,
  good: 60000,
  acceptable: 15000,
  poor: 5000,
  ip_based: 0,
};

export function GeolocationProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    error: null,
    coordinates: null,
    address: null,
    permissionStatus: 'checking',
    lastUpdated: null,
    accuracyStatus: 'unavailable',
    sampleCount: 0,
    isAcquiring: false,
  });

  const watchIdRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bestPositionRef = useRef<GeolocationPosition | null>(null);
  const sampleCountRef = useRef<number>(0);
  const acquisitionStartRef = useRef<number | null>(null);
  const isAcquiringRef = useRef<boolean>(false);

  const cleanup = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    isAcquiringRef.current = false;
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }, []);

  // Start continuous GPS watching - keeps running to refine position
  const startContinuousWatch = useCallback(async (showToast = true) => {
    if (!('geolocation' in navigator)) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Geolocation not supported',
        permissionStatus: 'unsupported',
        accuracyStatus: 'unavailable',
      }));
      return;
    }

    // If already watching, don't restart
    if (watchIdRef.current !== null) {
      console.log('[GPS Provider] Already watching, continuing...');
      return;
    }

    isAcquiringRef.current = true;
    sampleCountRef.current = 0;
    acquisitionStartRef.current = Date.now();
    let hasNotifiedUser = false;
    let hasAcceptablePosition = false;

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      isAcquiring: true,
      accuracyStatus: 'acquiring',
      sampleCount: 0,
    }));

    console.log('[GPS Provider] Starting CONTINUOUS watch - will keep refining position');

    const handlePosition = async (position: GeolocationPosition) => {
      sampleCountRef.current++;
      const accuracy = position.coords.accuracy;
      const elapsed = Date.now() - (acquisitionStartRef.current || Date.now());
      
      console.log(`[GPS Provider] Sample ${sampleCountRef.current}: accuracy=${Math.round(accuracy)}m, elapsed=${elapsed}ms`);

      setState(prev => ({ ...prev, sampleCount: sampleCountRef.current }));

      const isIPBased = isIPBasedGeolocation(accuracy);
      const status = getAccuracyStatus(accuracy);

      // ONLY update coordinates if NOT IP-based (or significantly better than current)
      const currentAccuracy = bestPositionRef.current?.coords.accuracy ?? Infinity;
      const shouldUpdate = accuracy < currentAccuracy;
      
      if (shouldUpdate) {
        bestPositionRef.current = position;
        console.log(`[GPS Provider] New best: ${Math.round(accuracy)}m (IP-based: ${isIPBased})`);
      }

      // Only store non-IP-based coordinates for payroll use
      if (!isIPBased && accuracy <= GPS_ACCURACY_THRESHOLDS.ACCEPTABLE) {
        hasAcceptablePosition = true;
        isAcquiringRef.current = false;
        
        const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);
        
        setState(prev => ({
          ...prev,
          loading: false,
          isAcquiring: false,
          error: null,
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            altitude: position.coords.altitude,
            timestamp: position.timestamp,
          },
          address,
          accuracyStatus: status,
          lastUpdated: new Date(),
          permissionStatus: 'granted',
        }));

        if (showToast && !hasNotifiedUser) {
          hasNotifiedUser = true;
          toast({
            title: "Location Acquired",
            description: `Accuracy: ${Math.round(accuracy)}m - Fortune 50 compliant`,
          });
        }
        
        // DON'T cleanup - keep watching for even better positions
        console.log('[GPS Provider] Acceptable position stored, continuing to watch for refinement');
      } else if (!isIPBased && accuracy <= GPS_ACCURACY_THRESHOLDS.POOR) {
        // Poor but real GPS - store it but mark as poor
        isAcquiringRef.current = false;
        const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);
        
        setState(prev => ({
          ...prev,
          loading: false,
          isAcquiring: false,
          error: 'Poor GPS accuracy. Move to open area or near windows.',
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            heading: position.coords.heading,
            altitude: position.coords.altitude,
            timestamp: position.timestamp,
          },
          address,
          accuracyStatus: status,
          lastUpdated: new Date(),
          permissionStatus: 'granted',
        }));
      } else if (isIPBased) {
        // IP-based - DON'T store coordinates, just update status
        // This blocks payroll until real GPS or override
        if (!hasAcceptablePosition) {
          setState(prev => ({
            ...prev,
            loading: elapsed < 30000, // Still loading if under 30s
            isAcquiring: elapsed < 30000,
            error: 'IP-based location only. Waiting for WiFi positioning...',
            accuracyStatus: 'ip_based',
            permissionStatus: 'granted',
            // DON'T update coordinates - keep null until real GPS
          }));
        }
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error('[GPS Provider] Error:', error.message);
      
      if (error.code === error.PERMISSION_DENIED) {
        cleanup();
        setState(prev => ({
          ...prev,
          loading: false,
          isAcquiring: false,
          error: 'Location permission denied. Enable in browser settings.',
          permissionStatus: 'denied',
          accuracyStatus: 'unavailable',
        }));
      }
      // For other errors, keep trying - watchPosition will continue
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 60000, // 60s timeout per position attempt
        maximumAge: 5000, // Accept positions up to 5s old for faster response
      }
    );

    // Initial acquisition timeout - show IP-based warning if still no WiFi position
    timeoutRef.current = setTimeout(async () => {
      console.log('[GPS Provider] 30s initial acquisition timeout');
      
      // Check if we got acceptable position
      const hasGoodPosition = bestPositionRef.current && 
        !isIPBasedGeolocation(bestPositionRef.current.coords.accuracy) &&
        bestPositionRef.current.coords.accuracy <= GPS_ACCURACY_THRESHOLDS.ACCEPTABLE;
      
      if (!hasGoodPosition) {
        isAcquiringRef.current = false;
        
        if (bestPositionRef.current && isIPBasedGeolocation(bestPositionRef.current.coords.accuracy)) {
          // We have IP-based but not WiFi - show warning but DON'T store coordinates
          if (showToast) {
            toast({
              title: "WiFi Positioning Unavailable",
              description: "Enable Windows Location Services or use manual location/override.",
              variant: "destructive",
            });
          }
          
          setState(prev => ({
            ...prev,
            loading: false,
            isAcquiring: false,
            error: 'IP-based location only. Enable Windows Location Services or request Supervisor Override.',
            accuracyStatus: 'ip_based',
            // coordinates stays null - blocks payroll
          }));
        } else {
          setState(prev => ({
            ...prev,
            loading: false,
            isAcquiring: false,
            error: 'Could not acquire location. Check browser permissions.',
            accuracyStatus: 'unavailable',
          }));
        }
      }
      
      // DON'T cleanup - keep watching in background for eventual WiFi fix
    }, 30000);

  }, [cleanup, reverseGeocode, toast]);

  // Alias for backward compatibility
  const startAcquisition = startContinuousWatch;

  const requestLocation = useCallback(async () => {
    await startAcquisition(true);
  }, [startAcquisition]);

  const retryGPS = useCallback(async () => {
    console.log('[GPS Provider] Manual retry requested');
    setState(prev => ({
      ...prev,
      coordinates: null,
      address: null,
      error: null,
      accuracyStatus: 'acquiring',
    }));
    bestPositionRef.current = null;
    await startAcquisition(true);
  }, [startAcquisition]);

  const clearLocation = useCallback(() => {
    cleanup();
    setState(prev => ({
      ...prev,
      coordinates: null,
      address: null,
      error: null,
      accuracyStatus: 'unavailable',
    }));
  }, [cleanup]);

  const setOverride = useCallback((lat: number, lng: number, address: string) => {
    cleanup();
    setState(prev => ({
      ...prev,
      loading: false,
      isAcquiring: false,
      error: null,
      coordinates: {
        lat,
        lng,
        accuracy: GPS_ACCURACY_THRESHOLDS.OVERRIDE,
        speed: null,
        heading: null,
        altitude: null,
        timestamp: Date.now(),
      },
      address,
      accuracyStatus: 'override',
      lastUpdated: new Date(),
    }));
    toast({
      title: "Location Override Applied",
      description: "Supervisor override in effect",
    });
  }, [cleanup, toast]);

  const getFallbackLocations = useCallback(() => [
    { value: 'office', label: 'Office - Lateral Engineering HQ', lat: -36.9285, lng: 174.8891, address: 'East Tamaki, Auckland' },
    { value: 'workshop', label: 'Workshop - Fabrication', lat: -36.9290, lng: 174.8900, address: 'Workshop Facility, East Tamaki, Auckland' },
    { value: 'site', label: 'Site - Job Location', lat: 0, lng: 0, address: 'On-Site Location' },
    { value: 'remote', label: 'Remote - Working from Home', lat: 0, lng: 0, address: 'Remote Location' },
  ], []);

  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setState(prev => ({
          ...prev,
          permissionStatus: result.state as any,
        }));
      });
    }
  }, []);

  useEffect(() => {
    startAcquisition(false);
    return cleanup;
  }, [startAcquisition, cleanup]);

  const isLocationAvailable = state.permissionStatus === 'granted' && 
    state.coordinates !== null && 
    state.accuracyStatus !== 'ip_based' &&
    state.accuracyStatus !== 'unavailable';
  
  const isIPBasedOnly = state.accuracyStatus === 'ip_based';
  const isContinuousTracking = watchIdRef.current !== null;

  return (
    <GeolocationContext.Provider
      value={{
        ...state,
        requestLocation,
        retryGPS,
        clearLocation,
        setOverride,
        getFallbackLocations,
        isLocationAvailable,
        isIPBasedOnly,
        isContinuousTracking,
      }}
    >
      {children}
    </GeolocationContext.Provider>
  );
}

export function useSharedGeolocation() {
  const context = useContext(GeolocationContext);
  if (!context) {
    throw new Error('useSharedGeolocation must be used within GeolocationProvider');
  }
  return context;
}
