import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Trash2, Building2, Warehouse, Truck, CreditCard, Edit, MoreVertical, Star, Grid3X3, List, Table, Save, X } from "lucide-react";
import { AddressSearch } from "@/components/ui/address-search";
import { ContactSearch } from "@/components/ui/contact-search";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  isPrimary: boolean;
}

interface LocationsManagerProps {
  entityType: "supplier" | "client";
  entityId?: number;
  onLocationChange?: (location: Location | null) => void;
}

const locationTypes = [
  { value: "primary", label: "Primary Office", icon: Building2 },
  { value: "warehouse", label: "Warehouse", icon: Warehouse },
  { value: "billing", label: "Billing Address", icon: CreditCard },
  { value: "shipping", label: "Shipping Address", icon: Truck },
  { value: "other", label: "Other", icon: MapPin }
];

export function LocationsManager({ entityType, entityId, onLocationChange }: LocationsManagerProps) {
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table">("grid");
  const [loading, setLoading] = useState(false);

  // Load locations when component mounts or entityId changes
  useEffect(() => {
    if (entityId) {
      loadLocations();
    }
  }, [entityId, entityType]);

  // Remove aggressive auto-refresh that was causing errors

  const loadLocations = async () => {
    if (!entityId) return;
    
    setLoading(true);
    try {
      const endpoint = entityType === "supplier" ? "supplier-locations" : "client-locations";
      const response = await fetch(`/api/${endpoint}?entityId=${entityId}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Loaded locations:", data);
        
        const transformedLocations = data.map((loc: any) => ({
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
          isPrimary: loc.isPrimary || false
        }));
        
        setLocations(transformedLocations);
      } else {
        console.log("No locations found or API error:", response.status);
        setLocations([]);
      }
    } catch (error) {
      console.error("Error loading locations:", error);
      setLocations([]);
      // Only show error toast for actual network errors, not empty results
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast({
          title: "Connection Error",
          description: "Could not connect to server. Please check your connection.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const createNewLocation = (): Location => ({
    id: `temp-${Date.now()}`,
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
    isPrimary: false
  });

  const handleAddLocation = () => {
    const newLocation = createNewLocation();
    setEditingLocation(newLocation);
    setShowForm(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation({ ...location });
    setShowForm(true);
  };

  const handleSaveLocation = async () => {
    if (!editingLocation || !entityId) return;

    // Validate required fields
    if (!editingLocation.locationName.trim() || !editingLocation.address.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a location name and address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const locationData = {
        entityId: entityId,
        entityType: entityType,
        locationType: editingLocation.locationType,
        locationName: editingLocation.locationName,
        addressLine1: editingLocation.address || editingLocation.addressLine1,
        addressLine2: editingLocation.addressLine2 || "",
        city: editingLocation.city || "",
        postalCode: editingLocation.postcode || editingLocation.postalCode || "",
        country: editingLocation.country || "New Zealand",
        contactPerson: editingLocation.contactPerson || "",
        phone: editingLocation.phone || "",
        email: editingLocation.email || "",
        operatingHours: editingLocation.operatingHours || "",
        specialInstructions: editingLocation.specialInstructions || "",
        notes: editingLocation.notes || "",
        isPrimary: editingLocation.isPrimary,
        isActive: editingLocation.isActive
      };

      const endpoint = entityType === "supplier" ? "supplier-locations" : "client-locations";
      const isUpdate = editingLocation.id && !editingLocation.id.startsWith('temp-');
      
      const response = await fetch(
        isUpdate ? `/api/${endpoint}/${editingLocation.id}` : `/api/${endpoint}`,
        {
          method: isUpdate ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(locationData)
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save location: ${response.status}`);
      }

      const savedLocation = await response.json();
      console.log("Location saved:", savedLocation);

      // Immediately reload locations once after successful save
      await loadLocations();
      
      setEditingLocation(null);
      setShowForm(false);

      toast({
        title: "Success",
        description: `Location ${isUpdate ? 'updated' : 'created'} successfully`
      });

      // If this is now the primary location, notify parent
      if (editingLocation.isPrimary) {
        onLocationChange?.(editingLocation);
      }

    } catch (error) {
      console.error("Error saving location:", error);
      toast({
        title: "Error",
        description: "Failed to save location. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;

    setLoading(true);
    try {
      const endpoint = entityType === "supplier" ? "supplier-locations" : "client-locations";
      const response = await fetch(`/api/${endpoint}/${locationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete location: ${response.status}`);
      }

      await loadLocations();
      
      toast({
        title: "Success",
        description: "Location deleted successfully"
      });

    } catch (error) {
      console.error("Error deleting location:", error);
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (locationId: string) => {
    setLoading(true);
    try {
      // Update all locations to not be primary, then set the selected one as primary
      const updatedLocations = locations.map(loc => ({
        ...loc,
        isPrimary: loc.id === locationId
      }));
      setLocations(updatedLocations);

      // Save the change to the database
      const endpoint = entityType === "supplier" ? "supplier-locations" : "client-locations";
      const response = await fetch(`/api/${endpoint}/${locationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true })
      });

      if (!response.ok) {
        throw new Error("Failed to update primary location");
      }

      const primaryLocation = updatedLocations.find(loc => loc.id === locationId);
      if (primaryLocation) {
        onLocationChange?.(primaryLocation);
      }

      toast({
        title: "Success",
        description: "Primary location updated"
      });

    } catch (error) {
      console.error("Error setting primary location:", error);
      toast({
        title: "Error",
        description: "Failed to update primary location",
        variant: "destructive"
      });
      // Reload to restore correct state
      await loadLocations();
    } finally {
      setLoading(false);
    }
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
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Please save the {entityType} first to manage locations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with view controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Locations & Addresses</h3>
          <p className="text-sm text-muted-foreground">
            Manage multiple locations for this {entityType}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {locations.length > 0 && (
            <div className="flex items-center border rounded-md">
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
          
          <Button onClick={handleAddLocation} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Locations Display */}
      {locations.length > 0 ? (
        viewMode === "table" ? (
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
                {locations.map((location) => {
                  const typeInfo = getLocationTypeInfo(location.locationType);
                  const TypeIcon = typeInfo.icon;
                  
                  return (
                    <tr key={location.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{location.locationName}</div>
                            <div className="flex gap-1 mt-1">
                              {location.isPrimary && (
                                <Badge variant="default" className="text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Primary
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!location.isPrimary && (
                              <DropdownMenuItem onClick={() => handleSetPrimary(location.id)}>
                                <Star className="h-4 w-4 mr-2" />
                                Set as Primary
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`gap-4 ${
            viewMode === "grid" ? "grid grid-cols-1 lg:grid-cols-2" : "space-y-3"
          }`}>
            {locations.map((location) => {
              const typeInfo = getLocationTypeInfo(location.locationType);
              const TypeIcon = typeInfo.icon;
              
              return viewMode === "list" ? (
                <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <TypeIcon className="h-4 w-4" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{location.locationName}</span>
                        {location.isPrimary && (
                          <Badge variant="default" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Primary
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!location.isPrimary && (
                        <DropdownMenuItem onClick={() => handleSetPrimary(location.id)}>
                          <Star className="h-4 w-4 mr-2" />
                          Set as Primary
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
              ) : (
                <Card key={location.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4" />
                        <CardTitle className="text-base">{location.locationName}</CardTitle>
                        {location.isPrimary && (
                          <Badge variant="default" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Primary
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
                          {!location.isPrimary && (
                            <DropdownMenuItem onClick={() => handleSetPrimary(location.id)}>
                              <Star className="h-4 w-4 mr-2" />
                              Set as Primary
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
                          <div className="h-3 w-3" />
                          <span className="text-muted-foreground">
                            {[location.city, location.postcode].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                      {location.contactPerson && (
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3" />
                          <span>{location.contactPerson}</span>
                          {location.phone && <span className="text-muted-foreground"> • {location.phone}</span>}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : !showForm ? (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No locations added yet</h3>
          <p className="text-muted-foreground mb-4">
            Add locations to track different addresses for this {entityType}
          </p>
          <Button onClick={handleAddLocation}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Location
          </Button>
        </div>
      ) : null}

      {/* Location Form */}
      {showForm && editingLocation && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                {editingLocation.id.startsWith('temp-') ? "Add New Location" : "Edit Location"}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setEditingLocation(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Location Type and Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Type</label>
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
                <label className="text-sm font-medium text-foreground">Location Name *</label>
                <Input
                  placeholder="Location name"
                  value={editingLocation.locationName}
                  onChange={(e) => updateEditingLocation("locationName", e.target.value)}
                />
              </div>
            </div>

            {/* Address Search */}
            <div>
              <label className="text-sm font-medium text-foreground">Address *</label>
              <AddressSearch
                field={{
                  value: editingLocation.address || "",
                  onChange: (value: string) => {
                    updateEditingLocation("address", value);
                  }
                }}
                form={{
                  setValue: (field: string, value: string) => {
                    console.log("Google Places setValue:", field, "=", value);
                    
                    if (field === "address") {
                      updateEditingLocation("address", value);
                      updateEditingLocation("addressLine1", value);
                    } else if (field === "city") {
                      updateEditingLocation("city", value);
                    } else if (field === "postcode") {
                      updateEditingLocation("postcode", value);
                      updateEditingLocation("postalCode", value);
                    } else if (field === "country") {
                      updateEditingLocation("country", value);
                    }
                  }
                }}
                placeholder="Search for address..."
              />
            </div>

            {/* City, Postcode, Country */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">City</label>
                <Input
                  placeholder="City"
                  value={editingLocation.city || ""}
                  onChange={(e) => updateEditingLocation("city", e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground">Postcode</label>
                <Input
                  placeholder="Postcode"
                  value={editingLocation.postcode || ""}
                  onChange={(e) => {
                    updateEditingLocation("postcode", e.target.value);
                    updateEditingLocation("postalCode", e.target.value);
                  }}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground">Country</label>
                <Select
                  value={editingLocation.country || "New Zealand"}
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
                    <SelectItem value="Canada">Canada</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Contact Person</label>
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
                <label className="text-sm font-medium text-foreground">Phone</label>
                <Input
                  placeholder="Phone"
                  value={editingLocation.phone}
                  onChange={(e) => updateEditingLocation("phone", e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="Email"
                  value={editingLocation.email}
                  onChange={(e) => updateEditingLocation("email", e.target.value)}
                />
              </div>
            </div>

            {/* Operating Hours and Instructions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Operating Hours</label>
                <Input
                  placeholder="Mon-Fri 8:00-17:00"
                  value={editingLocation.operatingHours}
                  onChange={(e) => updateEditingLocation("operatingHours", e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground">Special Instructions</label>
                <Input
                  placeholder="Special instructions"
                  value={editingLocation.specialInstructions}
                  onChange={(e) => updateEditingLocation("specialInstructions", e.target.value)}
                />
              </div>
            </div>

            {/* Primary Location Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={editingLocation.isPrimary}
                onChange={(e) => updateEditingLocation("isPrimary", e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="isPrimary" className="text-sm font-medium text-foreground">
                Set as primary location
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingLocation(null);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveLocation}
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save Location"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}