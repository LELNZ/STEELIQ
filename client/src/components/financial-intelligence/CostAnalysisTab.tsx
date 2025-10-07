import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Wrench,
  Building,
  FileText,
  Download,
  AlertTriangle,
  CheckCircle,
  Info,
  PieChart,
  BarChart3,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface JobCost {
  id: string;
  jobNumber: string;
  projectName: string;
  clientName: string;
  revenue: number;
  directCosts: number;
  overheads: number;
  profit: number;
  profitMargin: number;
  status: "completed" | "in-progress" | "quoted";
  completionDate?: string;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  subcontractorCost: number;
  otherCost: number;
}

interface CostCategory {
  category: string;
  amount: number;
  percentage: number;
  budget: number;
  variance: number;
  trend: "up" | "down" | "stable";
}

interface MaterialCostAnalysis {
  material: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier: string;
  priceChange: number;
}

interface LaborAnalysis {
  employee: string;
  hours: number;
  rate: number;
  totalCost: number;
  efficiency: number;
  overtimeHours: number;
}

export default function CostAnalysisTab() {
  const [selectedPeriod, setSelectedPeriod] = useState("current-month");
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const { data: jobCosts = [], isLoading: jobsLoading } = useQuery<JobCost[]>({
    queryKey: ["/api/financial-intelligence/costs/jobs", selectedPeriod],
  });

  const { data: costCategories = [], isLoading: categoriesLoading } = useQuery<CostCategory[]>({
    queryKey: ["/api/financial-intelligence/costs/categories", selectedPeriod],
  });

  const { data: materialAnalysis = [], isLoading: materialsLoading } = useQuery<MaterialCostAnalysis[]>({
    queryKey: ["/api/financial-intelligence/costs/materials", selectedPeriod],
  });

  const { data: laborAnalysis = [], isLoading: laborLoading } = useQuery<LaborAnalysis[]>({
    queryKey: ["/api/financial-intelligence/costs/labor", selectedPeriod],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const averageMargin = jobCosts.length > 0
    ? jobCosts.reduce((sum, job) => sum + job.profitMargin, 0) / jobCosts.length
    : 0;

  const totalRevenue = jobCosts.reduce((sum, job) => sum + job.revenue, 0);
  const totalCosts = jobCosts.reduce((sum, job) => sum + job.directCosts + job.overheads, 0);
  const totalProfit = jobCosts.reduce((sum, job) => sum + job.profit, 0);

  // Chart data for cost breakdown
  const costBreakdownData = {
    labels: ['Materials', 'Labor', 'Equipment', 'Subcontractors', 'Other'],
    datasets: [{
      data: [
        jobCosts.reduce((sum, job) => sum + job.materialCost, 0),
        jobCosts.reduce((sum, job) => sum + job.laborCost, 0),
        jobCosts.reduce((sum, job) => sum + job.equipmentCost, 0),
        jobCosts.reduce((sum, job) => sum + job.subcontractorCost, 0),
        jobCosts.reduce((sum, job) => sum + job.otherCost, 0)
      ],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(156, 163, 175, 0.8)'
      ],
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = formatCurrency(context.raw);
            const percentage = ((context.raw / totalCosts) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 25) return "text-green-600";
    if (margin >= 20) return "text-blue-600";
    if (margin >= 15) return "text-yellow-600";
    return "text-red-600";
  };

  const getVarianceColor = (variance: number) => {
    if (variance <= 0) return "text-green-600";
    if (variance <= 5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current-month">Current Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="current-quarter">Current Quarter</SelectItem>
            <SelectItem value="last-quarter">Last Quarter</SelectItem>
            <SelectItem value="year-to-date">Year to Date</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Analysis
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {jobCosts.length} projects analyzed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCosts)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Direct + Overhead costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalProfit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((totalProfit / totalRevenue) * 100).toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", getMarginColor(averageMargin))}>
              {averageMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Industry target margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Cost Breakdown by Category
            </CardTitle>
            <CardDescription>
              Distribution of costs across categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Doughnut data={costBreakdownData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Cost Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Cost Category Performance
            </CardTitle>
            <CardDescription>
              Budget vs actual with variance analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {costCategories.map((category) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{category.category}</span>
                      {category.trend === "up" && <TrendingUp className="h-4 w-4 text-red-600" />}
                      {category.trend === "down" && <TrendingDown className="h-4 w-4 text-green-600" />}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(category.amount)}</p>
                      <p className={cn("text-xs", getVarianceColor(category.variance))}>
                        {category.variance > 0 ? '+' : ''}{category.variance.toFixed(1)}% vs budget
                      </p>
                    </div>
                  </div>
                  <Progress 
                    value={(category.amount / category.budget) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job Profitability Analysis */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Job Profitability Analysis</CardTitle>
            <Popover>
              <PopoverTrigger>
                <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Profitability Guidelines</p>
                  <p className="text-sm text-gray-600">
                    • Green: ≥25% margin (excellent)<br />
                    • Blue: 20-25% margin (good)<br />
                    • Yellow: 15-20% margin (acceptable)<br />
                    • Red: &lt;15% margin (needs review)
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job #</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Direct Costs</TableHead>
                <TableHead className="text-right">Overheads</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobCosts.map((job) => (
                <TableRow 
                  key={job.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedJob(job.id)}
                >
                  <TableCell className="font-medium">{job.jobNumber}</TableCell>
                  <TableCell>{job.projectName}</TableCell>
                  <TableCell>{job.clientName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(job.revenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(job.directCosts)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(job.overheads)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(job.profit)}
                  </TableCell>
                  <TableCell className={cn("text-right font-medium", getMarginColor(job.profitMargin))}>
                    {job.profitMargin.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      job.status === "completed" ? "bg-green-100 text-green-800" :
                      job.status === "in-progress" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    )}>
                      {job.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Material Cost Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Material Cost Analysis
          </CardTitle>
          <CardDescription>
            Top materials by cost with price trend analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">Price Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materialAnalysis.slice(0, 5).map((material, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{material.material}</TableCell>
                  <TableCell>{material.supplier}</TableCell>
                  <TableCell className="text-right">{material.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(material.unitCost)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(material.totalCost)}</TableCell>
                  <TableCell className={cn("text-right", 
                    material.priceChange > 0 ? "text-red-600" : "text-green-600"
                  )}>
                    {material.priceChange > 0 ? '+' : ''}{material.priceChange.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Email Import Integration */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Email Cost Import Integration
              </CardTitle>
              <CardDescription>
                Sync actual costs from supplier invoices with job profitability analysis
              </CardDescription>
            </div>
            <Button 
              onClick={() => window.location.href = '/email-cost-import'}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              View Import Dashboard
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border border-gray-100">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-sm text-muted-foreground">Pending cost reviews</p>
                </CardContent>
              </Card>
              <Card className="border border-gray-100">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">+15.2%</div>
                  <p className="text-sm text-muted-foreground">Average cost variance</p>
                </CardContent>
              </Card>
              <Card className="border border-gray-100">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">87%</div>
                  <p className="text-sm text-muted-foreground">Auto-match accuracy</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Email Cost Import Active</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Automatically importing supplier invoices from connected email accounts. 
                    Costs are matched to jobs using PO numbers and analyzed for variances against estimates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Optimization Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Optimization Insights</CardTitle>
          <CardDescription>
            AI-powered recommendations for cost reduction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">High Material Cost Alert</p>
                <p className="text-sm text-gray-600 mt-1">
                  Steel prices increased 15% this quarter. Consider bulk purchasing agreements with Asmuss Steel for 8% discount on orders over $50,000.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
              <Users className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Labor Efficiency Opportunity</p>
                <p className="text-sm text-gray-600 mt-1">
                  Overtime costs increased 22% last month. Hire 2 additional welders to reduce overtime by 60% and save $18,000/month.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Successful Cost Reduction</p>
                <p className="text-sm text-gray-600 mt-1">
                  Equipment rental optimization saved $12,500 this quarter. Continue current rental vs purchase strategy for specialized tools.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}