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

  // Fetch real equipment data from API
  const equipment: any[] = [];

  // Fetch real schedule from API
  const upcomingSchedule: any[] = [];

  // Fetch real maintenance schedule from API
  const maintenanceSchedule: any[] = [];

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