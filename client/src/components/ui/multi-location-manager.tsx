import { useState, useEffect } from "react";
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

import { ActionIcons } from "@/components/ui/action-icons";
import { useToast } from "@/hooks/use-toast";

interface Location {
  id: string;
  locationType: string;
  locationName: string;
  address: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  postalCode: string;
  country: string;
  contactPerson: string;
  phone: string;
  email: string;
  operatingHours: string;
  specialInstructions: string;
  notes: string;
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
  const { toast } = useToast();
  const [savedLocations, setSavedLocations] = useState<Location[]>([]);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showNewLocationForm, setShowNewLocationForm] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table">("grid");

  // Function to refresh locations from database
  const refreshLocations = async () => {
    if (!entityId) return;
    
    try {
      const endpoint = entityType === "supplier" ? "supplier-locations" : "client-locations";
      const response = await fetch(`/api/${endpoint}?entityId=${entityId}`);
      
      if (response.ok) {
        const locations = await response.json();
        console.log("Refreshed locations from database:", locations);
        
        // Transform database locations to component format
        const transformedLocations = locations.map((loc: any) => ({
          id: loc.id.toString(),
          locationType: loc.locationType || "other",
          locationName: loc.locationName || "",
          address: loc.addressLine1 || "",
          addressLine1: loc.addressLine1 || "",
          addressLine2: loc.addressLine2 || "",
          city: loc.city || "",
          postcode: loc.postalCode || "",
          postalCode: loc.postalCode || "",
          country: loc.country || "New Zealand",
          contactPerson: loc.contactPerson || "",
          phone: loc.phone || "",
          email: loc.email || "",
          operatingHours: loc.operatingHours || "",
          specialInstructions: loc.specialInstructions || "",
          notes: loc.notes || "",
          isActive: loc.isActive !== false,
          isSaved: true,
          isEditing: false,
          isPreferred: loc.isPrimary || false
        }));
        
        setSavedLocations(transformedLocations);
        onLocationsChange?.(transformedLocations);
        
        // Set preferred location
        const preferredLocation = transformedLocations.find((loc: Location) => loc.isPreferred);
        if (preferredLocation) {
          onPreferredLocationChange?.(preferredLocation);
        }
      }
    } catch (error) {
      console.error("Error refreshing locations:", error);
    }
  };

  // Load existing locations when component mounts or entityId changes
  useEffect(() => {
    const loadExistingLocations = async () => {
      if (!entityId) return;
      
      try {
        const endpoint = entityType === "supplier" ? "supplier-locations" : "client-locations";
        const response = await fetch(`/api/${endpoint}?entityId=${entityId}`);
        
        if (response.ok) {
          const locations = await response.json();
          console.log("Loaded existing locations:", locations);
          
          // Transform database locations to component format
          const transformedLocations = locations.map((loc: any) => ({
            id: loc.id.toString(),
            locationType: loc.locationType || "other",
            locationName: loc.locationName || "",
            address: loc.addressLine1 || "",
            addressLine1: loc.addressLine1 || "",
            addressLine2: loc.addressLine2 || "",
            city: loc.city || "",
            postcode: loc.postalCode || "",
            postalCode: loc.postalCode || "",
            country: loc.country || "New Zealand",
            contactPerson: loc.contactPerson || "",
            phone: loc.phone || "",
            email: loc.email || "",
            operatingHours: loc.operatingHours || "",
            specialInstructions: loc.specialInstructions || "",
            notes: loc.notes || "",
            isActive: loc.isActive !== false,
            isSaved: true,
            isEditing: false,
            isPreferred: loc.isPrimary || false
          }));
          
          setSavedLocations(transformedLocations);
          onLocationsChange?.(transformedLocations);
          
          // Set preferred location
          const preferredLocation = transformedLocations.find((loc: Location) => loc.isPreferred);
          if (preferredLocation) {
            onPreferredLocationChange?.(preferredLocation);
          }
        }
      } catch (error) {
        console.error("Error loading existing locations:", error);
      }
    };

    loadExistingLocations();
  }, [entityId, entityType]);

  const createNewLocation = (): Location => ({
    id: Date.now().toString(),
    locationType: "other",
    locationName: "",
    address: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
    postalCode: "",
    country: "New Zealand",
    contactPerson: "",
    phone: "",
    email: "",
    operatingHours: "",
    specialInstructions: "",
    notes: "",
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



  const handleSaveLocation = async (location: Location) => {
    console.log("Saving location to database:", location);
    
    // Validate required fields
    if (!location.locationName.trim() || !location.address.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a location name and address",
        variant: "destructive"
      });
      return;
    }

    try {
      // Prepare location data for API
      const locationData = {
        entityId: entityId,
        entityType: entityType,
        locationType: location.locationType,
        locationName: location.locationName,
        addressLine1: location.address || location.addressLine1 || "",
        addressLine2: location.addressLine2 || "",
        city: location.city || "",
        postalCode: location.postcode || location.postalCode || "",
        country: location.country || "New Zealand",
        contactPerson: location.contactPerson || "",
        phone: location.phone || "",
        email: location.email || "",
        notes: location.specialInstructions || location.notes || "",
        isPrimary: savedLocations.length === 0, // First location becomes primary
        isBillingAddress: false,
        isShippingAddress: false
      };

      console.log("Sending location data to API:", locationData);

      // Save to database
      const apiEndpoint = entityType === "supplier" ? "supplier-locations" : "client-locations";
      let response;
      
      if (location.isSaved && location.id) {
        // Update existing location
        response = await fetch(`/api/${apiEndpoint}/${location.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(locationData)
        });
      } else {
        // Create new location
        response = await fetch(`/api/${apiEndpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(locationData)
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to save location: ${response.status}`);
      }

      const savedLocation = await response.json();
      console.log("Location saved successfully:", savedLocation);

      // Update local state
      const updatedLocation = {
        ...location,
        id: savedLocation.id ? savedLocation.id.toString() : location.id,
        isSaved: true,
        isEditing: false,
        isPreferred: locationData.isPrimary
      };

      // Update or add to saved locations
      // For new locations (temp IDs), always add to the list
      // For existing locations, find by database ID
      const existingIndex = location.isSaved ? 
        savedLocations.findIndex(loc => loc.id === location.id) : -1;
      let newSavedLocations;
      
      if (existingIndex >= 0) {
        // Update existing location
        newSavedLocations = [...savedLocations];
        newSavedLocations[existingIndex] = updatedLocation;
      } else {
        // Add new location
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

      // Force re-render to show the new location immediately
      console.log("Location saved and added to UI successfully");

      toast({
        title: "Location Saved",
        description: `${location.locationName} has been saved successfully`
      });

    } catch (error) {
      console.error("Error saving location:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save location. Please try again.",
        variant: "destructive"
      });
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
      
      // If deleted location was preferred, clear preferred status
      const deletedLocation = savedLocations.find(loc => loc.id === locationId);
      if (deletedLocation?.isPreferred) {
        onPreferredLocationChange?.(null);
      }
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
          {viewMode === "table" ? (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-sm font-medium">Location</th>
                    <th className="text-left p-3 text-sm font-medium">Address</th>
                    <th className="text-left p-3 text-sm font-medium">Contact</th>
                    <th className="text-left p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedLocations.map((location) => {
                    const typeInfo = getLocationTypeInfo(location.locationType);
                    const TypeIcon = typeInfo.icon;
                    
                    return (
                      <tr key={location.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4" />
                            <div>
                              <div className="font-medium">
                                {location.locationName || typeInfo.label}
                              </div>
                              <div className="flex gap-1 mt-1">
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
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            <div>{location.address}</div>
                            {(location.city || location.postcode) && (
                              <div className="text-muted-foreground">
                                {[location.city, location.postcode].filter(Boolean).join(", ")}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">
                            {location.contactPerson && <div>{location.contactPerson}</div>}
                            {location.phone && <div className="text-muted-foreground">{location.phone}</div>}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {!location.isPreferred && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleSetPreferred(location.id)}
                                title="Set as Preferred"
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <ActionIcons
                              onEdit={() => handleEditLocation(location)}
                              onDelete={() => handleDeleteLocation(location.id)}
                              editTitle="Edit Location"
                              deleteTitle="Delete Location"
                              compact={true}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`gap-4 ${
              viewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2" :
              "space-y-3"
            }`}>
              {savedLocations.map((location) => {
                const typeInfo = getLocationTypeInfo(location.locationType);
                const TypeIcon = typeInfo.icon;
                
                return viewMode === "list" ? (
                  <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <TypeIcon className="h-4 w-4" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {location.locationName || typeInfo.label}
                          </span>
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
                        <div className="text-sm text-muted-foreground">
                          {location.address}
                          {(location.city || location.postcode) && (
                            <span> • {[location.city, location.postcode].filter(Boolean).join(", ")}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!location.isPreferred && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSetPreferred(location.id)}
                          title="Set as Preferred"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <ActionIcons
                        onEdit={() => handleEditLocation(location)}
                        onDelete={() => handleDeleteLocation(location.id)}
                        editTitle="Edit Location"
                        deleteTitle="Delete Location"
                        compact={true}
                      />
                    </div>
                  </div>
                ) : (
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
                        <div className="flex items-center gap-2">
                          {!location.isPreferred && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleSetPreferred(location.id)}
                              title="Set as Preferred"
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          <ActionIcons
                            onEdit={() => handleEditLocation(location)}
                            onDelete={() => handleDeleteLocation(location.id)}
                            editTitle="Edit Location"
                            deleteTitle="Delete Location"
                            compact={true}
                          />
                        </div>
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
                )
              })}
            </div>
          )}
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

            {/* Address Section - Enhanced with proper field population */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Address</label>
                <div className="relative">
                  <AddressSearch
                    field={{
                      value: editingLocation.address || "",
                      onChange: (value: string) => {
                        console.log("Address field onChange:", value);
                        updateEditingLocation("address", value);
                      }
                    }}
                    form={{
                      setValue: (field: string, value: string) => {
                        console.log("Google Places setValue:", field, "=", value);
                        console.log("Current editingLocation:", editingLocation);
                        
                        if (!editingLocation) {
                          console.warn("No editingLocation available for setValue");
                          return;
                        }
                        
                        setEditingLocation(prev => {
                          if (!prev) return prev;
                          
                          const updated = { ...prev };
                          
                          if (field === "address") {
                            updated.address = value;
                            updated.addressLine1 = value;
                          } else if (field === "city") {
                            updated.city = value;
                          } else if (field === "postcode") {
                            updated.postcode = value;
                            updated.postalCode = value;
                          } else if (field === "country") {
                            updated.country = value;
                          }
                          
                          console.log("Updated location state:", updated);
                          return updated;
                        });
                      }
                    }}
                    placeholder="Search for address..."
                  />
                </div>
              </div>

              {/* City, Postcode, Country - Enhanced with proper state binding */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">City</label>
                  <Input
                    className="h-8"
                    placeholder="City"
                    value={editingLocation.city || ""}
                    onChange={(e) => {
                      console.log("City manual input:", e.target.value);
                      updateEditingLocation("city", e.target.value);
                    }}
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Postcode</label>
                  <Input
                    className="h-8"
                    placeholder="Postcode"
                    value={editingLocation.postcode || ""}
                    onChange={(e) => {
                      console.log("Postcode manual input:", e.target.value);
                      updateEditingLocation("postcode", e.target.value);
                    }}
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Country</label>
                  <Select
                    value={editingLocation.country || ""}
                    onValueChange={(value) => {
                      console.log("Country selection:", value);
                      updateEditingLocation("country", value);
                    }}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New Zealand">New Zealand</SelectItem>
                      <SelectItem value="Australia">Australia</SelectItem>
                      <SelectItem value="United States">United States</SelectItem>
                      <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                      <SelectItem value="Canada">Canada</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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