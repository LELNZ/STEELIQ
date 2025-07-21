import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, AlertTriangle, Calculator, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface CostVariance {
  id: number;
  jobId: number;
  jobNumber: string;
  clientName: string;
  costCategory: string;
  estimatedCost: string;
  actualCost: string;
  variance: string;
  variancePercentage: string;
  notes: string;
  reportDate: string;
}

export default function CostVarianceTab() {
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const { toast } = useToast();

  // Fetch cost variances
  const { data: variances = [], isLoading } = useQuery({
    queryKey: ["/api/cost-variances", selectedJob],
    queryFn: () => apiRequest(`/api/cost-variances${selectedJob !== "all" ? `?jobId=${selectedJob}` : ""}`),
  });

  // Fetch jobs for filtering
  const { data: jobs = [] } = useQuery({
    queryKey: ["/api/jobs"],
  });

  // Calculate variance mutation
  const calculateVarianceMutation = useMutation({
    mutationFn: (jobId: number) => apiRequest(`/api/cost-variances/calculate/${jobId}`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cost-variances"] });
      toast({
        title: "Variance calculated",
        description: "Cost variance has been updated for the selected job.",
      });
    },
  });

  const getVarianceColor = (percentage: number) => {
    if (percentage > 10) return "text-red-500";
    if (percentage > 5) return "text-yellow-500";
    if (percentage < -5) return "text-green-500";
    return "text-gray-500";
  };

  const getVarianceIcon = (percentage: number) => {
    if (percentage > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (percentage < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return null;
  };

  // Calculate summary statistics
  const totalEstimated = variances.reduce((sum: number, v: CostVariance) => sum + parseFloat(v.estimatedCost), 0);
  const totalActual = variances.reduce((sum: number, v: CostVariance) => sum + parseFloat(v.actualCost), 0);
  const totalVariance = totalActual - totalEstimated;
  const averageVariancePercentage = totalEstimated > 0 ? (totalVariance / totalEstimated) * 100 : 0;

  // Prepare chart data
  const chartData = variances
    .sort((a: CostVariance, b: CostVariance) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime())
    .map((v: CostVariance) => ({
      date: format(new Date(v.reportDate), "MMM dd"),
      variance: parseFloat(v.variancePercentage),
    }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Cost Variance Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Track actual costs vs estimates to improve future quote accuracy
          </p>
        </div>
        <Select value={selectedJob} onValueChange={setSelectedJob}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filter by job" />
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estimated</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEstimated.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined estimate value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalActual.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined actual costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variance</CardTitle>
            {totalVariance > 0 ? <TrendingUp className="h-4 w-4 text-red-500" /> : <TrendingDown className="h-4 w-4 text-green-500" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getVarianceColor(averageVariancePercentage)}`}>
              ${Math.abs(totalVariance).toLocaleString()}
              <span className="text-sm ml-1">({totalVariance > 0 ? "+" : "-"})</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {averageVariancePercentage.toFixed(1)}% variance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jobs Over Budget</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {variances.filter((v: CostVariance) => parseFloat(v.variance) > 0).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Of {variances.length} total jobs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Variance Trend Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Variance Trend</CardTitle>
            <CardDescription>Cost variance percentage over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `${value.toFixed(1)}%`} />
                  <Line
                    type="monotone"
                    dataKey="variance"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variance Table */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading cost variances...</div>
      ) : variances.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Calculator className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No cost variance data available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Import costs and calculate variances to see analysis
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Estimated</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variances.map((variance: CostVariance) => {
                const variancePercent = parseFloat(variance.variancePercentage);
                const varianceAmount = parseFloat(variance.variance);
                
                return (
                  <TableRow key={variance.id}>
                    <TableCell className="font-medium">{variance.jobNumber}</TableCell>
                    <TableCell>{variance.clientName}</TableCell>
                    <TableCell>${parseFloat(variance.estimatedCost).toLocaleString()}</TableCell>
                    <TableCell>${parseFloat(variance.actualCost).toLocaleString()}</TableCell>
                    <TableCell className={getVarianceColor(variancePercent)}>
                      <div className="flex items-center gap-1">
                        {getVarianceIcon(variancePercent)}
                        ${Math.abs(varianceAmount).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className={getVarianceColor(variancePercent)}>
                      {variancePercent > 0 ? "+" : ""}{variancePercent.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Badge variant={variancePercent > 10 ? "destructive" : variancePercent > 5 ? "secondary" : "default"}>
                        {variancePercent > 10 ? "Over Budget" : variancePercent > 5 ? "Warning" : "On Track"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const job = jobs.find((j: any) => j.jobNumber === variance.jobNumber);
                          if (job) calculateVarianceMutation.mutate(job.id);
                        }}
                        disabled={calculateVarianceMutation.isPending}
                      >
                        Recalculate
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}