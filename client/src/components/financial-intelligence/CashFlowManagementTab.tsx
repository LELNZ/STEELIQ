import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Line } from 'react-chartjs-2';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CashFlowData {
  date: string;
  inflow: number;
  outflow: number;
  netCashFlow: number;
  balance: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  dueDate: string;
  status: "paid" | "pending" | "overdue";
  daysOverdue?: number;
  paymentTerms: string;
}

interface Bill {
  id: string;
  billNumber: string;
  vendorName: string;
  amount: number;
  dueDate: string;
  status: "paid" | "pending" | "overdue";
  category: string;
}

interface CashFlowForecast {
  period: string;
  projectedInflow: number;
  projectedOutflow: number;
  projectedBalance: number;
  confidence: number;
}

export default function CashFlowManagementTab() {
  const [selectedView, setSelectedView] = useState("overview");

  const { data: cashFlowData = [], isLoading: cashFlowLoading } = useQuery<CashFlowData[]>({
    queryKey: ["/api/financial-intelligence/cashflow/data"],
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/financial-intelligence/cashflow/invoices"],
  });

  const { data: bills = [], isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: ["/api/financial-intelligence/cashflow/bills"],
  });

  const { data: forecast = [], isLoading: forecastLoading } = useQuery<CashFlowForecast[]>({
    queryKey: ["/api/financial-intelligence/cashflow/forecast"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const totalReceivables = invoices
    .filter(inv => inv.status !== "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalPayables = bills
    .filter(bill => bill.status !== "paid")
    .reduce((sum, bill) => sum + bill.amount, 0);

  const overdueReceivables = invoices
    .filter(inv => inv.status === "overdue")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const overduePayables = bills
    .filter(bill => bill.status === "overdue")
    .reduce((sum, bill) => sum + bill.amount, 0);

  const currentBalance = cashFlowData[cashFlowData.length - 1]?.balance || 0;

  // Chart data
  const cashFlowChartData = {
    labels: cashFlowData.map(d => format(new Date(d.date), 'MMM dd')),
    datasets: [
      {
        label: 'Cash Inflow',
        data: cashFlowData.map(d => d.inflow),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Cash Outflow',
        data: cashFlowData.map(d => d.outflow),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Cash Balance',
        data: cashFlowData.map(d => d.balance),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        yAxisID: 'y1',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      },
    },
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "pending":
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              As of {format(new Date(), 'MMM dd, yyyy')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accounts Receivable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceivables)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-red-600">{formatCurrency(overdueReceivables)}</span> overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accounts Payable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPayables)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-red-600">{formatCurrency(overduePayables)}</span> overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", 
              currentBalance - totalPayables >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(currentBalance - totalPayables)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              After pending payables
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Cash Flow Trends</CardTitle>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
          <CardDescription>
            30-day cash flow analysis with inflows, outflows and balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Line data={cashFlowChartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Views */}
      <Tabs value={selectedView} onValueChange={setSelectedView}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
          <TabsTrigger value="payables">Payables</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Receivables */}
        <TabsContent value="receivables" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Outstanding Invoices</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Send className="h-4 w-4 mr-2" />
                    Send Reminders
                  </Button>
                  <Button size="sm">
                    Create Invoice
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                          {invoice.daysOverdue && (
                            <span className="ml-2 text-xs text-red-600">
                              ({invoice.daysOverdue} days overdue)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payables */}
        <TabsContent value="payables" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Outstanding Bills</CardTitle>
                <Button size="sm">
                  Schedule Payments
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.billNumber}</TableCell>
                      <TableCell>{bill.vendorName}</TableCell>
                      <TableCell>{bill.category}</TableCell>
                      <TableCell>{formatCurrency(bill.amount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {format(new Date(bill.dueDate), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(bill.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecast */}
        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Forecast</CardTitle>
              <CardDescription>
                AI-powered predictions for the next 90 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {forecast.map((period) => (
                  <div key={period.period} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{period.period}</h4>
                        <p className="text-sm text-gray-600">
                          Confidence: {period.confidence}%
                        </p>
                      </div>
                      <Badge className={cn(
                        period.projectedBalance >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      )}>
                        {period.projectedBalance >= 0 ? "Positive" : "Negative"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Projected Inflow</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(period.projectedInflow)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Projected Outflow</p>
                        <p className="font-medium text-red-600">
                          {formatCurrency(period.projectedOutflow)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Projected Balance</p>
                        <p className={cn("font-medium",
                          period.projectedBalance >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {formatCurrency(period.projectedBalance)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Analysis & Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Critical: Low Cash Warning</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Projected cash shortage soon. Accelerate invoice collections and consider delaying non-critical expenses.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-yellow-50 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Collection Efficiency</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Review collection periods vs payment terms. Implement automated payment reminders to improve cash flow.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Payment Optimization</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Schedule supplier payments to maximize early payment discounts while maintaining adequate cash reserves.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Revenue Acceleration</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Consider offering early payment discounts to improve cash flow over the next quarter.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}