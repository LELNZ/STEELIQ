import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Wrench,
  Activity,
  AlertTriangle,
  CheckCircle,
  PauseCircle,
  Settings,
  MoreVertical,
  Clock,
  Gauge,
  Thermometer,
  Zap,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Machine {
  id: string;
  name: string;
  type: string;
  model: string;
  status: "operating" | "idle" | "maintenance" | "breakdown" | "offline";
  currentJob: string | null;
  operator: string | null;
  efficiency: number;
  utilizationRate: number;
  temperature: number;
  powerConsumption: number;
  runTime: number;
  idleTime: number;
  maintenanceSchedule: {
    lastMaintenance: string;
    nextMaintenance: string;
    hoursUntilMaintenance: number;
  };
  production: {
    currentOutput: number;
    targetOutput: number;
    qualityRate: number;
    cycleTime: number;
  };
  alerts: {
    type: "warning" | "critical" | "info";
    message: string;
    timestamp: string;
  }[];
}

export default function MachineMonitoringTab() {
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);

  const { data: machines = [], isLoading } = useQuery<Machine[]>({
    queryKey: ["/api/production-floor/machines"],
    refetchInterval: 3000, // Real-time updates every 3 seconds
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operating":
        return <Activity className="h-4 w-4 text-green-600" />;
      case "idle":
        return <PauseCircle className="h-4 w-4 text-yellow-600" />;
      case "maintenance":
        return <Wrench className="h-4 w-4 text-blue-600" />;
      case "breakdown":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "offline":
        return <PauseCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operating":
        return "bg-green-100 text-green-800";
      case "idle":
        return "bg-yellow-100 text-yellow-800";
      case "maintenance":
        return "bg-blue-100 text-blue-800";
      case "breakdown":
        return "bg-red-100 text-red-800";
      case "offline":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const operatingMachines = machines.filter(m => m.status === "operating").length;
  const criticalAlerts = machines.reduce((sum, m) => 
    sum + m.alerts.filter(a => a.type === "critical").length, 0
  );

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Machines Operating</p>
              <p className="text-2xl font-bold">{operatingMachines}/{machines.length}</p>
            </div>
            <Activity className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Efficiency</p>
              <p className="text-2xl font-bold">
                {machines.length > 0 
                  ? Math.round(machines.reduce((sum, m) => sum + m.efficiency, 0) / machines.length)
                  : 0}%
              </p>
            </div>
            <Gauge className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Critical Alerts</p>
              <p className="text-2xl font-bold">{criticalAlerts}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Power Usage</p>
              <p className="text-2xl font-bold">
                {machines.reduce((sum, m) => sum + m.powerConsumption, 0)} kW
              </p>
            </div>
            <Zap className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Machine Alerts</AlertTitle>
          <AlertDescription>
            {criticalAlerts} machines require immediate attention
          </AlertDescription>
        </Alert>
      )}

      {/* Machines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            Loading machines...
          </div>
        ) : (
          machines.map((machine) => (
            <Card 
              key={machine.id} 
              className={cn(
                "p-4 cursor-pointer transition-all",
                selectedMachine === machine.id && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedMachine(machine.id)}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{machine.name}</h4>
                      <p className="text-xs text-muted-foreground">{machine.model}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-xs", getStatusColor(machine.status))}>
                    {getStatusIcon(machine.status)}
                    <span className="ml-1">{machine.status}</span>
                  </Badge>
                </div>

                {/* Current Job */}
                {machine.currentJob && (
                  <div className="bg-muted rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">Current Job</p>
                    <p className="text-sm font-medium">{machine.currentJob}</p>
                    {machine.operator && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Operator: {machine.operator}
                      </p>
                    )}
                  </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Efficiency</span>
                      <span className="text-xs font-medium">{machine.efficiency}%</span>
                    </div>
                    <Progress value={machine.efficiency} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Utilization</span>
                      <span className="text-xs font-medium">{machine.utilizationRate}%</span>
                    </div>
                    <Progress value={machine.utilizationRate} className="h-2" />
                  </div>
                </div>

                {/* Real-time Data */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted rounded p-2">
                    <Thermometer className="h-4 w-4 mx-auto mb-1 text-orange-600" />
                    <p className="text-xs font-medium">{machine.temperature}°C</p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-600" />
                    <p className="text-xs font-medium">{machine.powerConsumption}kW</p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                    <p className="text-xs font-medium">{machine.runTime}h</p>
                  </div>
                </div>

                {/* Production Metrics */}
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground">Production Output</span>
                    <span className="font-medium">
                      {machine.production.currentOutput}/{machine.production.targetOutput} units
                    </span>
                  </div>
                  <Progress 
                    value={(machine.production.currentOutput / machine.production.targetOutput) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Maintenance Info */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Next Maintenance</span>
                  <span className={cn(
                    "font-medium",
                    machine.maintenanceSchedule.hoursUntilMaintenance < 48 && "text-orange-600"
                  )}>
                    {machine.maintenanceSchedule.hoursUntilMaintenance}h
                  </span>
                </div>

                {/* Alerts */}
                {machine.alerts.length > 0 && (
                  <div className="border-t pt-2">
                    {machine.alerts.slice(0, 2).map((alert, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs mb-1">
                        <AlertTriangle className={cn(
                          "h-3 w-3 mt-0.5",
                          alert.type === "critical" ? "text-red-600" :
                          alert.type === "warning" ? "text-yellow-600" :
                          "text-blue-600"
                        )} />
                        <span className="text-muted-foreground">{alert.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Machine Controls */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Quick Controls</h3>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Schedule Maintenance
          </Button>
          <Button variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            View Live Feed
          </Button>
          <Button variant="outline" size="sm">
            <Wrench className="h-4 w-4 mr-2" />
            Request Technician
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Maintenance Calendar
          </Button>
        </div>
      </Card>
    </div>
  );
}