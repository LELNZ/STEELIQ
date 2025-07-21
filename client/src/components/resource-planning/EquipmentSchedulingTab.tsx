import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench, AlertTriangle, CheckCircle, Clock, 
  Calendar, Settings, TrendingUp, Zap 
} from "lucide-react";

export default function EquipmentSchedulingTab() {
  const [view, setView] = useState("schedule");

  const equipment = [
    {
      id: 1,
      name: "Plasma Cutter #1",
      type: "Cutting",
      status: "operating",
      currentJob: "JOB-2025-001",
      utilization: 85,
      nextMaintenance: "Feb 15",
      hoursUsed: 1234,
      hoursUntilService: 166,
      efficiency: 92
    },
    {
      id: 2,
      name: "Press Brake #2",
      type: "Forming",
      status: "idle",
      currentJob: null,
      utilization: 65,
      nextMaintenance: "Mar 1",
      hoursUsed: 987,
      hoursUntilService: 413,
      efficiency: 88
    },
    {
      id: 3,
      name: "Welding Bay 1",
      type: "Welding",
      status: "operating",
      currentJob: "JOB-2025-002",
      utilization: 92,
      nextMaintenance: "Feb 8",
      hoursUsed: 2156,
      hoursUntilService: 44,
      efficiency: 95
    },
    {
      id: 4,
      name: "Drill Press #1",
      type: "Drilling",
      status: "maintenance",
      currentJob: null,
      utilization: 0,
      nextMaintenance: "In Progress",
      hoursUsed: 1500,
      hoursUntilService: 0,
      efficiency: 0
    }
  ];

  const upcomingSchedule = [
    { time: "08:00", equipment: "Plasma Cutter #1", job: "JOB-2025-001", duration: "4h", operator: "Manny M." },
    { time: "08:30", equipment: "Welding Bay 1", job: "JOB-2025-002", duration: "6h", operator: "Adam G." },
    { time: "10:00", equipment: "Press Brake #2", job: "JOB-2025-003", duration: "2h", operator: "Vili P." },
    { time: "13:00", equipment: "Plasma Cutter #1", job: "JOB-2025-004", duration: "3h", operator: "Chipo G." },
  ];

  const maintenanceSchedule = [
    { equipment: "Welding Bay 1", type: "Preventive", date: "Feb 8", duration: "4h", priority: "high" },
    { equipment: "Plasma Cutter #1", type: "Preventive", date: "Feb 15", duration: "6h", priority: "medium" },
    { equipment: "Press Brake #2", type: "Preventive", date: "Mar 1", duration: "3h", priority: "low" },
    { equipment: "Drill Press #1", type: "Corrective", date: "Today", duration: "8h", priority: "critical" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operating": return "bg-green-100 text-green-700";
      case "idle": return "bg-blue-100 text-blue-700";
      case "maintenance": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "warning";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Equipment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {equipment.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{item.type}</p>
                </div>
                <Badge className={getStatusColor(item.status)}>
                  {item.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Utilization</span>
                  <span>{item.utilization}%</span>
                </div>
                <Progress value={item.utilization} className="h-2" />
              </div>
              {item.currentJob && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Current: </span>
                  <Badge variant="outline" className="text-xs">{item.currentJob}</Badge>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Next service: {item.nextMaintenance}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs for Schedule Views */}
      <Tabs value={view} onValueChange={setView}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule">Today's Schedule</TabsTrigger>
          <TabsTrigger value="weekly">Weekly View</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Equipment Schedule - Today</CardTitle>
              <CardDescription>Real-time equipment allocation and upcoming jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingSchedule.map((schedule, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{schedule.time}</TableCell>
                      <TableCell>{schedule.equipment}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{schedule.job}</Badge>
                      </TableCell>
                      <TableCell>{schedule.duration}</TableCell>
                      <TableCell>{schedule.operator}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">Reschedule</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Optimization Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule Optimization</CardTitle>
              <CardDescription>AI-powered suggestions to improve equipment utilization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Combine cutting operations</p>
                  <p className="text-xs text-muted-foreground">
                    JOB-2025-003 and JOB-2025-004 use similar materials - combine to save 45 minutes setup time
                  </p>
                </div>
                <Button size="sm">Apply</Button>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Zap className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Move Press Brake job earlier</p>
                  <p className="text-xs text-muted-foreground">
                    Equipment idle from 08:00-10:00, moving job saves 2 hours idle time
                  </p>
                </div>
                <Button size="sm">Apply</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Equipment Calendar</CardTitle>
              <CardDescription>7-day equipment allocation overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                [Weekly calendar view would be implemented here]
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Maintenance Schedule</CardTitle>
                  <CardDescription>Preventive and corrective maintenance planning</CardDescription>
                </div>
                <Button>Schedule Maintenance</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceSchedule.map((maintenance, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{maintenance.equipment}</TableCell>
                      <TableCell>{maintenance.type}</TableCell>
                      <TableCell>{maintenance.date}</TableCell>
                      <TableCell>{maintenance.duration}</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(maintenance.priority) as any}>
                          {maintenance.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {maintenance.date === "Today" ? (
                          <Badge className="bg-red-100 text-red-700">In Progress</Badge>
                        ) : (
                          <Badge variant="outline">Scheduled</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Maintenance Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 border rounded-lg border-red-200 bg-red-50 dark:bg-red-900/20">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Welding Bay 1 - Service Due Soon</p>
                  <p className="text-xs text-muted-foreground">
                    44 hours until scheduled maintenance - ensure parts are ordered
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Clock className="h-5 w-5 text-orange-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Plasma Cutter #1 - High Usage Alert</p>
                  <p className="text-xs text-muted-foreground">
                    Running at 85% capacity - consider load balancing
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}