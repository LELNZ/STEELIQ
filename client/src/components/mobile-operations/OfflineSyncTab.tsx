import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  WifiOff,
  Wifi,
  RefreshCw,
  Upload,
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Database,
  Smartphone,
  Cloud,
  CloudOff,
  Battery,
  HardDrive,
  Trash2,
  Play,
  Pause,
  RotateCw,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SyncItem {
  id: string;
  type: "time_entry" | "inspection" | "document" | "location";
  action: "create" | "update" | "delete";
  entity: string;
  timestamp: string;
  size: string;
  deviceId: string;
  userName: string;
  retries: number;
  status: "pending" | "syncing" | "completed" | "failed";
  error?: string;
}

interface DeviceStatus {
  id: string;
  deviceName: string;
  userName: string;
  lastSync: string;
  pendingItems: number;
  storageUsed: number;
  batteryLevel: number;
  connectionStatus: "online" | "offline" | "syncing";
}

export function OfflineSyncTab() {
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState("all");

  const { data: syncQueue = [] } = useQuery<SyncItem[]>({
    queryKey: ["/api/mobile-operations/sync-queue"],
    refetchInterval: 5000,
  });

  const { data: devices = [] } = useQuery<DeviceStatus[]>({
    queryKey: ["/api/mobile-operations/devices"],
    refetchInterval: 10000,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Synced
          </Badge>
        );
      case "syncing":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getConnectionIcon = (status: string) => {
    switch (status) {
      case "online":
        return <Wifi className="h-4 w-4 text-green-600" />;
      case "offline":
        return <WifiOff className="h-4 w-4 text-red-600" />;
      case "syncing":
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <WifiOff className="h-4 w-4" />;
    }
  };

  const pendingCount = syncQueue.filter(item => item.status === "pending").length;
  const failedCount = syncQueue.filter(item => item.status === "failed").length;
  const totalSize = syncQueue.reduce((sum, item) => sum + parseFloat(item.size), 0);

  const handleSyncAll = async () => {
    setSyncInProgress(true);
    // Simulate sync
    setTimeout(() => setSyncInProgress(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Sync Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Sync</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalSize.toFixed(1)} MB total
              </p>
            </div>
            <Cloud className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failed Items</p>
              <p className="text-2xl font-bold">{failedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Devices</p>
              <p className="text-2xl font-bold">{devices.length}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {devices.filter(d => d.connectionStatus === "online").length} online
              </p>
            </div>
            <Smartphone className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Last Sync</p>
              <p className="text-2xl font-bold">2m ago</p>
              <p className="text-xs text-muted-foreground mt-1">All devices</p>
            </div>
            <RefreshCw className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Sync Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {syncInProgress ? (
                <>
                  <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                  <span className="font-medium">Syncing...</span>
                  <Progress value={65} className="w-32 h-2" />
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Sync Ready</span>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSyncInProgress(!syncInProgress)}
            >
              {syncInProgress ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Sync
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Resume Sync
                </>
              )}
            </Button>
            <Button onClick={handleSyncAll} disabled={syncInProgress || pendingCount === 0}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync All Now
            </Button>
          </div>
        </div>
      </Card>

      {/* Device Status */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Device Status</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <div
                key={device.id}
                className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{device.deviceName}</p>
                      <p className="text-sm text-muted-foreground">{device.userName}</p>
                    </div>
                  </div>
                  {getConnectionIcon(device.connectionStatus)}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pending Items</span>
                    <span className="font-medium">{device.pendingItems}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Storage Used</span>
                    <span className="font-medium">{device.storageUsed} MB</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Battery</span>
                    <div className="flex items-center gap-1">
                      <Battery className={`h-4 w-4 ${
                        device.batteryLevel > 50 ? "text-green-600" : 
                        device.batteryLevel > 20 ? "text-yellow-600" : "text-red-600"
                      }`} />
                      <span className="font-medium">{device.batteryLevel}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Sync</span>
                    <span className="font-medium">{device.lastSync}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <Button variant="outline" size="sm" className="w-full">
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Sync Device
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Sync Queue */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({failedCount})</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Pending Sync Items</h3>
                <Button variant="outline" size="sm">
                  <RotateCw className="h-4 w-4 mr-2" />
                  Retry All
                </Button>
              </div>
            </div>
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span>Time Entry</span>
                      </div>
                    </TableCell>
                    <TableCell>Clock In - Warehouse Site</TableCell>
                    <TableCell>Adam Green</TableCell>
                    <TableCell>iPhone 12</TableCell>
                    <TableCell>7:32 AM</TableCell>
                    <TableCell>0.1 MB</TableCell>
                    <TableCell>{getStatusBadge("pending")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-purple-600" />
                        <span>Document</span>
                      </div>
                    </TableCell>
                    <TableCell>Safety Photo - North Wing</TableCell>
                    <TableCell>Chipo Green</TableCell>
                    <TableCell>Samsung S21</TableCell>
                    <TableCell>8:45 AM</TableCell>
                    <TableCell>4.2 MB</TableCell>
                    <TableCell>{getStatusBadge("pending")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Upload className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clipboard className="h-4 w-4 text-green-600" />
                        <span>Inspection</span>
                      </div>
                    </TableCell>
                    <TableCell>Quality Check - Welding Bay</TableCell>
                    <TableCell>Manny Magallanes</TableCell>
                    <TableCell>iPad Pro</TableCell>
                    <TableCell>10:30 AM</TableCell>
                    <TableCell>2.8 MB</TableCell>
                    <TableCell>{getStatusBadge("syncing")}</TableCell>
                    <TableCell>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="failed">
          <Card>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Failed Sync Items</h3>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Failed
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Failed Items?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete {failedCount} failed sync items. 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                        Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <div className="p-4">
              {failedCount === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-muted-foreground">No failed sync items</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Retries</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Camera className="h-4 w-4 text-purple-600" />
                          <span>Document</span>
                        </div>
                      </TableCell>
                      <TableCell>Large Photo - 25MB</TableCell>
                      <TableCell>
                        <span className="text-sm text-red-600">File size exceeds limit</span>
                      </TableCell>
                      <TableCell>3</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <RotateCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold">Completed Syncs (Last 24 Hours)</h3>
            </div>
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Synced At</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span>Time Entry</span>
                      </div>
                    </TableCell>
                    <TableCell>Clock Out - Platform Site</TableCell>
                    <TableCell>Vili Pelenato</TableCell>
                    <TableCell>3:30 PM</TableCell>
                    <TableCell>1.2s</TableCell>
                    <TableCell>{getStatusBadge("completed")}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clipboard className="h-4 w-4 text-green-600" />
                        <span>Inspection</span>
                      </div>
                    </TableCell>
                    <TableCell>Safety Audit Complete</TableCell>
                    <TableCell>Adam Green</TableCell>
                    <TableCell>2:15 PM</TableCell>
                    <TableCell>3.5s</TableCell>
                    <TableCell>{getStatusBadge("completed")}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sync Settings */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Offline Sync Configuration</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
          <div>
            <h4 className="font-medium mb-3">Auto-Sync Settings</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Auto-sync when online</span>
                <Badge className="bg-green-100 text-green-800">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Sync interval</span>
                <span className="text-sm font-medium">Every 5 minutes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">WiFi only</span>
                <Badge variant="outline">Disabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Background sync</span>
                <Badge className="bg-green-100 text-green-800">Enabled</Badge>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">Storage Management</h4>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Local Storage Used</span>
                  <span className="text-sm font-medium">2.4 GB / 10 GB</span>
                </div>
                <Progress value={24} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Cache Size</span>
                  <span className="text-sm font-medium">856 MB</span>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cache
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Data retention</span>
                <span className="text-sm font-medium">30 days</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}