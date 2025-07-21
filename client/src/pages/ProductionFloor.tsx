import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Factory,
  Gauge,
  ClipboardList,
  BarChart3,
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  Wrench,
  Users,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import WorkOrderTrackingTab from "@/components/production-floor/WorkOrderTrackingTab";
import MachineMonitoringTab from "@/components/production-floor/MachineMonitoringTab";
import QualityControlTab from "@/components/production-floor/QualityControlTab";
import ProductionMetricsTab from "@/components/production-floor/ProductionMetricsTab";

interface ProductionStats {
  activeWorkOrders: number;
  machinesOperating: number;
  dailyOutput: number;
  qualityScore: number;
  efficiency: number;
  defectRate: number;
  onTimeDelivery: number;
  utilizationRate: number;
}

export default function ProductionFloor() {
  const [activeTab, setActiveTab] = useState("work-orders");

  const { data: stats } = useQuery<ProductionStats>({
    queryKey: ["/api/production-floor/stats"],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Production Floor Tracking</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and control of steel fabrication operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Production Report
          </Button>
          <Button size="sm">
            <ClipboardList className="h-4 w-4 mr-2" />
            New Work Order
          </Button>
        </div>
      </div>

      {/* Real-time Production Metrics */}
      <div className="grid gap-4 md:grid-cols-8">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Orders</p>
              <p className="text-2xl font-bold">{stats?.activeWorkOrders || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">In production</p>
            </div>
            <ClipboardList className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Machines Active</p>
              <p className="text-2xl font-bold">{stats?.machinesOperating || 0}/12</p>
              <p className="text-xs text-muted-foreground mt-1">Operating</p>
            </div>
            <Wrench className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Daily Output</p>
              <p className="text-2xl font-bold">{stats?.dailyOutput || 0}t</p>
              <p className="text-xs text-muted-foreground mt-1">Tonnes today</p>
            </div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Quality Score</p>
              <p className="text-2xl font-bold">{stats?.qualityScore || 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">Pass rate</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Efficiency</p>
              <p className="text-2xl font-bold">{stats?.efficiency || 0}%</p>
              <p className="text-xs text-green-600 mt-1">↑ 5% today</p>
            </div>
            <Gauge className="h-8 w-8 text-orange-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Defect Rate</p>
              <p className="text-2xl font-bold">{stats?.defectRate || 0}%</p>
              <p className="text-xs text-red-600 mt-1">↓ 2% week</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">On-Time</p>
              <p className="text-2xl font-bold">{stats?.onTimeDelivery || 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">Delivery rate</p>
            </div>
            <Clock className="h-8 w-8 text-teal-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Utilization</p>
              <p className="text-2xl font-bold">{stats?.utilizationRate || 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">Equipment</p>
            </div>
            <TrendingUp className="h-8 w-8 text-indigo-600" />
          </div>
        </Card>
      </div>

      {/* Production Status Overview */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium">Production Status: Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm">Floor Staff: 18 active</span>
            </div>
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-purple-600" />
              <span className="text-sm">Shift: Day Shift (7:00 AM - 3:30 PM)</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              <span className="text-sm">WIP: 24.5 tonnes</span>
            </div>
          </div>
          <Badge variant="outline" className="bg-green-50">
            <Activity className="h-3 w-3 mr-1" />
            All Systems Normal
          </Badge>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Overall Production Progress</span>
            <span className="font-medium">68%</span>
          </div>
          <Progress value={68} className="h-2" />
        </div>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="work-orders" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Work Orders
          </TabsTrigger>
          <TabsTrigger value="machine-monitoring" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Machine Monitoring
          </TabsTrigger>
          <TabsTrigger value="quality-control" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Quality Control
          </TabsTrigger>
          <TabsTrigger value="production-metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Production Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="work-orders">
          <WorkOrderTrackingTab />
        </TabsContent>

        <TabsContent value="machine-monitoring">
          <MachineMonitoringTab />
        </TabsContent>

        <TabsContent value="quality-control">
          <QualityControlTab />
        </TabsContent>

        <TabsContent value="production-metrics">
          <ProductionMetricsTab />
        </TabsContent>
      </Tabs>

      {/* Production Alerts */}
      <Card className="p-6 bg-gradient-to-r from-orange-50 to-red-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Production Alerts
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-orange-100 text-orange-800">Urgent</Badge>
                <span>Plasma cutter #2 requires maintenance in 48 hours</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Warning</Badge>
                <span>Material shortage alert: 100x100x6 SHS running low (12 lengths remaining)</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm">
            View All Alerts
          </Button>
        </div>
      </Card>
    </div>
  );
}