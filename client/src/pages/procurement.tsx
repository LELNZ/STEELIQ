import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
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
import { useQuery, useMutation } from "@tanstack/react-query";
import CreateRequisitionDialog from "@/components/procurement/CreateRequisitionDialog";
import RequisitionDetailsDialog from "@/components/procurement/RequisitionDetailsDialog";
import { RejectRequisitionDialog } from "@/components/procurement/RejectRequisitionDialog";
import { ResubmitRequisitionDialog } from "@/components/procurement/ResubmitRequisitionDialog";
import PurchaseOrdersView from "@/components/procurement/PurchaseOrdersView";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";


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
  const [createRequisitionOpen, setCreateRequisitionOpen] = useState(false);
  const [selectedRequisitionId, setSelectedRequisitionId] = useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequisition, setRejectingRequisition] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [resubmitDialogOpen, setResubmitDialogOpen] = useState(false);
  const [resubmittingRequisition, setResubmittingRequisition] = useState<any>(null);
  const { toast } = useToast();

  // Fetch real metrics from API
  const { data: metrics = {
    pendingApprovals: 0,
    activePOs: 0,
    monthlySpend: 0,
    savingsThisMonth: 0,
    pendingRequisitions: 0,
    awaitingDelivery: 0,
  } } = useQuery({
    queryKey: ["/api/procurement/metrics"],
  });

  // Fetch requisitions (with archive filter)
  const { data: requisitions = [], isLoading: requisitionsLoading } = useQuery({
    queryKey: ["/api/procurement/requisitions", showArchived ? "archived" : "active"],
    queryFn: async () => {
      const params = showArchived ? "?archivedOnly=true" : "";
      const response = await fetch(`/api/procurement/requisitions${params}`);
      if (!response.ok) throw new Error("Failed to fetch requisitions");
      return response.json();
    },
  });

  // Fetch pending approvals for current user
  const { data: pendingApprovals = [], isLoading: approvalsLoading } = useQuery({
    queryKey: ["/api/procurement/approvals/pending"],
  });

  // Approve requisition mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, comments }: { id: number; comments?: string }) => 
      apiRequest(`/api/procurement/requisitions/${id}/approve`, "POST", { comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/metrics"] });
      toast({
        title: "Success",
        description: "Requisition approved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve requisition",
        variant: "destructive",
      });
    },
  });

  // Archive requisition mutation
  const archiveMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/procurement/requisitions/${id}/archive`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/metrics"] });
      toast({
        title: "Success",
        description: "Requisition archived successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive requisition",
        variant: "destructive",
      });
    },
  });

  // Unarchive requisition mutation
  const unarchiveMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/procurement/requisitions/${id}/unarchive`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/requisitions"] });
      toast({
        title: "Success",
        description: "Requisition restored successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore requisition",
        variant: "destructive",
      });
    },
  });

  // Resubmit requisition mutation
  const resubmitMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates?: any }) => 
      apiRequest(`/api/procurement/requisitions/${id}/resubmit`, "POST", { updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/metrics"] });
      toast({
        title: "Success",
        description: "Requisition resubmitted successfully",
      });
      setResubmitDialogOpen(false);
      setResubmittingRequisition(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to resubmit requisition",
        variant: "destructive",
      });
    },
  });

  // Reject requisition mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, comments }: { id: number; comments: string }) => 
      apiRequest(`/api/procurement/requisitions/${id}/reject`, "POST", { comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/metrics"] });
      toast({
        title: "Success",
        description: "Requisition rejected",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject requisition",
        variant: "destructive",
      });
    },
  });

  // Filter requisitions based on search and archive status
  const filteredRequisitions = requisitions.filter((req: any) => {
    // Filter out archived items unless we're on the archived tab
    if (activeTab !== "archived" && req.isArchived) return false;
    
    // Apply search filter
    return req.requisitionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.category?.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        // Show archived items when switching to archived tab
        setShowArchived(value === "archived");
      }}>
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
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button className="gap-2" onClick={() => setCreateRequisitionOpen(true)}>
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
                  {requisitionsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : requisitions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No requisitions yet</p>
                  ) : (
                    requisitions.slice(0, 3).map((req: any) => (
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
                            {req.department} • {req.category}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${(req.estimatedTotal || 0).toLocaleString()}</p>
                          {req.requiredByDate && (
                            <p className="text-xs text-muted-foreground">
                              Due {format(new Date(req.requiredByDate), "MMM dd")}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
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
                  {approvalsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : pendingApprovals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending approvals</p>
                  ) : (
                    pendingApprovals.slice(0, 3).map((req: any) => (
                      <div key={req.id} className="flex items-center justify-between p-3 border border-warning/50 bg-warning/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-warning" />
                          <div>
                            <p className="font-medium text-sm">{req.requisitionNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {req.category} • ${(req.estimatedTotal || 0).toLocaleString()} • {req.priority}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const comments = prompt("Rejection reason (required):");
                              if (comments) {
                                rejectMutation.mutate({ id: req.id, comments });
                              }
                            }}
                          >
                            Reject
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => approveMutation.mutate({ id: req.id })}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
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
                {requisitionsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading requisitions...</p>
                ) : filteredRequisitions.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No requisitions found</p>
                    <Button 
                      variant="outline" 
                      className="mt-3"
                      onClick={() => setCreateRequisitionOpen(true)}
                    >
                      Create First Requisition
                    </Button>
                  </div>
                ) : (
                  filteredRequisitions.map((req: any) => (
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
                          {req.department} Department • {req.category}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {req.justification?.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">${(req.estimatedTotal || 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Approval {req.currentApprovalLevel || 0}/{req.maxApprovalLevel || 1}
                        </p>
                        {req.requiredByDate && (
                          <p className="text-xs text-muted-foreground">
                            Due {format(new Date(req.requiredByDate), "MMM dd")}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedRequisitionId(req.id)}
                        >
                          View Details
                        </Button>
                        {req.status === 'rejected' && !req.isArchived && (
                          <Button 
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setResubmittingRequisition(req);
                              setResubmitDialogOpen(true);
                            }}
                          >
                            Resubmit
                          </Button>
                        )}
                        {(req.status === 'approved' || req.status === 'rejected' || req.status === 'cancelled') && !req.isArchived && (
                          <Button 
                            size="sm"
                            variant="secondary"
                            onClick={() => archiveMutation.mutate(req.id)}
                          >
                            Archive
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Review and approve purchase requisitions requiring your action</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requisitionsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading approvals...</p>
                ) : requisitions.filter((r: any) => r.status === 'pending_approval').length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No pending approvals</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      All requisitions have been processed
                    </p>
                  </div>
                ) : (
                  requisitions.filter((r: any) => r.status === 'pending_approval').map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{req.requisitionNumber}</span>
                          <Badge variant={priorityColors[req.priority as keyof typeof priorityColors]} className="text-xs">
                            {req.priority}
                          </Badge>
                          <Badge variant="warning" className="text-xs">
                            {(() => {
                              const amount = req.estimatedTotal || 0;
                              if (amount <= 1000) return "Level 1 Approval (Supervisor)";
                              if (amount <= 5000) return "Level 2 Approval (Manager)";
                              if (amount <= 20000) return "Level 3 Approval (Director)";
                              return "Level 4 Approval (CEO)";
                            })()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {req.department} Department • {req.category}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {req.justification?.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="font-semibold text-lg">${(req.estimatedTotal || 0).toLocaleString()}</p>
                        {req.requiredByDate && (
                          <p className="text-xs text-muted-foreground">
                            Due {format(new Date(req.requiredByDate), "MMM dd")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedRequisitionId(req.id)}
                        >
                          Review
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => {
                            setRejectingRequisition(req);
                            setRejectDialogOpen(true);
                          }}
                        >
                          Reject
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => approveMutation.mutate({ id: req.id })}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RFQs Tab - Request for Quotes */}
        <TabsContent value="rfq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request for Quotes</CardTitle>
              <CardDescription>Send approved requisitions to suppliers for competitive quotes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requisitions.filter((r: any) => r.status === 'approved').length === 0 ? (
                  <div className="text-center py-8">
                    <Send className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No items ready for RFQ</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Approve requisitions to start the RFQ process
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Approved Requisitions - Ready for RFQ</h4>
                      {requisitions
                        .filter((r: any) => r.status === 'approved')
                        .map((req: any) => (
                          <div key={req.id} className="flex items-center justify-between py-2">
                            <div>
                              <span className="font-medium">{req.requisitionNumber}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ${(req.estimatedTotal || 0).toLocaleString()}
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                toast({
                                  title: "Send RFQ",
                                  description: "Supplier RFQ portal will be implemented in Phase 3",
                                });
                              }}
                            >
                              <Send className="h-3 w-3 mr-2" />
                              Send to Suppliers
                            </Button>
                          </div>
                        ))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <strong>Phase 3 Features:</strong> Supplier portal, automated RFQ sending, quote comparison, and award management
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders" className="space-y-4">
          <PurchaseOrdersView />
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

        {/* Receiving Tab - Goods Receipt */}
        <TabsContent value="receiving" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Goods Receiving</CardTitle>
              <CardDescription>Track deliveries and verify receipt of ordered goods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No pending deliveries</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Purchase orders in transit will appear here for receiving
                  </p>
                </div>
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Receiving Features (Coming Soon)</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Mobile barcode scanning for quick receiving</li>
                    <li>• Quality inspection workflows</li>
                    <li>• Automatic inventory updates</li>
                    <li>• Discrepancy reporting and resolution</li>
                    <li>• Mill certificate attachment and verification</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Archived Tab */}
        <TabsContent value="archived" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Archived Requisitions</CardTitle>
              <CardDescription>View archived purchase requisitions and restore if needed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {requisitionsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading archived requisitions...</p>
                ) : requisitions.filter((r: any) => r.isArchived).length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No archived requisitions</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Approved and rejected requisitions can be archived to keep your list organized
                    </p>
                  </div>
                ) : (
                  requisitions.filter((r: any) => r.isArchived).map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{req.requisitionNumber}</span>
                          <Badge variant={statusColors[req.status as keyof typeof statusColors]} className="text-xs">
                            {req.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {req.department} Department • {req.category}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Archived on {req.archivedAt ? format(new Date(req.archivedAt), "MMM dd, yyyy") : "N/A"}
                        </p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="font-semibold">${(req.estimatedTotal || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedRequisitionId(req.id)}
                        >
                          View
                        </Button>
                        <Button 
                          size="sm"
                          variant="secondary"
                          onClick={() => unarchiveMutation.mutate(req.id)}
                        >
                          Restore
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Requisition Dialog */}
      <CreateRequisitionDialog 
        open={createRequisitionOpen}
        onOpenChange={setCreateRequisitionOpen}
      />

      {/* Requisition Details Dialog */}
      {selectedRequisitionId && (
        <RequisitionDetailsDialog
          open={!!selectedRequisitionId}
          onOpenChange={(open) => !open && setSelectedRequisitionId(null)}
          requisitionId={selectedRequisitionId}
        />
      )}

      {/* Reject Requisition Dialog */}
      {rejectingRequisition && (
        <RejectRequisitionDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          requisitionNumber={rejectingRequisition.requisitionNumber}
          amount={rejectingRequisition.estimatedTotal || 0}
          onReject={(reason) => {
            rejectMutation.mutate({ 
              id: rejectingRequisition.id, 
              comments: reason 
            });
            setRejectDialogOpen(false);
            setRejectingRequisition(null);
          }}
        />
      )}

      {/* Resubmit Requisition Dialog */}
      {resubmittingRequisition && (
        <ResubmitRequisitionDialog
          open={resubmitDialogOpen}
          onOpenChange={setResubmitDialogOpen}
          requisition={resubmittingRequisition}
          onResubmit={(updates) => {
            resubmitMutation.mutate({ 
              id: resubmittingRequisition.id, 
              updates 
            });
          }}
        />
      )}
    </div>
  );
}