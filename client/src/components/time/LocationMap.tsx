import { useState, useEffect } from 'react';
import { MapPin, Map, Navigation, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { googleMapsService } from '@/lib/googleMaps';

interface LocationData {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
  timestamp: string;
}

interface LocationMapProps {
  location?: string;
  geolocation?: any;
  timestamp?: string;
}

export function LocationMap({ location, geolocation, timestamp }: LocationMapProps) {
  const [showMap, setShowMap] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  
  useEffect(() => {
    // Parse location data
    if (geolocation && typeof geolocation === 'object') {
      // Support both naming conventions: lat/lng and latitude/longitude
      const lat = geolocation.lat ?? geolocation.latitude;
      const lng = geolocation.lng ?? geolocation.longitude ?? geolocation.long;
      
      // Only set location data if we have valid numeric coordinates
      if (lat !== undefined && lng !== undefined) {
        const parsedLat = typeof lat === 'string' ? parseFloat(lat) : lat;
        const parsedLng = typeof lng === 'string' ? parseFloat(lng) : lng;
        
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
          setLocationData({
            lat: parsedLat,
            lng: parsedLng,
            accuracy: geolocation.accuracy,
            address: location,
            timestamp: timestamp || new Date().toISOString()
          });
        }
      }
    } else if (location && location.includes('Location (')) {
      // Parse from string format "Location (lat, lng)"
      const match = location.match(/Location \(([\d.-]+),\s*([\d.-]+)\)/);
      if (match) {
        setLocationData({
          lat: parseFloat(match[1]),
          lng: parseFloat(match[2]),
          address: location,
          timestamp: timestamp || new Date().toISOString()
        });
      }
    }
  }, [location, geolocation, timestamp]);
  
  // Check geolocation permission
  const checkPermission = async () => {
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        setPermissionStatus(result.state);
        
        result.addEventListener('change', () => {
          setPermissionStatus(result.state);
        });
      } catch (err) {
        setPermissionStatus('unsupported');
      }
    } else {
      setPermissionStatus('unsupported');
    }
  };
  
  useEffect(() => {
    checkPermission();
  }, []);
  
  // Request current location
  const requestCurrentLocation = () => {
    setIsLoadingLocation(true);
    
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      setIsLoadingLocation(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation: LocationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString()
        };
        
        setLocationData(newLocation);
        setIsLoadingLocation(false);
        
        // Reverse geocode for address using Google Maps
        googleMapsService.reverseGeocode(position.coords.latitude, position.coords.longitude)
          .then(result => {
            if (result && result.address) {
              setLocationData(prev => prev ? { ...prev, address: result.address } : null);
            }
          })
          .catch(error => {
            console.error('Reverse geocoding failed:', error);
            // Don't block if geocoding fails
          });
      },
      (error) => {
        setIsLoadingLocation(false);
        
        let errorMessage = 'Failed to get location';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable it in your browser settings.';
            setPermissionStatus('denied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };
  
  // Generate Google Maps URL
  const getMapUrl = () => {
    if (!locationData) return '';
    const apiKey = import.meta.env.VITE_MAPS_PLATFORM_API_KEY;
    
    // Use Google Maps Embed API now that it's configured
    if (apiKey) {
      // Google Maps Embed API with the provided API key
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${locationData.lat},${locationData.lng}&zoom=15`;
    }
    
    // Fallback to basic Google Maps if no API key (won't work in iframe but useful for testing)
    return `https://www.google.com/maps?q=${locationData.lat},${locationData.lng}`;
  };
  
  const getDirectionsUrl = () => {
    if (!locationData) return '';
    // Google Maps directions (works without API key in a new window)
    return `https://www.google.com/maps/dir/?api=1&destination=${locationData.lat},${locationData.lng}`;
  };
  
  const getStaticMapUrl = () => {
    if (!locationData) return '';
    const apiKey = import.meta.env.VITE_MAPS_PLATFORM_API_KEY;
    if (apiKey) {
      // Google Static Maps API
      return `https://maps.googleapis.com/maps/api/staticmap?center=${locationData.lat},${locationData.lng}&zoom=15&size=400x300&markers=color:red%7C${locationData.lat},${locationData.lng}&key=${apiKey}`;
    }
    // Use the embed URL as a fallback
    return getMapUrl();
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">
            {location || 'No location data'}
          </span>
          {locationData && locationData.accuracy && (
            <Badge variant="outline" className="text-xs">
              ±{Math.round(locationData.accuracy)}m
            </Badge>
          )}
        </div>
      </div>
      
      {locationData ? (
        <Dialog open={showMap} onOpenChange={setShowMap}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Map className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Location Details</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Location Info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Coordinates</p>
                      <p className="font-mono">
                        {locationData.lat && locationData.lng 
                          ? `${locationData.lat.toFixed(6)}, ${locationData.lng.toFixed(6)}`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Accuracy</p>
                      <p>{locationData.accuracy ? `±${Math.round(locationData.accuracy)}m` : 'Unknown'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Address</p>
                      <p className="text-xs">{locationData.address || 'Loading address...'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Timestamp</p>
                      <p className="text-xs">{new Date(locationData.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(getDirectionsUrl(), '_blank')}
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Get Directions
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Map */}
              <Card>
                <CardContent className="p-0">
                  <iframe
                    width="100%"
                    height="400"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={getMapUrl()}
                  />
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={requestCurrentLocation}
          disabled={isLoadingLocation || permissionStatus === 'denied'}
        >
          {isLoadingLocation ? (
            <span className="animate-spin">⟳</span>
          ) : (
            <MapPin className="w-4 h-4" />
          )}
        </Button>
      )}
      
      {permissionStatus === 'denied' && (
        <Alert className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Location access is disabled. Please enable it in your browser settings to track locations.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}