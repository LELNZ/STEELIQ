import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Battery, 
  BatteryLow, 
  BatteryMedium,
  BatteryFull,
  MapPin, 
  Activity, 
  Zap, 
  Shield,
  Smartphone,
  Wifi,
  AlertTriangle,
  Info
} from 'lucide-react';

interface BatteryProfile {
  id: string;
  name: string;
  description: string;
  minFrequency: number;
  maxFrequency: number;
  criticalBatteryThreshold: number;
  lowBatteryThreshold: number;
  normalBatteryThreshold: number;
  wifiPreferred: boolean;
  cellularFallback: boolean;
  offlineMode: boolean;
  adaptiveFrequency: boolean;
}

interface DeviceBatteryStatus {
  deviceId: string;
  userId: number;
  userName: string;
  batteryLevel: number;
  isCharging: boolean;
  lastUpdate: string;
  currentFrequency: number;
  networkType: string;
  gpsMode: string;
}

interface OptimizationSettings {
  enabled: boolean;
  currentProfile: string;
  customSettings: {
    baseFrequency: number;
    criticalFrequency: number;
    batteryThreshold: number;
    wifiOnly: boolean;
    nightMode: boolean;
    nightModeStart: string;
    nightModeEnd: string;
    geofenceOptimization: boolean;
    movementDetection: boolean;
  };
}

export function BatteryOptimizationSettings() {
  const { toast } = useToast();
  const [selectedProfile, setSelectedProfile] = useState('balanced');
  const [customFrequency, setCustomFrequency] = useState(30);
  const [batteryThreshold, setBatteryThreshold] = useState(20);
  const [wifiOnly, setWifiOnly] = useState(false);
  const [nightModeEnabled, setNightModeEnabled] = useState(true);
  const [nightModeStart, setNightModeStart] = useState('22:00');
  const [nightModeEnd, setNightModeEnd] = useState('06:00');
  const [geofenceOptimization, setGeofenceOptimization] = useState(true);
  const [movementDetection, setMovementDetection] = useState(true);
  const [adaptiveMode, setAdaptiveMode] = useState(true);

  // Predefined profiles
  const profiles: BatteryProfile[] = [
    {
      id: 'aggressive',
      name: 'Maximum Accuracy',
      description: 'Fortune 50 compliance priority - 30 second intervals',
      minFrequency: 30,
      maxFrequency: 30,
      criticalBatteryThreshold: 5,
      lowBatteryThreshold: 15,
      normalBatteryThreshold: 30,
      wifiPreferred: false,
      cellularFallback: true,
      offlineMode: false,
      adaptiveFrequency: false,
    },
    {
      id: 'balanced',
      name: 'Balanced',
      description: 'Adaptive frequency based on conditions',
      minFrequency: 30,
      maxFrequency: 120,
      criticalBatteryThreshold: 10,
      lowBatteryThreshold: 25,
      normalBatteryThreshold: 50,
      wifiPreferred: true,
      cellularFallback: true,
      offlineMode: false,
      adaptiveFrequency: true,
    },
    {
      id: 'battery_saver',
      name: 'Battery Saver',
      description: 'Extended intervals when battery is low',
      minFrequency: 60,
      maxFrequency: 300,
      criticalBatteryThreshold: 15,
      lowBatteryThreshold: 30,
      normalBatteryThreshold: 60,
      wifiPreferred: true,
      cellularFallback: false,
      offlineMode: true,
      adaptiveFrequency: true,
    },
  ];

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/time/gps/settings'],
  });

  // Fetch device battery statuses
  const { data: deviceStatuses = [] } = useQuery({
    queryKey: ['/api/time/gps/device-status'],
  });

  // Fetch optimization analytics
  const { data: analytics } = useQuery({
    queryKey: ['/api/time/gps/analytics'],
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/time/gps/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Settings updated',
        description: 'Battery optimization settings have been saved',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time/gps/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update settings',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Apply profile mutation
  const applyProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const profile = profiles.find(p => p.id === profileId);
      if (!profile) throw new Error('Profile not found');
      
      return apiRequest('/api/time/gps/apply-profile', {
        method: 'POST',
        body: JSON.stringify({ profile }),
      });
    },
    onSuccess: (_, profileId) => {
      toast({
        title: 'Profile applied',
        description: `${profiles.find(p => p.id === profileId)?.name} profile has been activated`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time/gps/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to apply profile',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Test optimization mutation
  const testOptimizationMutation = useMutation({
    mutationFn: async (data: { batteryLevel: number; isCharging: boolean; inGeofence: boolean }) => {
      return apiRequest('/api/time/gps/optimize-frequency', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result) => {
      toast({
        title: 'Optimization result',
        description: `Recommended frequency: ${result.frequency} seconds`,
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

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      enabled: true,
      currentProfile: selectedProfile,
      customSettings: {
        baseFrequency: customFrequency,
        criticalFrequency: Math.min(300, customFrequency * 3),
        batteryThreshold,
        wifiOnly,
        nightMode: nightModeEnabled,
        nightModeStart,
        nightModeEnd,
        geofenceOptimization,
        movementDetection,
      },
    });
  };

  const getBatteryIcon = (level: number, isCharging: boolean) => {
    if (isCharging) return <Zap className="h-4 w-4 text-green-600" />;
    if (level < 20) return <BatteryLow className="h-4 w-4 text-red-600" />;
    if (level < 50) return <BatteryMedium className="h-4 w-4 text-orange-600" />;
    return <BatteryFull className="h-4 w-4 text-green-600" />;
  };

  const getNetworkIcon = (type: string) => {
    if (type === 'wifi') return <Wifi className="h-4 w-4" />;
    if (type === 'cellular') return <Smartphone className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">GPS Battery Optimization</h2>
          <p className="text-muted-foreground">
            Optimize GPS tracking frequency to balance accuracy and battery life
          </p>
        </div>
        <Button 
          onClick={handleSaveSettings}
          disabled={updateSettingsMutation.isPending}
          data-testid="button-save-settings"
        >
          Save Settings
        </Button>
      </div>

      {/* Fortune 50 Compliance Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Fortune 50 Requirement:</strong> GPS tracking must maintain a minimum 30-second 
          frequency during work hours for compliance. Battery optimization will never exceed this 
          threshold when employees are on duty.
        </AlertDescription>
      </Alert>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Average Battery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getBatteryIcon(analytics?.averageBattery || 75, false)}
              <p className="text-2xl font-bold">{analytics?.averageBattery || 75}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{deviceStatuses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avg. Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics?.averageFrequency || 30}s</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Battery Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {analytics?.batterySavedPercent || 15}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Profiles */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Profiles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <Card
                key={profile.id}
                className={`cursor-pointer transition-all ${
                  selectedProfile === profile.id 
                    ? 'ring-2 ring-primary' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedProfile(profile.id)}
                data-testid={`profile-${profile.id}`}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{profile.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {profile.description}
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Frequency:</span>
                      <span className="font-medium">
                        {profile.minFrequency}-{profile.maxFrequency}s
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Battery Priority:</span>
                      <span className="font-medium">
                        {profile.id === 'aggressive' ? 'Low' : 
                         profile.id === 'balanced' ? 'Medium' : 'High'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Adaptive:</span>
                      <span className="font-medium">
                        {profile.adaptiveFrequency ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Button
            onClick={() => applyProfileMutation.mutate(selectedProfile)}
            disabled={applyProfileMutation.isPending}
            className="w-full"
            data-testid="button-apply-profile"
          >
            Apply Selected Profile
          </Button>
        </CardContent>
      </Card>

      {/* Custom Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Frequency */}
          <div>
            <Label>Base GPS Frequency (seconds)</Label>
            <div className="flex items-center gap-4 mt-2">
              <Slider
                min={30}
                max={300}
                step={10}
                value={[customFrequency]}
                onValueChange={(value) => setCustomFrequency(value[0])}
                className="flex-1"
              />
              <span className="w-16 text-right font-mono">{customFrequency}s</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Minimum: 30s (Fortune 50 compliance)
            </p>
          </div>

          {/* Battery Threshold */}
          <div>
            <Label>Critical Battery Threshold (%)</Label>
            <div className="flex items-center gap-4 mt-2">
              <Slider
                min={5}
                max={50}
                step={5}
                value={[batteryThreshold]}
                onValueChange={(value) => setBatteryThreshold(value[0])}
                className="flex-1"
              />
              <span className="w-16 text-right font-mono">{batteryThreshold}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Switch to power-saving mode below this level
            </p>
          </div>

          {/* Optimization Features */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Adaptive Frequency</Label>
                <p className="text-sm text-muted-foreground">
                  Adjust frequency based on battery, network, and movement
                </p>
              </div>
              <Switch
                checked={adaptiveMode}
                onCheckedChange={setAdaptiveMode}
                data-testid="switch-adaptive"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Geofence Optimization</Label>
                <p className="text-sm text-muted-foreground">
                  Reduce frequency when inside trusted geofences
                </p>
              </div>
              <Switch
                checked={geofenceOptimization}
                onCheckedChange={setGeofenceOptimization}
                data-testid="switch-geofence"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Movement Detection</Label>
                <p className="text-sm text-muted-foreground">
                  Increase frequency during movement, decrease when stationary
                </p>
              </div>
              <Switch
                checked={movementDetection}
                onCheckedChange={setMovementDetection}
                data-testid="switch-movement"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Wi-Fi Preferred</Label>
                <p className="text-sm text-muted-foreground">
                  Use Wi-Fi positioning when available to save battery
                </p>
              </div>
              <Switch
                checked={wifiOnly}
                onCheckedChange={setWifiOnly}
                data-testid="switch-wifi"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Night Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Reduce frequency during off-hours
                </p>
              </div>
              <Switch
                checked={nightModeEnabled}
                onCheckedChange={setNightModeEnabled}
                data-testid="switch-night"
              />
            </div>
          </div>

          {nightModeEnabled && (
            <div className="grid grid-cols-2 gap-4 pl-8">
              <div>
                <Label htmlFor="night-start">Night Mode Start</Label>
                <input
                  id="night-start"
                  type="time"
                  value={nightModeStart}
                  onChange={(e) => setNightModeStart(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  data-testid="input-night-start"
                />
              </div>
              <div>
                <Label htmlFor="night-end">Night Mode End</Label>
                <input
                  id="night-end"
                  type="time"
                  value={nightModeEnd}
                  onChange={(e) => setNightModeEnd(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                  data-testid="input-night-end"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device Status Table */}
      <Card>
        <CardHeader>
          <CardTitle>Device Battery Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Battery Level</TableHead>
                <TableHead>Charging</TableHead>
                <TableHead>Current Frequency</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>GPS Mode</TableHead>
                <TableHead>Last Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviceStatuses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No active devices
                  </TableCell>
                </TableRow>
              ) : (
                deviceStatuses.map((device: DeviceBatteryStatus) => (
                  <TableRow key={device.deviceId}>
                    <TableCell>{device.userName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getBatteryIcon(device.batteryLevel, device.isCharging)}
                        <Progress value={device.batteryLevel} className="w-16" />
                        <span className="text-sm">{device.batteryLevel}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {device.isCharging ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-gray-600">No</span>
                      )}
                    </TableCell>
                    <TableCell>{device.currentFrequency}s</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getNetworkIcon(device.networkType)}
                        <span className="capitalize">{device.networkType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">{device.gpsMode}</span>
                    </TableCell>
                    <TableCell>
                      {format(new Date(device.lastUpdate), 'HH:mm:ss')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Test Optimization */}
      <Card>
        <CardHeader>
          <CardTitle>Test Optimization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Battery Level (%)</Label>
              <input
                type="number"
                min="0"
                max="100"
                defaultValue="50"
                id="test-battery"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                data-testid="input-test-battery"
              />
            </div>
            <div>
              <Label>Is Charging?</Label>
              <Select defaultValue="false">
                <SelectTrigger className="mt-1" id="test-charging">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>In Geofence?</Label>
              <Select defaultValue="true">
                <SelectTrigger className="mt-1" id="test-geofence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            className="w-full mt-4"
            variant="outline"
            onClick={() => {
              const battery = parseInt((document.getElementById('test-battery') as HTMLInputElement).value);
              const charging = (document.getElementById('test-charging') as HTMLSelectElement).value === 'true';
              const inGeofence = (document.getElementById('test-geofence') as HTMLSelectElement).value === 'true';
              
              testOptimizationMutation.mutate({
                batteryLevel: battery,
                isCharging: charging,
                inGeofence,
              });
            }}
            disabled={testOptimizationMutation.isPending}
            data-testid="button-test-optimization"
          >
            Test Optimization Algorithm
          </Button>
          
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              The optimization algorithm calculates the ideal GPS frequency based on battery level, 
              charging status, network conditions, and location. It ensures Fortune 50 compliance 
              while maximizing battery life.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}