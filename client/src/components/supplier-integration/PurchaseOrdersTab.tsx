import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Plus,
  Settings,
  Download,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  Truck,
  FileText,
  RotateCcw,
  Calculator,
  Calendar,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PurchaseOrdersTab() {
  const [showAutomationDialog, setShowAutomationDialog] = useState(false);
  const [selectedPOs, setSelectedPOs] = useState<number[]>([]);

  const { data: purchaseOrders } = useQuery({
    queryKey: ["/api/supplier-integration/purchase-orders"],
  });

  const { data: automationRules } = useQuery({
    queryKey: ["/api/supplier-integration/automation-rules"],
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      draft: { color: "gray", icon: <FileText className="h-3 w-3" /> },
      pending: { color: "yellow", icon: <Clock className="h-3 w-3" /> },
      sent: { color: "blue", icon: <Send className="h-3 w-3" /> },
      confirmed: { color: "green", icon: <CheckCircle className="h-3 w-3" /> },
      delivered: { color: "purple", icon: <Truck className="h-3 w-3" /> },
      cancelled: { color: "red", icon: <RotateCcw className="h-3 w-3" /> },
    };

    const config = statusConfig[status] || statusConfig.draft;
    
    return (
      <Badge className={`bg-${config.color}-100 text-${config.color}-800`}>
        <span className="flex items-center gap-1">
          {config.icon}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold">Purchase Orders</h3>
            <div className="flex items-center gap-2">
              <Switch id="auto-po" />
              <Label htmlFor="auto-po" className="cursor-pointer">
                Auto-create POs
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={showAutomationDialog} onOpenChange={setShowAutomationDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Zap className="h-4 w-4 mr-2" />
                  Automation Rules
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Purchase Order Automation</DialogTitle>
                  <DialogDescription>
                    Configure rules for automatic PO creation
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="triggers" className="mt-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="triggers">Triggers</TabsTrigger>
                    <TabsTrigger value="conditions">Conditions</TabsTrigger>
                    <TabsTrigger value="actions">Actions</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>
                  <TabsContent value="triggers" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox />
                          <div>
                            <p className="font-medium">Low Stock Alert</p>
                            <p className="text-sm text-muted-foreground">
                              Create PO when stock falls below minimum
                            </p>
                          </div>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox />
                          <div>
                            <p className="font-medium">Job Material Request</p>
                            <p className="text-sm text-muted-foreground">
                              Auto-order materials for approved jobs
                            </p>
                          </div>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox />
                          <div>
                            <p className="font-medium">Scheduled Replenishment</p>
                            <p className="text-sm text-muted-foreground">
                              Regular orders for consumables
                            </p>
                          </div>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="conditions" className="space-y-4">
                    <div>
                      <Label>Minimum Order Value</Label>
                      <Input type="number" placeholder="$500" />
                    </div>
                    <div>
                      <Label>Lead Time Buffer (days)</Label>
                      <Input type="number" placeholder="7" />
                    </div>
                    <div>
                      <Label>Preferred Suppliers Only</Label>
                      <Switch />
                    </div>
                  </TabsContent>
                  <TabsContent value="actions" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Checkbox defaultChecked />
                        <Label>Create draft PO for review</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox />
                        <Label>Auto-send to supplier</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox defaultChecked />
                        <Label>Email notification to purchasing</Label>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="history">
                    <p className="text-sm text-muted-foreground">
                      Recent automation activity
                    </p>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create PO
            </Button>
          </div>
        </div>
      </Card>

      {/* PO Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Open POs</p>
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-muted-foreground">$145,230 total</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold">3</p>
              <p className="text-xs text-muted-foreground">$23,450 total</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">In Transit</p>
              <p className="text-2xl font-bold">5</p>
              <p className="text-xs text-muted-foreground">2-5 days ETA</p>
            </div>
            <Truck className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Auto-Created</p>
              <p className="text-2xl font-bold">8</p>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
            <Zap className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="font-semibold">Recent Purchase Orders</h3>
              <div className="flex gap-2">
                <Select defaultValue="all">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="7days">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="90days">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                <TableHead className="w-12">
                  <Checkbox />
                </TableHead>
                <TableHead>PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    PO-2025-0145
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Zap className="h-3 w-3 text-green-600" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Auto-generated from low stock alert</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
                <TableCell>Steel & Tube Holdings</TableCell>
                <TableCell>15</TableCell>
                <TableCell>$12,450.00</TableCell>
                <TableCell>Today, 9:45 AM</TableCell>
                <TableCell>{getStatusBadge("sent")}</TableCell>
                <TableCell>Jan 25</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell className="font-medium">PO-2025-0144</TableCell>
                <TableCell>Fletcher Steel</TableCell>
                <TableCell>8</TableCell>
                <TableCell>$8,234.50</TableCell>
                <TableCell>Today, 8:30 AM</TableCell>
                <TableCell>{getStatusBadge("confirmed")}</TableCell>
                <TableCell>Jan 24</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Package className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Checkbox />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    PO-2025-0143
                    <Badge variant="outline" className="text-xs">
                      Draft
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>Vulcan Steel</TableCell>
                <TableCell>23</TableCell>
                <TableCell>$23,450.00</TableCell>
                <TableCell>Yesterday</TableCell>
                <TableCell>{getStatusBadge("draft")}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Calculator className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Automation Activity */}
      <Card>
        <div className="p-4 border-b">
          <h3 className="font-semibold">Automation Activity</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm">Auto PO Created</p>
              <p className="text-sm text-muted-foreground">
                Low stock alert triggered PO-2025-0145 for 100x100x6 SHS (15 units)
              </p>
              <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <ShoppingCart className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm">Job Material Request</p>
              <p className="text-sm text-muted-foreground">
                Created draft PO for Job #2025-412982 materials
              </p>
              <p className="text-xs text-muted-foreground mt-1">4 hours ago</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-sm">Rule Skipped</p>
              <p className="text-sm text-muted-foreground">
                Order value $234.50 below minimum threshold of $500
              </p>
              <p className="text-xs text-muted-foreground mt-1">Yesterday</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}