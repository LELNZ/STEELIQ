import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface AddressSuggestion {
  place_id?: string;
  display_name: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
  main_text?: string;
  secondary_text?: string;
  fallback?: boolean;
  postcode?: string;
  city?: string;
  error?: boolean;
}

interface AddressSearchProps {
  placeholder?: string;
  onSelect?: (addressData: any) => void;
  initialValue?: string;
  onChange?: (...event: any[]) => void;
  field?: any;
  form?: any;
  label?: string;
  required?: boolean;
}

export function AddressSearch({ 
  placeholder = "Start typing address...", 
  onSelect, 
  initialValue = "", 
  onChange, 
  field, 
  form, 
  label = "Address", 
  required = false 
}: AddressSearchProps) {
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const addressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowAddressSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Google Places API address search for accurate results matching Google Maps
  const searchAddresses = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    setIsSearchingAddress(true);
    try {
      // Use server-side proxy to protect API key
      const response = await fetch('/api/places/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.error_message) {
          // Show Google API configuration error to user
          setAddressSuggestions([{
            display_name: "Google Places API Configuration Required",
            main_text: "API Setup Needed",
            secondary_text: "Please configure Google Places API (New) with valid credentials",
            fallback: true,
            error: true
          }]);
          setShowAddressSuggestions(true);
          return;
        }
        
        if (data.predictions && data.predictions.length > 0) {
          const formattedSuggestions = data.predictions.map((prediction: any) => ({
            place_id: prediction.place_id,
            display_name: prediction.description,
            structured_formatting: prediction.structured_formatting,
            main_text: prediction.structured_formatting?.main_text || '',
            secondary_text: prediction.structured_formatting?.secondary_text || ''
          }));
          
          setAddressSuggestions(formattedSuggestions);
          setShowAddressSuggestions(true);
        } else {
          // No results found
          setAddressSuggestions([{
            display_name: "No addresses found for your search",
            main_text: "Try a different search term",
            secondary_text: "Enter street name, suburb, or city",
            fallback: true
          }]);
          setShowAddressSuggestions(true);
        }
      } else {
        throw new Error(`API request failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Google Places API error:', error);
      // Show error state instead of fallback
      setAddressSuggestions([{
        display_name: "Address search temporarily unavailable",
        main_text: "Please enter address manually",
        secondary_text: "Google Places API connection failed",
        fallback: true,
        error: true
      }]);
      setShowAddressSuggestions(true);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const handleAddressChange = (value: string) => {
    field.onChange(value);
    
    if (addressTimeoutRef.current) {
      clearTimeout(addressTimeoutRef.current);
    }
    
    addressTimeoutRef.current = setTimeout(() => {
      searchAddresses(value);
    }, 300);
  };

  const selectAddress = async (suggestion: AddressSuggestion) => {
    console.log("selectAddress called with:", suggestion);
    
    // Don't allow selection of error states
    if (suggestion.error || suggestion.fallback) {
      console.log("Skipping error/fallback suggestion");
      return;
    }
    
    // Hide dropdown immediately
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
    
    if (suggestion.place_id) {
      console.log("Processing Google Places selection...");
      // Google Places API - get detailed address information
      try {
        const response = await fetch('/api/places/details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ place_id: suggestion.place_id })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Address details received:", data);
          
          if (data.result) {
            const addressComponents = data.result.address_components;
            const formattedAddress = data.result.formatted_address;
            
            // Extract address components
            let locality = '';
            let postalCode = '';
            
            addressComponents.forEach((component: any) => {
              const types = component.types;
              if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                locality = component.long_name;
              } else if (types.includes('postal_code')) {
                postalCode = component.long_name;
              }
            });
            
            console.log("Extracted address data:", { 
              address: formattedAddress, 
              city: locality, 
              postcode: postalCode 
            });
            
            // Update the input field value
            if (field?.onChange) {
              field.onChange(formattedAddress);
            }
            
            // Call onSelect callback with detailed address data
            if (onSelect) {
              console.log("Calling onSelect callback...");
              onSelect({
                address: formattedAddress,
                city: locality,
                postcode: postalCode,
                country: 'New Zealand'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error getting place details:', error);
        // Fallback to basic suggestion data
        if (field?.onChange) {
          field.onChange(suggestion.display_name);
        }
        if (onSelect) {
          onSelect({
            address: suggestion.display_name,
            city: '',
            postcode: '',
            country: 'New Zealand'
          });
        }
      }
    } else {
      // Manual address entry
      console.log("Processing manual address entry...");
      if (field?.onChange) {
        field.onChange(suggestion.display_name);
      }
      if (onSelect) {
        onSelect({
          address: suggestion.display_name,
          city: '',
          postcode: '',
          country: 'New Zealand'
        });
      }
    }
  };

  return (
    <FormItem className="relative">
      <FormLabel className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </FormLabel>
      <FormControl>
        <div ref={containerRef} className="relative">
          <Input
            placeholder={placeholder}
            {...field}
            onChange={(e) => handleAddressChange(e.target.value)}
            onFocus={() => {
              if (addressSuggestions.length > 0) {
                setShowAddressSuggestions(true);
              }
            }}
            className="pr-8"
          />
          {isSearchingAddress && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          )}
          
          {/* Address Suggestions Dropdown */}
          {showAddressSuggestions && addressSuggestions.length > 0 && (
            <div className="absolute z-[9999] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {addressSuggestions.map((suggestion, index) => (
                <div
                  key={suggestion.place_id || index}
                  className={`px-4 py-3 border-b border-gray-100 dark:border-gray-600 last:border-b-0 ${
                    suggestion.error || suggestion.fallback
                      ? 'bg-red-50 dark:bg-red-900/20 cursor-not-allowed' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Dropdown item clicked:", suggestion);
                    if (!suggestion.error && !suggestion.fallback) {
                      selectAddress(suggestion);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  {suggestion.place_id ? (
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {suggestion.main_text}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {suggestion.secondary_text}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Google Maps Verified
                      </div>
                    </div>
                  ) : suggestion.error ? (
                    <div>
                      <div className="text-sm font-medium text-red-700 dark:text-red-300">
                        {suggestion.main_text}
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {suggestion.secondary_text}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {suggestion.main_text || suggestion.display_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {suggestion.secondary_text}
                      </div>
                      {suggestion.postcode && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Postcode: {suggestion.postcode}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}