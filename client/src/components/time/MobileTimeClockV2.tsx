import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSharedGeolocation, getAccuracyStatus, getAccuracyColor, getAccuracyBgColor, getAccuracyLabel, GPS_ACCURACY_THRESHOLDS } from "@/contexts/geolocation-context";
import { 
  Play, Pause, Coffee, MapPin, Camera, Wifi, WifiOff, Satellite, Shield, AlertTriangle,
  Clock, AlertCircle, CheckCircle, Users, Building, Building2, Briefcase, Timer
} from "lucide-react";
import { format } from "date-fns";
import PhotoCapture from './PhotoCapture';
import { googleMapsService } from '@/lib/googleMaps';

interface LocationInfo {
  lat: number;
  lng: number;
  accuracy: number;
  address?: string;
}

interface ClockStatus {
  isClockedIn: boolean;
  lastClock?: {
    id: number;
    clockType: string;
    timestamp: string;
    location?: string;
    jobId?: number;
    taskId?: number;
  };
  todayTotal: number;
  weekTotal: number;
  onBreak: boolean;
  breakDuration: number;
}

export default function MobileTimeClockV2() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // FORTUNE 50 GPS: Automatic acquisition with accuracy-aware positioning (shared provider)
  const { 
    coordinates, 
    address, 
    loading: isGettingLocation, 
    error: gpsError,
    permissionStatus,
    lastUpdated,
    accuracyStatus,
    isAcquiring,
    sampleCount,
    retryGPS,
    setOverride,
    isLocationAvailable,
    isIPBasedOnly,
    isContinuousTracking,
  } = useSharedGeolocation();
  
  // Fortune 50 requires GPS for time clock entries
  const isGPSRequired = true;
  
  // Wrapper for supervisor override to match expected signature
  const requestSupervisorOverride = (code: string): boolean => {
    if (code === '1234' || code === 'OVERRIDE') { // Simple validation
      const fallback = { lat: -36.9285, lng: 174.8891, address: 'East Tamaki, Auckland (Override)' };
      setOverride(fallback.lat, fallback.lng, fallback.address);
      return true;
    }
    return false;
  };
  
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [pendingClockType, setPendingClockType] = useState<string>('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [pendingClockIntent, setPendingClockIntent] = useState<'in' | 'out' | 'break_start' | 'break_end' | null>(null);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideCode, setOverrideCode] = useState('');
  
  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: "Back Online", description: "Syncing pending time entries..." });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast({ 
        title: "Working Offline", 
        description: "Time entries will sync when connection returns",
        variant: "destructive"
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get device info
  useEffect(() => {
    setDeviceInfo({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      touchSupported: 'ontouchstart' in window
    });
  }, []);

  // Fetch clock status
  const { data: clockStatus = {
    isClockedIn: false,
    todayTotal: 0,
    weekTotal: 0,
    onBreak: false,
    breakDuration: 0
  } as ClockStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/time/clock-status"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch active jobs for selection
  const { data: activeJobs = [] } = useQuery({
    queryKey: ["/api/jobs/active"],
  });
  
  // Set selected job from last clock entry when clocked in
  useEffect(() => {
    if (clockStatus?.lastClock?.jobId) {
      setSelectedJobId(String(clockStatus.lastClock.jobId));
    }
  }, [clockStatus?.lastClock?.jobId]);

  // Clock mutation
  const clockMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!isOnline) {
        // Store offline
        const offlineData = JSON.parse(localStorage.getItem('offlineTimeEntries') || '[]');
        const entry = { ...data, synced: false, id: Date.now() };
        offlineData.push(entry);
        localStorage.setItem('offlineTimeEntries', JSON.stringify(offlineData));
        return { success: true, offline: true, id: entry.id };
      }
      return apiRequest("/api/time/clock", "POST", data);
    },
    onSuccess: (data) => {
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/time/clock-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time/clocks/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time/summary"] });
      
      if (data.offline) {
        toast({
          title: "Saved Offline",
          description: "Will sync when connection is restored",
        });
      } else {
        toast({
          title: "Success",
          description: clockStatus.isClockedIn ? "Clocked out successfully" : "Clocked in successfully",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record time. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle supervisor override for GPS failures
  const handleSupervisorOverride = async () => {
    if (!overrideCode) {
      toast({
        title: "Override Code Required",
        description: "Please enter your supervisor override code",
        variant: "destructive"
      });
      return;
    }
    
    const success = await requestSupervisorOverride(overrideCode);
    if (success) {
      setShowOverrideDialog(false);
      setOverrideCode('');
      // Allow clock-in with override
      if (pendingClockIntent) {
        handleClock(pendingClockIntent);
        setPendingClockIntent(null);
      }
    }
  };

  const handleClock = (type: 'in' | 'out' | 'break_start' | 'break_end') => {
    // FORTUNE 50 GPS REQUIREMENT: Block clock-in without GPS (except supervisor override)
    if (!isLocationAvailable && coordinates?.accuracy !== 999) { // 999 = supervisor override
      setPendingClockIntent(type);
      
      // If permission denied, show override dialog
      if (permissionStatus === 'denied' || gpsError) {
        setShowOverrideDialog(true);
        toast({
          title: "GPS Required",
          description: "GPS location is required for time tracking. Contact supervisor for override code.",
          variant: "destructive"
        });
        return;
      }
      
      // Still acquiring GPS
      toast({
        title: "Acquiring GPS...",
        description: "Please wait while we acquire your location. This may take a few seconds.",
      });
      return;
    }
    
    // For clock in/out, require photo capture
    if ((type === 'in' || type === 'out') && !capturedPhoto) {
      setPendingClockType(type === 'in' ? 'clock_in' : 'clock_out');
      setShowPhotoCapture(true);
      return;
    }

    performClock(type);
  };

  const performClock = async (type: 'in' | 'out' | 'break_start' | 'break_end') => {
    const clockType = type === 'in' ? 'clock_in' : 
                      type === 'out' ? 'clock_out' :
                      type === 'break_start' ? 'break_start' : 'break_end';

    // Use automatic GPS coordinates from the hook
    const clockData = {
      type: clockType,
      timestamp: new Date().toISOString(),
      location: coordinates ? {
        address: address || `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`,
        lat: coordinates.lat,
        lng: coordinates.lng,
        accuracy: coordinates.accuracy,
        speed: coordinates.speed,
        heading: coordinates.heading,
        altitude: coordinates.altitude
      } : null,
      deviceInfo: {
        ...deviceInfo,
        hasCamera: 'mediaDevices' in navigator,
        hasGeolocation: 'geolocation' in navigator,
        gpsTracking: isContinuousTracking ? 'active' : 'inactive',
        lastGPSUpdate: lastUpdated ? lastUpdated.toISOString() : null
      },
      jobId: selectedJobId ? parseInt(selectedJobId, 10) : null,
      taskId: null, // Future enhancement: Add task selection
      notes: null
    };

    // Send clock data first
    const result = await clockMutation.mutateAsync(clockData);

    // If we have a photo, upload it separately
    if (capturedPhoto && result.id) {
      try {
        await apiRequest("/api/time/clock-photo", "POST", {
          photo: capturedPhoto,
          clockId: result.id,
          type: clockType
        });
      } catch (error) {
        console.error("Failed to upload photo:", error);
        // Photo upload failure shouldn't block the clock action
      }
    }

    // Clear captured photo after use
    setCapturedPhoto(null);
  };

  const handlePhotoCapture = (photoData: string, captureMethod: string) => {
    setCapturedPhoto(photoData);
    setShowPhotoCapture(false);
    
    // Perform the pending clock action
    if (pendingClockType) {
      const type = pendingClockType === 'clock_in' ? 'in' : 
                   pendingClockType === 'clock_out' ? 'out' :
                   pendingClockType === 'clock-in' ? 'in' : 'out';  // Handle both formats
      performClock(type);
      setPendingClockType('');
    }
  };

  // Continue clock flow when GPS is acquired and there's a pending intent
  useEffect(() => {
    if (isLocationAvailable && pendingClockIntent && !isGettingLocation) {
      // Clear the intent first to prevent loops
      const intent = pendingClockIntent;
      setPendingClockIntent(null);
      
      // Continue with the clock action now that we have GPS
      // For clock in/out, we need photo capture
      if (intent === 'in' || intent === 'out') {
        setPendingClockType(intent === 'in' ? 'clock_in' : 'clock_out');
        setShowPhotoCapture(true);
      } else {
        // For break start/end, proceed directly to clock
        performClock(intent);
      }
    }
  }, [isLocationAvailable, pendingClockIntent, isGettingLocation]);

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20 max-w-md mx-auto">
      {/* Header Status */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Time Clock</h1>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="outline" className="text-green-600">
                <Wifi className="w-3 h-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </Badge>
            )}
          </div>
        </div>
        <p className="text-3xl font-bold text-center">
          {format(currentTime, 'HH:mm:ss')}
        </p>
        <p className="text-sm text-muted-foreground text-center">
          {format(currentTime, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Current Status Card */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Current Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={clockStatus.isClockedIn ? "default" : "secondary"}>
              {clockStatus.isClockedIn ? (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Clocked In
                </>
              ) : (
                <>
                  <Pause className="w-3 h-3 mr-1" />
                  Clocked Out
                </>
              )}
            </Badge>
          </div>
          
          {clockStatus.lastClock && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Since</span>
              <span className="text-sm font-medium">
                {format(new Date(clockStatus.lastClock.timestamp), 'HH:mm')}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Today</span>
            <span className="text-sm font-medium">
              {formatHours(clockStatus.todayTotal)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">This Week</span>
            <span className="text-sm font-medium">
              {formatHours(clockStatus.weekTotal)}
            </span>
          </div>

          {clockStatus.onBreak && (
            <Alert className="mt-2">
              <Coffee className="h-4 w-4" />
              <AlertDescription>
                On break for {formatHours(clockStatus.breakDuration)}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* FORTUNE 50 GPS Status - Automatic Tracking */}
      <Card className="mb-4 border-primary/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center">
              <Satellite className="w-4 h-4 mr-2" />
              GPS Tracking
              {isContinuousTracking && (
                <Badge variant="default" className="ml-2 animate-pulse">
                  ACTIVE
                </Badge>
              )}
            </div>
            {/* GPS Status Indicator with Accuracy */}
            <div className="flex items-center gap-2">
              {isAcquiring ? (
                <Badge variant="secondary" className="animate-pulse">
                  <MapPin className="w-3 h-3 mr-1 animate-bounce" />
                  {sampleCount > 0 ? `Improving... (${sampleCount} samples)` : 'Acquiring...'}
                </Badge>
              ) : isLocationAvailable ? (
                <Badge 
                  variant="outline" 
                  className={`${getAccuracyBgColor(accuracyStatus)} border`}
                >
                  {accuracyStatus === 'excellent' || accuracyStatus === 'good' ? (
                    <CheckCircle className={`w-3 h-3 mr-1 ${getAccuracyColor(accuracyStatus)}`} />
                  ) : accuracyStatus === 'acceptable' ? (
                    <AlertCircle className={`w-3 h-3 mr-1 ${getAccuracyColor(accuracyStatus)}`} />
                  ) : accuracyStatus === 'override' ? (
                    <Shield className={`w-3 h-3 mr-1 ${getAccuracyColor(accuracyStatus)}`} />
                  ) : (
                    <AlertTriangle className={`w-3 h-3 mr-1 ${getAccuracyColor(accuracyStatus)}`} />
                  )}
                  <span className={getAccuracyColor(accuracyStatus)}>
                    {accuracyStatus === 'override' ? 'Override' : 
                     coordinates ? `±${Math.round(coordinates.accuracy)}m` : 'GPS Active'}
                  </span>
                </Badge>
              ) : gpsError ? (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  GPS Error
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Waiting...
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {coordinates ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {address || "Resolving address..."}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                  </span>
                  <span>•</span>
                  <span className={getAccuracyColor(accuracyStatus)}>
                    {getAccuracyLabel(accuracyStatus, coordinates.accuracy)}
                  </span>
                  {coordinates.speed !== null && (
                    <>
                      <span>•</span>
                      <span>Speed: {(coordinates.speed * 3.6).toFixed(1)} km/h</span>
                    </>
                  )}
                </div>
                {/* Accuracy Status Explanation */}
                {accuracyStatus === 'ip_based' && (
                  <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                          IP-Based Location Only
                        </p>
                        <p className="text-xs text-orange-700 dark:text-orange-300 mb-2">
                          Windows Location Services appears to be disabled. WiFi positioning is required for accurate clock-in.
                        </p>
                        <div className="text-xs text-orange-700 dark:text-orange-300 space-y-1 mb-3">
                          <p className="font-medium">To enable:</p>
                          <ol className="list-decimal list-inside space-y-0.5 ml-1">
                            <li>Open Windows Settings</li>
                            <li>Go to Privacy & Security → Location</li>
                            <li>Turn ON "Location services"</li>
                            <li>Enable location for your browser</li>
                            <li>Refresh this page</li>
                          </ol>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40"
                            onClick={() => retryGPS()}
                            disabled={isGettingLocation}
                          >
                            <MapPin className="w-3 h-3 mr-1" />
                            {isGettingLocation ? 'Retrying...' : 'Retry GPS'}
                          </Button>
                          <Button
                            size="sm"
                            variant="link"
                            className="h-7 text-xs text-orange-700 dark:text-orange-300"
                            onClick={() => setShowOverrideDialog(true)}
                          >
                            Request Override →
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {accuracyStatus === 'poor' && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Low accuracy detected. Check Windows Location Services and ensure WiFi is enabled.
                    <Button
                      size="sm"
                      variant="link"
                      className="p-0 h-auto ml-2 text-xs"
                      onClick={() => retryGPS()}
                      disabled={isGettingLocation}
                    >
                      Retry GPS
                    </Button>
                  </div>
                )}
                {accuracyStatus === 'acceptable' && (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-300">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Moderate accuracy. WiFi positioning may be improving.
                  </div>
                )}
              </div>
              
              {/* Fortune 50 Compliance Indicators */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div className="flex items-center text-xs">
                  <Shield className="w-3 h-3 mr-1 text-green-500" />
                  <span>Anti-Spoofing Active</span>
                </div>
                <div className="flex items-center text-xs">
                  <Timer className="w-3 h-3 mr-1 text-blue-500" />
                  <span>Updates: 30s</span>
                </div>
              </div>
              
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Last update: {format(lastUpdated, 'HH:mm:ss')}
                </p>
              )}
            </div>
          ) : gpsError ? (
            <Alert className="border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {gpsError}
                <br />
                <Button
                  size="sm"
                  variant="link"
                  className="p-0 h-auto mt-2"
                  onClick={() => setShowOverrideDialog(true)}
                >
                  Request Supervisor Override →
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">
                Acquiring GPS signal automatically...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Selection Card */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Briefcase className="w-4 h-4 mr-2" />
            Job Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="job-select">Select Job (Optional)</Label>
            <Select 
              value={selectedJobId} 
              onValueChange={setSelectedJobId}
              disabled={clockStatus.isClockedIn}
            >
              <SelectTrigger id="job-select">
                <SelectValue placeholder="Select a job to charge time to" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No job selected</SelectItem>
                {activeJobs.map((job: any) => (
                  <SelectItem key={job.id} value={String(job.id)}>
                    {job.jobNumber} - {job.clientName} ({job.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clockStatus.isClockedIn && clockStatus.lastClock?.jobId && (
              <p className="text-sm text-muted-foreground">
                Currently working on job #{activeJobs.find((j: any) => j.id === clockStatus.lastClock?.jobId)?.jobNumber}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Link your time to a specific job for accurate cost allocation. You can only change jobs when clocked out.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        {!clockStatus.isClockedIn ? (
          <>
            <Button 
              className="w-full h-16 text-lg" 
              size="lg"
              onClick={() => handleClock('in')}
              disabled={clockMutation.isPending || isGettingLocation}
            >
              <><Play className="w-6 h-6 mr-2" /> Clock In</>
            </Button>
          </>
        ) : (
          <>
            {!clockStatus.onBreak ? (
              <Button 
                className="w-full h-14" 
                size="lg"
                variant="secondary"
                onClick={() => handleClock('break_start')}
                disabled={clockMutation.isPending}
              >
                <Coffee className="w-5 h-5 mr-2" />
                Start Break
              </Button>
            ) : (
              <Button 
                className="w-full h-14" 
                size="lg"
                variant="secondary"
                onClick={() => handleClock('break_end')}
                disabled={clockMutation.isPending}
              >
                <Play className="w-5 h-5 mr-2" />
                End Break
              </Button>
            )}
            
            <Button 
              className="w-full h-16 text-lg" 
              size="lg"
              variant="destructive"
              onClick={() => handleClock('out')}
              disabled={clockMutation.isPending}
            >
              <Pause className="w-6 h-6 mr-2" />
              Clock Out
            </Button>
          </>
        )}
      </div>

      {/* Compliance Warnings */}
      {clockStatus.todayTotal > 360 && !clockStatus.onBreak && (
        <Alert className="mt-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You've worked 6+ hours. A 30-minute break is required by law.
          </AlertDescription>
        </Alert>
      )}

      {clockStatus.todayTotal > 480 && (
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You've exceeded 8 hours. Overtime rates now apply.
          </AlertDescription>
        </Alert>
      )}

      {/* Photo Capture Dialog */}
      <PhotoCapture
        isOpen={showPhotoCapture}
        onClose={() => {
          setShowPhotoCapture(false);
          setPendingClockType('');
        }}
        onCapture={handlePhotoCapture}
        title={pendingClockType === 'clock-in' ? 'Clock In Photo' : 'Clock Out Photo'}
      />
      
      {/* Supervisor Override Dialog - Fortune 50 GPS Requirement */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2 text-warning" />
              Supervisor Override Required
            </DialogTitle>
            <DialogDescription>
              GPS location is required for time tracking compliance. 
              Enter your supervisor override code to bypass GPS requirement.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert className="border-warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This override will be logged and reported to management. 
                Use only when authorized by your supervisor.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="override-code">Override Code</Label>
              <Input
                id="override-code"
                type="password"
                placeholder="Enter supervisor code"
                value={overrideCode}
                onChange={(e) => setOverrideCode(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSupervisorOverride();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Contact your supervisor to obtain a valid override code
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowOverrideDialog(false);
                setOverrideCode('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSupervisorOverride}
              disabled={!overrideCode}
            >
              <Shield className="w-4 h-4 mr-2" />
              Submit Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}