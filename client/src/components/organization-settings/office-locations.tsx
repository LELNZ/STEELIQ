import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Building2, Plus, Edit, Trash2, MapPin, Phone, Mail, Check } from "lucide-react";

interface CompanyLocation {
  id?: number;
  locationName: string;
  isPrimary: boolean;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  gstNumber?: string;
  businessNumber?: string;
  logoPath?: string;
  isActive: boolean;
}

export default function OfficeLocations() {
  const { toast } = useToast();
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<CompanyLocation | null>(null);
  const [locationForm, setLocationForm] = useState<CompanyLocation>({
    locationName: "",
    isPrimary: false,
    addressLine1: "",
    addressLine2: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    country: "New Zealand",
    phone: "",
    email: "",
    gstNumber: "",
    businessNumber: "",
    isActive: true,
  });

  // Fetch company locations
  const { data: locations = [], isLoading: loadingLocations } = useQuery({
    queryKey: ["/api/organization/locations"],
  });

  // Create or update location
  const saveLocationMutation = useMutation({
    mutationFn: async (location: CompanyLocation) => {
      if (location.id) {
        return await apiRequest(
          `/api/organization/locations/${location.id}`,
          "PUT",
          location
        );
      } else {
        return await apiRequest(
          "/api/organization/locations",
          "POST",
          location
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/locations"] });
      toast({
        title: "Success",
        description: `Location ${locationForm.id ? "updated" : "created"} successfully`,
      });
      setIsEditingLocation(false);
      resetLocationForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${locationForm.id ? "update" : "create"} location`,
        variant: "destructive",
      });
    },
  });

  // Delete location
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(
        `/api/organization/locations/${id}`,
        "DELETE"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/locations"] });
      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive",
      });
    },
  });

  const resetLocationForm = () => {
    setLocationForm({
      locationName: "",
      isPrimary: false,
      addressLine1: "",
      addressLine2: "",
      city: "",
      stateProvince: "",
      postalCode: "",
      country: "New Zealand",
      phone: "",
      email: "",
      gstNumber: "",
      businessNumber: "",
      isActive: true,
    });
    setSelectedLocation(null);
  };

  const handleEditLocation = (location: CompanyLocation) => {
    setLocationForm(location);
    setSelectedLocation(location);
    setIsEditingLocation(true);
  };

  const handleSaveLocation = () => {
    // Basic validation
    if (!locationForm.locationName || !locationForm.addressLine1 || !locationForm.city || !locationForm.phone || !locationForm.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Ensure only one primary location
    if (locationForm.isPrimary && !locationForm.id) {
      const hasPrimary = locations.some((loc: CompanyLocation) => loc.isPrimary);
      if (hasPrimary) {
        toast({
          title: "Validation Error",
          description: "There can only be one head office location",
          variant: "destructive",
        });
        return;
      }
    }

    saveLocationMutation.mutate(locationForm);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Office Locations</h2>
        <p className="text-muted-foreground mt-1">
          Manage your company's office locations and contact information
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Locations</CardTitle>
              <CardDescription>
                Add and manage your company office locations
              </CardDescription>
            </div>
            <Dialog open={isEditingLocation} onOpenChange={setIsEditingLocation}>
              <DialogTrigger asChild>
                <Button onClick={() => resetLocationForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{selectedLocation ? "Edit" : "Add"} Office Location</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="locationName">Location Name</Label>
                      <Input
                        id="locationName"
                        value={locationForm.locationName}
                        onChange={(e) => setLocationForm({ ...locationForm, locationName: e.target.value })}
                        placeholder="Auckland Head Office"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isPrimary"
                        checked={locationForm.isPrimary}
                        onCheckedChange={(checked) => setLocationForm({ ...locationForm, isPrimary: checked })}
                      />
                      <Label htmlFor="isPrimary">Head Office</Label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="addressLine1">Address Line 1</Label>
                    <Input
                      id="addressLine1"
                      value={locationForm.addressLine1}
                      onChange={(e) => setLocationForm({ ...locationForm, addressLine1: e.target.value })}
                      placeholder="123 Engineering Street"
                    />
                  </div>

                  <div>
                    <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                    <Input
                      id="addressLine2"
                      value={locationForm.addressLine2}
                      onChange={(e) => setLocationForm({ ...locationForm, addressLine2: e.target.value })}
                      placeholder="Suite 200"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={locationForm.city}
                        onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                        placeholder="Auckland"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stateProvince">State/Province</Label>
                      <Input
                        id="stateProvince"
                        value={locationForm.stateProvince}
                        onChange={(e) => setLocationForm({ ...locationForm, stateProvince: e.target.value })}
                        placeholder="Auckland"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        value={locationForm.postalCode}
                        onChange={(e) => setLocationForm({ ...locationForm, postalCode: e.target.value })}
                        placeholder="1010"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={locationForm.country}
                      onChange={(e) => setLocationForm({ ...locationForm, country: e.target.value })}
                      placeholder="New Zealand"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={locationForm.phone}
                        onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })}
                        placeholder="+64 9 123 4567"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={locationForm.email}
                        onChange={(e) => setLocationForm({ ...locationForm, email: e.target.value })}
                        placeholder="office@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                      <Input
                        id="gstNumber"
                        value={locationForm.gstNumber}
                        onChange={(e) => setLocationForm({ ...locationForm, gstNumber: e.target.value })}
                        placeholder="123-456-789"
                      />
                    </div>
                    <div>
                      <Label htmlFor="businessNumber">Business Number (Optional)</Label>
                      <Input
                        id="businessNumber"
                        value={locationForm.businessNumber}
                        onChange={(e) => setLocationForm({ ...locationForm, businessNumber: e.target.value })}
                        placeholder="9429037541862"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditingLocation(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveLocation} disabled={saveLocationMutation.isPending}>
                    {saveLocationMutation.isPending ? "Saving..." : "Save Location"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLocations ? (
            <div className="text-center py-8 text-muted-foreground">Loading locations...</div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No office locations added yet. Click "Add Location" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Tax Info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location: CompanyLocation) => (
                  <TableRow key={location.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{location.locationName}</div>
                          {location.isPrimary && (
                            <span className="text-xs text-primary">Head Office</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{location.addressLine1}</div>
                        {location.addressLine2 && <div>{location.addressLine2}</div>}
                        <div>{location.city}, {location.stateProvince} {location.postalCode}</div>
                        <div className="text-muted-foreground">{location.country}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{location.phone}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span>{location.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {location.gstNumber && <div>GST: {location.gstNumber}</div>}
                        {location.businessNumber && <div>BN: {location.businessNumber}</div>}
                        {!location.gstNumber && !location.businessNumber && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {location.isActive ? (
                          <>
                            <Check className="h-3 w-3 text-green-600" />
                            <span className="text-sm text-green-600">Active</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Inactive</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLocation(location)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Location</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{location.locationName}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => location.id && deleteLocationMutation.mutate(location.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}