import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Info } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from "recharts";

export default function CapacityPlanningTab() {
  const capacityData = [
    { date: "Mon", planned: 85, actual: 78, optimal: 80 },
    { date: "Tue", planned: 90, actual: 92, optimal: 80 },
    { date: "Wed", planned: 75, actual: 71, optimal: 80 },
    { date: "Thu", planned: 80, actual: 82, optimal: 80 },
    { date: "Fri", planned: 70, actual: 65, optimal: 80 },
    { date: "Sat", planned: 40, actual: 45, optimal: 40 },
  ];

  const departmentCapacity = [
    { department: "Cutting", capacity: 85, available: 15, status: "high" },
    { department: "Welding", capacity: 92, available: 8, status: "critical" },
    { department: "Assembly", capacity: 65, available: 35, status: "optimal" },
    { department: "Finishing", capacity: 73, available: 27, status: "optimal" },
    { department: "QC/Inspection", capacity: 58, available: 42, status: "low" },
  ];

  const upcomingBottlenecks = [
    { date: "Feb 5", department: "Welding", severity: "high", reason: "3 large projects converging", impact: "2-day delay risk" },
    { date: "Feb 12", department: "Cutting", severity: "medium", reason: "Maintenance scheduled", impact: "Reduced capacity by 40%" },
    { date: "Feb 18", department: "Assembly", severity: "low", reason: "New project starting", impact: "May need overtime" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical": return "text-red-500";
      case "high": return "text-orange-500";
      case "optimal": return "text-green-500";
      case "low": return "text-blue-500";
      default: return "text-gray-500";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "critical": return "destructive";
      case "high": return "warning";
      case "optimal": return "success";
      case "low": return "info";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Weekly Capacity Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Weekly Capacity Overview</CardTitle>
              <CardDescription>Workshop utilization vs optimal capacity</CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Optimal capacity is 75-85% to allow for urgent jobs and maintenance</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={capacityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} name="Actual" />
              <Line type="monotone" dataKey="planned" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Planned" />
              <Line type="monotone" dataKey="optimal" stroke="#10b981" strokeWidth={1} name="Optimal" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Department Capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Department Capacity Status</CardTitle>
            <CardDescription>Current utilization by department</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {departmentCapacity.map((dept) => (
              <div key={dept.department} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{dept.department}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadge(dept.status) as any}>
                      {dept.capacity}%
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {dept.available}% available
                    </span>
                  </div>
                </div>
                <Progress value={dept.capacity} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capacity Optimization Suggestions</CardTitle>
            <CardDescription>AI-powered recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Shift welding jobs to Tuesday/Thursday</p>
                  <p className="text-xs text-muted-foreground">Could reduce bottleneck by 15%</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <TrendingDown className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Schedule maintenance during low periods</p>
                  <p className="text-xs text-muted-foreground">Fridays show 35% lower utilization</p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Consider outsourcing overflow cutting</p>
                  <p className="text-xs text-muted-foreground">Next week shows 110% demand</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bottlenecks */}
      <Card>
        <CardHeader>
          <CardTitle>Predicted Bottlenecks</CardTitle>
          <CardDescription>Potential capacity issues in the next 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingBottlenecks.map((bottleneck, index) => (
              <div key={index} className="flex items-start gap-4 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{bottleneck.date}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm">{bottleneck.department}</span>
                    <Badge variant={bottleneck.severity === "high" ? "destructive" : bottleneck.severity === "medium" ? "warning" : "secondary"}>
                      {bottleneck.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{bottleneck.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">Impact: {bottleneck.impact}</p>
                </div>
                <Button size="sm" variant="outline">Mitigate</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Capacity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Average Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78.3%</div>
            <p className="text-xs text-muted-foreground mt-1">Within optimal range</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Tue 10-12</div>
            <p className="text-xs text-muted-foreground mt-1">Highest demand period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Idle Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12.5%</div>
            <p className="text-xs text-muted-foreground mt-1">Acceptable buffer</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}