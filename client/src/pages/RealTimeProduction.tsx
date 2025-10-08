import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, AlertTriangle, CheckCircle, Clock, Package, TrendingUp, Users, Zap, BarChart3, Gauge } from "lucide-react";
import { format } from "date-fns";

export default function RealTimeProduction() {
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  // Real-time production metrics
  const { data: productionMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/production/real-time/metrics'],
    refetchInterval: refreshInterval,
    staleTime: 0
  });

  // Active work orders
  const { data: activeWorkOrders } = useQuery({
    queryKey: ['/api/production/real-time/work-orders'],
    refetchInterval: refreshInterval,
    staleTime: 0
  });

  // Machine status
  const { data: machineStatus } = useQuery({
    queryKey: ['/api/production/real-time/machines'],
    refetchInterval: refreshInterval * 2, // Update less frequently
  });

  // Quality metrics
  const { data: qualityMetrics } = useQuery({
    queryKey: ['/api/production/real-time/quality'],
    refetchInterval: refreshInterval * 3,
  });

  // Inventory levels
  const { data: inventoryAlerts } = useQuery({
    queryKey: ['/api/production/real-time/inventory-alerts'],
    refetchInterval: refreshInterval * 6,
  });

  // Calculate OEE (Overall Equipment Effectiveness)
  const calculateOEE = () => {
    if (!machineStatus) return 0;
    const totalMachines = machineStatus.length || 1;
    const runningMachines = machineStatus?.filter((m: any) => m.status === 'running').length || 0;
    const availability = (runningMachines / totalMachines) * 100;
    const performance = productionMetrics?.performanceRate || 85;
    const quality = qualityMetrics?.passRate || 95;
    return Math.round((availability * performance * quality) / 10000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'maintenance': return 'bg-orange-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'running': return 'default';
      case 'idle': return 'secondary';
      case 'maintenance': return 'outline';
      case 'offline': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Real-Time Production Monitor</h1>
          <p className="text-muted-foreground">Live production floor intelligence and analytics</p>
        </div>
        
        <div className="flex items-center gap-4">
          <select 
            className="px-3 py-2 border rounded-md"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
          >
            <option value="5000">5 sec refresh</option>
            <option value="10000">10 sec refresh</option>
            <option value="30000">30 sec refresh</option>
            <option value="60000">1 min refresh</option>
          </select>
          
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Live</span>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">OEE Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateOEE()}%</div>
            <Progress value={calculateOEE()} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">Overall Equipment Effectiveness</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeWorkOrders?.length || 0}</div>
            <div className="flex items-center gap-1 mt-2">
              <Activity className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">
                {activeWorkOrders?.filter((w: any) => w.priority === 'high').length || 0} high priority
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Output Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productionMetrics?.dailyOutput || 0} kg</div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-xs text-green-600">+{productionMetrics?.outputGrowth || 0}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quality Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualityMetrics?.passRate || 0}%</div>
            <div className="flex items-center gap-1 mt-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">
                {qualityMetrics?.inspectionsToday || 0} inspections
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productionMetrics?.efficiency || 0}%</div>
            <div className="flex items-center gap-1 mt-2">
              <Zap className="h-3 w-3 text-yellow-500" />
              <span className="text-xs text-muted-foreground">vs target 90%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="floor-view" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="floor-view">Floor View</TabsTrigger>
          <TabsTrigger value="machines">Machines</TabsTrigger>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Floor View Tab */}
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
                  {['Cutting', 'Welding', 'Assembly', 'Drilling', 'Painting', 'QC Station', 'Packing', 'Shipping'].map((station) => (
                    <div key={station} className="border rounded-lg p-4 text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                        Math.random() > 0.3 ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                      }`}></div>
                      <p className="text-sm font-medium">{station}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.random() > 0.3 ? 'Active' : 'Idle'}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Department Filter */}
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

            {/* Live Alerts */}
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
                        {format(new Date(alert.timestamp), 'HH:mm:ss')}
                      </div>
                    </AlertDescription>
                  </Alert>
                )) || (
                  <p className="text-sm text-muted-foreground">No active alerts</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Production Timeline */}
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

        {/* Machines Tab */}
        <TabsContent value="machines" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machineStatus?.map((machine: any) => (
              <Card key={machine.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{machine.name}</CardTitle>
                      <CardDescription>{machine.type}</CardDescription>
                    </div>
                    <Badge variant={getStatusVariant(machine.status)}>
                      {machine.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Utilization</p>
                      <p className="font-medium">{machine.utilization}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Runtime</p>
                      <p className="font-medium">{machine.runtime}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Output</p>
                      <p className="font-medium">{machine.output} units</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Efficiency</p>
                      <p className="font-medium">{machine.efficiency}%</p>
                    </div>
                  </div>
                  
                  {machine.currentJob && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium">Current Job</p>
                      <p className="text-sm text-muted-foreground">{machine.currentJob}</p>
                      <Progress value={machine.jobProgress} className="mt-2" />
                    </div>
                  )}

                  {machine.nextMaintenance && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3 w-3 text-orange-500" />
                      <span className="text-muted-foreground">
                        Next maintenance: {machine.nextMaintenance}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )) || (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No machine data available
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Work Orders Tab */}
        <TabsContent value="work-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Work Orders</CardTitle>
              <CardDescription>Real-time work order tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeWorkOrders?.map((order: any) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{order.orderNumber}</h4>
                          <Badge variant={order.priority === 'high' ? 'destructive' : 'secondary'}>
                            {order.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{order.description}</p>
                        <div className="flex gap-4 text-sm">
                          <span>Job: {order.jobCode}</span>
                          <span>Qty: {order.quantity}</span>
                          <span>Due: {format(new Date(order.dueDate), 'MMM dd')}</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold">{order.progress}%</div>
                        <Progress value={order.progress} className="w-24 mt-1" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {order.completedQty}/{order.quantity}
                        </p>
                      </div>
                    </div>

                    {order.currentOperation && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
                        <Activity className="h-3 w-3 text-blue-500" />
                        <span>Current: {order.currentOperation}</span>
                        <span className="text-muted-foreground">• Operator: {order.operator}</span>
                      </div>
                    )}
                  </div>
                )) || (
                  <p className="text-center py-8 text-muted-foreground">No active work orders</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Hourly Production Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Hourly Production Output</CardTitle>
                <CardDescription>Today's production by hour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[...Array(8)].map((_, i) => {
                    const hour = i + 8; // Starting from 8 AM
                    const value = Math.floor(Math.random() * 100);
                    return (
                      <div key={hour} className="flex items-center gap-2">
                        <span className="text-sm w-16">{hour}:00</span>
                        <div className="flex-1 bg-secondary rounded-full h-6">
                          <div 
                            className="bg-primary h-full rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${value}%` }}
                          >
                            <span className="text-xs text-primary-foreground font-medium">
                              {value * 10} kg
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Department Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
                <CardDescription>Efficiency by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Cutting', 'Welding', 'Assembly', 'Finishing'].map((dept) => {
                    const efficiency = Math.floor(Math.random() * 30) + 70;
                    return (
                      <div key={dept}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{dept}</span>
                          <span className="font-medium">{efficiency}%</span>
                        </div>
                        <Progress value={efficiency} />
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-sm font-medium mb-3">Key Metrics</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Cycle Time</p>
                      <p className="text-xl font-bold">2.4h</p>
                      <p className="text-xs text-green-600">-15% vs avg</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">First Pass Yield</p>
                      <p className="text-xl font-bold">94%</p>
                      <p className="text-xs text-green-600">+2% vs target</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Scrap Rate</p>
                      <p className="text-xl font-bold">1.2%</p>
                      <p className="text-xs text-green-600">-0.3% vs avg</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Downtime</p>
                      <p className="text-xl font-bold">8min</p>
                      <p className="text-xs text-red-600">+3min vs target</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Material Consumption */}
          <Card>
            <CardHeader>
              <CardTitle>Material Consumption Today</CardTitle>
              <CardDescription>Real-time material usage tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {['Steel Plate', 'Steel Beam', 'Steel Pipe', 'Welding Wire', 'Paint'].map((material) => {
                  const used = Math.floor(Math.random() * 800) + 200;
                  const stock = Math.floor(Math.random() * 2000) + 1000;
                  const percentage = (used / stock) * 100;
                  
                  return (
                    <div key={material} className="text-center">
                      <div className="relative w-20 h-20 mx-auto">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-secondary"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="36"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${percentage * 2.26} 226`}
                            className="text-primary"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold">{Math.round(percentage)}%</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium mt-2">{material}</p>
                      <p className="text-xs text-muted-foreground">{used}kg used</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}