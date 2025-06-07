import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Plus, Trash2, Building2, Clock, Phone, Mail, Save, Check, AlertCircle, Edit, MoreVertical, Star, Grid3X3, List, Table } from "lucide-react";
import { AddressSearch } from "@/components/ui/address-search";
import { ContactSearch } from "@/components/ui/contact-search";
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
  isPreferred: boolean;
}

interface MultiLocationManagerProps {
  entityType: "supplier" | "client";
  entityId?: number;
  onLocationsChange?: (locations: Location[]) => void;
  onPreferredLocationChange?: (location: Location | null) => void;
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
  onPreferredLocationChange,
  initialLocations = []
}: MultiLocationManagerProps) {
  const [savedLocations, setSavedLocations] = useState<Location[]>([]);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showNewLocationForm, setShowNewLocationForm] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table">("grid");

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
    isEditing: true,
    isPreferred: false
  });

  const handleAddNewLocation = () => {
    const newLocation = createNewLocation();
    setEditingLocation(newLocation);
    setShowNewLocationForm(true);
  };

  const handleSetPreferred = (locationId: string) => {
    const newSavedLocations = savedLocations.map(loc => ({
      ...loc,
      isPreferred: loc.id === locationId
    }));
    
    setSavedLocations(newSavedLocations);
    onLocationsChange?.(newSavedLocations);
    
    // Notify parent about preferred location change
    const preferredLocation = newSavedLocations.find(loc => loc.isPreferred);
    onPreferredLocationChange?.(preferredLocation || null);
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

    // If this is the first location, make it preferred automatically
    if (savedLocations.length === 0) {
      updatedLocation.isPreferred = true;
    }

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
    
    // If this became the preferred location, notify parent
    if (updatedLocation.isPreferred) {
      onPreferredLocationChange?.(updatedLocation);
    }
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
      console.log("MultiLocationManager setValue called:", { field, value, hasEditingLocation: !!editingLocation });
      if (editingLocation) {
        const updatedLocation = { ...editingLocation };
        
        if (field === "address") {
          updatedLocation.address = value;
        } else if (field === "city") {
          updatedLocation.city = value;
        } else if (field === "postcode") {
          updatedLocation.postcode = value;
        } else if (field === "country") {
          updatedLocation.country = value;
        }
        
        console.log("Updating location with:", { field, value, updatedLocation });
        setEditingLocation(updatedLocation);
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
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          {savedLocations.length > 0 && (
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-none border-x"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="rounded-l-none"
              >
                <Table className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <Button
            onClick={handleAddNewLocation}
            className="flex items-center gap-2"
            disabled={showNewLocationForm}
          >
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        </div>
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
                        {location.isPreferred && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current" />
                            Preferred
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!location.isPreferred && (
                            <DropdownMenuItem onClick={() => handleSetPreferred(location.id)}>
                              <Star className="h-4 w-4 mr-2" />
                              Set as Preferred
                            </DropdownMenuItem>
                          )}
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
          <CardContent className="space-y-3">
            {/* Location Type and Name - Compact */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Select
                  value={editingLocation.locationType}
                  onValueChange={(value) => updateEditingLocation("locationType", value)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locationTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-3 w-3" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input
                  className="h-8"
                  placeholder="Location name"
                  value={editingLocation.locationName}
                  onChange={(e) => updateEditingLocation("locationName", e.target.value)}
                />
              </div>
            </div>

            {/* Address - Compact */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Address</label>
              <div className="relative">
                <AddressSearch
                  field={{
                    value: editingLocation.address,
                    onChange: (value: string) => updateEditingLocation("address", value)
                  }}
                  form={createAddressFormHandler()}
                  placeholder="Enter address"
                />
              </div>
            </div>

            {/* City, Postcode, Country - Compact */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">City</label>
                <Input
                  className="h-8"
                  placeholder="City"
                  value={editingLocation.city}
                  onChange={(e) => updateEditingLocation("city", e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground">Postcode</label>
                <Input
                  className="h-8"
                  placeholder="Postcode"
                  value={editingLocation.postcode}
                  onChange={(e) => updateEditingLocation("postcode", e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground">Country</label>
                <Select
                  value={editingLocation.country}
                  onValueChange={(value) => updateEditingLocation("country", value)}
                >
                  <SelectTrigger className="h-8">
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

            {/* Contact Information - Compact */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Contact</label>
                <ContactSearch
                  entityType={entityType}
                  entityId={entityId}
                  value={editingLocation.contactPerson}
                  onChange={(contact) => {
                    if (contact) {
                      updateEditingLocation("contactPerson", contact.name);
                      updateEditingLocation("phone", contact.phoneMobile || contact.mobile || contact.phonePrimary || contact.workPhone || "");
                      updateEditingLocation("email", contact.email || "");
                    } else {
                      updateEditingLocation("contactPerson", "");
                    }
                  }}
                  placeholder="Search contacts..."
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input
                  className="h-8"
                  placeholder="Phone"
                  value={editingLocation.phone}
                  onChange={(e) => updateEditingLocation("phone", e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input
                  className="h-8"
                  type="email"
                  placeholder="Email"
                  value={editingLocation.email}
                  onChange={(e) => updateEditingLocation("email", e.target.value)}
                />
              </div>
            </div>

            {/* Operating Hours and Instructions - Compact */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Hours</label>
                <Input
                  className="h-8"
                  placeholder="Mon-Fri 8:00-17:00"
                  value={editingLocation.operatingHours}
                  onChange={(e) => updateEditingLocation("operatingHours", e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground">Instructions</label>
                <Input
                  className="h-8"
                  placeholder="Special instructions"
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