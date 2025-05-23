import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import JobList from "@/components/jobs/job-list";
import InventoryAlerts from "@/components/inventory/inventory-alerts";
import SetupWizard from "@/components/setup/setup-wizard";
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
  Play
} from "lucide-react";
import { JobStats, ActivityItem } from "@/types";

export default function Dashboard() {
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<JobStats>({
    queryKey: ["/api/analytics/stats"],
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/jobs"],
  });

  const { data: materials } = useQuery<any[]>({
    queryKey: ["/api/materials"],
  });

  const { data: inventory } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });

  // Mock activity data - in real app this would come from API
  const recentActivity: ActivityItem[] = [
    {
      id: "1",
      action: "Job JOB-2024-001 cutting completed",
      time: "2 minutes ago",
      type: "success"
    },
    {
      id: "2", 
      action: "New material batch received",
      time: "15 minutes ago",
      type: "info"
    },
    {
      id: "3",
      action: "Optimization completed for JOB-2024-002", 
      time: "1 hour ago",
      type: "info"
    }
  ];

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button className="bg-secondary hover:bg-secondary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Job
          </Button>
          <Button className="bg-accent hover:bg-accent/90">
            <Zap className="w-4 h-4 mr-2" />
            Optimize All
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          {(materials?.length || 0) === 0 && (
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Active Jobs</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {stats?.activeJobs ?? 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Briefcase className="text-secondary text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="w-4 h-4 text-accent mr-1" />
              <span className="text-accent text-sm font-medium">+8%</span>
              <span className="text-muted-foreground text-sm ml-1">from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Material Efficiency</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {stats?.avgEfficiency ? Number(stats.avgEfficiency).toFixed(1) : '0.0'}%
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <Leaf className="text-accent text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-accent text-sm font-medium">Target: 95%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Weekly Volume</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {stats?.weeklyVolume ?? 0} jobs
                </p>
              </div>
              <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                <Weight className="text-warning text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-muted-foreground text-sm">of 5t capacity</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Value</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  ${stats?.totalValue?.toLocaleString() ?? '0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                <DollarSign className="text-accent text-xl" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-accent text-sm font-medium">This month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs List */}
        <div className="lg:col-span-2">
          <JobList />
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
              {recentActivity.map((activity) => (
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
              ))}
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
