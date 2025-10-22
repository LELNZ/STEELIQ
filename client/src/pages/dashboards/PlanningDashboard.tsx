import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/loading-spinner";
import { 
  Calculator,
  Package,
  Scissors,
  BarChart3,
  Clock,
  AlertCircle,
  CheckCircle,
  Layers,
  Grid3x3,
  FileText,
  Target
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function PlanningDashboard() {
  const { user } = useAuth();

  // Planning-specific metrics
  const { data: planningMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/planning/metrics"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: cuttingPlans } = useQuery({
    queryKey: ["/api/cutting-plans/active"],
    staleTime: 2 * 60 * 1000,
  });

  const { data: materialUsage } = useQuery({
    queryKey: ["/api/materials/usage-stats"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: optimizationQueue } = useQuery({
    queryKey: ["/api/optimization/queue"],
    staleTime: 1 * 60 * 1000,
  });

  const { data: jobsInPlanning } = useQuery({
    queryKey: ["/api/jobs/planning-stage"],
    staleTime: 2 * 60 * 1000,
  });

  if (metricsLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planning Dashboard</h1>
          <p className="text-muted-foreground">
            {user?.name} • Planning Department
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Calculator className="h-4 w-4 mr-2" />
            Optimize All
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            New Cutting Plan
          </Button>
        </div>
      </div>

      {/* Planning Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Material Efficiency</p>
                <p className="text-2xl font-bold mt-1">
                  {planningMetrics?.materialEfficiency || 94.5}%
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Target: 95%
                </p>
              </div>
              <Layers className="h-10 w-10 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Active Plans</p>
                <p className="text-2xl font-bold mt-1">
                  {cuttingPlans?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {cuttingPlans?.filter((p: any) => p.status === 'optimized').length || 0} optimized
                </p>
              </div>
              <Scissors className="h-10 w-10 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Waste Reduction</p>
                <p className="text-2xl font-bold mt-1">
                  {planningMetrics?.wasteReduction || 18}%
                </p>
                <div className="flex items-center mt-2">
                  <Target className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-500">vs. manual planning</span>
                </div>
              </div>
              <Package className="h-10 w-10 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Jobs Pending</p>
                <p className="text-2xl font-bold mt-1">
                  {jobsInPlanning?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Avg. time: {planningMetrics?.avgPlanningTime || 2.5} hrs
                </p>
              </div>
              <Clock className="h-10 w-10 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Cutting Plans */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Active Cutting Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cuttingPlans?.slice(0, 5).map((plan: any) => (
                  <div key={plan.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium">{plan.planNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          Job: {plan.jobNumber} • {plan.materialType}
                        </p>
                      </div>
                      <Badge variant={
                        plan.status === 'optimized' ? 'default' :
                        plan.status === 'pending' ? 'secondary' :
                        'outline'
                      }>
                        {plan.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Efficiency</p>
                        <p className="font-medium">{plan.efficiency}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Pieces</p>
                        <p className="font-medium">{plan.pieceCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Waste</p>
                        <p className="font-medium">{plan.waste}%</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline">
                        View Plan
                      </Button>
                      {plan.status === 'pending' && (
                        <Button size="sm">
                          Optimize
                        </Button>
                      )}
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-8">
                    No active cutting plans
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Optimization Queue */}
        <Card>
          <CardHeader>
            <CardTitle>Optimization Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {optimizationQueue?.items?.slice(0, 5).map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      item.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                      item.status === 'completed' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{item.jobNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.pieceCount} pieces
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.estimatedTime}
                  </Badge>
                </div>
              )) || (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Queue empty - all plans optimized
                  </p>
                </div>
              )}
            </div>
            {optimizationQueue?.items?.length > 0 && (
              <Button className="w-full mt-4" variant="outline">
                Process All ({optimizationQueue.items.length})
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Material Usage & Planning Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Material Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Material Usage This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {materialUsage?.materials?.map((material: any) => (
                <div key={material.type}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">{material.type}</span>
                    <span className="text-sm font-medium">
                      {material.used}/{material.allocated} units
                    </span>
                  </div>
                  <Progress 
                    value={(material.used / material.allocated) * 100} 
                    className={
                      (material.used / material.allocated) > 0.9 
                        ? '[&>div]:bg-red-500' 
                        : ''
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Efficiency: {material.efficiency}%
                  </p>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">
                  No usage data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Planning Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Planning Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{planningMetrics?.plansCompleted || 47}</p>
                <p className="text-xs text-muted-foreground">Plans this week</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <Grid3x3 className="h-8 w-8 mx-auto mb-2 text-accent" />
                <p className="text-2xl font-bold">{planningMetrics?.nestingEfficiency || 89}%</p>
                <p className="text-xs text-muted-foreground">Nesting efficiency</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 text-warning" />
                <p className="text-2xl font-bold">{planningMetrics?.avgOptTime || 3.2}min</p>
                <p className="text-xs text-muted-foreground">Avg optimization</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <Package className="h-8 w-8 mx-auto mb-2 text-secondary" />
                <p className="text-2xl font-bold">{planningMetrics?.remnantsSaved || 124}</p>
                <p className="text-xs text-muted-foreground">Remnants saved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}