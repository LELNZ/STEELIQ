import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  WifiOff, 
  Wifi,
  CloudOff,
  Cloud,
  RefreshCw,
  Clock,
  Database,
  Smartphone,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Battery,
  HardDrive,
  Zap,
  Settings,
  Play,
  Pause,
  MoreVertical,
  Info
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

interface SyncQueueItem {
  id: string;
  type: "time_entry" | "inspection" | "document" | "material_scan";
  action: "create" | "update" | "delete";
  data: any;
  deviceId: string;
  userId: string;
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
  error?: string;
  priority: "high" | "normal" | "low";
  size: number;
}

interface Device {
  id: string;
  deviceName: string;
  userName: string;
  lastSync: string;
  pendingItems: number;
  storageUsed: number;
  batteryLevel: number;
  connectionStatus: "online" | "offline" | "syncing";
}

export default function OfflineSyncTab() {
  const [autoSync, setAutoSync] = useState(true);
  const [syncOnWifiOnly, setSyncOnWifiOnly] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: syncQueue = [], isLoading: queueLoading } = useQuery<SyncQueueItem[]>({
    queryKey: ["/api/mobile-operations/sync-queue"],
  });

  const { data: devices = [], isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ["/api/mobile-operations/devices"],
  });

  const syncMutation = useMutation({
    mutationFn: async (items?: string[]) => {
      setIsSyncing(true);
      return apiRequest("/api/mobile-operations/sync", {
        method: "POST",
        body: JSON.stringify({ items: items || "all" }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-operations/sync-queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mobile-operations/devices"] });
      setIsSyncing(false);
    },
    onError: () => {
      setIsSyncing(false);
    },
  });

  // Calculate statistics
  const totalPendingItems = syncQueue.length;
  const failedItems = syncQueue.filter(item => item.error).length;
  const totalDataSize = syncQueue.reduce((sum, item) => sum + item.size, 0);
  const highPriorityItems = syncQueue.filter(item => item.priority === "high").length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "time_entry":
        return <Clock className="h-4 w-4" />;
      case "inspection":
        return <CheckCircle2 className="h-4 w-4" />;
      case "document":
        return <Upload className="h-4 w-4" />;
      case "material_scan":
        return <Database className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600";
      case "normal":
        return "text-blue-600";
      case "low":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="space-y-6">
      {/* Sync Status Alert */}
      {isSyncing && (
        <Alert className="border-blue-200 bg-blue-50">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertTitle>Syncing in progress</AlertTitle>
          <AlertDescription>
            Uploading data to server. Please keep the app open.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Items</p>
              <p className="text-2xl font-bold">{totalPendingItems}</p>
              {highPriorityItems > 0 && (
                <p className="text-xs text-red-600">{highPriorityItems} high priority</p>
              )}
            </div>
            <CloudOff className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed Items</p>
              <p className="text-2xl font-bold">{failedItems}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Data Size</p>
              <p className="text-2xl font-bold">{formatBytes(totalDataSize)}</p>
            </div>
            <HardDrive className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Devices</p>
              <p className="text-2xl font-bold">{devices.length}</p>
            </div>
            <Smartphone className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
      </div>

      {/* Sync Settings */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Sync Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-sync">Auto Sync</Label>
              <p className="text-sm text-muted-foreground">
                Automatically sync data when connection is available
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={autoSync}
              onCheckedChange={setAutoSync}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="wifi-only">Wi-Fi Only</Label>
              <p className="text-sm text-muted-foreground">
                Only sync when connected to Wi-Fi to save mobile data
              </p>
            </div>
            <Switch
              id="wifi-only"
              checked={syncOnWifiOnly}
              onCheckedChange={setSyncOnWifiOnly}
            />
          </div>

          <div className="pt-4 flex gap-2">
            <Button 
              onClick={() => syncMutation.mutate()}
              disabled={isSyncing || totalPendingItems === 0}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
              Sync Now
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Advanced Settings
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs for Queue and Devices */}
      <Tabs defaultValue="queue" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="queue">Sync Queue</TabsTrigger>
          <TabsTrigger value="devices">Connected Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          {queueLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading sync queue...</div>
          ) : syncQueue.length === 0 ? (
            <Card className="p-8 text-center">
              <Cloud className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">All synced!</h3>
              <p className="text-muted-foreground">No pending items in the sync queue</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {syncQueue.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(item.type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {item.type.replace("_", " ").charAt(0).toUpperCase() + 
                               item.type.replace("_", " ").slice(1)}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {item.action}
                            </Badge>
                            <span className={cn("text-xs", getPriorityColor(item.priority))}>
                              {item.priority} priority
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Created: {format(new Date(item.createdAt), "MMM d, h:mm a")}</span>
                            <span>Size: {formatBytes(item.size)}</span>
                            <span>Attempts: {item.attempts}</span>
                          </div>
                          {item.error && (
                            <div className="flex items-center gap-2 mt-1 text-sm text-red-600">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{item.error}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => syncMutation.mutate([item.id])}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retry Now
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Info className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <XCircle className="h-4 w-4 mr-2" />
                          Remove from Queue
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          {devicesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading devices...</div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No connected devices</div>
          ) : (
            devices.map((device) => (
              <Card key={device.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">{device.deviceName}</h4>
                        <p className="text-sm text-muted-foreground">{device.userName}</p>
                      </div>
                      <Badge className={cn(
                        "text-xs",
                        device.connectionStatus === "online" ? "bg-green-100 text-green-800" :
                        device.connectionStatus === "syncing" ? "bg-blue-100 text-blue-800" :
                        "bg-gray-100 text-gray-800"
                      )}>
                        {device.connectionStatus}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Last Sync</p>
                        <p className="font-medium">{device.lastSync}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pending Items</p>
                        <p className="font-medium">{device.pendingItems}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Storage Used</p>
                        <p className="font-medium">{device.storageUsed} MB</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Battery className={cn(
                          "h-4 w-4",
                          device.batteryLevel > 60 ? "text-green-600" :
                          device.batteryLevel > 30 ? "text-yellow-600" :
                          "text-red-600"
                        )} />
                        <p className="font-medium">{device.batteryLevel}%</p>
                      </div>
                    </div>

                    {device.pendingItems > 0 && (
                      <div className="mt-3">
                        <Button 
                          size="sm"
                          onClick={() => syncMutation.mutate()}
                          disabled={isSyncing}
                        >
                          <RefreshCw className={cn("h-3 w-3 mr-1", isSyncing && "animate-spin")} />
                          Sync Device
                        </Button>
                      </div>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Device Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Force Sync</DropdownMenuItem>
                      <DropdownMenuItem>Clear Cache</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Remove Device</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}