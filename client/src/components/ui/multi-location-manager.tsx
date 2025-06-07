import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Trash2, Building2, Clock, Phone, Mail } from "lucide-react";
import { AddressSearch } from "@/components/ui/address-search";

interface Location {
  id: string;
  locationType: string;
  locationName: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  contactPerson: string;
  phone: string;
  email: string;
  operatingHours: string;
  specialInstructions: string;
  isActive: boolean;
}

interface MultiLocationManagerProps {
  entityType: "supplier" | "client";
  entityId?: number;
  onLocationsChange?: (locations: Location[]) => void;
  initialLocations?: Location[];
}

const locationTypes = [
  { value: "primary", label: "Primary Office", icon: Building2 },
  { value: "warehouse", label: "Warehouse", icon: MapPin },
  { value: "billing", label: "Billing Address", icon: Mail },
  { value: "shipping", label: "Shipping Address", icon: MapPin },
  { value: "pickup", label: "Pickup Location", icon: MapPin },
  { value: "other", label: "Other", icon: MapPin }
];

export function MultiLocationManager({ 
  entityType, 
  entityId, 
  onLocationsChange,
  initialLocations = []
}: MultiLocationManagerProps) {
  const [locations, setLocations] = useState<Location[]>(
    initialLocations.length > 0 
      ? initialLocations 
      : [{
          id: "1",
          locationType: "primary",
          locationName: "Main Office",
          address: "",
          city: "",
          postcode: "",
          country: "New Zealand",
          contactPerson: "",
          phone: "",
          email: "",
          operatingHours: "",
          specialInstructions: "",
          isActive: true
        }]
  );

  const addLocation = () => {
    const newLocation: Location = {
      id: Date.now().toString(),
      locationType: "other",
      locationName: "",
      address: "",
      city: "",
      postcode: "",
      country: "New Zealand",
      contactPerson: "",
      phone: "",
      email: "",
      operatingHours: "",
      specialInstructions: "",
      isActive: true
    };
    
    const updatedLocations = [...locations, newLocation];
    setLocations(updatedLocations);
    onLocationsChange?.(updatedLocations);
  };

  const removeLocation = (id: string) => {
    if (locations.length <= 1) return; // Keep at least one location
    
    const updatedLocations = locations.filter(loc => loc.id !== id);
    setLocations(updatedLocations);
    onLocationsChange?.(updatedLocations);
  };

  const updateLocation = (id: string, field: keyof Location, value: any) => {
    const updatedLocations = locations.map(loc => 
      loc.id === id ? { ...loc, [field]: value } : loc
    );
    setLocations(updatedLocations);
    onLocationsChange?.(updatedLocations);
  };

  const getLocationTypeInfo = (type: string) => {
    return locationTypes.find(lt => lt.value === type) || locationTypes[0];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Locations & Addresses</h3>
          <Badge variant="secondary">{locations.length} location{locations.length !== 1 ? 's' : ''}</Badge>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLocation}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      <div className="space-y-4">
        {locations.map((location, index) => {
          const typeInfo = getLocationTypeInfo(location.locationType);
          const TypeIcon = typeInfo.icon;
          
          return (
            <Card key={location.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TypeIcon className="h-4 w-4" />
                    {location.locationName || typeInfo.label}
                    {location.locationType === "primary" && (
                      <Badge variant="default" className="text-xs">Primary</Badge>
                    )}
                  </CardTitle>
                  {locations.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLocation(location.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Location Type and Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Location Type</label>
                    <Select
                      value={location.locationType}
                      onValueChange={(value) => updateLocation(location.id, "locationType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locationTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Location Name</label>
                    <Input
                      placeholder="e.g., Head Office, Auckland Warehouse"
                      value={location.locationName}
                      onChange={(e) => updateLocation(location.id, "locationName", e.target.value)}
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="text-sm font-medium">Street Address</label>
                  <AddressSearch
                    field={{
                      value: location.address,
                      onChange: (value) => updateLocation(location.id, "address", value)
                    }}
                    form={{
                      setValue: (field: string, value: string) => {
                        if (field === "city") updateLocation(location.id, "city", value);
                        if (field === "postcode") updateLocation(location.id, "postcode", value);
                        if (field === "country") updateLocation(location.id, "country", value);
                      }
                    }}
                    placeholder="Enter street address"
                  />
                </div>

                {/* City, Postcode, Country */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input
                      placeholder="City"
                      value={location.city}
                      onChange={(e) => updateLocation(location.id, "city", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Postcode</label>
                    <Input
                      placeholder="Postcode"
                      value={location.postcode}
                      onChange={(e) => updateLocation(location.id, "postcode", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Country</label>
                    <Select
                      value={location.country}
                      onValueChange={(value) => updateLocation(location.id, "country", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New Zealand">New Zealand</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Contact Person
                    </label>
                    <Input
                      placeholder="Contact name"
                      value={location.contactPerson}
                      onChange={(e) => updateLocation(location.id, "contactPerson", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Phone
                    </label>
                    <Input
                      placeholder="Phone number"
                      value={location.phone}
                      onChange={(e) => updateLocation(location.id, "phone", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={location.email}
                      onChange={(e) => updateLocation(location.id, "email", e.target.value)}
                    />
                  </div>
                </div>

                {/* Operating Hours and Special Instructions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Operating Hours
                    </label>
                    <Input
                      placeholder="e.g., Mon-Fri 8:00-17:00"
                      value={location.operatingHours}
                      onChange={(e) => updateLocation(location.id, "operatingHours", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Special Instructions</label>
                    <Textarea
                      placeholder="Delivery instructions, access codes, etc."
                      className="min-h-[60px]"
                      value={location.specialInstructions}
                      onChange={(e) => updateLocation(location.id, "specialInstructions", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}