import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Mail, FileSearch, TrendingUp, Settings2, Upload, RefreshCw } from "lucide-react";
import EmailAccountsTab from "@/components/email-cost-import/EmailAccountsTab";
import ImportedCostsTab from "@/components/email-cost-import/ImportedCostsTab";
import CostVarianceTab from "@/components/email-cost-import/CostVarianceTab";
import SupplierTemplatesTab from "@/components/email-cost-import/SupplierTemplatesTab";

export default function EmailCostImport() {
  const [activeTab, setActiveTab] = useState("accounts");

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Email Cost Import</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically import and reconcile supplier costs from emails for accurate job profitability analysis
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Pending Review</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">12</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  Imported costs awaiting review
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <FileSearch className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Imported</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">$45,678</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  This month's imported costs
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Variance Alert</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-500 mt-0.5 sm:mt-1">+15.2%</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  Average cost overrun
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Auto-Match Rate</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-0.5 sm:mt-1">87%</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  Invoices auto-matched to jobs
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Settings2 className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Accounts
          </TabsTrigger>
          <TabsTrigger value="costs" className="flex items-center gap-2">
            <FileSearch className="h-4 w-4" />
            Imported Costs
          </TabsTrigger>
          <TabsTrigger value="variance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Cost Variance
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Supplier Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <EmailAccountsTab />
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <ImportedCostsTab />
        </TabsContent>

        <TabsContent value="variance" className="space-y-4">
          <CostVarianceTab />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <SupplierTemplatesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}