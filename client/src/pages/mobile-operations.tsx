import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wifi, WifiOff, Battery, Clock, MapPin, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import TimeTrackingTab from "@/components/mobile-operations/TimeTrackingTab";
import SiteInspectionTab from "@/components/mobile-operations/SiteInspectionTab";
import DocumentCaptureTab from "@/components/mobile-operations/DocumentCaptureTab";
import OfflineSyncTab from "@/components/mobile-operations/OfflineSyncTab";
import { offlineSync } from "@/lib/offlineSync";
import { useToast } from "@/hooks/use-toast";

interface MobileOperationsStats {
  activeWorkers: number;
  activeSites: number;
  hoursToday: number;
  documentsTotal: number;
  documentsToday: number;
}

export default function MobileOperations() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">("idle");
  const [pendingSync, setPendingSync] = useState(0);
  
  const { data: stats } = useQuery<MobileOperationsStats>({
    queryKey: ["/api/mobile-operations/stats"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  // Initialize offline sync and monitor network status
  useEffect(() => {
    // Initialize offline sync
    offlineSync.initialize();
    offlineSync.setupNetworkListeners();
    
    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Your connection has been restored",
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "Changes will be saved locally and synced when online",
        variant: "destructive"
      });
    };
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    // Monitor battery status
    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        
        battery.addEventListener("levelchange", () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }
    
    // Check pending sync items periodically
    const checkPendingSync = async () => {
      const operations = await offlineSync.getPendingOperations();
      setPendingSync(operations.length);
    };
    
    checkPendingSync();
    const interval = setInterval(checkPendingSync, 30000); // Check every 30 seconds
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [toast]);
  
  // Manual sync
  const handleManualSync = async () => {
    setSyncStatus("syncing");
    try {
      const result = await offlineSync.syncPendingOperations();
      setSyncStatus("idle");
      setPendingSync(0);
      
      toast({
        title: "Sync Complete",
        description: `${result.syncedCount} operations synced successfully`,
      });
    } catch (error) {
      setSyncStatus("error");
      toast({
        title: "Sync Failed",
        description: "Unable to sync data. Please try again later.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header with Status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mobile Operations</h1>
          <p className="text-sm text-gray-600 mt-1">Field operations management for teams on the go</p>
        </div>
        
        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          <Badge variant={isOnline ? "default" : "destructive"} className="gap-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? "Online" : "Offline"}
          </Badge>
          
          {batteryLevel !== null && (
            <Badge variant={batteryLevel > 20 ? "default" : "destructive"} className="gap-1">
              <Battery className="h-3 w-3" />
              {batteryLevel}%
            </Badge>
          )}
          
          {pendingSync > 0 && (
            <Badge variant="warning" className="gap-1">
              <Clock className="h-3 w-3" />
              {pendingSync} pending
            </Badge>
          )}
        </div>
      </div>
      
      {/* Offline Alert */}
      {!isOnline && (
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You're currently offline. All changes are being saved locally and will sync automatically when you're back online.
            {pendingSync > 0 && (
              <Button 
                size="sm" 
                variant="outline" 
                className="ml-4"
                onClick={handleManualSync}
                disabled={!isOnline || syncStatus === "syncing"}
              >
                Sync Now
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Active Workers</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{stats?.activeWorkers || 0}</p>
              </div>
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Sites Active</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{stats?.activeSites || 0}</p>
              </div>
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Hours Today</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{stats?.hoursToday || 0}</p>
              </div>
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Documents</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-xl font-bold text-foreground">{stats?.documentsTotal || 0}</p>
                  <Badge variant="outline" className="text-xs h-5">+{stats?.documentsToday || 0}</Badge>
                </div>
              </div>
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Tabs */}
      <Tabs defaultValue="time-tracking" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="time-tracking" className="text-xs sm:text-sm">Time Tracking</TabsTrigger>
          <TabsTrigger value="site-inspection" className="text-xs sm:text-sm">Site Inspection</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs sm:text-sm">Documents</TabsTrigger>
          <TabsTrigger value="offline-sync" className="text-xs sm:text-sm">Offline Sync</TabsTrigger>
        </TabsList>
        
        <TabsContent value="time-tracking">
          <TimeTrackingTab />
        </TabsContent>
        
        <TabsContent value="site-inspection">
          <SiteInspectionTab />
        </TabsContent>
        
        <TabsContent value="documents">
          <DocumentCaptureTab />
        </TabsContent>
        
        <TabsContent value="offline-sync">
          <OfflineSyncTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}