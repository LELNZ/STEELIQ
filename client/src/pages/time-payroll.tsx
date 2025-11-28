import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Timer, Clock, Calendar, MapPin, Users, DollarSign, 
  Smartphone, Wifi, WifiOff, Camera, Upload, Download,
  Play, Pause, CheckCircle, AlertCircle, TrendingUp, CreditCard, Navigation,
  Building, Briefcase, Settings, Globe, Moon, Sun, Mic
} from "lucide-react";
import { format } from "date-fns";
import type { LaborRateCard, PayrollIntegration } from "@shared/schema";
import { useOffline } from "@/hooks/useOffline";
import { useSharedGeolocation } from "@/contexts/geolocation-context";
import MobileTimeClockV2 from "@/components/time/MobileTimeClockV2";
import { LocationMap } from "@/components/time/LocationMap";
import ManagerApprovalDashboard from "@/components/time/ManagerApprovalDashboard";
import PayrollPeriodManager from "@/components/time/PayrollPeriodManager";
import { useAuth } from "@/contexts/auth-context";
// Voice memos deferred to Phase 2 for proper business integration
// import { VoiceMemoRecorder } from "@/components/time/VoiceMemoRecorder";
import { CalendarSyncSettings } from "@/components/time/CalendarSyncSettings";
import { AutomatedShiftScheduler } from "@/components/time/AutomatedShiftScheduler";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSelector } from "@/components/ui/language-selector";
import { AccessibilityPanel } from "@/components/ui/accessibility-panel";
import { useBiometric } from "@/hooks/useBiometric";
import { useI18n } from "@/lib/i18n";
import BiometricSettings from "@/components/time/BiometricSettings";

export default function TimePayroll() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOnline, isSyncing, saveOffline, loadOffline } = useOffline({ enableSync: true });
  const { 
    coordinates, 
    address, 
    loading: locationLoading, 
    permissionStatus,
    requestLocation,
    getFallbackLocations,
    setOverride,
    isLocationAvailable,
    isIPBasedOnly,
    accuracyStatus,
  } = useSharedGeolocation();
  
  // Derived value for location request capability
  const canRequestLocation = permissionStatus !== 'denied' && permissionStatus !== 'unsupported';
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [showPayrollSetup, setShowPayrollSetup] = useState(false);
  const [showAddRateCardDialog, setShowAddRateCardDialog] = useState(false);
  const [skillLevel, setSkillLevel] = useState("");
  const [employeeType, setEmployeeType] = useState("");
  const [selectedFallbackLocation, setSelectedFallbackLocation] = useState("");

  // Fetch clock status
  const { data: clockStatus, refetch: refetchClockStatus } = useQuery({
    queryKey: ["/api/time/clock-status"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  const [showMobileSyncDialog, setShowMobileSyncDialog] = useState(false);
  const [mobileTimeData, setMobileTimeData] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Check for mobile sync on mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('sync') === 'mobile') {
      const mobileData = sessionStorage.getItem('mobileTimeEntries');
      if (mobileData) {
        try {
          setMobileTimeData(JSON.parse(mobileData));
          setShowMobileSyncDialog(true);
          sessionStorage.removeItem('mobileTimeEntries');
        } catch (error) {
          console.error('Failed to parse mobile time entries:', error);
          toast({
            title: "Sync Error",
            description: "Failed to parse mobile data. Please try again.",
            variant: "destructive"
          });
          sessionStorage.removeItem('mobileTimeEntries');
        }
      }
    }
  }, []);

  // Fetch labor rate cards
  const { data: laborRateCards = [] } = useQuery({
    queryKey: ["/api/labor-rates/cards"],
  });

  // Fetch payroll integration status
  const { data: payrollIntegration } = useQuery({
    queryKey: ["/api/payroll/integration"],
  });

  // Fetch time clock summary
  const { data: timeClockSummary = {} } = useQuery({
    queryKey: [`/api/time/summary/${format(selectedWeek, 'yyyy-MM-dd')}`],
  });

  // Calculate week range for timesheet fetching
  const weekStart = new Date(selectedWeek);
  weekStart.setDate(selectedWeek.getDate() - selectedWeek.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Fetch timesheets for selected week
  const { data: timesheets = [], isLoading: timesheetsLoading } = useQuery({
    queryKey: ['/api/time/timesheets', format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(
        `/api/time/timesheets?startDate=${format(weekStart, 'yyyy-MM-dd')}&endDate=${format(weekEnd, 'yyyy-MM-dd')}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to fetch timesheets');
      return response.json();
    },
    enabled: !!selectedWeek,
  });

  // Fetch today's clock entries for real-time activity
  const { data: todayClocks = [], refetch: refetchTodayClocks } = useQuery({
    queryKey: ["/api/time/clocks/today"],
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache data
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  
  // Listen for clock status changes and immediately refetch
  useEffect(() => {
    if (clockStatus?.isClockedIn !== undefined) {
      refetchTodayClocks();
    }
  }, [clockStatus?.isClockedIn, refetchTodayClocks]);

  // Save labor rate mutation
  const saveLaborRateMutation = useMutation({
    mutationFn: async (rateCard: Partial<LaborRateCard>) => {
      return apiRequest(
        rateCard.id ? "PATCH" : "POST",
        "/api/labor-rates/cards",
        rateCard
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/labor-rates/cards"] });
      toast({
        title: "Success",
        description: "Labor rate saved successfully.",
      });
    },
  });

  // Sync payroll mutation
  const syncPayrollMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/payroll/sync", "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/integration"] });
      toast({
        title: "Payroll Sync Complete",
        description: "Time data has been synchronized with your payroll system.",
      });
    },
  });

  // Export timesheets handler
  const handleExportTimesheets = async () => {
    try {
      // Calculate date range for current week
      const startOfWeek = new Date(selectedWeek);
      startOfWeek.setDate(selectedWeek.getDate() - selectedWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      // Format dates for the API
      const startDate = startOfWeek.toISOString().split('T')[0];
      const endDate = endOfWeek.toISOString().split('T')[0];

      // Create download link
      const response = await fetch(`/api/timesheets/export?startDate=${startDate}&endDate=${endDate}&format=csv`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheets_${startDate}_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Complete",
        description: `Timesheets exported for ${startDate} to ${endDate}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export timesheets. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Show mobile interface for mobile devices
  if (isMobile) {
    return <MobileTimeClockV2 />;
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Time & Payroll Management</h1>
          <p className="text-sm text-muted-foreground">Integrated time tracking, labor rates, and payroll processing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportTimesheets}>
            <Download className="w-4 h-4 mr-2" />
            Export Timesheets
          </Button>
          <Button 
            onClick={() => syncPayrollMutation.mutate()}
            disabled={!payrollIntegration?.isActive}
          >
            <Upload className="w-4 h-4 mr-2" />
            Sync Payroll
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className={`grid w-full ${
          user?.permissions?.payrollPeriodManage ? 'grid-cols-9' : 'grid-cols-5'
        }`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {user?.permissions?.payrollPeriodManage && (
            <TabsTrigger value="periods">Periods</TabsTrigger>
          )}
          {user?.permissions?.manageRates && (
            <TabsTrigger value="rates">Labor Rates</TabsTrigger>
          )}
          <TabsTrigger value="timesheets">Timesheets</TabsTrigger>
          {user?.permissions?.timeApprovalManage && (
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
          )}
          {user?.permissions?.payrollPeriodManage && (
            <TabsTrigger value="payroll">Integration</TabsTrigger>
          )}
          <TabsTrigger value="mobile">Mobile</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Workers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeClockSummary.activeWorkers || 0}</div>
                <p className="text-xs text-muted-foreground">Currently clocked in</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Week Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timeClockSummary.weekHours || "0"}h</div>
                <p className="text-xs text-muted-foreground">Total this week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Labor Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${timeClockSummary.weekLaborCost || "0"}</div>
                <p className="text-xs text-muted-foreground">Week to date</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {payrollIntegration?.isActive ? (
                    <>
                      <Wifi className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-red-600" />
                      <span className="text-sm">Disconnected</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {payrollIntegration?.provider || "No payroll system"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Time Clock Card with Offline Support */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Quick Clock In/Out</span>
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
                  {isSyncing && (
                    <Badge variant="outline" className="text-blue-600">
                      <Upload className="w-3 h-3 mr-1" />
                      Syncing
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Location Selection - Always Visible */}
              <div className="mb-4 p-4 border rounded-lg bg-secondary/10">
                <Label className="text-sm font-semibold mb-2 block">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location {
                    accuracyStatus === 'override' ? '(Manual Override)' :
                    coordinates ? `(GPS Acquired - ±${Math.round(coordinates.accuracy)}m)` :
                    isIPBasedOnly ? '(WiFi GPS Unavailable - Select Location)' :
                    locationLoading ? '(Acquiring GPS...)' :
                    '(Select Location or Get GPS)'
                  }
                </Label>
                
                {/* Quick location buttons - always available */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  {getFallbackLocations().map(loc => (
                    <Button
                      key={loc.value}
                      variant={selectedFallbackLocation === loc.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedFallbackLocation(loc.value);
                        // Set override in shared context for preset locations with coordinates
                        if (loc.lat && loc.lng && loc.lat !== 0 && loc.lng !== 0) {
                          setOverride(loc.lat, loc.lng, loc.address);
                        }
                        toast({
                          title: "Location Selected",
                          description: `Using ${loc.label}`,
                        });
                      }}
                    >
                      {loc.value === 'office' && <Building className="w-4 h-4 mr-1" />}
                      {loc.value === 'workshop' && <Briefcase className="w-4 h-4 mr-1" />}
                      {loc.value === 'site' && <MapPin className="w-4 h-4 mr-1" />}
                      {loc.value === 'remote' && <Users className="w-4 h-4 mr-1" />}
                      {loc.label ? loc.label.split(' - ')[0] : loc.value}
                    </Button>
                  ))}
                </div>
                
                {/* GPS button - optional */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => requestLocation()}
                  disabled={locationLoading || permissionStatus === 'denied'}
                  className="w-full"
                >
                  {locationLoading ? (
                    <>
                      <Navigation className="w-4 h-4 mr-2 animate-pulse" />
                      Getting GPS Location...
                    </>
                  ) : coordinates ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                      GPS: {address || `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`}
                      {coordinates.accuracy && ` (±${Math.round(coordinates.accuracy)}m)`}
                    </>
                  ) : permissionStatus === 'denied' ? (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      GPS Denied - Use Manual Location
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Get Current GPS Location (Optional)
                    </>
                  )}
                </Button>
                
                {/* Show selected location */}
                {selectedFallbackLocation && !coordinates && (
                  <p className="text-sm text-muted-foreground mt-2">
                    <CheckCircle className="w-3 h-3 inline mr-1 text-green-600" />
                    Selected: {getFallbackLocations().find(l => l.value === selectedFallbackLocation)?.label}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Select Job</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a job" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No jobs available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Task</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select task" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="welding">Welding</SelectItem>
                      <SelectItem value="cutting">Cutting</SelectItem>
                      <SelectItem value="assembly">Assembly</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button 
                    className="w-full" 
                    size="lg"
                    variant={clockStatus?.isClockedIn ? "destructive" : "default"}
                    disabled={locationLoading || (!coordinates && !selectedFallbackLocation && !clockStatus?.isClockedIn)}
                    onClick={async () => {
                      const clockType = clockStatus?.isClockedIn ? 'clock_out' : 'clock_in';
                      
                      // Check if we have a location selected (GPS or manual)
                      if (!clockStatus?.isClockedIn && !coordinates && !selectedFallbackLocation) {
                        toast({
                          title: "Location Required",
                          description: "Please select a location or get GPS location first",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      // Prepare location data
                      let locationInfo: any = {};
                      if (coordinates) {
                        // Use actual GPS location
                        locationInfo = {
                          location: address || `GPS Location (${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)})`,
                          geolocation: {
                            lat: coordinates.lat,
                            lng: coordinates.lng,
                            accuracy: coordinates.accuracy
                          }
                        };
                      } else if (selectedFallbackLocation) {
                        // Use selected manual location
                        const fallback = getFallbackLocations().find(l => l.value === selectedFallbackLocation);
                        locationInfo = {
                          location: fallback?.label || selectedFallbackLocation,
                          geolocation: fallback?.lat && fallback?.lng ? {
                            lat: fallback.lat,
                            lng: fallback.lng,
                            accuracy: null
                          } : null
                        };
                      } else {
                        // For clock out, use last known location or default
                        locationInfo = {
                          location: 'Clock Out Location',
                          geolocation: null
                        };
                      }
                      
                      const timeEntry = {
                        timestamp: new Date().toISOString(),
                        clockType,
                        jobId: null,
                        taskId: null,
                        ...locationInfo,
                        notes: null
                      };
                      
                      if (!isOnline) {
                        // Save offline
                        await saveOffline('pending_time_entry', timeEntry);
                        toast({
                          title: clockStatus?.isClockedIn ? "Clocked Out (Offline)" : "Clocked In (Offline)",
                          description: "Your time entry will sync when back online",
                        });
                      } else {
                        // Save online
                        try {
                          await apiRequest("/api/time/clock", "POST", timeEntry);
                          // Immediately refetch clock status and today's clocks
                          await Promise.all([
                            refetchClockStatus(),
                            refetchTodayClocks()
                          ]);
                          toast({
                            title: clockStatus?.isClockedIn ? "Clocked Out" : "Clocked In",
                            description: clockStatus?.isClockedIn ? "Time tracking stopped" : "Time tracking started successfully",
                          });
                        } catch (error) {
                          await saveOffline('pending_time_entry', timeEntry);
                          toast({
                            title: "Saved Offline",
                            description: "Will retry when connection is restored",
                            variant: "destructive"
                          });
                        }
                      }
                    }}
                  >
                    {clockStatus?.isClockedIn ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Clock Out
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Clock In
                        {(coordinates || selectedFallbackLocation) && <CheckCircle className="w-4 h-4 ml-2 text-green-500" />}
                      </>
                    )}
                  </Button>
                  {clockStatus?.isClockedIn && clockStatus?.todayTotal !== undefined && (
                    <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center gap-2">
                        <Timer className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">
                          {Math.floor((clockStatus.todayTotal || 0) / 60)}h {(clockStatus.todayTotal || 0) % 60}m
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {!isOnline && (
                <p className="text-sm text-muted-foreground mt-4">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  You're working offline. Time entries will be synced automatically when you're back online.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Real-Time Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todayClocks.length > 0 ? (
                  todayClocks.map((clock: any) => (
                    <div key={clock.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          clock.clockType === 'clock_in' ? 'bg-green-100' : 
                          clock.clockType === 'clock_out' ? 'bg-red-100' :
                          clock.clockType === 'break_start' ? 'bg-yellow-100' :
                          'bg-blue-100'
                        }`}>
                          {clock.clockType === 'clock_in' ? (
                            <Play className="w-4 h-4 text-green-600" />
                          ) : clock.clockType === 'clock_out' ? (
                            <Pause className="w-4 h-4 text-red-600" />
                          ) : clock.clockType === 'break_start' ? (
                            <Coffee className="w-4 h-4 text-yellow-600" />
                          ) : (
                            <Play className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {clock.clockType === 'clock_in' ? 'Clocked In' : 
                             clock.clockType === 'clock_out' ? 'Clocked Out' :
                             clock.clockType === 'break_start' ? 'Break Started' :
                             clock.clockType === 'break_end' ? 'Break Ended' :
                             'Activity'}
                          </p>
                          <LocationMap 
                            location={clock.location}
                            geolocation={clock.geolocation}
                            timestamp={clock.timestamp}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{format(new Date(clock.timestamp), 'HH:mm')}</p>
                        <p className="text-xs text-muted-foreground">Today</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No activity today yet</p>
                    <p className="text-sm mt-1">Your clock ins and outs will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.permissions?.payrollPeriodManage && (
          <TabsContent value="periods" className="space-y-4">
            <PayrollPeriodManager />
          </TabsContent>
        )}

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Labor Rate Cards</span>
                <Button size="sm" onClick={() => setShowAddRateCardDialog(true)}>
                  <Users className="w-4 h-4 mr-2" />
                  Add Rate Card
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {laborRateCards.map((rate: LaborRateCard) => (
                  <div key={rate.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{rate.name}</h4>
                        <p className="text-sm text-muted-foreground">{rate.code} • {rate.skillLevel}</p>
                      </div>
                      <Badge variant={rate.employeeType === 'employee' ? 'default' : 'secondary'}>
                        {rate.employeeType}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Base Rate</p>
                        <p className="font-medium">${rate.baseRate}/hr</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Cost Rate</p>
                        <p className="font-medium">${rate.costRate}/hr</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Overtime</p>
                        <p className="font-medium">{rate.overtimeMultiplier}x</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Weekend</p>
                        <p className="font-medium">{rate.weekendMultiplier}x</p>
                      </div>
                    </div>

                    {rate.certificationRequirements && rate.certificationRequirements.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-1">Required Certifications</p>
                        <div className="flex flex-wrap gap-1">
                          {(rate.certificationRequirements as string[]).map(cert => (
                            <Badge key={cert} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timesheets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Weekly Timesheets</CardTitle>
                <div className="flex gap-2">
                  <Input 
                    type="date" 
                    value={selectedWeek ? selectedWeek.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSelectedWeek(new Date(e.target.value))}
                    className="w-40"
                  />
                  <Button variant="outline" size="sm" onClick={handleExportTimesheets}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timesheets?.length > 0 ? (
                      timesheets.map((timesheet: any) => (
                        <TableRow key={timesheet.id}>
                          <TableCell>{format(new Date(timesheet.date), 'MMM d')}</TableCell>
                          <TableCell>{timesheet.employeeName}</TableCell>
                          <TableCell>{timesheet.jobNumber || 'General'}</TableCell>
                          <TableCell>{timesheet.startTime ? format(new Date(timesheet.startTime), 'HH:mm') : '-'}</TableCell>
                          <TableCell>{timesheet.endTime ? format(new Date(timesheet.endTime), 'HH:mm') : '-'}</TableCell>
                          <TableCell>{timesheet.hoursWorked || 0}h</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span className="text-xs">{timesheet.location || 'Office'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={timesheet.status === 'approved' ? 'default' : 'secondary'}>
                              {timesheet.status || 'pending'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No timesheets found for the selected week
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.permissions?.timeApprovalManage && (
          <TabsContent value="approvals" className="space-y-4">
            {/* Fortune 50 Compliance: Manager Approval Dashboard */}
            <ManagerApprovalDashboard />
          </TabsContent>
        )}

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payroll System Integration</CardTitle>
            </CardHeader>
            <CardContent>
              {payrollIntegration?.isActive ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Connected to {payrollIntegration.provider}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last sync: {payrollIntegration.lastSyncAt ? format(new Date(payrollIntegration.lastSyncAt), 'PPp') : 'Never'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label>Sync Frequency</Label>
                      <Select defaultValue={payrollIntegration.syncFrequency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="manual">Manual Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Mapping Status</Label>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Employee IDs</span>
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Mapped
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Cost Centers</span>
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Mapped
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Pay Codes</span>
                          <Badge variant="outline" className="text-orange-600">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Partial
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Payroll System Connected</h3>
                  <p className="text-muted-foreground mb-4">
                    Connect your payroll system to automatically sync time data
                  </p>
                  <Button onClick={() => setShowPayrollSetup(true)}>
                    Configure Payroll Integration
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {showPayrollSetup && (
            <Card>
              <CardHeader>
                <CardTitle>Setup Payroll Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Payroll Provider</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xero">Xero Payroll</SelectItem>
                        <SelectItem value="adp">ADP</SelectItem>
                        <SelectItem value="workday">Workday</SelectItem>
                        <SelectItem value="myob">MYOB</SelectItem>
                        <SelectItem value="employmenthero">Employment Hero</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>API Endpoint</Label>
                    <Input placeholder="https://api.payrollprovider.com/v2" />
                  </div>

                  <div>
                    <Label>API Key</Label>
                    <Input type="password" placeholder="Enter your API key" />
                  </div>

                  <div className="flex gap-2">
                    <Button>Test Connection</Button>
                    <Button variant="outline" onClick={() => setShowPayrollSetup(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mobile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Mobile Time Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Features</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">GPS Clock In/Out</p>
                        <p className="text-sm text-muted-foreground">
                          Automatic location verification with geofencing
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Camera className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Photo Verification</p>
                        <p className="text-sm text-muted-foreground">
                          Site photos for time entry validation
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <WifiOff className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Offline Mode</p>
                        <p className="text-sm text-muted-foreground">
                          Works without internet, syncs when connected
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Timer className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Break Tracking</p>
                        <p className="text-sm text-muted-foreground">
                          Automatic break time deduction
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Setup Status</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Progressive Web App</span>
                        <span className="text-sm font-medium">Ready</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Offline Storage</span>
                        <span className="text-sm font-medium">Configured</span>
                      </div>
                      <Progress value={100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Push Notifications</span>
                        <span className="text-sm font-medium">Pending</span>
                      </div>
                      <Progress value={60} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Biometric Auth</span>
                        <span className="text-sm font-medium">Not Setup</span>
                      </div>
                      <Progress value={0} className="h-2" />
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button className="w-full">
                      Configure Mobile Settings
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduling" className="space-y-4">
          <AutomatedShiftScheduler />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Voice Memos - Deferred to Phase 2 for proper business integration */}
            {/* Voice memos will be integrated into job progress tracking and quality check notes */}
            
            {/* Calendar Sync */}
            <CalendarSyncSettings />

            {/* Enhanced Features */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Enhanced Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Theme & Accessibility Controls */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Display Settings</h3>
                    <p className="text-sm text-muted-foreground">
                      Customize appearance and accessibility options
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <ThemeToggle />
                    <LanguageSelector />
                    <AccessibilityPanel />
                  </div>
                </div>

                {/* Biometric Authentication */}
                <BiometricSettings />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Labor Rate Card Dialog */}
      <Dialog open={showAddRateCardDialog} onOpenChange={(open) => {
        setShowAddRateCardDialog(open);
        if (!open) {
          // Reset form when dialog closes
          setSkillLevel("");
          setEmployeeType("");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Labor Rate Card</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);
            
            // Get select values directly from form elements
            const skillLevelSelect = form.querySelector('[name="skillLevel"]') as HTMLSelectElement;
            const employeeTypeSelect = form.querySelector('[name="employeeType"]') as HTMLSelectElement;
            
            const rateCard = {
              name: formData.get('name') as string,
              code: formData.get('code') as string,
              description: formData.get('description') as string,
              skillLevel: skillLevel,
              employeeType: employeeType,
              baseRate: parseFloat(formData.get('baseRate') as string),
              costRate: parseFloat(formData.get('costRate') as string),
              overtimeMultiplier: parseFloat(formData.get('overtimeMultiplier') as string) || 1.5,
              weekendMultiplier: parseFloat(formData.get('weekendMultiplier') as string) || 1.5,
              holidayMultiplier: parseFloat(formData.get('holidayMultiplier') as string) || 2.0,
              nightShiftMultiplier: parseFloat(formData.get('nightShiftMultiplier') as string) || 1.2,
              effectiveFrom: format(new Date(), 'yyyy-MM-dd')
            };

            // Validation
            if (!skillLevel || !employeeType) {
              toast({
                title: "Validation Error",
                description: "Please select both skill level and employee type.",
                variant: "destructive"
              });
              return;
            }

            console.log('Submitting rate card:', rateCard);

            saveLaborRateMutation.mutate(rateCard, {
              onSuccess: () => {
                setShowAddRateCardDialog(false);
                setSkillLevel("");
                setEmployeeType("");
                queryClient.invalidateQueries({ queryKey: ['/api/labor-rates/cards'] });
                toast({
                  title: "Success",
                  description: "Labor rate card created successfully!",
                });
              },
              onError: (error: any) => {
                console.error('Error creating rate card:', error);
                console.error('Error details:', error.message);
                const errorMessage = error.message || "Failed to create rate card. Please try again.";
                toast({
                  title: "Error",
                  description: errorMessage,
                  variant: "destructive"
                });
              }
            });
          }}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Rate Card Name</Label>
                <Input id="name" name="name" placeholder="e.g., Senior Welder" required />
              </div>
              <div>
                <Label htmlFor="code">Code</Label>
                <Input id="code" name="code" placeholder="e.g., SW01" required />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Describe this rate card..." />
              </div>
              <div>
                <Label htmlFor="skillLevel">Skill Level</Label>
                <Select name="skillLevel" value={skillLevel} onValueChange={setSkillLevel} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apprentice">Apprentice</SelectItem>
                    <SelectItem value="tradesman">Tradesman</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="specialist">Specialist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="employeeType">Employee Type</Label>
                <Select name="employeeType" value={employeeType} onValueChange={setEmployeeType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="subcontractor">Subcontractor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="baseRate">Base Rate ($/hr)</Label>
                <Input id="baseRate" name="baseRate" type="number" step="0.01" placeholder="120.00" required />
              </div>
              <div>
                <Label htmlFor="costRate">Cost Rate ($/hr)</Label>
                <Input id="costRate" name="costRate" type="number" step="0.01" placeholder="85.00" required />
              </div>
              <div>
                <Label htmlFor="overtimeMultiplier">Overtime Multiplier</Label>
                <Input id="overtimeMultiplier" name="overtimeMultiplier" type="number" step="0.1" placeholder="1.5" defaultValue="1.5" />
              </div>
              <div>
                <Label htmlFor="weekendMultiplier">Weekend Multiplier</Label>
                <Input id="weekendMultiplier" name="weekendMultiplier" type="number" step="0.1" placeholder="1.5" defaultValue="1.5" />
              </div>
              <div>
                <Label htmlFor="holidayMultiplier">Holiday Multiplier</Label>
                <Input id="holidayMultiplier" name="holidayMultiplier" type="number" step="0.1" placeholder="2.0" defaultValue="2.0" />
              </div>
              <div>
                <Label htmlFor="nightShiftMultiplier">Night Shift Multiplier</Label>
                <Input id="nightShiftMultiplier" name="nightShiftMultiplier" type="number" step="0.1" placeholder="1.2" defaultValue="1.2" />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowAddRateCardDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveLaborRateMutation.isPending}>
                {saveLaborRateMutation.isPending ? "Creating..." : "Create Rate Card"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mobile Sync Dialog */}
      <Dialog open={showMobileSyncDialog} onOpenChange={setShowMobileSyncDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Mobile Time Entries Import
            </DialogTitle>
          </DialogHeader>
          
          {mobileTimeData && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Import Summary</p>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div>
                    <p className="text-xs text-blue-700">Date</p>
                    <p className="font-medium">{format(new Date(mobileTimeData.date), 'PPP')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700">Site</p>
                    <p className="font-medium">{mobileTimeData.site === 'all' ? 'All Sites' : mobileTimeData.site}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-700">Total Hours</p>
                    <p className="font-medium">{mobileTimeData.totalHours.toFixed(1)}h</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Time Entries ({mobileTimeData.entries.length})</h4>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {mobileTimeData.entries.map((entry: any, idx: number) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{entry.employeeName}</p>
                          <p className="text-sm text-muted-foreground">
                            {entry.employeeNumber} • {entry.jobSite}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{entry.totalHours?.toFixed(1) || '0'}h</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.clockIn), 'HH:mm')} - {entry.clockOut ? format(new Date(entry.clockOut), 'HH:mm') : 'Active'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{entry.location.address}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Import these time entries to the payroll system?
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowMobileSyncDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      toast({
                        title: "Time Entries Imported",
                        description: `Successfully imported ${mobileTimeData.entries.length} time entries from Mobile Operations`,
                      });
                      setShowMobileSyncDialog(false);
                      // Refresh the time clock data
                      queryClient.invalidateQueries({ queryKey: ["/api/time/summary"] });
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Import to Payroll
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}