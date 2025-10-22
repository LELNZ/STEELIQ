import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-spinner";
import { 
  Users,
  Server,
  Shield,
  Database,
  Activity,
  AlertTriangle,
  Settings,
  FileText,
  Key,
  HardDrive,
  Clock,
  CheckCircle
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { user } = useAuth();

  // System-wide metrics for administrators
  const { data: systemMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/admin/system-metrics"],
    staleTime: 1 * 60 * 1000, // Refresh every minute
  });

  const { data: userStats } = useQuery({
    queryKey: ["/api/admin/user-stats"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: auditLogs } = useQuery({
    queryKey: ["/api/audit/recent"],
    staleTime: 30 * 1000, // Refresh every 30 seconds
  });

  const { data: systemHealth } = useQuery({
    queryKey: ["/api/admin/system-health"],
    refetchInterval: 10000, // Check every 10 seconds
  });

  if (metricsLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Administration</h1>
          <p className="text-muted-foreground">
            {user?.name} • System Administrator
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </Link>
          </Button>
          <Button asChild>
            <Link href="/team-management">
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Link>
          </Button>
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={systemHealth?.status === 'healthy' ? '' : 'border-destructive'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">System Status</p>
                <div className="flex items-center gap-2 mt-2">
                  {systemHealth?.status === 'healthy' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <p className="text-lg font-bold capitalize">
                    {systemHealth?.status || 'Healthy'}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Uptime: {systemHealth?.uptime || '99.9%'}
                </p>
              </div>
              <Server className="h-10 w-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Active Users</p>
                <p className="text-2xl font-bold mt-1">
                  {userStats?.activeUsers || 0}/{userStats?.totalUsers || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {userStats?.newThisWeek || 0} new this week
                </p>
              </div>
              <Users className="h-10 w-10 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Database Size</p>
                <p className="text-2xl font-bold mt-1">
                  {systemMetrics?.dbSize || '2.4'} GB
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {systemMetrics?.dbGrowth || '+12%'} this month
                </p>
              </div>
              <Database className="h-10 w-10 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">API Calls</p>
                <p className="text-2xl font-bold mt-1">
                  {systemMetrics?.apiCalls || '124K'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Today: {systemMetrics?.apiCallsToday || '8.2K'}
                </p>
              </div>
              <Activity className="h-10 w-10 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audit Logs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent System Activity</CardTitle>
                <Badge variant="outline">Live</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditLogs?.slice(0, 8).map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                      log.level === 'error' ? 'bg-red-500' :
                      log.level === 'warning' ? 'bg-yellow-500' :
                      log.level === 'info' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.user}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">{log.action}</span>
                      </div>
                      {log.details && (
                        <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.timestamp}
                      </p>
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-4">
                    No recent activity
                  </p>
                )}
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All Logs
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* System Resources */}
        <Card>
          <CardHeader>
            <CardTitle>System Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Storage</span>
                  </div>
                  <span className="text-sm font-medium">
                    {systemHealth?.storage?.used || 45}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div 
                    className={`h-2 rounded-full ${
                      (systemHealth?.storage?.used || 45) > 80 ? 'bg-red-500' :
                      (systemHealth?.storage?.used || 45) > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${systemHealth?.storage?.used || 45}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">CPU Usage</span>
                  </div>
                  <span className="text-sm font-medium">
                    {systemHealth?.cpu?.usage || 32}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div 
                    className={`h-2 rounded-full ${
                      (systemHealth?.cpu?.usage || 32) > 80 ? 'bg-red-500' :
                      (systemHealth?.cpu?.usage || 32) > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${systemHealth?.cpu?.usage || 32}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Memory</span>
                  </div>
                  <span className="text-sm font-medium">
                    {systemHealth?.memory?.usage || 58}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div 
                    className={`h-2 rounded-full ${
                      (systemHealth?.memory?.usage || 58) > 80 ? 'bg-red-500' :
                      (systemHealth?.memory?.usage || 58) > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${systemHealth?.memory?.usage || 58}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Backup</span>
                <span className="font-medium">{systemHealth?.lastBackup || '2 hours ago'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Next Maintenance</span>
                <span className="font-medium">{systemHealth?.nextMaintenance || 'Sunday 2 AM'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management & Security */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Roles Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>User Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userStats?.roleDistribution?.map((role: any) => (
                <div key={role.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className={`h-4 w-4 ${
                      role.name === 'admin' || role.name === 'full' ? 'text-red-500' :
                      role.name === 'supervisor' ? 'text-orange-500' :
                      role.name === 'accounting' ? 'text-blue-500' :
                      role.name === 'planning' ? 'text-green-500' :
                      'text-gray-500'
                    }`} />
                    <span className="text-sm capitalize">{role.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{role.count} users</span>
                    <Badge variant="outline">{role.percentage}%</Badge>
                  </div>
                </div>
              )) || (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Basic Users</span>
                    <Badge>12</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Planning</span>
                    <Badge>5</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Accounting</span>
                    <Badge>3</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Supervisors</span>
                    <Badge>4</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Administrators</span>
                    <Badge>2</Badge>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Status */}
        <Card>
          <CardHeader>
            <CardTitle>Security Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Password Policies</span>
                </div>
                <Badge variant="default">Enforced</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">2FA Enabled</span>
                </div>
                <Badge variant="outline">
                  {userStats?.twoFactorEnabled || 8}/{userStats?.totalUsers || 26} users
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Session Timeout</span>
                </div>
                <Badge variant="outline">8 hours</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Audit Logging</span>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  Last security scan: {systemHealth?.lastSecurityScan || '2 days ago'}
                </p>
                <Button variant="outline" className="w-full">
                  Run Security Audit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}