import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/loading-spinner";
import { 
  Users,
  Clock,
  BarChart3,
  Wrench,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Shield,
  Calendar,
  FileText,
  Activity
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function SupervisorDashboard() {
  const { user } = useAuth();

  // Department-level metrics for supervisors
  const { data: departmentMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/analytics/department-metrics", user?.department],
    staleTime: 5 * 60 * 1000,
  });

  const { data: teamPerformance } = useQuery({
    queryKey: ["/api/team/performance", user?.department],
    staleTime: 5 * 60 * 1000,
  });

  const { data: productionSchedule } = useQuery({
    queryKey: ["/api/production/schedule", user?.department],
    staleTime: 2 * 60 * 1000,
  });

  const { data: qualityMetrics } = useQuery({
    queryKey: ["/api/quality/metrics", user?.department],
    staleTime: 5 * 60 * 1000,
  });

  const { data: safetyIncidents } = useQuery({
    queryKey: ["/api/safety/incidents", user?.department],
    staleTime: 10 * 60 * 1000,
  });

  if (metricsLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Supervisor Dashboard</h1>
          <p className="text-muted-foreground">
            {user?.name} • {user?.department || 'Department'} Supervisor
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Shift Report
          </Button>
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Team Schedule
          </Button>
        </div>
      </div>

      {/* Department Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Team Members</p>
                <p className="text-2xl font-bold mt-1">
                  {departmentMetrics?.activeStaff || 0}/{departmentMetrics?.totalStaff || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {departmentMetrics?.onLeave || 0} on leave
                </p>
              </div>
              <Users className="h-10 w-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Dept. Efficiency</p>
                <p className="text-2xl font-bold mt-1">
                  {departmentMetrics?.efficiency || 0}%
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-500">+3% this week</span>
                </div>
              </div>
              <Activity className="h-10 w-10 text-accent opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Quality Score</p>
                <p className="text-2xl font-bold mt-1">
                  {qualityMetrics?.score || 98.5}%
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {qualityMetrics?.defects || 2} defects
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Safety Days</p>
                <p className="text-2xl font-bold mt-1">
                  {safetyIncidents?.daysSinceIncident || 45}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Target: 60 days
                </p>
              </div>
              <Shield className="h-10 w-10 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Performance */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamPerformance?.members?.slice(0, 5).map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        member.status === 'active' ? 'bg-green-500' :
                        member.status === 'break' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`} />
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.role} • {member.shift}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">{member.efficiency}%</p>
                        <p className="text-xs text-muted-foreground">efficiency</p>
                      </div>
                      <Badge variant={member.performance === 'excellent' ? 'default' : 'secondary'}>
                        {member.performance}
                      </Badge>
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-4">
                    No team data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Production Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {productionSchedule?.tasks?.map((task: any, index: number) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full ${
                    task.status === 'completed' ? 'bg-green-500' :
                    task.status === 'in-progress' ? 'bg-blue-500' :
                    'bg-gray-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{task.time}</p>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    {task.assignedTo && (
                      <Badge variant="outline" className="mt-1">{task.assignedTo}</Badge>
                    )}
                  </div>
                </div>
              )) || (
                <>
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">6:00 AM - 10:00 AM</p>
                      <p className="text-sm text-muted-foreground">Morning production run</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">10:30 AM - 12:00 PM</p>
                      <p className="text-sm text-muted-foreground">Quality inspection</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">1:00 PM - 5:00 PM</p>
                      <p className="text-sm text-muted-foreground">Afternoon production</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Targets */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Production Targets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Cutting Operations</span>
                  <span className="text-sm font-medium">
                    {departmentMetrics?.cutting?.completed || 0}/{departmentMetrics?.cutting?.target || 100}
                  </span>
                </div>
                <Progress value={(departmentMetrics?.cutting?.completed / departmentMetrics?.cutting?.target) * 100 || 0} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Welding Operations</span>
                  <span className="text-sm font-medium">
                    {departmentMetrics?.welding?.completed || 0}/{departmentMetrics?.welding?.target || 80}
                  </span>
                </div>
                <Progress value={(departmentMetrics?.welding?.completed / departmentMetrics?.welding?.target) * 100 || 0} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Assembly Operations</span>
                  <span className="text-sm font-medium">
                    {departmentMetrics?.assembly?.completed || 0}/{departmentMetrics?.assembly?.target || 60}
                  </span>
                </div>
                <Progress value={(departmentMetrics?.assembly?.completed / departmentMetrics?.assembly?.target) * 100 || 0} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issues & Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Active Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {departmentMetrics?.issues?.map((issue: any, index: number) => (
                <div key={index} className="flex items-start gap-2">
                  <AlertCircle className={`h-4 w-4 mt-0.5 ${
                    issue.severity === 'high' ? 'text-red-500' :
                    issue.severity === 'medium' ? 'text-yellow-500' :
                    'text-blue-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{issue.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {issue.machine} • Reported {issue.time}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Resolve
                  </Button>
                </div>
              )) || (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>No active issues</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}