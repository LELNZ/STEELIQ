import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  Smartphone,
  MapPin,
  Camera,
  WifiOff,
  QrCode,
  Clock,
  CheckCircle,
  AlertCircle,
  Navigation,
  Battery,
  Signal,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import TimeTrackingTab from "@/components/mobile-operations/TimeTrackingTab";
import SiteInspectionTab from "@/components/mobile-operations/SiteInspectionTab";
import DocumentCaptureTab from "@/components/mobile-operations/DocumentCaptureTab";
import OfflineSyncTab from "@/components/mobile-operations/OfflineSyncTab";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function MobileOperations() {
  const [activeTab, setActiveTab] = useState("time-tracking");

  const { data: stats } = useQuery({
    queryKey: ["/api/mobile-operations/stats"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mobile Operations</h1>
          <p className="text-muted-foreground">
            Field operations management and mobile workforce tools
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <QrCode className="h-4 w-4 mr-2" />
            QR Scanner
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            Install Mobile App
          </Button>
        </div>
      </div>

      {/* Mobile Stats Overview */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Workers</p>
              <p className="text-2xl font-bold">{stats?.activeWorkers || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">On site now</p>
            </div>
            <Navigation className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Check-ins Today</p>
              <p className="text-2xl font-bold">{stats?.checkinsToday || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">GPS verified</p>
            </div>
            <MapPin className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Photos Captured</p>
              <p className="text-2xl font-bold">{stats?.photosToday || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Today</p>
            </div>
            <Camera className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Offline Queue</p>
              <p className="text-2xl font-bold">{stats?.offlineQueue || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Pending sync</p>
            </div>
            <WifiOff className="h-8 w-8 text-orange-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Scans Today</p>
              <p className="text-2xl font-bold">{stats?.scansToday || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">QR/Barcode</p>
            </div>
            <QrCode className="h-8 w-8 text-teal-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Compliance</p>
              <p className="text-2xl font-bold">{stats?.complianceRate || 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">Site safety</p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
        </Card>
      </div>

      {/* Mobile Device Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Active Devices: {stats?.activeDevices || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <Battery className="h-5 w-5 text-green-600" />
              <span className="text-sm">Avg Battery: 78%</span>
            </div>
            <div className="flex items-center gap-2">
              <Signal className="h-5 w-5 text-blue-600" />
              <span className="text-sm">Network Coverage: Good</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <span className="text-sm">Last Sync: 2 mins ago</span>
            </div>
          </div>
          <Badge variant="outline" className="bg-green-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            All Systems Operational
          </Badge>
        </div>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="time-tracking" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Tracking
          </TabsTrigger>
          <TabsTrigger value="site-inspection" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Site Inspection
          </TabsTrigger>
          <TabsTrigger value="document-capture" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Document Capture
          </TabsTrigger>
          <TabsTrigger value="offline-sync" className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" />
            Offline Sync
          </TabsTrigger>
        </TabsList>

        <TabsContent value="time-tracking">
          <TimeTrackingTab />
        </TabsContent>

        <TabsContent value="site-inspection">
          <SiteInspectionTab />
        </TabsContent>

        <TabsContent value="document-capture">
          <DocumentCaptureTab />
        </TabsContent>

        <TabsContent value="offline-sync">
          <OfflineSyncTab />
        </TabsContent>
      </Tabs>

      {/* Mobile App Download */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-2">LEL Mobile App</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Download the mobile app for full offline functionality and GPS tracking
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm">
                <Smartphone className="h-4 w-4 mr-2" />
                iOS App Store
              </Button>
              <Button variant="outline" size="sm">
                <Smartphone className="h-4 w-4 mr-2" />
                Google Play
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                APK Download
              </Button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium mb-2">App Version 2.4.1</p>
            <Progress value={85} className="w-32 mb-1" />
            <p className="text-xs text-muted-foreground">85% adoption rate</p>
          </div>
        </div>
      </Card>
    </div>
  );
}