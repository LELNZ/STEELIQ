// Google Maps Service Wrapper for Geocoding
interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
  components?: {
    streetNumber?: string;
    route?: string;
    locality?: string;
    administrativeArea?: string;
    country?: string;
    postalCode?: string;
  };
}

class GoogleMapsService {
  private geocoder: google.maps.Geocoder | null = null;
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;
  
  constructor() {
    this.loadGoogleMaps();
  }

  private loadGoogleMaps(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    
    this.loadPromise = new Promise((resolve, reject) => {
      const apiKey = import.meta.env.VITE_MAPS_PLATFORM_API_KEY;
      
      if (!apiKey) {
        console.warn('Google Maps API key not found');
        reject(new Error('Google Maps API key not configured'));
        return;
      }

      // Check if Google Maps is already loaded
      if (window.google?.maps?.Geocoder) {
        this.geocoder = new google.maps.Geocoder();
        this.isLoaded = true;
        resolve();
        return;
      }

      // Load Google Maps script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geocoding&v=weekly`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        if (window.google?.maps?.Geocoder) {
          this.geocoder = new google.maps.Geocoder();
          this.isLoaded = true;
          resolve();
        } else {
          console.warn('Google Maps loaded but Geocoder not available');
          resolve(); // Still resolve to allow fallback behavior
        }
      };
      
      script.onerror = () => {
        console.warn('Failed to load Google Maps API - will use fallback geocoding');
        resolve(); // Resolve instead of reject to allow fallback behavior
      };
      
      document.head.appendChild(script);
    });
    
    return this.loadPromise;
  }

  async ensureLoaded(): Promise<void> {
    if (!this.isLoaded) {
      await this.loadGoogleMaps();
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
    try {
      await this.ensureLoaded();
      
      if (!this.geocoder) {
        console.warn('Geocoder not available');
        return null;
      }

      return new Promise((resolve) => {
        this.geocoder!.geocode(
          { location: { lat, lng } },
          (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const result = results[0];
              
              // Extract address components
              const components: GeocodeResult['components'] = {};
              result.address_components?.forEach(component => {
                const types = component.types;
                if (types.includes('street_number')) {
                  components.streetNumber = component.long_name;
                } else if (types.includes('route')) {
                  components.route = component.long_name;
                } else if (types.includes('locality')) {
                  components.locality = component.long_name;
                } else if (types.includes('administrative_area_level_1')) {
                  components.administrativeArea = component.long_name;
                } else if (types.includes('country')) {
                  components.country = component.long_name;
                } else if (types.includes('postal_code')) {
                  components.postalCode = component.long_name;
                }
              });
              
              resolve({
                address: result.formatted_address,
                lat,
                lng,
                components
              });
            } else {
              console.warn('Geocoding failed:', status);
              // Return basic result with coordinates only
              resolve({
                address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                lat,
                lng
              });
            }
          }
        );
      });
    } catch (error) {
      console.error('Reverse geocode error:', error);
      // Return coordinates as fallback
      return {
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        lat,
        lng
      };
    }
  }

  async geocode(address: string): Promise<GeocodeResult | null> {
    try {
      await this.ensureLoaded();
      
      if (!this.geocoder) {
        console.warn('Geocoder not available');
        return null;
      }

      return new Promise((resolve) => {
        this.geocoder!.geocode(
          { address },
          (results, status) => {
            if (status === 'OK' && results && results[0]) {
              const result = results[0];
              const location = result.geometry.location;
              
              resolve({
                address: result.formatted_address,
                lat: location.lat(),
                lng: location.lng()
              });
            } else {
              console.warn('Geocoding failed:', status);
              resolve(null);
            }
          }
        );
      });
    } catch (error) {
      console.error('Geocode error:', error);
      return null;
    }
  }

  // Generate Google Maps URL for directions
  getDirectionsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  // Generate Google Maps static image URL
  getStaticMapUrl(lat: number, lng: number, zoom: number = 15, size: string = '400x300'): string {
    const apiKey = import.meta.env.VITE_MAPS_PLATFORM_API_KEY;
    if (!apiKey) return '';
    
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&markers=color:red%7C${lat},${lng}&key=${apiKey}`;
  }

  // Generate Google Maps embed URL
  getEmbedUrl(lat: number, lng: number): string {
    const apiKey = import.meta.env.VITE_MAPS_PLATFORM_API_KEY;
    if (!apiKey) return '';
    
    return `https://www.google.com/maps/embed/v1/place?q=${lat},${lng}&key=${apiKey}`;
  }
}

// Export singleton instance
export const googleMapsService = new GoogleMapsService();

// Export type for use in components
export type { GeocodeResult };

// Helper function for backward compatibility
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const result = await googleMapsService.reverseGeocode(lat, lng);
  return result?.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}