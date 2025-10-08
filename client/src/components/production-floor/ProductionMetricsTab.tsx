import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { 
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  Calendar,
  Clock,
  Package,
  Gauge,
  Target,
  Activity,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ProductionData {
  dailyOutput: {
    date: string;
    planned: number;
    actual: number;
    efficiency: number;
  }[];
  machineUtilization: {
    machine: string;
    utilization: number;
    targetUtilization: number;
  }[];
  qualityMetrics: {
    metric: string;
    value: number;
    target: number;
    trend: "up" | "down" | "stable";
  }[];
  productionByType: {
    type: string;
    value: number;
    percentage: number;
  }[];
  oeeBreakdown: {
    availability: number;
    performance: number;
    quality: number;
    oee: number;
  };
  kpis: {
    name: string;
    value: number;
    unit: string;
    target: number;
    status: "on-track" | "warning" | "critical";
  }[];
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function ProductionMetricsTab() {
  const [timeRange, setTimeRange] = useState("week");
  const [selectedMetric, setSelectedMetric] = useState("output");

  const { data: productionData, isLoading } = useQuery<ProductionData>({
    queryKey: ["/api/production-floor/metrics", timeRange],
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading metrics...</div>;
  }

  if (!productionData) {
    return <div className="text-center py-8 text-muted-foreground">No data available</div>;
  }

  const oeeScore = productionData.oeeBreakdown?.oee || 0;
  const oeeColor = oeeScore >= 85 ? "text-green-600" : oeeScore >= 65 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Custom Range
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {(productionData.kpis || []).map((kpi) => (
          <Card key={kpi.name} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{kpi.name}</p>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  kpi.status === "on-track" ? "bg-green-50 text-green-700" :
                  kpi.status === "warning" ? "bg-yellow-50 text-yellow-700" :
                  "bg-red-50 text-red-700"
                )}
              >
                {kpi.status === "on-track" ? <CheckCircle2 className="h-3 w-3" /> :
                 kpi.status === "warning" ? <AlertCircle className="h-3 w-3" /> :
                 <AlertCircle className="h-3 w-3" />}
              </Badge>
            </div>
            <p className="text-2xl font-bold">
              {kpi.value}
              <span className="text-sm font-normal text-muted-foreground ml-1">{kpi.unit}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Target: {kpi.target} {kpi.unit}
            </p>
          </Card>
        ))}
      </div>

      {/* OEE Dashboard */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Overall Equipment Effectiveness (OEE)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className={cn("text-5xl font-bold mb-2", oeeColor)}>
              {oeeScore}%
            </div>
            <p className="text-sm text-muted-foreground">Overall OEE</p>
            <p className="text-xs text-muted-foreground mt-1">World Class: 85%+</p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Availability</span>
                <span className="font-medium">{productionData.oeeBreakdown?.availability || 0}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded">
                <div 
                  className="h-full bg-blue-600 rounded"
                  style={{ width: `${productionData.oeeBreakdown?.availability || 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Performance</span>
                <span className="font-medium">{productionData.oeeBreakdown?.performance || 0}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded">
                <div 
                  className="h-full bg-green-600 rounded"
                  style={{ width: `${productionData.oeeBreakdown?.performance || 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Quality</span>
                <span className="font-medium">{productionData.oeeBreakdown?.quality || 0}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded">
                <div 
                  className="h-full bg-purple-600 rounded"
                  style={{ width: `${productionData.oeeBreakdown?.quality || 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <h4 className="text-sm font-medium mb-3">Production by Type</h4>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie
                  data={productionData.productionByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(productionData.productionByType || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(productionData.productionByType || []).map((type, index) => (
                <div key={type.type} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span>{type.type}: {type.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Charts */}
      <Tabs defaultValue="output" className="space-y-4">
        <TabsList>
          <TabsTrigger value="output">Production Output</TabsTrigger>
          <TabsTrigger value="utilization">Machine Utilization</TabsTrigger>
          <TabsTrigger value="quality">Quality Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="output">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Daily Production Output</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={productionData.dailyOutput || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), "MMM d")}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => format(new Date(date), "MMM d, yyyy")}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="planned" 
                  stroke="#94A3B8" 
                  name="Planned"
                  strokeDasharray="5 5"
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="#3B82F6" 
                  name="Actual"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="efficiency" 
                  stroke="#10B981" 
                  name="Efficiency %"
                  yAxisId="right"
                />
                <YAxis yAxisId="right" orientation="right" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="utilization">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Machine Utilization</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productionData.machineUtilization || []} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="machine" type="category" />
                <Tooltip />
                <Legend />
                <Bar dataKey="utilization" fill="#3B82F6" name="Current" />
                <Bar dataKey="targetUtilization" fill="#E5E7EB" name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="quality">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Quality Metrics Trends</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(productionData.qualityMetrics || []).map((metric) => (
                <div key={metric.metric} className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{metric.metric}</h4>
                    {metric.trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : metric.trend === "down" ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : (
                      <Activity className="h-4 w-4 text-gray-600" />
                    )}
                  </div>
                  <p className="text-2xl font-bold mb-1">{metric.value}%</p>
                  <p className="text-xs text-muted-foreground">Target: {metric.target}%</p>
                  <div className="mt-2 h-2 bg-gray-200 rounded">
                    <div 
                      className={cn(
                        "h-full rounded",
                        metric.value >= metric.target ? "bg-green-600" : "bg-yellow-600"
                      )}
                      style={{ width: `${Math.min(metric.value, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Production Insights */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Production Insights & Recommendations
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Badge className="bg-green-100 text-green-800 mt-0.5">Positive</Badge>
            <p className="text-sm">
              Machine efficiency has improved by 5% this week. Plasma Cutter #1 and Press Brake #2 
              are exceeding performance targets consistently.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="bg-yellow-100 text-yellow-800 mt-0.5">Attention</Badge>
            <p className="text-sm">
              Welding station bottleneck detected during peak hours (10 AM - 2 PM). 
              Consider redistributing workload or adding temporary capacity.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge className="bg-blue-100 text-blue-800 mt-0.5">Opportunity</Badge>
            <p className="text-sm">
              Implementing predictive maintenance could reduce unplanned downtime by an estimated 15% 
              based on current failure patterns.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}