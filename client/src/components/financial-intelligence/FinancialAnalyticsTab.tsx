import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  BarChart3,
  LineChart,
  PieChart,
  DollarSign,
  Percent,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Line, Bar, Pie, Doughnut } from "recharts";
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
import { Line as Line2, Bar as Bar2, Doughnut as Doughnut2 } from 'react-chartjs-2';

// Register ChartJS components
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

interface FinancialMetrics {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  grossMargin: number;
  ebitda: number;
  cashFlow: number;
  workingCapital: number;
}

interface KPIData {
  name: string;
  value: number;
  target: number;
  trend: "up" | "down" | "stable";
  change: number;
  status: "on-track" | "warning" | "critical";
  unit: string;
}

export default function FinancialAnalyticsTab() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setMonth(new Date().getMonth() - 12)),
    to: new Date()
  });
  const [comparisonPeriod, setComparisonPeriod] = useState("year-over-year");
  const [selectedMetric, setSelectedMetric] = useState("revenue");

  const { data: metrics = [], isLoading: metricsLoading } = useQuery<FinancialMetrics[]>({
    queryKey: ["/api/financial-intelligence/analytics/metrics", dateRange],
  });

  const { data: kpis = [], isLoading: kpisLoading } = useQuery<KPIData[]>({
    queryKey: ["/api/financial-intelligence/analytics/kpis"],
  });

  const { data: revenueBreakdown } = useQuery({
    queryKey: ["/api/financial-intelligence/analytics/revenue-breakdown"],
  });

  const { data: expenseBreakdown } = useQuery({
    queryKey: ["/api/financial-intelligence/analytics/expense-breakdown"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-track":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Chart data preparation
  const lineChartData = {
    labels: metrics.map(m => m.period),
    datasets: [
      {
        label: 'Revenue',
        data: metrics.map(m => m.revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Expenses',
        data: metrics.map(m => m.expenses),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Profit',
        data: metrics.map(m => m.profit),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
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
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Financial Analytics Dashboard</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
          <CardDescription>
            Comprehensive financial performance metrics and trend analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[260px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, "PPP")} - {format(dateRange.to, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => range && setDateRange({ from: range.from!, to: range.to || range.from! })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="year-over-year">Year over Year</SelectItem>
                <SelectItem value="quarter-over-quarter">Quarter over Quarter</SelectItem>
                <SelectItem value="month-over-month">Month over Month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="profit">Profit</SelectItem>
                <SelectItem value="margin">Margins</SelectItem>
                <SelectItem value="cashflow">Cash Flow</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.name}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
                <Popover>
                  <PopoverTrigger>
                    <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{kpi.name}</p>
                      <p className="text-sm text-gray-600">
                        Target: {kpi.unit === '%' ? `${kpi.target}%` : formatCurrency(kpi.target)}
                      </p>
                      <p className="text-sm text-gray-600">
                        This metric shows {kpi.name.toLowerCase()} performance compared to targets.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">
                    {kpi.unit === '%' ? `${kpi.value}%` : formatCurrency(kpi.value)}
                  </span>
                  <Badge className={cn("ml-2", getStatusColor(kpi.status))}>
                    {kpi.status.replace('-', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  {getTrendIcon(kpi.trend)}
                  <span className={cn("ml-1", kpi.change >= 0 ? "text-green-600" : "text-red-600")}>
                    {kpi.change >= 0 ? '+' : ''}{kpi.change}%
                  </span>
                  <span className="ml-1">vs last period</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChart className="h-5 w-5 mr-2" />
              Revenue & Expense Trends
            </CardTitle>
            <CardDescription>
              Monthly performance over selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {metricsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Activity className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <Line2 data={lineChartData} options={chartOptions} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profit Margins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Profit Margin Analysis
            </CardTitle>
            <CardDescription>
              Gross margin vs net margin trends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {metricsLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Activity className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <Bar2
                  data={{
                    labels: metrics.map(m => m.period),
                    datasets: [
                      {
                        label: 'Gross Margin %',
                        data: metrics.map(m => m.grossMargin),
                        backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      },
                      {
                        label: 'Profit Margin %',
                        data: metrics.map(m => m.profitMargin),
                        backgroundColor: 'rgba(34, 197, 94, 0.8)',
                      }
                    ]
                  }}
                  options={{
                    ...chartOptions,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 40,
                        ticks: {
                          callback: function(value: any) {
                            return value + '%';
                          }
                        }
                      }
                    }
                  }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Revenue by Category
            </CardTitle>
            <CardDescription>
              Revenue distribution across business segments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {revenueBreakdown && Object.keys(revenueBreakdown).length > 0 ? (
                <Doughnut2
                  data={{
                    labels: Object.keys(revenueBreakdown),
                    datasets: [{
                      data: Object.values(revenueBreakdown),
                      backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(156, 163, 175, 0.8)'
                      ],
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right' as const,
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No revenue data available</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Expense Breakdown
            </CardTitle>
            <CardDescription>
              Operating expense distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {expenseBreakdown && Object.keys(expenseBreakdown).length > 0 ? (
                <Doughnut2
                  data={{
                    labels: Object.keys(expenseBreakdown),
                    datasets: [{
                      data: Object.values(expenseBreakdown),
                      backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(156, 163, 175, 0.8)',
                        'rgba(34, 197, 94, 0.8)'
                      ],
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right' as const,
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No expense data available</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Insights & Recommendations</CardTitle>
          <CardDescription>
            AI-powered analysis and actionable recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Revenue Growth Opportunity</p>
                <p className="text-sm text-gray-600 mt-1">
                  Installation services show 25% YoY growth. Consider expanding installation team capacity to capture additional market share.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Cost Optimization</p>
                <p className="text-sm text-gray-600 mt-1">
                  Material costs increased 8% while revenue grew 12%. Negotiate bulk purchasing agreements with top 3 suppliers for 5-7% savings.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
              <Percent className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Margin Improvement</p>
                <p className="text-sm text-gray-600 mt-1">
                  Maintenance contracts show 35% gross margin vs 22% company average. Prioritize recurring maintenance agreements in sales strategy.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}