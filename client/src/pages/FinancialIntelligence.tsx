import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialAnalyticsTab from "@/components/financial-intelligence/FinancialAnalyticsTab";
import CashFlowManagementTab from "@/components/financial-intelligence/CashFlowManagementTab";
import CostAnalysisTab from "@/components/financial-intelligence/CostAnalysisTab";
import BudgetTrackingTab from "@/components/financial-intelligence/BudgetTrackingTab";
import { JobCostingAnalytics } from "@/components/analytics/JobCostingAnalytics";
import { ExecutiveReportingDashboard } from "@/components/executive/ExecutiveReportingDashboard";
import { 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Target,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Calculator,
  BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface FinancialStats {
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
  profitMarginTarget: number;
  cashOnHand: number;
  daysOfExpenses: number;
  accountsReceivable: number;
  accountsPayable: number;
  overduedInvoices: number;
  overdueInvoiceCount: number;
  yearOverYearGrowth: number;
  lastYearRevenue: number;
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Revenue (YTD)</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-32 mt-1" />
                ) : (
                  <>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">
                      {formatCurrency(stats?.revenue || 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 flex items-center">
                      {stats?.yearOverYearGrowth !== undefined && stats.yearOverYearGrowth !== 0 ? (
                        <>
                          {stats.yearOverYearGrowth > 0 ? (
                            <ArrowUpRight className="h-3 w-3 text-accent mr-1" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                          )}
                          <span className={stats.yearOverYearGrowth > 0 ? "text-accent font-medium" : "text-red-500 font-medium"}>
                            {stats.yearOverYearGrowth > 0 ? '+' : ''}{stats.yearOverYearGrowth.toFixed(1)}%
                          </span>
                          <span className="ml-1 hidden sm:inline">from last year</span>
                        </>
                      ) : (
                        <span className="text-xs">No prior year data</span>
                      )}
                    </p>
                  </>
                )}
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Profit Margin</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-20 mt-1" />
                ) : (
                  <>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">
                      {(stats?.profitMargin || 0).toFixed(1)}%
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                      Target: {stats?.profitMarginTarget || 20}%
                    </p>
                  </>
                )}
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <PieChart className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Cash on Hand</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-32 mt-1" />
                ) : (
                  <>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">
                      {formatCurrency(stats?.cashOnHand || 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                      {stats?.daysOfExpenses !== undefined && stats.daysOfExpenses < 999 
                        ? `${stats.daysOfExpenses} days of expenses`
                        : 'Sufficient cash reserves'}
                    </p>
                  </>
                )}
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Overdue Invoices</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-32 mt-1" />
                ) : (
                  <>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">
                      {formatCurrency(stats?.overduedInvoices || 0)}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {stats?.overdueInvoiceCount || 0} invoice{(stats?.overdueInvoiceCount || 0) !== 1 ? 's' : ''} past due
                    </p>
                  </>
                )}
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
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
          <TabsTrigger value="jobcosting" className="flex items-center space-x-2">
            <Calculator className="h-4 w-4" />
            <span>Job Costing</span>
          </TabsTrigger>
          <TabsTrigger value="executive" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Executive</span>
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

        <TabsContent value="jobcosting" className="space-y-4">
          <JobCostingAnalytics />
        </TabsContent>

        <TabsContent value="executive" className="space-y-4">
          <ExecutiveReportingDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}