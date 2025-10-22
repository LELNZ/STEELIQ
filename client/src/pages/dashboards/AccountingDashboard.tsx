import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-spinner";
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Receipt,
  FileText,
  AlertCircle,
  Calculator,
  PiggyBank,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function AccountingDashboard() {
  const { user } = useAuth();

  // Financial metrics with department scoping
  const { data: financialStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/analytics/financial-stats"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: pendingInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices/pending"],
    staleTime: 2 * 60 * 1000,
  });

  const { data: costAnalysis } = useQuery({
    queryKey: ["/api/analytics/cost-analysis"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: cashFlow } = useQuery({
    queryKey: ["/api/analytics/cash-flow"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: purchaseOrders } = useQuery({
    queryKey: ["/api/purchase-orders/recent"],
    staleTime: 2 * 60 * 1000,
  });

  if (statsLoading || invoicesLoading) {
    return <LoadingState />;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Dashboard</h1>
          <p className="text-muted-foreground">
            {user?.name} • Accounting & Finance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Generate Reports
          </Button>
          <Button>
            <Receipt className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Monthly Revenue</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(financialStats?.monthlyRevenue || 0)}
                </p>
                <div className="flex items-center mt-2">
                  {financialStats?.revenueChange > 0 ? (
                    <>
                      <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-xs text-green-500">
                        +{financialStats?.revenueChange}% vs last month
                      </span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                      <span className="text-xs text-red-500">
                        {financialStats?.revenueChange}% vs last month
                      </span>
                    </>
                  )}
                </div>
              </div>
              <DollarSign className="h-10 w-10 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Operating Costs</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(financialStats?.operatingCosts || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Budget: {formatCurrency(financialStats?.budgetedCosts || 0)}
                </p>
              </div>
              <Calculator className="h-10 w-10 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Gross Margin</p>
                <p className="text-2xl font-bold mt-1">
                  {financialStats?.grossMargin || 0}%
                </p>
                <div className="flex items-center mt-2">
                  {financialStats?.marginTrend === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    Target: {financialStats?.marginTarget || 35}%
                  </span>
                </div>
              </div>
              <PiggyBank className="h-10 w-10 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Outstanding AR</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(financialStats?.accountsReceivable || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {financialStats?.overdueCount || 0} overdue
                </p>
              </div>
              <CreditCard className="h-10 w-10 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Invoices */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pending Invoices</CardTitle>
                <Badge variant="outline">
                  {pendingInvoices?.length || 0} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvoices?.slice(0, 5).map((invoice: any) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <Badge variant={invoice.overdue ? 'destructive' : 'secondary'}>
                          {invoice.overdue ? 'Overdue' : `Due in ${invoice.daysUntilDue} days`}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {invoice.customerName} • {invoice.projectName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(invoice.amount)}</p>
                      <Button size="sm" variant="outline" className="mt-1">
                        Process
                      </Button>
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-4">
                    No pending invoices
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Inflow</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(cashFlow?.inflow || 0)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-green-500 rounded-full"
                    style={{ width: `${Math.min((cashFlow?.inflowPercentage || 0), 100)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Outflow</span>
                  <span className="text-sm font-medium text-red-600">
                    {formatCurrency(cashFlow?.outflow || 0)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-red-500 rounded-full"
                    style={{ width: `${Math.min((cashFlow?.outflowPercentage || 0), 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Net Position</span>
                  <span className={`font-bold ${
                    (cashFlow?.netPosition || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(cashFlow?.netPosition || 0)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Analysis & Purchase Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Analysis by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {costAnalysis?.categories?.map((category: any) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {formatCurrency(category.amount)}
                    </span>
                    <Badge variant="outline">{category.percentage}%</Badge>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">
                  No cost data available
                </p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total Costs</span>
                <span className="font-bold text-lg">
                  {formatCurrency(costAnalysis?.totalCosts || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Purchase Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {purchaseOrders?.slice(0, 5).map((po: any) => (
                <div key={po.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{po.poNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {po.supplierName} • {po.itemCount} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      {formatCurrency(po.total)}
                    </p>
                    <Badge variant={po.status === 'approved' ? 'default' : 'secondary'}>
                      {po.status}
                    </Badge>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">
                  No recent purchase orders
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}