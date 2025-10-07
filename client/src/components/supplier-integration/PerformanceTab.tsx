import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Star,
  Clock,
  Package,
  AlertCircle,
  CheckCircle,
  Download,
  Filter,
  Calendar,
  DollarSign,
  Truck,
  ShieldCheck,
  XCircle,
  Award,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PerformanceTab() {
  const [dateRange, setDateRange] = useState("30days");
  const [selectedSupplier, setSelectedSupplier] = useState("all");

  const { data: performanceData = [] } = useQuery({
    queryKey: ["/api/supplier-integration/performance", dateRange, selectedSupplier],
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["/api/supplier-integration/metrics", dateRange, selectedSupplier],
  });

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getStarRating = (score: number) => {
    const stars = Math.round(score / 20);
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="12months">Last 12 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supplier</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="All suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers?.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Award className="h-8 w-8 text-yellow-600" />
            <span className="text-2xl font-bold text-yellow-600">
              {isLoadingMetrics ? "..." : metrics?.overallPerformance ? `${metrics.overallPerformance}%` : "—"}
            </span>
          </div>
          <p className="font-medium">Overall Performance</p>
          <Progress value={metrics?.overallPerformance || 0} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {metrics?.performanceTrend ? `${metrics.performanceTrend}% from last month` : "No data"}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Clock className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">
              {isLoadingMetrics ? "..." : metrics?.onTimeDelivery ? `${metrics.onTimeDelivery}%` : "—"}
            </span>
          </div>
          <p className="font-medium">On-Time Delivery</p>
          <Progress value={metrics?.onTimeDelivery || 0} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {metrics?.deliveryTarget ? `Target: ${metrics.deliveryTarget}%` : "No target set"}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <ShieldCheck className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-bold">
              {isLoadingMetrics ? "..." : metrics?.qualityScore ? `${metrics.qualityScore}%` : "—"}
            </span>
          </div>
          <p className="font-medium">Quality Score</p>
          <Progress value={metrics?.qualityScore || 0} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {metrics?.defects !== undefined ? `${metrics.defects} defects this month` : "No data"}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold">
              {isLoadingMetrics ? "..." : metrics?.costSavings ? `${metrics.costSavings}%` : "—"}
            </span>
          </div>
          <p className="font-medium">Cost Savings</p>
          <Progress value={Math.abs(metrics?.costSavings || 0)} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {metrics?.savingsAmount ? `$${metrics.savingsAmount.toLocaleString()} saved` : "No data"}
          </p>
        </Card>
      </div>

      {/* Detailed Performance Metrics */}
      <Tabs defaultValue="scorecard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="scorecard">
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold">Supplier Scorecard</h3>
            </div>
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Overall Score</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Communication</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceData && performanceData.length > 0 ? (
                    performanceData.map((supplier: any) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">
                          {supplier.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${getPerformanceColor(supplier.overallScore || 0)}`}>
                              {supplier.overallScore || 0}%
                            </span>
                            <Badge className={supplier.overallScore >= 90 ? "bg-green-100 text-green-800" : 
                              supplier.overallScore >= 75 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                              {supplier.overallScore >= 90 ? "Excellent" : 
                                supplier.overallScore >= 75 ? "Good" : "Average"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{supplier.deliveryScore || 0}%</TableCell>
                        <TableCell>{supplier.qualityScore || 0}%</TableCell>
                        <TableCell>{supplier.priceScore || 0}%</TableCell>
                        <TableCell>{supplier.communicationScore || 0}%</TableCell>
                        <TableCell>
                          <div className="flex">{getStarRating(supplier.overallScore || 0)}</div>
                        </TableCell>
                        <TableCell>
                          {supplier.trend === "up" ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : supplier.trend === "down" ? (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          ) : (
                            <span className="h-4 w-4 text-gray-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No supplier performance data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="delivery">
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold">Delivery Performance</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">On-Time Delivery Rate</h4>
                  <div className="space-y-3">
                    {performanceData && performanceData.length > 0 ? (
                      performanceData.map((supplier: any) => (
                        <div key={supplier.id}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">{supplier.name}</span>
                            <span className="text-sm font-medium">{supplier.deliveryScore || 0}%</span>
                          </div>
                          <Progress value={supplier.deliveryScore || 0} />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No delivery performance data available
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-4">Average Lead Time (days)</h4>
                  <div className="space-y-3">
                    {performanceData && performanceData.length > 0 ? (
                      performanceData.map((supplier: any) => (
                        <div key={supplier.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <span>{supplier.name}</span>
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{supplier.avgLeadTime || 0}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        No lead time data available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="quality">
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold">Quality Metrics</h3>
            </div>
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Defect Rate</TableHead>
                    <TableHead>Returns</TableHead>
                    <TableHead>Certifications</TableHead>
                    <TableHead>Last Audit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceData && performanceData.length > 0 ? (
                    performanceData.map((supplier: any) => (
                      <TableRow key={supplier.id}>
                        <TableCell className="font-medium">
                          {supplier.name}
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${
                            (supplier.defectRate || 0) < 0.5 ? "text-green-600" : 
                            (supplier.defectRate || 0) < 1.0 ? "text-yellow-600" : "text-red-600"
                          }`}>
                            {supplier.defectRate || 0}%
                          </span>
                        </TableCell>
                        <TableCell>{supplier.returns || 0}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {supplier.certifications && supplier.certifications.length > 0 ? (
                              supplier.certifications.map((cert: string, idx: number) => (
                                <Badge key={idx} variant="outline">{cert}</Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{supplier.lastAudit || "N/A"}</TableCell>
                        <TableCell>
                          <Badge className={
                            supplier.complianceStatus === "Compliant" ? "bg-green-100 text-green-800" :
                            supplier.complianceStatus === "Review" ? "bg-yellow-100 text-yellow-800" :
                            "bg-gray-100 text-gray-800"
                          }>
                            {supplier.complianceStatus === "Compliant" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {supplier.complianceStatus === "Review" && <AlertCircle className="h-3 w-3 mr-1" />}
                            {supplier.complianceStatus || "Unknown"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No quality metrics data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold">Pricing Analysis</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Price Competitiveness</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead>vs Market</TableHead>
                        <TableHead>Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceData && performanceData.length > 0 ? (
                        performanceData.map((supplier: any) => (
                          <TableRow key={supplier.id}>
                            <TableCell>{supplier.name}</TableCell>
                            <TableCell>
                              <span className={
                                (supplier.priceVsMarket || 0) < 0 ? "text-green-600" : "text-red-600"
                              }>
                                {(supplier.priceVsMarket || 0) > 0 ? "+" : ""}{supplier.priceVsMarket || 0}%</span>
                        </TableCell>
                            <TableCell>
                              {supplier.priceTrend === "up" ? (
                                <TrendingUp className="h-4 w-4 text-red-600" />
                              ) : supplier.priceTrend === "down" ? (
                                <TrendingDown className="h-4 w-4 text-green-600" />
                              ) : (
                                <span className="h-4 w-4 text-gray-400">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No pricing data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <h4 className="font-medium mb-4">Cost Savings Achieved</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span>Volume Discounts</span>
                        <span className="font-medium text-green-600">$23,450</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span>Early Payment</span>
                        <span className="font-medium text-blue-600">$12,340</span>
                      </div>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span>Price Negotiations</span>
                        <span className="font-medium text-purple-600">$9,440</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}