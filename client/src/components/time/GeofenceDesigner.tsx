import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Circle, 
  Square,
  Hexagon,
  AlertTriangle,
  CheckCircle,
  Navigation,
  Ruler,
  Users,
  Shield
} from 'lucide-react';
import type { GeofenceZone } from '@shared/schema';

interface Geofence {
  id: number;
  name: string;
  centerLatitude: number;
  centerLongitude: number;
  radius: number;
  shape: 'circle' | 'polygon' | 'rectangle';
  polygonCoordinates?: Array<{ lat: number; lng: number }>;
  enforced: boolean;
  allowOverride: boolean;
  activeEmployees?: number;
  violationCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface GeofenceViolation {
  id: number;
  userId: number;
  userName: string;
  geofenceId: number;
  geofenceName: string;
  violationType: 'outside' | 'mock_location' | 'gps_disabled';
  timestamp: string;
  distance: number;
  resolved: boolean;
}

export function GeofenceDesigner() {
  const { toast } = useToast();
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [violationsDialogOpen, setViolationsDialogOpen] = useState(false);
  const [mapViewOpen, setMapViewOpen] = useState(false);
  
  // Form state
  const [geofenceName, setGeofenceName] = useState('');
  const [centerLat, setCenterLat] = useState(-36.8485);
  const [centerLng, setCenterLng] = useState(174.7633);
  const [radius, setRadius] = useState(250);
  const [shape, setShape] = useState<'circle' | 'polygon' | 'rectangle'>('circle');
  const [enforced, setEnforced] = useState(true);
  const [allowOverride, setAllowOverride] = useState(true);
  const [polygonPoints, setPolygonPoints] = useState<Array<{ lat: number; lng: number }>>([]);

  // Fetch geofences
  const { data: geofences = [], isLoading } = useQuery({
    queryKey: ['/api/time/geofences'],
  });

  // Fetch active violations
  const { data: violations = [] } = useQuery({
    queryKey: ['/api/time/geofences/violations'],
  });

  // Fetch geofence analytics
  const { data: analytics } = useQuery({
    queryKey: ['/api/time/geofences/analytics'],
  });

  // Create geofence mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/time/geofences', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Geofence created',
        description: 'New geofence zone has been configured',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time/geofences'] });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create geofence',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Update geofence mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      return apiRequest(`/api/time/geofences/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data.updates),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Geofence updated',
        description: 'Changes have been saved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time/geofences'] });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update geofence',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Delete geofence mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/time/geofences/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Geofence deleted',
        description: 'The geofence has been removed',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time/geofences'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete geofence',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Toggle enforcement mutation
  const toggleEnforcementMutation = useMutation({
    mutationFn: async (data: { id: number; enforced: boolean }) => {
      return apiRequest(`/api/time/geofences/${data.id}/toggle-enforcement`, {
        method: 'POST',
        body: JSON.stringify({ enforced: data.enforced }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time/geofences'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to toggle enforcement',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Test geofence mutation
  const testMutation = useMutation({
    mutationFn: async (data: { id: number; testLat: number; testLng: number }) => {
      return apiRequest(`/api/time/geofences/${data.id}/test`, {
        method: 'POST',
        body: JSON.stringify({
          latitude: data.testLat,
          longitude: data.testLng,
        }),
      });
    },
    onSuccess: (result) => {
      toast({
        title: result.inside ? 'Inside geofence' : 'Outside geofence',
        description: `Distance from center: ${result.distance}m`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Test failed',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setGeofenceName('');
    setCenterLat(-36.8485);
    setCenterLng(174.7633);
    setRadius(250);
    setShape('circle');
    setEnforced(true);
    setAllowOverride(true);
    setPolygonPoints([]);
  };

  const handleCreateGeofence = () => {
    if (!geofenceName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please provide a name for the geofence',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate({
      name: geofenceName,
      centerLatitude: centerLat,
      centerLongitude: centerLng,
      radius,
      shape,
      polygonCoordinates: shape === 'polygon' ? polygonPoints : undefined,
      enforced,
      allowOverride,
    });
  };

  const handleEditGeofence = (geofence: Geofence) => {
    setSelectedGeofence(geofence);
    setGeofenceName(geofence.name);
    setCenterLat(geofence.centerLatitude);
    setCenterLng(geofence.centerLongitude);
    setRadius(geofence.radius);
    setShape(geofence.shape);
    setEnforced(geofence.enforced);
    setAllowOverride(geofence.allowOverride);
    setPolygonPoints(geofence.polygonCoordinates || []);
    setEditDialogOpen(true);
  };

  const handleUpdateGeofence = () => {
    if (!selectedGeofence) return;

    updateMutation.mutate({
      id: selectedGeofence.id,
      updates: {
        name: geofenceName,
        centerLatitude: centerLat,
        centerLongitude: centerLng,
        radius,
        shape,
        polygonCoordinates: shape === 'polygon' ? polygonPoints : undefined,
        enforced,
        allowOverride,
      },
    });
  };

  const getShapeIcon = (shape: string) => {
    switch (shape) {
      case 'circle':
        return <Circle className="h-4 w-4" />;
      case 'polygon':
        return <Hexagon className="h-4 w-4" />;
      case 'rectangle':
        return <Square className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenterLat(position.coords.latitude);
          setCenterLng(position.coords.longitude);
          toast({
            title: 'Location obtained',
            description: 'GPS coordinates have been updated',
          });
        },
        (error) => {
          toast({
            title: 'Location error',
            description: 'Unable to get current location',
            variant: 'destructive',
          });
        }
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Geofence Designer</h2>
          <p className="text-muted-foreground">
            Configure location-based boundaries for time tracking compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setViolationsDialogOpen(true)}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Violations ({violations.filter((v: GeofenceViolation) => !v.resolved).length})
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-geofence">
            <Plus className="h-4 w-4 mr-2" />
            Create Geofence
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Geofences</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {geofences.filter((g: Geofence) => g.enforced).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {analytics?.totalCoverageKm2 || 0} km²
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {analytics?.activeEmployees || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Compliance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {analytics?.complianceRate || 100}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Violations Alert */}
      {violations.filter((v: GeofenceViolation) => !v.resolved).length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            There are {violations.filter((v: GeofenceViolation) => !v.resolved).length} active geofence violations requiring attention.
            <Button
              variant="link"
              className="ml-2 text-orange-700"
              onClick={() => setViolationsDialogOpen(true)}
            >
              View Details →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Geofences Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Geofences</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Shape</TableHead>
                <TableHead>Center Coordinates</TableHead>
                <TableHead>Radius/Size</TableHead>
                <TableHead>Override</TableHead>
                <TableHead>Active Users</TableHead>
                <TableHead>Violations</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    Loading geofences...
                  </TableCell>
                </TableRow>
              ) : geofences.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    No geofences configured
                  </TableCell>
                </TableRow>
              ) : (
                geofences.map((geofence: Geofence) => (
                  <TableRow key={geofence.id}>
                    <TableCell>
                      <Switch
                        checked={geofence.enforced}
                        onCheckedChange={(enforced) => 
                          toggleEnforcementMutation.mutate({ id: geofence.id, enforced })
                        }
                        data-testid={`switch-geofence-${geofence.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{geofence.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getShapeIcon(geofence.shape)}
                        <span className="capitalize">{geofence.shape}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{geofence.centerLatitude.toFixed(6)}</p>
                        <p>{geofence.centerLongitude.toFixed(6)}</p>
                      </div>
                    </TableCell>
                    <TableCell>{geofence.radius}m</TableCell>
                    <TableCell>
                      {geofence.allowOverride ? (
                        <span className="text-green-600">Allowed</span>
                      ) : (
                        <span className="text-red-600">Blocked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{geofence.activeEmployees || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {geofence.violationCount || 0 > 0 ? (
                        <span className="text-red-600">{geofence.violationCount}</span>
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            testMutation.mutate({
                              id: geofence.id,
                              testLat: centerLat,
                              testLng: centerLng,
                            });
                          }}
                          data-testid={`button-test-${geofence.id}`}
                        >
                          <Navigation className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditGeofence(geofence)}
                          data-testid={`button-edit-${geofence.id}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(geofence.id)}
                          data-testid={`button-delete-${geofence.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Geofence Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Geofence</DialogTitle>
            <DialogDescription>
              Define a geographic boundary for time tracking compliance
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Geofence Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Main Office, Warehouse A"
                value={geofenceName}
                onChange={(e) => setGeofenceName(e.target.value)}
                data-testid="input-geofence-name"
              />
            </div>

            <div>
              <Label>Shape</Label>
              <Select value={shape} onValueChange={(value: any) => setShape(value)}>
                <SelectTrigger data-testid="select-shape">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="circle">
                    <div className="flex items-center gap-2">
                      <Circle className="h-4 w-4" />
                      Circle
                    </div>
                  </SelectItem>
                  <SelectItem value="polygon">
                    <div className="flex items-center gap-2">
                      <Hexagon className="h-4 w-4" />
                      Polygon
                    </div>
                  </SelectItem>
                  <SelectItem value="rectangle">
                    <div className="flex items-center gap-2">
                      <Square className="h-4 w-4" />
                      Rectangle
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lat">Center Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.000001"
                  value={centerLat}
                  onChange={(e) => setCenterLat(parseFloat(e.target.value))}
                  data-testid="input-latitude"
                />
              </div>
              <div>
                <Label htmlFor="lng">Center Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="0.000001"
                  value={centerLng}
                  onChange={(e) => setCenterLng(parseFloat(e.target.value))}
                  data-testid="input-longitude"
                />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleGetCurrentLocation}
              className="w-full"
              data-testid="button-get-location"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Use Current Location
            </Button>

            {shape === 'circle' && (
              <div>
                <Label htmlFor="radius">Radius (meters)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    id="radius"
                    min={50}
                    max={1000}
                    step={50}
                    value={[radius]}
                    onValueChange={(value) => setRadius(value[0])}
                    className="flex-1"
                  />
                  <span className="w-20 text-right font-mono">{radius}m</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Fortune 50 standard: 250m radius
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enforce Geofence</Label>
                  <p className="text-sm text-muted-foreground">
                    Require employees to be within boundary
                  </p>
                </div>
                <Switch
                  checked={enforced}
                  onCheckedChange={setEnforced}
                  data-testid="switch-enforce"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Override</Label>
                  <p className="text-sm text-muted-foreground">
                    Managers can approve clock events outside boundary
                  </p>
                </div>
                <Switch
                  checked={allowOverride}
                  onCheckedChange={setAllowOverride}
                  data-testid="switch-override"
                />
              </div>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Geofences help ensure Fortune 50 compliance by validating employee locations 
                during clock events. GPS tracking with 8-decimal precision is automatically 
                enforced within these boundaries.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateGeofence}
              disabled={createMutation.isPending}
              data-testid="button-save-geofence"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Geofence'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Violations Dialog */}
      <Dialog open={violationsDialogOpen} onOpenChange={setViolationsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Geofence Violations</DialogTitle>
            <DialogDescription>
              Review and manage geofence compliance violations
            </DialogDescription>
          </DialogHeader>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Geofence</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No violations recorded
                  </TableCell>
                </TableRow>
              ) : (
                violations.map((violation: GeofenceViolation) => (
                  <TableRow key={violation.id}>
                    <TableCell>{format(new Date(violation.timestamp), 'MMM dd, HH:mm')}</TableCell>
                    <TableCell>{violation.userName}</TableCell>
                    <TableCell>{violation.geofenceName}</TableCell>
                    <TableCell>
                      <span className="capitalize">{violation.violationType.replace('_', ' ')}</span>
                    </TableCell>
                    <TableCell>{violation.distance}m</TableCell>
                    <TableCell>
                      {violation.resolved ? (
                        <span className="text-green-600">Resolved</span>
                      ) : (
                        <span className="text-red-600">Active</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <DialogFooter>
            <Button onClick={() => setViolationsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}