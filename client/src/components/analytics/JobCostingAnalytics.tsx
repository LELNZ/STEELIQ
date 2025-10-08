import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  BarChart3,
  PieChart,
  Activity,
  FileText,
  Download,
  Calculator,
  Clock,
  Package
} from "lucide-react";
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CostAnalytics {
  overview: {
    totalJobs: number;
    totalEstimatedCost: number;
    totalActualCost: number;
    totalVariance: number;
    variancePercentage: number;
    profitMargin: number;
    overBudgetJobs: number;
    underBudgetJobs: number;
  };
  jobCostBreakdown: Array<{
    jobId: number;
    jobNumber: string;
    clientName: string;
    estimatedCost: number;
    actualCost: number;
    variance: number;
    variancePercentage: number;
    status: string;
    profitMargin: number;
    completionPercentage: number;
  }>;
  costByCategory: {
    materials: number;
    labor: number;
    subcontractors: number;
    overhead: number;
    other: number;
  };
  monthlyTrend: Array<{
    month: string;
    estimated: number;
    actual: number;
    profit: number;
  }>;
  topVariances: Array<{
    jobNumber: string;
    description: string;
    variance: number;
    reason: string;
  }>;
  laborAnalytics: {
    totalHours: number;
    totalCost: number;
    avgRatePerHour: number;
    overtimeHours: number;
    efficiencyRate: number;
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function MetricCard({ 
  title, 
  value, 
  change, 
  trend, 
  icon 
}: { 
  title: string; 
  value: string | number; 
  change?: number; 
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : trend === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : null}
                <span className={`text-sm ${
                  trend === 'up' ? 'text-green-500' : 
                  trend === 'down' ? 'text-red-500' : 
                  'text-muted-foreground'
                }`}>
                  {change > 0 ? '+' : ''}{change}%
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className="text-muted-foreground">{icon}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function JobCostingAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedJob, setSelectedJob] = useState("all");

  // Fetch analytics data
  const { data: analytics = null, isLoading } = useQuery<CostAnalytics>({
    queryKey: ['/api/analytics/job-costing', selectedPeriod, selectedJob],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: selectedPeriod,
        ...(selectedJob !== 'all' && { jobId: selectedJob })
      });
      const response = await fetch(`/api/analytics/job-costing?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    }
  });

  // Fetch jobs list for selector
  const { data: jobs = [] } = useQuery({
    queryKey: ['/api/jobs'],
  });

  // Chart data preparation
  const costBreakdownChart = useMemo(() => {
    if (!analytics) return null;
    
    return {
      labels: ['Materials', 'Labor', 'Subcontractors', 'Overhead', 'Other'],
      datasets: [{
        data: [
          analytics.costByCategory.materials,
          analytics.costByCategory.labor,
          analytics.costByCategory.subcontractors,
          analytics.costByCategory.overhead,
          analytics.costByCategory.other
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(107, 114, 128, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(251, 146, 60)',
          'rgb(147, 51, 234)',
          'rgb(107, 114, 128)'
        ],
        borderWidth: 1
      }]
    };
  }, [analytics]);

  const trendChart = useMemo(() => {
    if (!analytics) return null;
    
    return {
      labels: analytics.monthlyTrend.map(t => t.month),
      datasets: [
        {
          label: 'Estimated Cost',
          data: analytics.monthlyTrend.map(t => t.estimated),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Actual Cost',
          data: analytics.monthlyTrend.map(t => t.actual),
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Profit',
          data: analytics.monthlyTrend.map(t => t.profit),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3
        }
      ]
    };
  }, [analytics]);

  const varianceChart = useMemo(() => {
    if (!analytics) return null;
    
    const topJobs = analytics.jobCostBreakdown
      .slice(0, 10)
      .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
    
    return {
      labels: topJobs.map(j => j.jobNumber),
      datasets: [{
        label: 'Cost Variance',
        data: topJobs.map(j => j.variance),
        backgroundColor: topJobs.map(j => 
          j.variance < 0 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)'
        ),
        borderColor: topJobs.map(j => 
          j.variance < 0 ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)'
        ),
        borderWidth: 1
      }]
    };
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedJob} onValueChange={setSelectedJob}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Jobs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {jobs.map((job: any) => (
                <SelectItem key={job.id} value={job.id.toString()}>
                  {job.jobNumber} - {job.clientName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Estimated Cost"
          value={formatCurrency(analytics.overview.totalEstimatedCost)}
          icon={<Calculator className="h-5 w-5" />}
        />
        <MetricCard
          title="Total Actual Cost"
          value={formatCurrency(analytics.overview.totalActualCost)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          title="Cost Variance"
          value={formatCurrency(Math.abs(analytics.overview.totalVariance))}
          change={analytics.overview.variancePercentage}
          trend={analytics.overview.totalVariance > 0 ? 'up' : 'down'}
          icon={<Activity className="h-5 w-5" />}
        />
        <MetricCard
          title="Profit Margin"
          value={`${analytics.overview.profitMargin}%`}
          trend={analytics.overview.profitMargin > 15 ? 'up' : 'down'}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="breakdown" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="variances">Variances</TabsTrigger>
          <TabsTrigger value="jobs">Job Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Distribution</CardTitle>
                <CardDescription>Breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                {costBreakdownChart && (
                  <Doughnut 
                    data={costBreakdownChart} 
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { position: 'bottom' }
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Labor Analytics</CardTitle>
                <CardDescription>Workforce efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Hours</span>
                    <span className="font-medium">{analytics.laborAnalytics.totalHours.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Labor Cost</span>
                    <span className="font-medium">{formatCurrency(analytics.laborAnalytics.totalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Rate/Hour</span>
                    <span className="font-medium">{formatCurrency(analytics.laborAnalytics.avgRatePerHour)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Overtime Hours</span>
                    <span className="font-medium">{analytics.laborAnalytics.overtimeHours}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Efficiency Rate</span>
                    <span className="text-sm font-medium">{analytics.laborAnalytics.efficiencyRate}%</span>
                  </div>
                  <Progress value={analytics.laborAnalytics.efficiencyRate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Trends</CardTitle>
              <CardDescription>Monthly comparison of estimated vs actual costs</CardDescription>
            </CardHeader>
            <CardContent>
              {trendChart && (
                <Line 
                  data={trendChart}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'bottom' }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: (value) => formatCurrency(Number(value))
                        }
                      }
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variances" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Variance Analysis</CardTitle>
                <CardDescription>Jobs with highest cost variance</CardDescription>
              </CardHeader>
              <CardContent>
                {varianceChart && (
                  <Bar 
                    data={varianceChart}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: { display: false }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: (value) => formatCurrency(Number(value))
                          }
                        }
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Variances</CardTitle>
                <CardDescription>Significant cost deviations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topVariances.map((variance, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{variance.jobNumber}</p>
                        <p className="text-xs text-muted-foreground">{variance.reason}</p>
                      </div>
                      <Badge variant={variance.variance < 0 ? "destructive" : "success"}>
                        {formatCurrency(Math.abs(variance.variance))}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Job Cost Analysis</CardTitle>
              <CardDescription>Detailed breakdown by job</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Job Number</th>
                      <th className="text-left p-2">Client</th>
                      <th className="text-right p-2">Estimated</th>
                      <th className="text-right p-2">Actual</th>
                      <th className="text-right p-2">Variance</th>
                      <th className="text-right p-2">Margin</th>
                      <th className="text-center p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.jobCostBreakdown.map((job) => (
                      <tr key={job.jobId} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{job.jobNumber}</td>
                        <td className="p-2">{job.clientName}</td>
                        <td className="p-2 text-right">{formatCurrency(job.estimatedCost)}</td>
                        <td className="p-2 text-right">{formatCurrency(job.actualCost)}</td>
                        <td className="p-2 text-right">
                          <span className={job.variance < 0 ? 'text-red-500' : 'text-green-500'}>
                            {formatCurrency(Math.abs(job.variance))}
                          </span>
                        </td>
                        <td className="p-2 text-right">{job.profitMargin}%</td>
                        <td className="p-2 text-center">
                          <Badge variant={
                            job.status === 'completed' ? 'default' :
                            job.status === 'in_progress' ? 'secondary' :
                            'outline'
                          }>
                            {job.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}