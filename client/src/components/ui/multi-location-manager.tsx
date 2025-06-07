import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Plus, Trash2, Building2, Clock, Phone, Mail, Save, Check, AlertCircle, Edit, MoreVertical } from "lucide-react";
import { AddressSearch } from "@/components/ui/address-search";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  isSaved: boolean;
  isEditing: boolean;
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
  const [savedLocations, setSavedLocations] = useState<Location[]>([]);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showNewLocationForm, setShowNewLocationForm] = useState(false);

  const createNewLocation = (): Location => ({
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
    isActive: true,
    isSaved: false,
    isEditing: true
  });

  const handleAddNewLocation = () => {
    const newLocation = createNewLocation();
    setEditingLocation(newLocation);
    setShowNewLocationForm(true);
  };

  const handleSaveLocation = (location: Location) => {
    console.log("Saving location:", location);
    
    // Validate required fields
    if (!location.locationName.trim() || !location.address.trim()) {
      alert("Please enter a location name and address");
      return;
    }

    const updatedLocation = {
      ...location,
      isSaved: true,
      isEditing: false
    };

    // Update or add to saved locations
    const existingIndex = savedLocations.findIndex(loc => loc.id === location.id);
    let newSavedLocations;
    
    if (existingIndex >= 0) {
      newSavedLocations = [...savedLocations];
      newSavedLocations[existingIndex] = updatedLocation;
    } else {
      newSavedLocations = [...savedLocations, updatedLocation];
    }

    setSavedLocations(newSavedLocations);
    setEditingLocation(null);
    setShowNewLocationForm(false);
    onLocationsChange?.(newSavedLocations);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation({ ...location, isEditing: true });
    setShowNewLocationForm(true);
  };

  const handleDeleteLocation = (locationId: string) => {
    if (confirm("Are you sure you want to delete this location?")) {
      const newSavedLocations = savedLocations.filter(loc => loc.id !== locationId);
      setSavedLocations(newSavedLocations);
      onLocationsChange?.(newSavedLocations);
    }
  };

  const handleCancelEdit = () => {
    setEditingLocation(null);
    setShowNewLocationForm(false);
  };

  const updateEditingLocation = (field: keyof Location, value: any) => {
    if (editingLocation) {
      setEditingLocation({
        ...editingLocation,
        [field]: value
      });
    }
  };

  // Custom form setValue function for AddressSearch
  const createAddressFormHandler = () => ({
    setValue: (field: string, value: string) => {
      console.log("Address form setValue:", { field, value });
      if (editingLocation) {
        if (field === "address") {
          updateEditingLocation("address", value);
        } else if (field === "city") {
          updateEditingLocation("city", value);
        } else if (field === "postcode") {
          updateEditingLocation("postcode", value);
        } else if (field === "country") {
          updateEditingLocation("country", value);
        }
      }
    }
  });

  const getLocationTypeInfo = (type: string) => {
    return locationTypes.find(lt => lt.value === type) || locationTypes[0];
  };

  if (!entityId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Save the {entityType} first to manage locations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Locations & Addresses</h3>
          <Badge variant="secondary">{savedLocations.length} location{savedLocations.length !== 1 ? 's' : ''}</Badge>
        </div>
        <Button
          onClick={handleAddNewLocation}
          className="flex items-center gap-2"
          disabled={showNewLocationForm}
        >
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      {/* Saved Locations */}
      {savedLocations.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-muted-foreground">Saved Locations</h4>
          <div className="grid gap-4">
            {savedLocations.map((location) => {
              const typeInfo = getLocationTypeInfo(location.locationType);
              const TypeIcon = typeInfo.icon;
              
              return (
                <Card key={location.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4" />
                        <CardTitle className="text-base">
                          {location.locationName || typeInfo.label}
                        </CardTitle>
                        {location.locationType === "primary" && (
                          <Badge variant="default" className="text-xs">Primary</Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditLocation(location)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteLocation(location.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>{location.address}</span>
                      </div>
                      {(location.city || location.postcode) && (
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3" /> {/* Spacer */}
                          <span className="text-muted-foreground">
                            {[location.city, location.postcode].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                      {location.contactPerson && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{location.contactPerson}</span>
                          {location.phone && <span className="text-muted-foreground">• {location.phone}</span>}
                        </div>
                      )}
                      {location.operatingHours && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>{location.operatingHours}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* New/Edit Location Form */}
      {showNewLocationForm && editingLocation && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              {editingLocation.isSaved ? "Edit Location" : "Add New Location"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Location Type and Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Location Type</label>
                <Select
                  value={editingLocation.locationType}
                  onValueChange={(value) => updateEditingLocation("locationType", value)}
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
                  value={editingLocation.locationName}
                  onChange={(e) => updateEditingLocation("locationName", e.target.value)}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-sm font-medium">Street Address</label>
              <AddressSearch
                field={{
                  value: editingLocation.address,
                  onChange: (value: string) => updateEditingLocation("address", value)
                }}
                form={createAddressFormHandler()}
                placeholder="Enter street address"
              />
            </div>

            {/* City, Postcode, Country */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">City</label>
                <Input
                  placeholder="City"
                  value={editingLocation.city}
                  onChange={(e) => updateEditingLocation("city", e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Postcode</label>
                <Input
                  placeholder="Postcode"
                  value={editingLocation.postcode}
                  onChange={(e) => updateEditingLocation("postcode", e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Country</label>
                <Select
                  value={editingLocation.country}
                  onValueChange={(value) => updateEditingLocation("country", value)}
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
                  value={editingLocation.contactPerson}
                  onChange={(e) => updateEditingLocation("contactPerson", e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone
                </label>
                <Input
                  placeholder="Phone number"
                  value={editingLocation.phone}
                  onChange={(e) => updateEditingLocation("phone", e.target.value)}
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
                  value={editingLocation.email}
                  onChange={(e) => updateEditingLocation("email", e.target.value)}
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
                  value={editingLocation.operatingHours}
                  onChange={(e) => updateEditingLocation("operatingHours", e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Special Instructions</label>
                <Textarea
                  placeholder="Delivery instructions, access codes, etc."
                  className="min-h-[60px]"
                  value={editingLocation.specialInstructions}
                  onChange={(e) => updateEditingLocation("specialInstructions", e.target.value)}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSaveLocation(editingLocation)}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Location
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {savedLocations.length === 0 && !showNewLocationForm && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No locations added yet</h3>
          <p className="text-muted-foreground mb-4">
            Add locations to track different addresses for this {entityType}
          </p>
          <Button onClick={handleAddNewLocation} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add First Location
          </Button>
        </div>
      )}
    </div>
  );
}