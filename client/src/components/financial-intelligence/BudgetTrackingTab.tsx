import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calendar,
  BarChart3,
  Activity,
  Settings,
  Plus,
  Edit,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Bar, Line } from 'react-chartjs-2';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Budget {
  id: string;
  category: string;
  period: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  remaining: number;
  status: "on-track" | "warning" | "over-budget";
  lastUpdated: string;
  projectedTotal: number;
  alerts: string[];
}

interface BudgetAlert {
  id: string;
  type: "warning" | "critical" | "info";
  category: string;
  message: string;
  actionRequired: boolean;
  timestamp: string;
}

interface BudgetForecast {
  period: string;
  projected: number;
  budget: number;
  confidence: number;
}

export default function BudgetTrackingTab() {
  const [selectedPeriod, setSelectedPeriod] = useState("current-quarter");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery<Budget[]>({
    queryKey: ["/api/financial-intelligence/budgets/tracking", selectedPeriod, selectedDepartment],
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery<BudgetAlert[]>({
    queryKey: ["/api/financial-intelligence/budgets/alerts"],
  });

  const { data: forecast = [], isLoading: forecastLoading } = useQuery<BudgetForecast[]>({
    queryKey: ["/api/financial-intelligence/budgets/forecast", selectedPeriod],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.budgetAmount, 0);
  const totalActual = budgets.reduce((sum, b) => sum + b.actualAmount, 0);
  const totalVariance = totalActual - totalBudget;
  const overBudgetCount = budgets.filter(b => b.status === "over-budget").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on-track":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "over-budget":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance <= 0) return "text-green-600";
    if (variance <= 5) return "text-yellow-600";
    return "text-red-600";
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  // Chart data
  const budgetComparisonData = {
    labels: budgets.map(b => b.category),
    datasets: [
      {
        label: 'Budget',
        data: budgets.map(b => b.budgetAmount),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
      },
      {
        label: 'Actual',
        data: budgets.map(b => b.actualAmount),
        backgroundColor: 'rgba(34, 197, 94, 0.6)',
      },
      {
        label: 'Projected',
        data: budgets.map(b => b.projectedTotal),
        backgroundColor: 'rgba(251, 191, 36, 0.6)',
      }
    ]
  };

  const forecastChartData = {
    labels: forecast.map(f => f.period),
    datasets: [
      {
        label: 'Budget',
        data: forecast.map(f => f.budget),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Projected',
        data: forecast.map(f => f.projected),
        borderColor: 'rgb(251, 191, 36)',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
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
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Current Month</SelectItem>
              <SelectItem value="current-quarter">Current Quarter</SelectItem>
              <SelectItem value="current-year">Current Year</SelectItem>
              <SelectItem value="next-quarter">Next Quarter</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="fabrication">Fabrication</SelectItem>
              <SelectItem value="installation">Installation</SelectItem>
              <SelectItem value="admin">Administration</SelectItem>
              <SelectItem value="sales">Sales & Marketing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Budget Settings
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Budget
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              For {selectedPeriod.replace('-', ' ')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actual Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
            <Progress 
              value={(totalActual / totalBudget) * 100} 
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", getVarianceColor((totalVariance / totalBudget) * 100))}>
              {formatCurrency(Math.abs(totalVariance))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalVariance > 0 ? 'Over budget' : 'Under budget'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              Budget Health
              <Popover>
                <PopoverTrigger className="ml-2">
                  <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Budget Health Score</p>
                    <p className="text-sm text-gray-600">
                      Calculated based on variance percentage, number of over-budget categories, and forecast accuracy.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {overBudgetCount === 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-lg font-medium text-green-600">Healthy</span>
                </>
              ) : overBudgetCount <= 2 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="text-lg font-medium text-yellow-600">Attention Needed</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-lg font-medium text-red-600">Critical</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overBudgetCount} categories over budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.filter(a => a.type === "critical").map((alert) => (
            <Alert key={alert.id} className="border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle>Critical Budget Alert</AlertTitle>
              <AlertDescription>
                {alert.message}
                {alert.actionRequired && (
                  <Button variant="link" className="p-0 h-auto ml-2 text-red-600">
                    Take Action →
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Budget Comparison Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Budget vs Actual Comparison
            </CardTitle>
            <CardDescription>
              Category-wise budget performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={budgetComparisonData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Budget Forecast
            </CardTitle>
            <CardDescription>
              Projected spending vs budget limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line data={forecastChartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Details Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Budget Category Details</CardTitle>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Budgets
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Alerts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((budget) => (
                <TableRow key={budget.id}>
                  <TableCell className="font-medium">{budget.category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(budget.budgetAmount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(budget.actualAmount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(budget.remaining)}</TableCell>
                  <TableCell className={cn("text-right font-medium", getVarianceColor(budget.variancePercentage))}>
                    {budget.variance > 0 ? '+' : ''}{formatCurrency(Math.abs(budget.variance))}
                    <span className="text-xs ml-1">({budget.variancePercentage.toFixed(1)}%)</span>
                  </TableCell>
                  <TableCell>
                    <div className="w-24">
                      <Progress 
                        value={Math.min((budget.actualAmount / budget.budgetAmount) * 100, 100)} 
                        className="h-2"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(budget.status)}>
                      {budget.status.replace('-', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {budget.alerts.length > 0 && (
                      <Popover>
                        <PopoverTrigger>
                          <div className="flex items-center cursor-pointer">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span className="ml-1 text-sm">{budget.alerts.length}</span>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Budget Alerts</p>
                            {budget.alerts.map((alert, index) => (
                              <p key={index} className="text-sm text-gray-600">• {alert}</p>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Budget Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Optimization Insights</CardTitle>
          <CardDescription>
            AI-powered recommendations for budget management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Material Budget Alert</p>
                <p className="text-sm text-gray-600 mt-1">
                  Material costs projected to exceed budget by 18% this quarter. Negotiate fixed-price contracts with suppliers to lock in current rates.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Reallocation Opportunity</p>
                <p className="text-sm text-gray-600 mt-1">
                  Marketing budget underutilized by 35%. Consider reallocating $25,000 to equipment maintenance to prevent Q4 overspend.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Efficiency Achievement</p>
                <p className="text-sm text-gray-600 mt-1">
                  Labor costs 12% under budget due to productivity improvements. Maintain current practices and consider performance bonuses.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
              <Target className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Budget Planning</p>
                <p className="text-sm text-gray-600 mt-1">
                  Based on current trends, recommend 8% increase in fabrication budget for next quarter to accommodate growth projections.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}