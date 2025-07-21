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
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Email Cost Import</h1>
        <p className="text-muted-foreground mt-2">
          Automatically import and reconcile supplier costs from emails for accurate job profitability analysis
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Imported costs awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Imported</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,678</div>
            <p className="text-xs text-muted-foreground">
              This month's imported costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance Alert</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">+15.2%</div>
            <p className="text-xs text-muted-foreground">
              Average cost overrun
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auto-Match Rate</CardTitle>
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">
              Invoices auto-matched to jobs
            </p>
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