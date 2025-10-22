import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/ui/loading-spinner";
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  BarChart3,
  Activity,
  Briefcase,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Globe
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function ExecutiveDashboard() {
  const { user } = useAuth();

  // Strategic metrics for executives
  const { data: executiveMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/analytics/executive-metrics"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: kpis } = useQuery({
    queryKey: ["/api/analytics/kpis"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: projectPortfolio } = useQuery({
    queryKey: ["/api/projects/portfolio"],
    staleTime: 10 * 60 * 1000,
  });

  const { data: riskAssessment } = useQuery({
    queryKey: ["/api/analytics/risk-assessment"],
    staleTime: 10 * 60 * 1000,
  });

  const { data: departmentPerformance } = useQuery({
    queryKey: ["/api/analytics/department-performance"],
    staleTime: 5 * 60 * 1000,
  });

  if (metricsLoading) {
    return <LoadingState />;
  }

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const formatPercentChange = (value: number) => {
    const isPositive = value >= 0;
    return (
      <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <ArrowUpRight className="h-4 w-4 mr-1" />
        ) : (
          <ArrowDownRight className="h-4 w-4 mr-1" />
        )}
        <span>{Math.abs(value)}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Executive Dashboard</h1>
          <p className="text-muted-foreground">
            Strategic Overview • {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Board Report
          </Button>
          <Button>
            <Globe className="h-4 w-4 mr-2" />
            Export Analytics
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted-foreground text-sm font-medium">Annual Revenue</p>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold mb-2">
              {formatCurrency(executiveMetrics?.annualRevenue || 0)}
            </p>
            {formatPercentChange(executiveMetrics?.revenueGrowth || 0)}
            <Progress value={executiveMetrics?.revenueProgress || 0} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-1">
              {executiveMetrics?.revenueProgress || 0}% of target
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted-foreground text-sm font-medium">EBITDA Margin</p>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold mb-2">
              {executiveMetrics?.ebitdaMargin || 0}%
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Target: {executiveMetrics?.ebitdaTarget || 25}%</span>
              <Badge variant={executiveMetrics?.ebitdaMargin >= executiveMetrics?.ebitdaTarget ? 'default' : 'destructive'}>
                {executiveMetrics?.ebitdaMargin >= executiveMetrics?.ebitdaTarget ? 'On Track' : 'Below Target'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted-foreground text-sm font-medium">Customer NPS</p>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold mb-2">
              {executiveMetrics?.npsScore || 0}
            </p>
            {formatPercentChange(executiveMetrics?.npsChange || 0)}
            <p className="text-xs text-muted-foreground mt-2">
              Industry avg: {executiveMetrics?.industryNps || 45}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted-foreground text-sm font-medium">Op. Efficiency</p>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold mb-2">
              {executiveMetrics?.operationalEfficiency || 0}%
            </p>
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-green-600">+{executiveMetrics?.efficiencyImprovement || 2.3}% QoQ</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Portfolio */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Major Project Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectPortfolio?.projects?.slice(0, 5).map((project: any) => (
                  <div key={project.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Client: {project.client} • Value: {formatCurrency(project.value)}
                        </p>
                      </div>
                      <Badge variant={
                        project.status === 'on-track' ? 'default' :
                        project.status === 'at-risk' ? 'destructive' :
                        'secondary'
                      }>
                        {project.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Margin: {project.margin}%
                        </span>
                        <span className="text-muted-foreground">
                          Due: {project.dueDate}
                        </span>
                      </div>
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-8">
                    No active major projects
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Assessment */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Risk Level</span>
                  <Badge variant={
                    riskAssessment?.level === 'low' ? 'default' :
                    riskAssessment?.level === 'medium' ? 'secondary' :
                    'destructive'
                  }>
                    {riskAssessment?.level || 'Low'}
                  </Badge>
                </div>
                <Progress 
                  value={riskAssessment?.score || 25} 
                  className={`h-2 ${
                    riskAssessment?.score <= 33 ? '[&>div]:bg-green-500' :
                    riskAssessment?.score <= 66 ? '[&>div]:bg-yellow-500' :
                    '[&>div]:bg-red-500'
                  }`}
                />
              </div>

              <div className="space-y-3 pt-2">
                {riskAssessment?.risks?.map((risk: any, index: number) => (
                  <div key={index} className="flex items-start gap-2">
                    {risk.severity === 'high' ? (
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    ) : risk.severity === 'medium' ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{risk.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Impact: ${risk.potentialImpact}
                      </p>
                    </div>
                  </div>
                )) || (
                  <>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Supply Chain</p>
                        <p className="text-xs text-muted-foreground">Stable, no disruptions</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Market Volatility</p>
                        <p className="text-xs text-muted-foreground">Steel prices fluctuating</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Department Performance Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {departmentPerformance?.departments?.map((dept: any) => (
              <div key={dept.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-medium">{dept.name}</p>
                  <Badge variant="outline">{dept.headcount} staff</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Efficiency</span>
                    <span className="font-medium">{dept.efficiency}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Budget Utilization</span>
                    <span className="font-medium">{dept.budgetUtilization}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Target Achievement</span>
                    <span className="font-medium">{dept.targetAchievement}%</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Monthly Cost</span>
                    <span className="text-sm font-bold">{formatCurrency(dept.monthlyCost)}</span>
                  </div>
                </div>
              </div>
            )) || (
              <div className="col-span-3 text-center py-8 text-muted-foreground">
                Department performance data loading...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}