import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertTriangle,
  Zap,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
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
  activeStaff: number;
  currentShift: string;
  wipTonnage: number;
  overallProgress: number;
}

export default function ProductionFloor() {
  const [activeTab, setActiveTab] = useState("floor-view");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  // Main production stats
  const { data: stats } = useQuery<ProductionStats>({
    queryKey: ["/api/production-floor/stats"],
    refetchInterval: refreshInterval,
    staleTime: 0
  });

  // Machine status for OEE calculation and department view
  const { data: allMachines } = useQuery({
    queryKey: ['/api/production-floor/machines'],
    refetchInterval: refreshInterval * 2, // Update less frequently
  });

  // Filter machines based on selected department
  const machineStatus = allMachines?.filter((m: any) => {
    if (selectedDepartment === 'all') return true;
    const dept = m.department?.toLowerCase() || m.machineType?.toLowerCase() || '';
    if (selectedDepartment === 'fabrication') {
      return dept.includes('cut') || dept.includes('drill') || dept.includes('saw');
    }
    if (selectedDepartment === 'assembly') {
      return dept.includes('weld') || dept.includes('assembly');
    }
    if (selectedDepartment === 'finishing') {
      return dept.includes('paint') || dept.includes('finish') || dept.includes('qc');
    }
    return false;
  }) || allMachines;

  // Active work orders for department filtering
  const { data: activeWorkOrders } = useQuery({
    queryKey: ['/api/production/real-time/work-orders'],
    refetchInterval: refreshInterval,
    staleTime: 0
  });

  // Real-time production metrics
  const { data: productionMetrics } = useQuery({
    queryKey: ['/api/production/real-time/metrics'],
    refetchInterval: refreshInterval,
    staleTime: 0
  });

  // Quality metrics for OEE calculation
  const { data: qualityMetrics } = useQuery({
    queryKey: ['/api/production/real-time/quality'],
    refetchInterval: refreshInterval * 3,
  });

  // Inventory alerts
  const { data: inventoryAlerts } = useQuery({
    queryKey: ['/api/production/real-time/inventory-alerts'],
    refetchInterval: refreshInterval * 6,
  });

  // Calculate OEE (Overall Equipment Effectiveness) - Wave 2 Feature
  const calculateOEE = () => {
    // Return 0 if any data is missing - no fake values allowed
    if (!machineStatus || machineStatus.length === 0) return 0;
    if (!productionMetrics?.performanceRate || !qualityMetrics?.passRate) return 0;
    
    const totalMachines = machineStatus.length;
    const runningMachines = machineStatus.filter((m: any) => m.current_state === 'running').length;
    const availability = (runningMachines / totalMachines) * 100;
    
    // Use only real data - no fallbacks
    const performance = productionMetrics.performanceRate || 0;
    const quality = qualityMetrics.passRate || 0;
    
    return Math.round((availability * performance * quality) / 10000);
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header with Wave 2 Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Floor Intelligence</h1>
          <p className="text-sm text-gray-600 mt-1">
            Real-time monitoring and control of steel fabrication operations
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Refresh Interval Control - Wave 2 Feature */}
          <select 
            className="px-3 py-2 border rounded-md text-sm"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
          >
            <option value="5000">5 sec refresh</option>
            <option value="10000">10 sec refresh</option>
            <option value="30000">30 sec refresh</option>
            <option value="60000">1 min refresh</option>
          </select>
          
          {/* Live Status Indicator - Wave 2 Feature */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Live</span>
          </div>

          <Button variant="outline" size="sm" className="hidden sm:flex">
            <BarChart3 className="h-4 w-4 mr-2" />
            Production Report
          </Button>
          <Button size="sm" className="whitespace-nowrap">
            <ClipboardList className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">New Work Order</span>
            <span className="sm:hidden">New Order</span>
          </Button>
        </div>
      </div>

      {/* Real-time Production Metrics - Enhanced with Wave 2 Features */}
      <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-9 gap-3 sm:gap-4">
        {/* OEE Score - Wave 2 Feature */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">OEE Score</p>
                <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5">{calculateOEE()}%</p>
                <Progress value={calculateOEE()} className="mt-1 h-1" />
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Active Orders</p>
                <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5">{stats?.activeWorkOrders || 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">In production</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Machines Active</p>
                <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5">{stats?.machinesOperating || 0}/12</p>
                <p className="text-xs text-muted-foreground mt-0.5">Operating</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Daily Output</p>
                <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5">{stats?.dailyOutput || 0}t</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tonnes today</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Quality Score</p>
                <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5">{stats?.qualityScore || 0}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Pass rate</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Efficiency</p>
                <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5">{stats?.efficiency || 0}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">No data</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">Defect Rate</p>
                <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5">{stats?.defectRate || 0}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">No data</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">On-Time</p>
                <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5">{stats?.onTimeDelivery || 0}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Delivery rate</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
              </div>
            </div>
          </CardContent>
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
              <span className="text-sm">Floor Staff: {stats?.activeStaff || 0} active</span>
            </div>
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-purple-600" />
              <span className="text-sm">Shift: {stats?.currentShift || 'No shift'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              <span className="text-sm">WIP: {stats?.wipTonnage || 0} tonnes</span>
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
            <span className="font-medium">{stats?.overallProgress || 0}%</span>
          </div>
          <Progress value={stats?.overallProgress || 0} className="h-2" />
        </div>
      </Card>

      {/* Main Content Tabs - Enhanced with Wave 2 Floor View */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="floor-view" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Floor View
          </TabsTrigger>
          <TabsTrigger value="work-orders" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Work Orders
          </TabsTrigger>
          <TabsTrigger value="machine-monitoring" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Machines
          </TabsTrigger>
          <TabsTrigger value="quality-control" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Quality
          </TabsTrigger>
          <TabsTrigger value="production-metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Floor View Tab - Wave 2 Feature */}
        <TabsContent value="floor-view" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Production Status Grid */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Production Floor Status</CardTitle>
                <CardDescription>Real-time machine and workstation status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {['cutting', 'welding', 'assembly', 'drilling', 'painting', 'qc', 'packing', 'finishing'].map((dept) => {
                    // Use real machine data to determine department status
                    const deptMachines = machineStatus?.filter((m: any) => 
                      m.department?.toLowerCase() === dept || 
                      m.machineType?.toLowerCase()?.includes(dept)
                    ) || [];
                    const activeMachines = deptMachines.filter((m: any) => m.current_state === 'running').length;
                    const totalMachines = deptMachines.length;
                    const isActive = activeMachines > 0;
                    const displayName = dept === 'qc' ? 'QC Station' : 
                                      dept === 'packing' ? 'Packing' :
                                      dept.charAt(0).toUpperCase() + dept.slice(1);
                    
                    return (
                      <div key={dept} className="border rounded-lg p-4 text-center">
                        <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                          isActive ? 'bg-green-500 animate-pulse' : 
                          totalMachines > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                        }`}></div>
                        <p className="text-sm font-medium">{displayName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {totalMachines > 0 
                            ? isActive ? `Active (${activeMachines}/${totalMachines})` : `Idle (0/${totalMachines})`
                            : 'No machines'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Department Filter - Wave 2 Feature */}
                <div className="mt-6 flex gap-2">
                  <Button
                    variant={selectedDepartment === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDepartment('all')}
                  >
                    All Departments
                  </Button>
                  <Button
                    variant={selectedDepartment === 'fabrication' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDepartment('fabrication')}
                  >
                    Fabrication
                  </Button>
                  <Button
                    variant={selectedDepartment === 'assembly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDepartment('assembly')}
                  >
                    Assembly
                  </Button>
                  <Button
                    variant={selectedDepartment === 'finishing' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDepartment('finishing')}
                  >
                    Finishing
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live Alerts - Wave 2 Feature */}
            <Card>
              <CardHeader>
                <CardTitle>Live Alerts</CardTitle>
                <CardDescription>Critical notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {inventoryAlerts?.map((alert: any, idx: number) => (
                  <Alert key={idx} variant={alert.level === 'critical' ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(alert.timestamp || new Date()), 'HH:mm:ss')}
                      </div>
                    </AlertDescription>
                  </Alert>
                )) || (
                  <p className="text-sm text-muted-foreground">No active alerts</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Production Timeline - Wave 2 Feature */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Production Timeline</CardTitle>
              <CardDescription>Hourly production output and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-border"></div>
                <div className="space-y-4 ml-4">
                  {productionMetrics?.timeline?.map((event: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-4">
                      <div className="absolute -left-2 w-4 h-4 rounded-full bg-primary border-2 border-background"></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{event.time}</span>
                          <Badge variant="secondary">{event.output} kg</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No timeline data available</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
            <div className="text-sm text-muted-foreground">
              No active production alerts
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