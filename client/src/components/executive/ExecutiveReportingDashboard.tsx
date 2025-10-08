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
  Calendar,
  Users,
  Factory,
  ShieldCheck,
  Target,
  Zap,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { Line, Bar, Pie, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
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
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ExecutiveMetrics {
  financialOverview: {
    revenue: number;
    revenueGrowth: number;
    grossProfit: number;
    netProfit: number;
    ebitda: number;
    cashFlow: number;
    workingCapital: number;
    debtToEquity: number;
  };
  operationalKPIs: {
    activeProjects: number;
    completedProjects: number;
    onTimeDelivery: number;
    customerSatisfaction: number;
    productivityRate: number;
    utilizationRate: number;
    cycleTime: number;
    defectRate: number;
  };
  businessIntelligence: {
    marketShare: number;
    customerRetention: number;
    newCustomers: number;
    averageDealSize: number;
    salesPipeline: number;
    winRate: number;
    customerLifetimeValue: number;
    customerAcquisitionCost: number;
  };
  riskMetrics: {
    overallRisk: 'low' | 'medium' | 'high';
    financialRisk: number;
    operationalRisk: number;
    complianceRisk: number;
    marketRisk: number;
    safetyIncidents: number;
    qualityIssues: number;
    criticalAlerts: number;
  };
  trendsAnalysis: Array<{
    period: string;
    revenue: number;
    profit: number;
    projects: number;
    efficiency: number;
  }>;
  departmentPerformance: Array<{
    department: string;
    budget: number;
    actual: number;
    variance: number;
    efficiency: number;
  }>;
  topProjects: Array<{
    name: string;
    value: number;
    status: string;
    margin: number;
  }>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function KPICard({ 
  title, 
  value, 
  change, 
  trend, 
  icon,
  subtitle
}: { 
  title: string; 
  value: string | number; 
  change?: number; 
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                {trend === 'up' ? (
                  <ArrowUp className="h-3 w-3 text-green-500" />
                ) : trend === 'down' ? (
                  <ArrowDown className="h-3 w-3 text-red-500" />
                ) : null}
                <span className={`text-xs font-medium ${
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
            <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ExecutiveReportingDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("quarter");
  const [selectedView, setSelectedView] = useState("overview");

  // Fetch executive metrics
  const { data: metrics, isLoading } = useQuery<ExecutiveMetrics>({
    queryKey: ['/api/analytics/executive', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/executive?period=${selectedPeriod}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch executive metrics');
      return response.json();
    }
  });

  // Prepare chart data
  const trendChart = useMemo(() => {
    if (!metrics?.trendsAnalysis) return null;
    
    return {
      labels: metrics.trendsAnalysis.map(t => t.period),
      datasets: [
        {
          label: 'Revenue',
          data: metrics.trendsAnalysis.map(t => t.revenue),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          yAxisID: 'y',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Profit',
          data: metrics.trendsAnalysis.map(t => t.profit),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          yAxisID: 'y',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Efficiency',
          data: metrics.trendsAnalysis.map(t => t.efficiency),
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          yAxisID: 'y1',
          tension: 0.3,
          fill: false
        }
      ]
    };
  }, [metrics]);

  const departmentChart = useMemo(() => {
    if (!metrics?.departmentPerformance) return null;
    
    return {
      labels: metrics.departmentPerformance.map(d => d.department),
      datasets: [
        {
          label: 'Budget',
          data: metrics.departmentPerformance.map(d => d.budget),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
        },
        {
          label: 'Actual',
          data: metrics.departmentPerformance.map(d => d.actual),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
        }
      ]
    };
  }, [metrics]);

  const riskRadarChart = useMemo(() => {
    if (!metrics?.riskMetrics) return null;
    
    return {
      labels: ['Financial', 'Operational', 'Compliance', 'Market', 'Safety', 'Quality'],
      datasets: [{
        label: 'Risk Level',
        data: [
          metrics.riskMetrics.financialRisk,
          metrics.riskMetrics.operationalRisk,
          metrics.riskMetrics.complianceRisk,
          metrics.riskMetrics.marketRisk,
          100 - (metrics.riskMetrics.safetyIncidents * 10),
          100 - (metrics.riskMetrics.qualityIssues * 5)
        ],
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(239, 68, 68)',
      }]
    };
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading executive dashboard...</p>
      </div>
    );
  }

  // Default metrics if no data
  const data = metrics || {
    financialOverview: {
      revenue: 0,
      revenueGrowth: 0,
      grossProfit: 0,
      netProfit: 0,
      ebitda: 0,
      cashFlow: 0,
      workingCapital: 0,
      debtToEquity: 0
    },
    operationalKPIs: {
      activeProjects: 0,
      completedProjects: 0,
      onTimeDelivery: 0,
      customerSatisfaction: 0,
      productivityRate: 0,
      utilizationRate: 0,
      cycleTime: 0,
      defectRate: 0
    },
    businessIntelligence: {
      marketShare: 0,
      customerRetention: 0,
      newCustomers: 0,
      averageDealSize: 0,
      salesPipeline: 0,
      winRate: 0,
      customerLifetimeValue: 0,
      customerAcquisitionCost: 0
    },
    riskMetrics: {
      overallRisk: 'low' as const,
      financialRisk: 0,
      operationalRisk: 0,
      complianceRisk: 0,
      marketRisk: 0,
      safetyIncidents: 0,
      qualityIssues: 0,
      criticalAlerts: 0
    },
    trendsAnalysis: [],
    departmentPerformance: [],
    topProjects: []
  };

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Executive Dashboard</h2>
          <p className="text-muted-foreground">Strategic insights and business intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </Button>
          
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Executive Summary
          </Button>
        </div>
      </div>

      {/* Risk Alert Banner */}
      {data.riskMetrics.criticalAlerts > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <p className="font-medium text-red-900">
                  {data.riskMetrics.criticalAlerts} Critical Alerts Require Attention
                </p>
                <p className="text-sm text-red-700">
                  Review risk assessment and compliance reports for immediate action items
                </p>
              </div>
              <Button size="sm" variant="destructive">
                View Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Revenue YTD"
          value={formatCurrency(data.financialOverview.revenue)}
          change={data.financialOverview.revenueGrowth}
          trend={data.financialOverview.revenueGrowth > 0 ? 'up' : 'down'}
          icon={<TrendingUp className="h-4 w-4 text-secondary" />}
          subtitle="vs. prior year"
        />
        
        <KPICard
          title="Net Profit Margin"
          value={formatPercentage(data.financialOverview.netProfit)}
          change={2.3}
          trend="up"
          icon={<DollarSign className="h-4 w-4 text-secondary" />}
          subtitle="Industry avg: 12%"
        />
        
        <KPICard
          title="Customer Satisfaction"
          value={formatPercentage(data.operationalKPIs.customerSatisfaction)}
          change={1.5}
          trend="up"
          icon={<Users className="h-4 w-4 text-secondary" />}
          subtitle="NPS: 72"
        />
        
        <KPICard
          title="On-Time Delivery"
          value={formatPercentage(data.operationalKPIs.onTimeDelivery)}
          change={-0.5}
          trend="down"
          icon={<Zap className="h-4 w-4 text-secondary" />}
          subtitle="Target: 95%"
        />
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Strategic Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial Performance</TabsTrigger>
          <TabsTrigger value="operational">Operational Excellence</TabsTrigger>
          <TabsTrigger value="risk">Risk & Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Business Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Business Performance Trends</CardTitle>
                <CardDescription>Revenue, profit, and efficiency over time</CardDescription>
              </CardHeader>
              <CardContent>
                {trendChart && (
                  <Line 
                    data={trendChart}
                    options={{
                      responsive: true,
                      interaction: {
                        mode: 'index',
                        intersect: false,
                      },
                      scales: {
                        y: {
                          type: 'linear',
                          display: true,
                          position: 'left',
                          ticks: {
                            callback: (value) => formatCurrency(Number(value))
                          }
                        },
                        y1: {
                          type: 'linear',
                          display: true,
                          position: 'right',
                          grid: {
                            drawOnChartArea: false,
                          },
                          ticks: {
                            callback: (value) => `${value}%`
                          }
                        }
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Top Projects */}
            <Card>
              <CardHeader>
                <CardTitle>Top Projects by Value</CardTitle>
                <CardDescription>Highest revenue generating projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topProjects.map((project, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{project.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={
                            project.status === 'completed' ? 'default' :
                            project.status === 'in_progress' ? 'secondary' :
                            'outline'
                          }>
                            {project.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Margin: {project.margin}%
                          </span>
                        </div>
                      </div>
                      <p className="font-bold">{formatCurrency(project.value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Department Budget vs Actual</CardTitle>
              <CardDescription>Financial performance by department</CardDescription>
            </CardHeader>
            <CardContent>
              {departmentChart && (
                <Bar 
                  data={departmentChart}
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

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPICard
              title="EBITDA"
              value={formatCurrency(data.financialOverview.ebitda)}
              subtitle="Earnings before interest, taxes, depreciation"
            />
            <KPICard
              title="Cash Flow"
              value={formatCurrency(data.financialOverview.cashFlow)}
              subtitle="Operating cash flow"
            />
            <KPICard
              title="Working Capital"
              value={formatCurrency(data.financialOverview.workingCapital)}
              subtitle="Current assets - liabilities"
            />
          </div>

          {/* Financial Analysis Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <Pie 
                  data={{
                    labels: ['Products', 'Services', 'Maintenance', 'Other'],
                    datasets: [{
                      data: [45, 30, 20, 5],
                      backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(251, 146, 60, 0.8)',
                        'rgba(147, 51, 234, 0.8)'
                      ]
                    }]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Health Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Debt to Equity Ratio</span>
                    <span className="font-medium">{data.financialOverview.debtToEquity.toFixed(2)}</span>
                  </div>
                  <Progress value={data.financialOverview.debtToEquity * 50} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Gross Profit Margin</span>
                    <span className="font-medium">{data.financialOverview.grossProfit}%</span>
                  </div>
                  <Progress value={data.financialOverview.grossProfit} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">ROI</span>
                    <span className="font-medium">18.5%</span>
                  </div>
                  <Progress value={18.5} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operational" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard
              title="Active Projects"
              value={data.operationalKPIs.activeProjects}
              icon={<Factory className="h-4 w-4 text-secondary" />}
            />
            <KPICard
              title="Productivity Rate"
              value={`${data.operationalKPIs.productivityRate}%`}
              icon={<Activity className="h-4 w-4 text-secondary" />}
            />
            <KPICard
              title="Utilization Rate"
              value={`${data.operationalKPIs.utilizationRate}%`}
              icon={<BarChart3 className="h-4 w-4 text-secondary" />}
            />
            <KPICard
              title="Cycle Time"
              value={`${data.operationalKPIs.cycleTime} days`}
              icon={<Calendar className="h-4 w-4 text-secondary" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Operational Excellence Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Defect Rate</p>
                    <p className="text-xl font-bold">{data.operationalKPIs.defectRate}%</p>
                    <Progress value={100 - data.operationalKPIs.defectRate} className="h-1 mt-2" />
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">First Pass Yield</p>
                    <p className="text-xl font-bold">94.2%</p>
                    <Progress value={94.2} className="h-1 mt-2" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Equipment Efficiency</p>
                    <p className="text-xl font-bold">87.5%</p>
                    <Progress value={87.5} className="h-1 mt-2" />
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Schedule Adherence</p>
                    <p className="text-xl font-bold">91.8%</p>
                    <Progress value={91.8} className="h-1 mt-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment Matrix</CardTitle>
                <CardDescription>Multi-dimensional risk analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {riskRadarChart && (
                  <Radar 
                    data={riskRadarChart}
                    options={{
                      responsive: true,
                      scales: {
                        r: {
                          beginAtZero: true,
                          max: 100
                        }
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance & Safety Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">ISO Compliance</p>
                      <p className="text-sm text-muted-foreground">All certifications current</p>
                    </div>
                  </div>
                  <Badge variant="success">Compliant</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">Safety Incidents</p>
                      <p className="text-sm text-muted-foreground">Last 30 days</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold">{data.riskMetrics.safetyIncidents}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Quality Issues</p>
                      <p className="text-sm text-muted-foreground">Requiring attention</p>
                    </div>
                  </div>
                  <span className="text-xl font-bold">{data.riskMetrics.qualityIssues}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Risk Mitigation Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="p-3 border-l-4 border-red-500 bg-red-50 rounded">
                  <p className="font-medium text-red-900">High Priority</p>
                  <p className="text-sm text-red-700">Update emergency response procedures by month end</p>
                </div>
                <div className="p-3 border-l-4 border-yellow-500 bg-yellow-50 rounded">
                  <p className="font-medium text-yellow-900">Medium Priority</p>
                  <p className="text-sm text-yellow-700">Schedule equipment maintenance for 3 critical machines</p>
                </div>
                <div className="p-3 border-l-4 border-blue-500 bg-blue-50 rounded">
                  <p className="font-medium text-blue-900">Low Priority</p>
                  <p className="text-sm text-blue-700">Review and update standard operating procedures</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}