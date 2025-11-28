import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Monitor, 
  Camera, 
  Key, 
  Clock, 
  LogOut, 
  Shield, 
  Users,
  MapPin,
  CheckCircle,
  XCircle 
} from 'lucide-react';
import PhotoCapture from './PhotoCapture';

interface KioskSession {
  sessionId: string;
  sessionToken: string;
  refreshToken: string;
  expiresAt: string;
  kioskSettings: {
    requiresPhoto: boolean;
    requiresPin: boolean;
    allowedActions: string[];
  };
}

interface Employee {
  id: number;
  name: string;
  employeeId: string;
  hasPin: boolean;
  lastClock?: {
    type: string;
    timestamp: string;
  };
}

export function KioskModePage() {
  const { toast } = useToast();
  const [isKioskActive, setIsKioskActive] = useState(false);
  const [currentSession, setCurrentSession] = useState<KioskSession | null>(null);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [clockDialogOpen, setClockDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Setup form state
  const [deviceId, setDeviceId] = useState('');
  const [locationName, setLocationName] = useState('');
  const [requiresPhoto, setRequiresPhoto] = useState(true);
  const [requiresPin, setRequiresPin] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(12);
  
  // Clock form state
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeePin, setEmployeePin] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);

  // Fetch active employees from the backend
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['/api/users/active'],
    enabled: isKioskActive,
  });

  // Create kiosk session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: {
      deviceId: string;
      locationId: number;
      locationName: string;
      requiresPhoto: boolean;
      requiresPin: boolean;
      expiresInHours: number;
    }) => {
      return apiRequest('/api/time/kiosk/session', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          platform: navigator.platform,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
    },
    onSuccess: (data) => {
      setCurrentSession(data);
      setIsKioskActive(true);
      localStorage.setItem('kioskSession', JSON.stringify(data));
      toast({
        title: 'Kiosk mode activated',
        description: `Session expires at ${format(new Date(data.expiresAt), 'MMM dd, HH:mm')}`,
      });
      setSetupDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create kiosk session',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Clock in/out mutation
  const clockMutation = useMutation({
    mutationFn: async (data: {
      employeeId: number;
      clockType: string;
      pin?: string;
      photo?: string;
    }) => {
      if (!currentSession) {
        throw new Error('No active kiosk session');
      }
      
      return apiRequest('/api/time/kiosk/clock', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: currentSession.sessionToken,
          employeeId: data.employeeId,
          clockType: data.clockType,
          pin: data.pin,
          photo: data.photo,
        }),
      });
    },
    onSuccess: (data) => {
      toast({
        title: data.message,
        description: `Recorded at ${format(new Date(data.timestamp), 'MMM dd, HH:mm:ss')}`,
      });
      setClockDialogOpen(false);
      setSelectedEmployee(null);
      setEmployeePin('');
      setCapturedPhoto(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Clock operation failed',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (!currentSession) {
        throw new Error('No active session');
      }
      
      return apiRequest('/api/time/kiosk/logout', {
        method: 'POST',
        body: JSON.stringify({
          sessionToken: currentSession.sessionToken,
        }),
      });
    },
    onSuccess: () => {
      setIsKioskActive(false);
      setCurrentSession(null);
      localStorage.removeItem('kioskSession');
      toast({
        title: 'Kiosk mode deactivated',
        description: 'Session has been terminated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to logout',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Load saved session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('kioskSession');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      // Check if session is still valid
      if (new Date(session.expiresAt) > new Date()) {
        setCurrentSession(session);
        setIsKioskActive(true);
      } else {
        localStorage.removeItem('kioskSession');
      }
    }

    // Generate device ID if not exists
    let storedDeviceId = localStorage.getItem('kioskDeviceId');
    if (!storedDeviceId) {
      storedDeviceId = `KIOSK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      localStorage.setItem('kioskDeviceId', storedDeviceId);
    }
    setDeviceId(storedDeviceId);
  }, []);

  const handleStartKiosk = () => {
    setSetupDialogOpen(true);
  };

  const handleCreateSession = () => {
    createSessionMutation.mutate({
      deviceId,
      locationId: 1, // Would come from location selector
      locationName,
      requiresPhoto,
      requiresPin,
      expiresInHours,
    });
  };

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    setClockDialogOpen(true);
  };

  const handleClock = (clockType: string) => {
    if (!selectedEmployee) return;

    clockMutation.mutate({
      employeeId: selectedEmployee.id,
      clockType,
      pin: requiresPin ? employeePin : undefined,
      photo: requiresPhoto ? capturedPhoto || undefined : undefined,
    });
  };

  const handleCapturePhoto = () => {
    setShowPhotoCapture(true);
  };

  const handlePhotoCaptureComplete = (photoData: string, captureMethod: string) => {
    setCapturedPhoto(photoData);
    setShowPhotoCapture(false);
    toast({
      title: 'Photo captured',
      description: `Photo has been captured via ${captureMethod}`,
    });
  };

  const filteredEmployees = (employees || []).filter((emp: any) =>
    (emp.name?.toLowerCase() || '').includes(employeeSearch.toLowerCase()) ||
    (emp.username?.toLowerCase() || '').includes(employeeSearch.toLowerCase()) ||
    (emp.employeeNumber?.toLowerCase() || '').includes(employeeSearch.toLowerCase())
  );

  if (isKioskActive && currentSession) {
    // Kiosk Mode Interface
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Monitor className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Time Clock Kiosk</h1>
              <p className="text-gray-600">{locationName || 'Main Office'}</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            className="bg-white"
            data-testid="button-kiosk-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Exit Kiosk
          </Button>
        </div>

        {/* Session Info */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Session Status</p>
                  <p className="font-semibold text-green-600">Active</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Expires At</p>
                  <p className="font-semibold">{format(new Date(currentSession.expiresAt), 'HH:mm')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Photo Required</p>
                  <p className="font-semibold">{currentSession.kioskSettings.requiresPhoto ? 'Yes' : 'No'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">PIN Required</p>
                  <p className="font-semibold">{currentSession.kioskSettings.requiresPin ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Search */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Label htmlFor="search">Search by name or ID</Label>
              <Input
                id="search"
                placeholder="Enter employee name or ID..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="text-lg"
                data-testid="input-employee-search"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {filteredEmployees.map((employee) => (
                <Card
                  key={employee.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleEmployeeSelect(employee)}
                  data-testid={`card-employee-${employee.id}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{employee.name}</h3>
                        <p className="text-sm text-gray-600">{employee.employeeId}</p>
                      </div>
                      <Users className="h-12 w-12 text-gray-300" />
                    </div>
                    {employee.lastClock && (
                      <div className="mt-4 p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-600">Last Action:</p>
                        <p className="text-sm font-medium">
                          {employee.lastClock.type === 'clock_in' ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Clocked In
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600">
                              <XCircle className="h-3 w-3" />
                              Clocked Out
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Clock Dialog */}
        <Dialog open={clockDialogOpen} onOpenChange={setClockDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Clock In/Out</DialogTitle>
              <DialogDescription>
                {selectedEmployee?.name} ({selectedEmployee?.employeeId})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {currentSession?.kioskSettings.requiresPhoto && (
                <div>
                  <Label>Photo Verification</Label>
                  <div className="mt-2 flex gap-2">
                    {capturedPhoto ? (
                      <div className="w-32 h-32 bg-gray-200 rounded flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={handleCapturePhoto}
                        className="w-full"
                        data-testid="button-capture-photo"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Capture Photo
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {currentSession?.kioskSettings.requiresPin && (
                <div>
                  <Label htmlFor="pin">Enter PIN</Label>
                  <Input
                    id="pin"
                    type="password"
                    placeholder="Enter 4-digit PIN"
                    value={employeePin}
                    onChange={(e) => setEmployeePin(e.target.value)}
                    maxLength={4}
                    data-testid="input-employee-pin"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  size="lg"
                  variant="default"
                  onClick={() => handleClock('clock_in')}
                  disabled={
                    (currentSession?.kioskSettings.requiresPhoto && !capturedPhoto) ||
                    (currentSession?.kioskSettings.requiresPin && !employeePin) ||
                    selectedEmployee?.lastClock?.type === 'clock_in'
                  }
                  data-testid="button-clock-in"
                >
                  Clock In
                </Button>
                <Button
                  className="flex-1"
                  size="lg"
                  variant="destructive"
                  onClick={() => handleClock('clock_out')}
                  disabled={
                    (currentSession?.kioskSettings.requiresPhoto && !capturedPhoto) ||
                    (currentSession?.kioskSettings.requiresPin && !employeePin) ||
                    selectedEmployee?.lastClock?.type === 'clock_out'
                  }
                  data-testid="button-clock-out"
                >
                  Clock Out
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setClockDialogOpen(false);
                  setSelectedEmployee(null);
                  setEmployeePin('');
                  setCapturedPhoto(null);
                }}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Admin Setup Interface
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Kiosk Mode Management</h2>
          <p className="text-muted-foreground">
            Set up shared devices for employee time tracking
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kiosk Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-6 border rounded-lg">
            <div className="flex items-center gap-4">
              <Monitor className="h-12 w-12 text-gray-400" />
              <div>
                <h3 className="text-lg font-semibold">No Active Kiosk Session</h3>
                <p className="text-sm text-gray-600">
                  Start a kiosk session to enable time clock on this device
                </p>
              </div>
            </div>
            <Button onClick={handleStartKiosk} size="lg" data-testid="button-start-kiosk">
              <Monitor className="h-4 w-4 mr-2" />
              Start Kiosk Mode
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Device Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Device ID</Label>
              <p className="font-mono text-sm mt-1">{deviceId}</p>
            </div>
            <div>
              <Label>Platform</Label>
              <p className="text-sm mt-1">{navigator.platform}</p>
            </div>
            <div>
              <Label>Screen Resolution</Label>
              <p className="text-sm mt-1">{window.screen.width}x{window.screen.height}</p>
            </div>
            <div>
              <Label>Timezone</Label>
              <p className="text-sm mt-1">{Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Kiosk Mode</DialogTitle>
            <DialogDescription>
              Set up this device as a time clock kiosk
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="location">Location Name *</Label>
              <Input
                id="location"
                placeholder="e.g., Main Office, Warehouse A"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                data-testid="input-location-name"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Photo Verification</Label>
                <p className="text-sm text-muted-foreground">
                  Employees must take a photo when clocking
                </p>
              </div>
              <Switch
                checked={requiresPhoto}
                onCheckedChange={setRequiresPhoto}
                data-testid="switch-requires-photo"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require PIN Entry</Label>
                <p className="text-sm text-muted-foreground">
                  Employees must enter their PIN
                </p>
              </div>
              <Switch
                checked={requiresPin}
                onCheckedChange={setRequiresPin}
                data-testid="switch-requires-pin"
              />
            </div>

            <div>
              <Label htmlFor="expires">Session Duration (hours)</Label>
              <Input
                id="expires"
                type="number"
                min="1"
                max="24"
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(parseInt(e.target.value) || 12)}
                data-testid="input-expires-hours"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold">Location-Based Tracking</p>
                  <p className="mt-1">
                    This kiosk will track clock events at the specified location.
                    GPS verification may be enforced based on your organization's policies.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateSession}
              disabled={!locationName || createSessionMutation.isPending}
              data-testid="button-create-session"
            >
              {createSessionMutation.isPending ? 'Creating...' : 'Activate Kiosk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Capture Dialog - Real camera integration */}
      <PhotoCapture
        isOpen={showPhotoCapture}
        onClose={() => setShowPhotoCapture(false)}
        onCapture={handlePhotoCaptureComplete}
        title="Kiosk Photo Verification"
      />
    </div>
  );
}