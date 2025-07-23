import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialAnalyticsTab from "@/components/financial-intelligence/FinancialAnalyticsTab";
import CashFlowManagementTab from "@/components/financial-intelligence/CashFlowManagementTab";
import CostAnalysisTab from "@/components/financial-intelligence/CostAnalysisTab";
import BudgetTrackingTab from "@/components/financial-intelligence/BudgetTrackingTab";
import { 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Target,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialStats {
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  cashOnHand: number;
  accountsReceivable: number;
  accountsPayable: number;
  overduedInvoices: number;
}

export default function FinancialIntelligence() {
  const [activeTab, setActiveTab] = useState("analytics");

  const { data: stats, isLoading } = useQuery<FinancialStats>({
    queryKey: ["/api/financial-intelligence/stats"],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Intelligence</h1>
          <p className="text-sm text-gray-600 mt-1">
            Real-time financial insights and analytics for strategic decision making
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (YTD)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(stats?.revenue || 0)}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                  +12.5% from last year
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <PieChart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.profitMargin || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  Target: 22.5%
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash on Hand</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(stats?.cashOnHand || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  45 days of operating expenses
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(stats?.overduedInvoices || 0)}</div>
                <p className="text-xs text-muted-foreground flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  8 invoices past due
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Financial Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4" />
            <span>Cash Flow</span>
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center space-x-2">
            <PieChart className="h-4 w-4" />
            <span>Cost Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="budgets" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Budget Tracking</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <FinancialAnalyticsTab />
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <CashFlowManagementTab />
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <CostAnalysisTab />
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          <BudgetTrackingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}