import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/loading-spinner";
import JobList from "@/components/jobs/job-list";
import JobTable from "@/components/jobs/job-table";
import InventoryAlerts from "@/components/inventory/inventory-alerts";
import SetupWizard from "@/components/setup/setup-wizard";
import { ViewSwitcher } from "@/components/ui/view-switcher";
import { useAuth } from "@/contexts/auth-context";
import { 
  Briefcase, 
  Leaf, 
  Weight, 
  DollarSign,
  TrendingUp,
  Plus,
  Zap,
  Download,
  Upload,
  QrCode,
  PlusCircle,
  Check,
  Clock,
  User,
  Calendar,
  Play,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { JobStats, ActivityItem } from "@/types";

export default function Dashboard() {
  const { user } = useAuth();
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card' | 'list'>('table');

  // Performance optimization: Use parallel queries with stale time
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<JobStats>({
    queryKey: ["/api/analytics/stats"],
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2, // Retry failed requests
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const { data: jobs, isLoading: jobsLoading, error: jobsError } = useQuery({
    queryKey: ["/api/jobs"],
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: any[]) => data?.slice(0, 10), // Only show latest 10 jobs on dashboard
    retry: 2,
  });

  const { data: materials } = useQuery<any[], Error, number>({
    queryKey: ["/api/materials"],
    staleTime: 10 * 60 * 1000, // Materials don't change often
    select: (data: any[]) => data?.length || 0, // Only need count for dashboard
  });

  const { data: inventory } = useQuery<any[], Error, { totalItems: number; lowStock: number }>({
    queryKey: ["/api/inventory"],
    staleTime: 5 * 60 * 1000,
    select: (data: any[]) => ({
      totalItems: data?.length || 0,
      lowStock: data?.filter((item: any) => item.quantity < item.minQuantity).length || 0
    }),
  });

  // Recent activity - currently empty (will be populated from API when implemented)
  const recentActivity: ActivityItem[] = [];

  // Error state with retry button
  if (statsError || jobsError) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
        <div className="text-center space-y-2">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Unable to Load Dashboard</h2>
          <p className="text-muted-foreground max-w-md">
            We encountered an error while loading your dashboard data. Please try again.
          </p>
        </div>
        <Button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/analytics/stats"] });
            queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
          }}
          variant="default"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // Show skeleton loading for better perceived performance
  if (statsLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Action Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-10 w-24 bg-muted animate-pulse rounded-md" />
            <div className="h-10 w-28 bg-muted animate-pulse rounded-md" />
            <div className="h-10 w-20 bg-muted animate-pulse rounded-md" />
          </div>
        </div>

        {/* Skeleton Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Skeleton Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-6 w-28 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Debug Info - Remove this in production */}
      {user && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Debug Info (Current User)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1">
              <p>Username: {user.username}</p>
              <p>Role: <Badge variant="outline">{user.role}</Badge></p>
              <p>Has manageUsers permission: {user.permissions?.manageUsers ? '✅ Yes' : '❌ No'}</p>
              <p>Has systemSettings permission: {user.permissions?.systemSettings ? '✅ Yes' : '❌ No'}</p>
              <p>Has auditLogs permission: {user.permissions?.auditLogs ? '✅ Yes' : '❌ No'}</p>
              <p>Total permissions granted: {Object.values(user.permissions || {}).filter(Boolean).length} / {Object.keys(user.permissions || {}).length}</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <Button className="bg-secondary hover:bg-secondary/90" size="sm">
            <Plus className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">New Job</span>
            <span className="sm:hidden">New</span>
          </Button>
          <Button className="bg-accent hover:bg-accent/90" size="sm">
            <Zap className="w-4 h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Optimize All</span>
            <span className="sm:hidden">Optimize</span>
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1 sm:mr-2" />
            Export
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          {(materials || 0) === 0 && (
            <Button 
              onClick={() => setShowSetupWizard(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Setup Wizard
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground text-xs sm:text-sm font-medium">Active Jobs</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">
                  {stats?.activeJobs ?? 0}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Briefcase className="text-secondary w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 lg:mt-4 flex items-center">
              <span className="text-muted-foreground text-xs sm:text-sm">Weekly trend</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground text-xs sm:text-sm font-medium">Material Efficiency</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">
                  {stats?.avgEfficiency && stats.avgEfficiency > 0 
                    ? `${Number(stats.avgEfficiency).toFixed(1)}%` 
                    : <span className="text-lg sm:text-xl lg:text-2xl text-muted-foreground">No data</span>}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Leaf className="text-accent w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 lg:mt-4 flex items-center">
              <span className="text-accent text-xs sm:text-sm font-medium">No target set</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground text-xs sm:text-sm font-medium">Weekly Volume</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">
                  {stats?.weeklyVolume && stats.weeklyVolume > 0 
                    ? <>{stats.weeklyVolume} <span className="text-base sm:text-lg lg:text-xl">jobs</span></>
                    : <span className="text-lg sm:text-xl lg:text-2xl text-muted-foreground">No data</span>}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-warning/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Weight className="text-warning w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 lg:mt-4 flex items-center">
              <span className="text-muted-foreground text-xs sm:text-sm">capacity available</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground text-xs sm:text-sm font-medium">Total Value</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">
                  {stats?.totalValue && stats.totalValue > 0 
                    ? `$${stats.totalValue.toLocaleString()}` 
                    : <span className="text-lg sm:text-xl lg:text-2xl text-muted-foreground">No data</span>}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <DollarSign className="text-accent w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 lg:mt-4 flex items-center">
              <span className="text-accent text-xs sm:text-sm font-medium">This month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Jobs List - more compact on mobile */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-base sm:text-lg">Recent Jobs</CardTitle>
              <ViewSwitcher 
                view={viewMode} 
                onViewChange={setViewMode} 
                storageKey="dashboard-jobs-view-preference" 
              />
            </CardHeader>
            <CardContent className="p-0">
              {jobsLoading ? (
                <div className="flex items-center justify-center h-32 sm:h-48 lg:h-64">
                  <div className="space-y-2 sm:space-y-4">
                    <div className="h-6 w-6 sm:h-8 sm:w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground text-xs sm:text-sm">Loading jobs...</p>
                  </div>
                </div>
              ) : jobs && jobs.length > 0 ? (
                <div className="transition-all duration-300 ease-in-out max-h-64 sm:max-h-96 overflow-y-auto">
                  {viewMode === 'table' ? (
                    <JobTable jobs={jobs.slice(0, 5)} />
                  ) : (
                    <JobList />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 sm:h-48 lg:h-64 space-y-2 sm:space-y-4">
                  <Briefcase className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/50" />
                  <div className="text-center px-4">
                    <h3 className="font-medium text-sm sm:text-lg">No Jobs Yet</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm mt-1">
                      Create your first job to get started
                    </p>
                  </div>
                  <Button variant="default" size="sm" className="mt-2 sm:mt-4">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    Create First Job
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="ghost" className="w-full justify-between p-3 h-auto bg-secondary/5 hover:bg-secondary/10">
                <div className="flex items-center space-x-3">
                  <Upload className="text-secondary" />
                  <span className="font-medium">Upload Materials</span>
                </div>
                <div className="text-muted-foreground">→</div>
              </Button>
              <Button variant="ghost" className="w-full justify-between p-3 h-auto bg-accent/5 hover:bg-accent/10">
                <div className="flex items-center space-x-3">
                  <QrCode className="text-accent" />
                  <span className="font-medium">Scan Material</span>
                </div>
                <div className="text-muted-foreground">→</div>
              </Button>
              <Button variant="ghost" className="w-full justify-between p-3 h-auto bg-warning/5 hover:bg-warning/10">
                <div className="flex items-center space-x-3">
                  <PlusCircle className="text-warning" />
                  <span className="font-medium">Add Remnant</span>
                </div>
                <div className="text-muted-foreground">→</div>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'success' ? 'bg-accent/10' :
                      activity.type === 'info' ? 'bg-secondary/10' :
                      activity.type === 'warning' ? 'bg-warning/10' :
                      'bg-destructive/10'
                    }`}>
                      {activity.type === 'success' ? (
                        <Check className={`text-accent text-sm`} />
                      ) : activity.type === 'info' ? (
                        <Plus className={`text-secondary text-sm`} />
                      ) : (
                        <Zap className={`text-warning text-sm`} />
                      )}
                    </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Alerts */}
          <InventoryAlerts />
        </div>
      </div>

      {/* Setup Wizard */}
      <SetupWizard 
        open={showSetupWizard} 
        onOpenChange={setShowSetupWizard} 
      />
    </div>
  );
}
