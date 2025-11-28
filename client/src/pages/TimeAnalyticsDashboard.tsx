import { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, TrendingDown, Clock, DollarSign, Users, 
  AlertCircle, Calendar, Activity, BarChart3, Target,
  Timer, AlertTriangle, CheckCircle, XCircle, ArrowUp,
  ArrowDown, TrendingUpIcon, Award, Coffee, UserCheck,
  Briefcase, Shield, Zap, Building2, ChevronUp, ChevronDown
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface KPIMetric {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: any;
  description?: string;
}

interface PredictiveForecast {
  nextPeriodCost: { amount: number; confidence: number };
  budgetVariance: { predicted: number; threshold: number; status: string };
  overtimeRisk: { level: string; probability: number; potentialCost: number };
  recommendations: string[];
}

interface ComparisonItem {
  metric: string;
  current: number;
  previous: number;
  changePercentage: number;
  trend: string;
  currentPeriodDays?: number;
  previousPeriodDays?: number;
  dataQuality?: 'high' | 'medium' | 'low' | 'insufficient';
}

interface TrendAnalytics {
  summary: {
    overallTrend: 'increasing' | 'decreasing' | 'stable';
    volatilityIndex: number;
    predictabilityScore: number;
    seasonalityStrength: number;
    recommendedActions: string[];
  };
  comparisons: {
    weekOverWeek: ComparisonItem[];
    monthOverMonth: ComparisonItem[];
  };
  anomalies: Array<{ date: string; metric: string; severity: string; description: string }>;
}

interface EscalationDashboard {
  slaMetrics: {
    totalPending: number;
    onTrack: number;
    warning: number;
    breached: number;
    critical: number;
    avgApprovalTimeHours: number;
    slaComplianceRate: number;
  };
  pendingApprovals: Array<{
    timesheetId: number;
    employeeName: string;
    departmentName: string;
    hoursOverdue: number;
    escalationStatus: string;
  }>;
  departmentBreakdown: Array<{
    departmentName: string;
    pendingCount: number;
    breachedCount: number;
    avgTimeToApproval: number;
  }>;
}

interface TimeAnalytics {
  overview: {
    totalEmployees: number;
    activeToday: number;
    onTime: number;
    late: number;
    absent: number;
    onBreak: number;
    totalHoursToday: number;
    totalHoursWeek: number;
    totalHoursMonth: number;
    overtimeHours: number;
    averageHoursPerDay: number;
  };
  payroll: {
    currentPeriodCost: number;
    projectedCost: number;
    overtimeCost: number;
    regularCost: number;
    averageCostPerHour: number;
    costVariance: number;
    budgetUtilization: number;
  };
  compliance: {
    overtimeViolations: number;
    breakViolations: number;
    lateClockIns: number;
    missedClockOuts: number;
    complianceScore: number;
  };
  productivity: {
    utilizationRate: number;
    billableHours: number;
    nonBillableHours: number;
    idleTime: number;
    productivityScore: number;
  };
  trends: {
    daily: Array<{ date: string; hours: number; cost: number; employees: number }>;
    weekly: Array<{ week: string; hours: number; cost: number; overtime: number }>;
    departmental: Array<{ department: string; hours: number; cost: number; efficiency: number }>;
  };
}

export default function TimeAnalyticsDashboard() {
  const [period, setPeriod] = useState('week');
  const [department, setDepartment] = useState('all');
  const [refreshInterval, setRefreshInterval] = useState(60000); // 1 minute

  // Fetch analytics data
  const { data: analytics, isLoading, error } = useQuery<TimeAnalytics>({
    queryKey: ['/api/time/analytics', period, department],
    refetchInterval: refreshInterval,
  });

  // Fetch departments for filter
  const { data: departments = [] } = useQuery({
    queryKey: ['/api/departments'],
  });

  // Fortune 50 Wave 4: Executive Analytics
  const { data: predictiveForecast } = useQuery<PredictiveForecast>({
    queryKey: ['/api/time/predictive-labor/forecast'],
    refetchInterval: 300000, // 5 minutes
  });

  const { data: trendAnalytics } = useQuery<TrendAnalytics>({
    queryKey: ['/api/time/trend-analysis'],
    refetchInterval: 300000,
  });

  const { data: escalationData } = useQuery<EscalationDashboard>({
    queryKey: ['/api/time/escalation/dashboard'],
    refetchInterval: 60000, // 1 minute
  });

  // Calculate KPI metrics
  const kpiMetrics: KPIMetric[] = analytics ? [
    {
      title: "Active Employees",
      value: `${analytics.overview.activeToday}/${analytics.overview.totalEmployees}`,
      change: ((analytics.overview.activeToday / analytics.overview.totalEmployees) * 100),
      changeType: 'neutral',
      icon: Users,
      description: "Currently clocked in"
    },
    {
      title: "Total Hours Today",
      value: analytics.overview.totalHoursToday.toFixed(1),
      change: analytics.overview.averageHoursPerDay ? 
        ((analytics.overview.totalHoursToday - analytics.overview.averageHoursPerDay) / analytics.overview.averageHoursPerDay * 100) : 0,
      changeType: analytics.overview.totalHoursToday > analytics.overview.averageHoursPerDay ? 'positive' : 'negative',
      icon: Clock,
      description: "Hours worked today"
    },
    {
      title: "Current Period Cost",
      value: `$${analytics.payroll.currentPeriodCost.toLocaleString()}`,
      change: analytics.payroll.costVariance,
      changeType: analytics.payroll.costVariance < 0 ? 'positive' : 'negative',
      icon: DollarSign,
      description: "Total labor cost"
    },
    {
      title: "Overtime Hours",
      value: analytics.overview.overtimeHours.toFixed(1),
      change: analytics.payroll.overtimeCost / analytics.payroll.regularCost * 100,
      changeType: analytics.overview.overtimeHours > 40 ? 'negative' : 'neutral',
      icon: AlertTriangle,
      description: "This period"
    },
    {
      title: "Compliance Score",
      value: `${analytics.compliance.complianceScore}%`,
      changeType: analytics.compliance.complianceScore >= 90 ? 'positive' : 
                   analytics.compliance.complianceScore >= 70 ? 'neutral' : 'negative',
      icon: CheckCircle,
      description: "Overall compliance"
    },
    {
      title: "Productivity Rate",
      value: `${analytics.productivity.utilizationRate.toFixed(1)}%`,
      change: analytics.productivity.productivityScore - 75,
      changeType: analytics.productivity.utilizationRate >= 80 ? 'positive' : 
                   analytics.productivity.utilizationRate >= 60 ? 'neutral' : 'negative',
      icon: Activity,
      description: "Resource utilization"
    }
  ] : [];

  // Chart configurations
  const attendanceChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Hours Worked',
        data: analytics?.trends.daily.slice(-7).map(d => d.hours) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true
      },
      {
        label: 'Employees',
        data: analytics?.trends.daily.slice(-7).map(d => d.employees) || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.3,
        fill: true,
        yAxisID: 'y1'
      }
    ]
  };

  const costChartData = {
    labels: analytics?.trends.weekly.map(w => w.week) || [],
    datasets: [
      {
        label: 'Regular Cost',
        data: analytics?.trends.weekly.map(w => w.cost - w.overtime) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
      {
        label: 'Overtime Cost',
        data: analytics?.trends.weekly.map(w => w.overtime) || [],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load analytics data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Time & Attendance Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Real-time insights into workforce management and payroll
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept: any) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Activity className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiMetrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <metric.icon className="w-4 h-4 text-muted-foreground" />
                {metric.change !== undefined && (
                  <Badge variant={
                    metric.changeType === 'positive' ? 'default' :
                    metric.changeType === 'negative' ? 'destructive' : 'secondary'
                  } className="text-xs">
                    {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{metric.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{metric.title}</p>
              {metric.description && (
                <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="executive" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-[750px]">
          <TabsTrigger value="executive" data-testid="tab-executive">Executive</TabsTrigger>
          <TabsTrigger value="attendance" data-testid="tab-attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll" data-testid="tab-payroll">Payroll</TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance</TabsTrigger>
          <TabsTrigger value="productivity" data-testid="tab-productivity">Productivity</TabsTrigger>
        </TabsList>

        {/* Executive Tab - Fortune 50 CFO-Level Dashboard */}
        <TabsContent value="executive" className="space-y-4" data-testid="executive-dashboard">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Predicted Cost Card */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Briefcase className="w-5 h-5 text-blue-500" />
                  <Badge variant="outline" className="text-xs">Forecast</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  ${predictiveForecast?.nextPeriodCost?.amount?.toLocaleString() || '0'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Next Period Projected Cost</p>
                {predictiveForecast?.nextPeriodCost?.confidence && (
                  <div className="flex items-center gap-1 mt-2">
                    <Shield className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-600">
                      {predictiveForecast.nextPeriodCost.confidence}% confidence
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Budget Variance Card */}
            <Card className={`border-l-4 ${
              predictiveForecast?.budgetVariance?.status === 'on_track' ? 'border-l-green-500' :
              predictiveForecast?.budgetVariance?.status === 'warning' ? 'border-l-yellow-500' : 'border-l-red-500'
            }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Target className="w-5 h-5 text-purple-500" />
                  <Badge variant={
                    predictiveForecast?.budgetVariance?.status === 'on_track' ? 'default' :
                    predictiveForecast?.budgetVariance?.status === 'warning' ? 'secondary' : 'destructive'
                  } className="text-xs">
                    {predictiveForecast?.budgetVariance?.status || 'N/A'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {predictiveForecast?.budgetVariance?.predicted !== undefined
                    ? `${predictiveForecast.budgetVariance.predicted > 0 ? '+' : ''}${predictiveForecast.budgetVariance.predicted.toFixed(1)}%`
                    : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Predicted Budget Variance</p>
                <p className="text-xs text-muted-foreground">
                  Threshold: ±{predictiveForecast?.budgetVariance?.threshold || 10}%
                </p>
              </CardContent>
            </Card>

            {/* Overtime Risk Card */}
            <Card className={`border-l-4 ${
              predictiveForecast?.overtimeRisk?.level === 'low' ? 'border-l-green-500' :
              predictiveForecast?.overtimeRisk?.level === 'medium' ? 'border-l-yellow-500' : 'border-l-red-500'
            }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <Badge variant={
                    predictiveForecast?.overtimeRisk?.level === 'low' ? 'default' :
                    predictiveForecast?.overtimeRisk?.level === 'medium' ? 'secondary' : 'destructive'
                  } className="text-xs capitalize">
                    {predictiveForecast?.overtimeRisk?.level || 'Unknown'} Risk
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {predictiveForecast?.overtimeRisk?.probability?.toFixed(0) || 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Overtime Breach Probability</p>
                {predictiveForecast?.overtimeRisk?.potentialCost && (
                  <p className="text-xs text-orange-600 mt-1">
                    Potential Cost: ${predictiveForecast.overtimeRisk.potentialCost.toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* SLA Compliance Card */}
            <Card className={`border-l-4 ${
              (escalationData?.slaMetrics?.slaComplianceRate || 0) >= 90 ? 'border-l-green-500' :
              (escalationData?.slaMetrics?.slaComplianceRate || 0) >= 70 ? 'border-l-yellow-500' : 'border-l-red-500'
            }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <Badge variant="outline" className="text-xs">Approvals</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {escalationData?.slaMetrics?.slaComplianceRate?.toFixed(1) || 100}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">SLA Compliance Rate</p>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="text-yellow-600">{escalationData?.slaMetrics?.warning || 0} warning</span>
                  <span className="text-red-600">{escalationData?.slaMetrics?.breached || 0} breached</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trend Summary and Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Trend Analysis Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Trend Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Trend</span>
                  <div className="flex items-center gap-2">
                    {trendAnalytics?.summary?.overallTrend === 'increasing' ? (
                      <ChevronUp className="w-4 h-4 text-green-500" />
                    ) : trendAnalytics?.summary?.overallTrend === 'decreasing' ? (
                      <ChevronDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <ArrowUp className="w-4 h-4 text-gray-500 rotate-90" />
                    )}
                    <Badge variant="outline" className="capitalize">
                      {trendAnalytics?.summary?.overallTrend || 'Stable'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Volatility Index</span>
                    <span className="font-medium">{trendAnalytics?.summary?.volatilityIndex?.toFixed(1) || 0}%</span>
                  </div>
                  <Progress value={trendAnalytics?.summary?.volatilityIndex || 0} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Predictability Score</span>
                    <span className="font-medium">{trendAnalytics?.summary?.predictabilityScore?.toFixed(0) || 0}/100</span>
                  </div>
                  <Progress value={trendAnalytics?.summary?.predictabilityScore || 0} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Seasonality Strength</span>
                    <span className="font-medium">{trendAnalytics?.summary?.seasonalityStrength?.toFixed(1) || 0}%</span>
                  </div>
                  <Progress value={trendAnalytics?.summary?.seasonalityStrength || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  AI-Powered Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(predictiveForecast?.recommendations || trendAnalytics?.summary?.recommendedActions || []).slice(0, 4).map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{idx + 1}</span>
                      </div>
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                  {(!predictiveForecast?.recommendations?.length && !trendAnalytics?.summary?.recommendedActions?.length) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No immediate actions required - trends are stable
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Benchmarking and Escalation Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Department Benchmarking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Department Benchmarking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {escalationData?.departmentBreakdown?.slice(0, 5).map((dept, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{dept.departmentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {dept.pendingCount} pending | Avg: {dept.avgTimeToApproval?.toFixed(1)}h
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {dept.breachedCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {dept.breachedCount} breached
                          </Badge>
                        )}
                        {dept.breachedCount === 0 && dept.pendingCount === 0 && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Clear
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!escalationData?.departmentBreakdown || escalationData.departmentBreakdown.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No department data available
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Approval Escalation Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Approval Escalation Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {escalationData?.pendingApprovals?.filter(a => a.escalationStatus !== 'on_track').slice(0, 5).map((approval, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{approval.employeeName}</p>
                        <p className="text-xs text-muted-foreground">
                          {approval.departmentName} | {approval.hoursOverdue?.toFixed(1)}h overdue
                        </p>
                      </div>
                      <Badge 
                        variant={
                          approval.escalationStatus === 'critical' ? 'destructive' :
                          approval.escalationStatus === 'breached' ? 'destructive' :
                          approval.escalationStatus === 'warning' ? 'secondary' : 'default'
                        }
                        className="text-xs capitalize"
                      >
                        {approval.escalationStatus}
                      </Badge>
                    </div>
                  ))}
                  {(!escalationData?.pendingApprovals?.filter(a => a.escalationStatus !== 'on_track').length) && (
                    <div className="text-center py-4">
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">All approvals on track</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Period Comparisons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Period-over-Period Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Data Quality Warning */}
              {(() => {
                const hasInsufficientQuality = trendAnalytics?.comparisons?.weekOverWeek?.some(
                  c => c.dataQuality === 'low' || c.dataQuality === 'insufficient'
                ) || trendAnalytics?.comparisons?.monthOverMonth?.some(
                  c => c.dataQuality === 'low' || c.dataQuality === 'insufficient'
                );
                const hasMediumQuality = !hasInsufficientQuality && (
                  trendAnalytics?.comparisons?.weekOverWeek?.some(c => c.dataQuality === 'medium') ||
                  trendAnalytics?.comparisons?.monthOverMonth?.some(c => c.dataQuality === 'medium')
                );
                
                if (hasInsufficientQuality) {
                  return (
                    <Alert className="mb-4 border-amber-200 bg-amber-50">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-700">
                        Limited data available for accurate comparisons. Metrics marked with an indicator may have reduced reliability.
                      </AlertDescription>
                    </Alert>
                  );
                }
                if (hasMediumQuality) {
                  return (
                    <Alert className="mb-4 border-blue-200 bg-blue-50">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-700">
                        Some comparison periods have partial data coverage. Results may vary with more complete data.
                      </AlertDescription>
                    </Alert>
                  );
                }
                return null;
              })()}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Week-over-Week */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Week-over-Week</h4>
                  <div className="space-y-2">
                    {trendAnalytics?.comparisons?.weekOverWeek?.slice(0, 4).map((comp, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm" data-testid={`wow-comparison-${idx}`}>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">{comp.metric}</span>
                          {(comp.dataQuality === 'low' || comp.dataQuality === 'insufficient') && (
                            <AlertCircle className="w-3 h-3 text-amber-500" title={`Limited data: ${comp.previousPeriodDays || 0} days in prior period`} />
                          )}
                          {comp.dataQuality === 'medium' && (
                            <AlertCircle className="w-3 h-3 text-blue-400" title={`Partial data: ${comp.previousPeriodDays || 0} days in prior period`} />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {comp.metric.includes('Employee') ? comp.current?.toFixed(1) : `$${comp.current?.toLocaleString() || 0}`}
                          </span>
                          <Badge 
                            variant={comp.trend === 'improving' ? 'default' : comp.trend === 'declining' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {comp.changePercentage > 0 ? '+' : ''}{comp.changePercentage?.toFixed(1) || 0}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {trendAnalytics?.comparisons?.weekOverWeek?.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">No data available for comparison</p>
                    )}
                  </div>
                </div>

                {/* Month-over-Month */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Month-over-Month</h4>
                  <div className="space-y-2">
                    {trendAnalytics?.comparisons?.monthOverMonth?.slice(0, 4).map((comp, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm" data-testid={`mom-comparison-${idx}`}>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">{comp.metric}</span>
                          {(comp.dataQuality === 'low' || comp.dataQuality === 'insufficient') && (
                            <AlertCircle className="w-3 h-3 text-amber-500" title={`Limited data: ${comp.previousPeriodDays || 0} days in prior period`} />
                          )}
                          {comp.dataQuality === 'medium' && (
                            <AlertCircle className="w-3 h-3 text-blue-400" title={`Partial data: ${comp.previousPeriodDays || 0} days in prior period`} />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {comp.metric.includes('Employee') ? comp.current?.toFixed(1) : `$${comp.current?.toLocaleString() || 0}`}
                          </span>
                          <Badge 
                            variant={comp.trend === 'improving' ? 'default' : comp.trend === 'declining' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {comp.changePercentage > 0 ? '+' : ''}{comp.changePercentage?.toFixed(1) || 0}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {trendAnalytics?.comparisons?.monthOverMonth?.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">No data available for comparison</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anomaly Alerts */}
          {trendAnalytics?.anomalies && trendAnalytics.anomalies.length > 0 && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="w-4 h-4" />
                  Anomaly Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {trendAnalytics.anomalies.slice(0, 3).map((anomaly, idx) => (
                    <Alert key={idx} variant={anomaly.severity === 'critical' || anomaly.severity === 'high' ? 'destructive' : 'default'}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <span className="font-medium">{anomaly.date}</span>: {anomaly.description}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Attendance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Weekly Attendance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Line data={attendanceChartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            {/* Real-time Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Current Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-green-600" />
                      <span>On Time</span>
                    </div>
                    <span className="font-semibold">{analytics.overview.onTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span>Late Arrivals</span>
                    </div>
                    <span className="font-semibold">{analytics.overview.late}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span>Absent</span>
                    </div>
                    <span className="font-semibold">{analytics.overview.absent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-blue-600" />
                      <span>On Break</span>
                    </div>
                    <span className="font-semibold">{analytics.overview.onBreak}</span>
                  </div>
                </div>

                {/* Department breakdown */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="text-sm font-semibold mb-3">By Department</h4>
                  <div className="space-y-2">
                    {analytics.trends.departmental.slice(0, 5).map((dept, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{dept.department}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{dept.hours.toFixed(1)}h</span>
                          <Badge variant={dept.efficiency >= 80 ? "default" : "secondary"} className="text-xs">
                            {dept.efficiency.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cost Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Weekly Labor Costs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Bar data={costChartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            {/* Payroll Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Payroll Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Budget Utilization</span>
                      <span className="text-sm font-semibold">
                        {analytics.payroll.budgetUtilization.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          analytics.payroll.budgetUtilization > 90 ? 'bg-red-500' :
                          analytics.payroll.budgetUtilization > 75 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, analytics.payroll.budgetUtilization)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Regular Hours</p>
                      <p className="text-xl font-bold">
                        ${analytics.payroll.regularCost.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Overtime</p>
                      <p className="text-xl font-bold text-orange-600">
                        ${analytics.payroll.overtimeCost.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Projected Total</p>
                      <p className="text-xl font-bold">
                        ${analytics.payroll.projectedCost.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Cost/Hour</p>
                      <p className="text-xl font-bold">
                        ${analytics.payroll.averageCostPerHour.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {analytics.payroll.costVariance !== 0 && (
                    <Alert className="mt-4" variant={analytics.payroll.costVariance > 10 ? "destructive" : "default"}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Cost variance: {analytics.payroll.costVariance > 0 ? '+' : ''}
                        {analytics.payroll.costVariance.toFixed(1)}% from budget
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Compliance Issues
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.compliance.overtimeViolations > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {analytics.compliance.overtimeViolations} employees exceeded overtime limits
                      </AlertDescription>
                    </Alert>
                  )}
                  {analytics.compliance.breakViolations > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {analytics.compliance.breakViolations} break compliance violations detected
                      </AlertDescription>
                    </Alert>
                  )}
                  {analytics.compliance.missedClockOuts > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {analytics.compliance.missedClockOuts} missed clock-outs require review
                      </AlertDescription>
                    </Alert>
                  )}
                  {analytics.compliance.lateClockIns > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {analytics.compliance.lateClockIns} late clock-ins recorded today
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Compliance Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-gray-200"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - analytics.compliance.complianceScore / 100)}`}
                        className={
                          analytics.compliance.complianceScore >= 90 ? 'text-green-500' :
                          analytics.compliance.complianceScore >= 70 ? 'text-yellow-500' : 'text-red-500'
                        }
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold">{analytics.compliance.complianceScore}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Overall compliance with labor laws and company policies
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Resource Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Billable Hours</span>
                      <span className="text-sm font-semibold">
                        {analytics.productivity.billableHours.toFixed(1)}h
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(analytics.productivity.billableHours / (analytics.productivity.billableHours + analytics.productivity.nonBillableHours)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Non-Billable Hours</span>
                      <span className="text-sm font-semibold">
                        {analytics.productivity.nonBillableHours.toFixed(1)}h
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${(analytics.productivity.nonBillableHours / (analytics.productivity.billableHours + analytics.productivity.nonBillableHours)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Idle Time</span>
                      <span className="text-sm font-semibold">
                        {analytics.productivity.idleTime.toFixed(1)}h
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (analytics.productivity.idleTime / 40) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Productivity Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-4xl font-bold mb-2">
                    {analytics.productivity.productivityScore.toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">out of 100</p>
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between text-sm">
                      <span>Utilization Rate</span>
                      <span className="font-semibold">{analytics.productivity.utilizationRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Billable Ratio</span>
                      <span className="font-semibold">
                        {((analytics.productivity.billableHours / (analytics.productivity.billableHours + analytics.productivity.nonBillableHours)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}