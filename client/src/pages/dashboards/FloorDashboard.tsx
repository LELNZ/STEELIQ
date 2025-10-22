import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-spinner";
import { 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Wrench,
  Activity,
  BarChart3,
  Calendar,
  Users,
  Target,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function FloorDashboard() {
  const { user } = useAuth();

  // Production metrics without financial data
  const { data: productionStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/production/floor-metrics", user?.department],
    staleTime: 60 * 1000, // Refresh every minute
  });

  const { data: activeWorkOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/work-orders/active", user?.department],
    staleTime: 2 * 60 * 1000,
  });

  const { data: shiftStatus, isLoading: shiftLoading } = useQuery({
    queryKey: ["/api/time/shift-status", user?.id],
    refetchInterval: 30000, // Check every 30 seconds
  });

  const { data: teamMetrics } = useQuery({
    queryKey: ["/api/production/team-metrics", user?.department],
    staleTime: 5 * 60 * 1000,
  });

  if (statsLoading || ordersLoading || shiftLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Production Floor</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name} • {user?.department || 'Production'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={shiftStatus?.clockedIn ? "default" : "secondary"}>
            <Clock className="h-3 w-3 mr-1" />
            {shiftStatus?.clockedIn ? "On Shift" : "Off Shift"}
          </Badge>
        </div>
      </div>

      {/* Shift Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Today's Target</p>
                <p className="text-2xl font-bold mt-1">
                  {productionStats?.dailyTarget || 0} units
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {productionStats?.completedToday || 0} completed
                </p>
              </div>
              <Target className="h-10 w-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Shift Efficiency</p>
                <p className="text-2xl font-bold mt-1">
                  {productionStats?.efficiency || 0}%
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-500">+5% from last shift</span>
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
                <p className="text-muted-foreground text-sm">Active Orders</p>
                <p className="text-2xl font-bold mt-1">
                  {activeWorkOrders?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {activeWorkOrders?.filter((o: any) => o.priority === 'high').length || 0} high priority
                </p>
              </div>
              <Wrench className="h-10 w-10 text-warning opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Team Members</p>
                <p className="text-2xl font-bold mt-1">
                  {teamMetrics?.activeMembers || 0}/{teamMetrics?.totalMembers || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Currently on floor
                </p>
              </div>
              <Users className="h-10 w-10 text-secondary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Active Work Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeWorkOrders?.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      order.status === 'in_progress' ? 'bg-blue-500' :
                      order.status === 'completed' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`} />
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground">{order.operation}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={order.priority === 'high' ? 'destructive' : 'secondary'}>
                      {order.priority}
                    </Badge>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">
                  No active work orders
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Production Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Shift</span>
                <Badge>{shiftStatus?.shiftName || 'Day Shift'}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shift Hours</span>
                <span>{shiftStatus?.shiftHours || '6:00 AM - 2:00 PM'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Break Time</span>
                <span>{shiftStatus?.nextBreak || '10:00 AM'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overtime Available</span>
                <Badge variant="outline">{shiftStatus?.overtimeAvailable ? 'Yes' : 'No'}</Badge>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium">Today's Focus Areas</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Complete pending cutting operations</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span>Quality check on batch #2341</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span>Machine maintenance at 1:00 PM</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Department Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{productionStats?.qualityScore || 98}%</p>
              <p className="text-xs text-muted-foreground">Quality Score</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Clock className="h-8 w-8 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">{productionStats?.onTimeDelivery || 95}%</p>
              <p className="text-xs text-muted-foreground">On-Time Delivery</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Activity className="h-8 w-8 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold">{productionStats?.machineUptime || 92}%</p>
              <p className="text-xs text-muted-foreground">Machine Uptime</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-secondary" />
              <p className="text-2xl font-bold">{productionStats?.safetyScore || 100}</p>
              <p className="text-xs text-muted-foreground">Safety Days</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}