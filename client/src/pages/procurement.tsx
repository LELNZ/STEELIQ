import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ShoppingCart, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Package,
  DollarSign,
  Plus,
  Search,
  Filter,
  Send,
  FileSignature,
  Truck
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

// Temporary mock data - will be replaced with actual API calls
const mockRequisitions = [
  {
    id: 1,
    requisitionNumber: "REQ-2025-001",
    requestedBy: "John Smith",
    department: "Fabrication",
    category: "Materials",
    priority: "urgent",
    status: "pending_approval",
    estimatedTotal: 5500,
    requiredByDate: new Date("2025-01-15"),
    items: 3,
    currentApprovalLevel: 1,
    maxApprovalLevel: 2,
  },
  {
    id: 2,
    requisitionNumber: "REQ-2025-002",
    requestedBy: "Sarah Johnson",
    department: "Office",
    category: "Supplies",
    priority: "standard",
    status: "approved",
    estimatedTotal: 350,
    requiredByDate: new Date("2025-01-20"),
    items: 5,
    currentApprovalLevel: 1,
    maxApprovalLevel: 1,
  },
];

const statusColors = {
  draft: "secondary",
  pending_approval: "warning",
  approved: "success",
  rejected: "destructive",
  converted_to_po: "default",
  cancelled: "secondary",
} as const;

const priorityColors = {
  standard: "secondary",
  urgent: "warning",
  critical: "destructive",
} as const;

export default function Procurement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");

  // Mock metrics - will be replaced with actual API calls
  const metrics = {
    pendingApprovals: 5,
    activePOs: 12,
    monthlySpend: 45678,
    savingsThisMonth: 3456,
    pendingRequisitions: 8,
    awaitingDelivery: 7,
  };

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Procurement Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage requisitions, approvals, purchase orders, and supplier relationships
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-bold text-warning mt-1">{metrics.pendingApprovals}</p>
                <p className="text-xs text-muted-foreground mt-2">Requires your action</p>
              </div>
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active POs</p>
                <p className="text-2xl font-bold">{metrics.activePOs}</p>
                <p className="text-xs text-muted-foreground mt-2">In progress</p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Spend</p>
                <p className="text-2xl font-bold">${metrics.monthlySpend.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-2">Current month</p>
              </div>
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Savings</p>
                <p className="text-2xl font-bold text-green-600">${metrics.savingsThisMonth.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-2">This month</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="dashboard">Overview</TabsTrigger>
            <TabsTrigger value="requisitions">
              Requisitions
              {metrics.pendingRequisitions > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {metrics.pendingRequisitions}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approvals">
              Approvals
              {metrics.pendingApprovals > 0 && (
                <Badge variant="warning" className="ml-2">
                  {metrics.pendingApprovals}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="rfq">RFQs</TabsTrigger>
            <TabsTrigger value="receiving">Receiving</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Requisition
            </Button>
          </div>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Requisitions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Requisitions</CardTitle>
                <CardDescription>Latest purchase requests requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockRequisitions.slice(0, 3).map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{req.requisitionNumber}</span>
                          <Badge variant={priorityColors[req.priority as keyof typeof priorityColors]} className="text-xs">
                            {req.priority}
                          </Badge>
                          <Badge variant={statusColors[req.status as keyof typeof statusColors]} className="text-xs">
                            {req.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {req.requestedBy} • {req.department} • {req.items} items
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${req.estimatedTotal.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Due {format(req.requiredByDate, "MMM dd")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Approval Queue */}
            <Card>
              <CardHeader>
                <CardTitle>Approval Queue</CardTitle>
                <CardDescription>Items waiting for your approval</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-warning/50 bg-warning/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-warning" />
                      <div>
                        <p className="font-medium text-sm">REQ-2025-001</p>
                        <p className="text-xs text-muted-foreground">
                          Steel materials • $5,500 • Urgent
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Reject</Button>
                      <Button size="sm">Approve</Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">REQ-2025-003</p>
                        <p className="text-xs text-muted-foreground">
                          Equipment rental • $2,200 • Standard
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Review</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Process Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Procurement Process Flow</CardTitle>
              <CardDescription>Current status of procurement pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FileSignature className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Requisitions</p>
                  <p className="text-2xl font-bold mt-1">{metrics.pendingRequisitions}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>

                <div className="text-muted-foreground">→</div>

                <div className="flex-1 text-center">
                  <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Clock className="h-6 w-6 text-warning" />
                  </div>
                  <p className="text-sm font-medium">Approvals</p>
                  <p className="text-2xl font-bold mt-1">{metrics.pendingApprovals}</p>
                  <p className="text-xs text-muted-foreground">Waiting</p>
                </div>

                <div className="text-muted-foreground">→</div>

                <div className="flex-1 text-center">
                  <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Send className="h-6 w-6 text-secondary" />
                  </div>
                  <p className="text-sm font-medium">RFQs</p>
                  <p className="text-2xl font-bold mt-1">3</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>

                <div className="text-muted-foreground">→</div>

                <div className="flex-1 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Purchase Orders</p>
                  <p className="text-2xl font-bold mt-1">{metrics.activePOs}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>

                <div className="text-muted-foreground">→</div>

                <div className="flex-1 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Truck className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm font-medium">Receiving</p>
                  <p className="text-2xl font-bold mt-1">{metrics.awaitingDelivery}</p>
                  <p className="text-xs text-muted-foreground">Awaiting</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requisitions Tab */}
        <TabsContent value="requisitions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Purchase Requisitions</CardTitle>
                  <CardDescription>Manage and track all purchase requests</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search requisitions..." 
                      className="pl-8 w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockRequisitions.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{req.requisitionNumber}</span>
                        <Badge variant={priorityColors[req.priority as keyof typeof priorityColors]} className="text-xs">
                          {req.priority}
                        </Badge>
                        <Badge variant={statusColors[req.status as keyof typeof statusColors]} className="text-xs">
                          {req.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Requested by {req.requestedBy} • {req.department} Department
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {req.items} items • Required by {format(req.requiredByDate, "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">${req.estimatedTotal.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        Approval {req.currentApprovalLevel}/{req.maxApprovalLevel}
                      </p>
                    </div>
                    <div className="ml-4">
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other tabs will be implemented in subsequent phases */}
        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Review and approve purchase requisitions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Approval workflow coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase-orders">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Manage active purchase orders</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Purchase order management coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rfq">
          <Card>
            <CardHeader>
              <CardTitle>Request for Quotes</CardTitle>
              <CardDescription>Manage RFQ processes and supplier responses</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">RFQ system coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receiving">
          <Card>
            <CardHeader>
              <CardTitle>Goods Receiving</CardTitle>
              <CardDescription>Track deliveries and manage goods receipt notes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Receiving management coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}