import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Activity,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Filter,
  Settings,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PriceFeedsTab() {
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const { data: priceFeeds, isLoading } = useQuery({
    queryKey: ["/api/supplier-integration/price-feeds", selectedSupplier, selectedCategory],
  });

  const { data: priceComparisons } = useQuery({
    queryKey: ["/api/supplier-integration/price-comparisons"],
  });

  const { data: suppliers } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  const { data: priceAlerts } = useQuery({
    queryKey: ["/api/supplier-integration/price-alerts"],
  });

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "error":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case "paused":
        return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="structural">Structural Steel</SelectItem>
                  <SelectItem value="plate">Plate & Sheet</SelectItem>
                  <SelectItem value="merchant">Merchant Bar</SelectItem>
                  <SelectItem value="hollow">Hollow Sections</SelectItem>
                  <SelectItem value="consumables">Consumables</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="active-only" 
                  checked={showActiveOnly}
                  onCheckedChange={(checked) => setShowActiveOnly(checked as boolean)}
                />
                <Label htmlFor="active-only">Active feeds only</Label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
            <Button size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync All
            </Button>
          </div>
        </div>
      </Card>

      {/* Price Feeds Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live Price Feeds */}
        <div className="lg:col-span-2">
          <Card>
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Live Price Feeds</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Price Feed Configuration</DialogTitle>
                      <DialogDescription>
                        Configure supplier API connections and update frequencies
                      </DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="api">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="api">API Settings</TabsTrigger>
                        <TabsTrigger value="mapping">Field Mapping</TabsTrigger>
                        <TabsTrigger value="schedule">Update Schedule</TabsTrigger>
                      </TabsList>
                      <TabsContent value="api" className="space-y-4">
                        <div>
                          <Label>API Endpoint</Label>
                          <Input placeholder="https://api.supplier.com/prices" />
                        </div>
                        <div>
                          <Label>Authentication Type</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select auth type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="api-key">API Key</SelectItem>
                              <SelectItem value="oauth">OAuth 2.0</SelectItem>
                              <SelectItem value="basic">Basic Auth</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TabsContent>
                      <TabsContent value="mapping">
                        <p className="text-sm text-muted-foreground">
                          Map supplier fields to your system fields
                        </p>
                      </TabsContent>
                      <TabsContent value="schedule">
                        <p className="text-sm text-muted-foreground">
                          Set update frequency and timing
                        </p>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Last Update</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceFeeds && priceFeeds.length > 0 ? (
                    priceFeeds.map((feed: any) => (
                      <TableRow key={feed.id}>
                        <TableCell className="font-medium">
                          {feed.supplierName}
                        </TableCell>
                        <TableCell>{feed.itemCount || 0}</TableCell>
                        <TableCell>{feed.lastUpdate || "Never"}</TableCell>
                        <TableCell>{getStatusBadge(feed.status || "inactive")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No price feeds configured
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>

        {/* Recent Price Changes */}
        <div>
          <Card>
            <div className="p-4 border-b">
              <h3 className="font-semibold">Recent Price Changes</h3>
            </div>
            <div className="p-4 space-y-3">
              {priceAlerts && priceAlerts.length > 0 ? (
                priceAlerts.slice(0, 3).map((alert: any, index: number) => {
                  const isIncrease = alert.change > 0;
                  const isNeutral = alert.change === 0;
                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        isIncrease ? "bg-red-50" : isNeutral ? "bg-gray-50" : "bg-green-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isIncrease ? (
                          <TrendingUp className="h-5 w-5 text-red-500" />
                        ) : isNeutral ? (
                          <Minus className="h-5 w-5 text-gray-500" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-green-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{alert.material}</p>
                          <p className="text-xs text-muted-foreground">Price Update</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${
                          isIncrease ? "text-red-600" : isNeutral ? "text-gray-600" : "text-green-600"
                        }`}>
                          {isIncrease ? "+" : ""}{alert.change.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">${alert.price}/{alert.unit}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent price alerts</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Price History Table */}
      <Card>
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Material Price History</h3>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Current Price</TableHead>
                <TableHead>Previous Price</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Trend (30d)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {priceComparisons && priceComparisons.length > 0 ? (
                priceComparisons.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell>{item.supplier}</TableCell>
                    <TableCell>{item.currentPrice}</TableCell>
                    <TableCell className="text-muted-foreground">{item.previousPrice}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPriceChangeIcon(item.priceChange || 0)}
                        <span className={item.priceChange > 0 ? "text-red-600" : item.priceChange < 0 ? "text-green-600" : "text-gray-600"}>
                          {item.priceChange > 0 ? "+" : ""}{item.priceChange || 0}%</span>
                  </div>
                    </TableCell>
                    <TableCell>{item.lastUpdated || "Never"}</TableCell>
                    <TableCell>
                      <div className={`h-8 w-16 rounded ${
                        item.priceChange > 0 ? "bg-red-100" : item.priceChange < 0 ? "bg-green-100" : "bg-gray-100"
                      }`} />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No price comparison data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}