import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Package,
  TrendingUp,
  ShoppingCart,
  AlertCircle,
  BarChart3,
  RefreshCw,
  Settings,
  Zap,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriceFeedsTab } from "@/components/supplier-integration/PriceFeedsTab";
import { ApiConnectionsTab } from "@/components/supplier-integration/ApiConnectionsTab";
import { PurchaseOrdersTab } from "@/components/supplier-integration/PurchaseOrdersTab";
import { PerformanceTab } from "@/components/supplier-integration/PerformanceTab";

export default function SupplierIntegrationHub() {
  const [activeTab, setActiveTab] = useState("price-feeds");

  const { data: stats } = useQuery({
    queryKey: ["/api/supplier-integration/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Supplier Integration Hub</h1>
          <p className="text-muted-foreground">
            Real-time supplier connections and automated procurement
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Integration Settings
          </Button>
          <Button size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync All
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Integrations</p>
              <p className="text-2xl font-bold">{stats?.activeIntegrations || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Live connections</p>
            </div>
            <Zap className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Price Updates</p>
              <p className="text-2xl font-bold">{stats?.priceUpdates || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Auto POs</p>
              <p className="text-2xl font-bold">{stats?.automaticPOs || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Catalog Items</p>
              <p className="text-2xl font-bold">{stats?.catalogItems || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Available products</p>
            </div>
            <Package className="h-8 w-8 text-orange-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Performance Score</p>
              <p className="text-2xl font-bold">{stats?.performanceScore || 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">Avg supplier rating</p>
            </div>
            <BarChart3 className="h-8 w-8 text-teal-600" />
          </div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="price-feeds" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Price Feeds
          </TabsTrigger>
          <TabsTrigger value="api-connections" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            API Connections
          </TabsTrigger>
          <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="price-feeds">
          <PriceFeedsTab />
        </TabsContent>

        <TabsContent value="api-connections">
          <ApiConnectionsTab />
        </TabsContent>

        <TabsContent value="purchase-orders">
          <PurchaseOrdersTab />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab />
        </TabsContent>
      </Tabs>

      {/* System Status */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-medium">Integration Status</p>
            <p className="text-xs text-muted-foreground">
              All systems operational. Last sync: {new Date().toLocaleTimeString()}
            </p>
          </div>
          <Button variant="outline" size="sm">
            View Logs
          </Button>
        </div>
      </Card>
    </div>
  );
}