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
  Truck,
  Info
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation } from "@tanstack/react-query";
import CreateRequisitionDialog from "@/components/procurement/CreateRequisitionDialog";
import RequisitionDetailsDialog from "@/components/procurement/RequisitionDetailsDialog";
import { RejectRequisitionDialog } from "@/components/procurement/RejectRequisitionDialog";
import { ResubmitRequisitionDialog } from "@/components/procurement/ResubmitRequisitionDialog";
import PurchaseOrdersView from "@/components/procurement/PurchaseOrdersView";
import RFQManagementView from "@/components/procurement/RFQManagementView";
import QuotesComparisonView from "@/components/procurement/QuotesComparisonView";
import ConvertToPODialog from "@/components/procurement/ConvertToPODialog";
import AuditLogViewer from "@/components/procurement/AuditLogViewer";
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
  const [createRfqFromRequisition, setCreateRfqFromRequisition] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingRequisition, setRejectingRequisition] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [resubmitDialogOpen, setResubmitDialogOpen] = useState(false);
  const [resubmittingRequisition, setResubmittingRequisition] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [convertToPOOpen, setConvertToPOOpen] = useState(false);
  const [convertingRequisition, setConvertingRequisition] = useState<any>(null);
  const { toast } = useToast();

  // Fetch real metrics from API
  const { data: metrics = {
    pendingApprovals: 0,
    activePOs: 0,
    monthlySpend: 0,
    savingsThisMonth: 0,
    pendingRequisitions: 0,
    awaitingDelivery: 0,
    // RFQ metrics
    draftRfqs: 0,
    draftRfqTotal: 0,
    activeRfqs: 0,
    activeRfqTotal: 0,
    // PO metrics
    draftPOs: 0,
    draftPOTotal: 0,
    pendingPOs: 0,
    pendingPOTotal: 0,
    activePOTotal: 0,
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

  // Filter requisitions based on search, archive status, and status filter
  const filteredRequisitions = requisitions.filter((req: any) => {
    // Filter out archived items unless we're on the archived tab
    if (activeTab !== "archived" && req.isArchived) return false;
    
    // Apply status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        if (!["draft", "pending_approval", "approved"].includes(req.status)) return false;
      } else if (statusFilter === "completed") {
        if (!["converted_to_po", "cancelled"].includes(req.status)) return false;
      } else if (statusFilter !== req.status) {
        return false;
      }
    }
    
    // Apply search filter
    return req.requisitionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.category?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="container mx-auto p-3">
      {/* Header */}
      <div className="mb-3">
        <h1 className="text-xl font-bold">Procurement Center</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage requisitions, approvals, purchase orders, and supplier relationships
        </p>
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 mt-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-xs">
              <p className="font-medium text-blue-900 dark:text-blue-100">Procurement Policy</p>
              <p className="text-blue-800 dark:text-blue-200 mt-0.5">
                All purchases require RFQ process. Emergency purchases bypass with manager approval.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pending Approvals</p>
                <p className="text-xl font-bold text-warning">{metrics.pendingApprovals}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Requires your action</p>
              </div>
              <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Active POs</p>
                <p className="text-xl font-bold">{metrics.activePOs}</p>
                <p className="text-xs text-muted-foreground mt-0.5">${metrics.activePOTotal.toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Monthly Spend</p>
                <p className="text-xl font-bold">${metrics.monthlySpend.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Current month</p>
              </div>
              <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Savings</p>
                <p className="text-xl font-bold text-green-600">${metrics.savingsThisMonth.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">This month</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
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
        <div className="flex items-center justify-between mb-2">
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
            <TabsTrigger value="rfqs">RFQs</TabsTrigger>
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="receiving">Receiving</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
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
        <TabsContent value="dashboard" className="space-y-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* Recent Requisitions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Recent Requisitions</CardTitle>
                <CardDescription className="text-xs">Latest purchase requests requiring attention</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-2">
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
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Approval Queue</CardTitle>
                <CardDescription className="text-xs">Items waiting for your approval</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-2">
                  {approvalsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : pendingApprovals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending approvals</p>
                  ) : (
                    pendingApprovals.slice(0, 3).map((req: any) => (
                      <div key={req.id} className="flex items-center justify-between p-2 border border-warning/50 bg-warning/5 rounded-lg">
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
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Procurement Process Flow</CardTitle>
              <CardDescription className="text-xs">Current status of procurement pipeline</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <TooltipProvider>
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-center">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-1">
                      <FileSignature className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-xs font-medium">Requisitions</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs font-semibold mb-1">Requisition Statuses:</p>
                          <p className="text-xs">• <span className="font-medium">Draft:</span> Being created, not submitted</p>
                          <p className="text-xs">• <span className="font-medium">Pending:</span> Awaiting approval</p>
                          <p className="text-xs">• <span className="font-medium">Approved:</span> Ready for RFQ/PO creation</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-lg font-bold">{metrics.pendingRequisitions}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>

                  <div className="text-muted-foreground">→</div>

                  <div className="flex-1 text-center">
                    <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-1">
                      <Clock className="h-5 w-5 text-warning" />
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-xs font-medium">Approvals</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs font-semibold mb-1">Approval Process:</p>
                          <p className="text-xs">• Multi-level approval based on value</p>
                          <p className="text-xs">• Reviews requisition details</p>
                          <p className="text-xs">• Can approve, reject, or request changes</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-lg font-bold">{metrics.pendingApprovals}</p>
                    <p className="text-xs text-muted-foreground">Waiting</p>
                  </div>

                  <div className="text-muted-foreground">→</div>

                  <div className="flex-1 text-center">
                    <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-1">
                      <Send className="h-5 w-5 text-secondary" />
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-xs font-medium">RFQs</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs font-semibold mb-1">RFQ Statuses:</p>
                          <p className="text-xs">• <span className="font-medium">Draft:</span> Being prepared, not sent</p>
                          <p className="text-xs">• <span className="font-medium">Active:</span> Sent to suppliers, awaiting quotes</p>
                          <p className="text-xs">• <span className="font-medium">Closed:</span> Quote evaluation complete</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-lg font-bold">{metrics.activeRfqs || 0}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                    <div className="mt-1 text-xs">
                      <span className="text-muted-foreground">Draft: </span>
                      <span className="font-medium">{metrics.draftRfqs || 0}</span>
                      <span className="text-muted-foreground"> • Closed: </span>
                      <span className="font-medium">{metrics.closedRfqs || 0}</span>
                    </div>
                  </div>

                  <div className="text-muted-foreground">→</div>

                  <div className="flex-1 text-center">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-1">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-xs font-medium">Purchase Orders</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs font-semibold mb-1">PO Statuses:</p>
                          <p className="text-xs">• <span className="font-medium">Draft:</span> Created but not sent</p>
                          <p className="text-xs">• <span className="font-medium">Active:</span> Sent to supplier</p>
                          <p className="text-xs">• <span className="font-medium">Executed:</span> Supplier acknowledged</p>
                          <p className="text-xs">• <span className="font-medium">Complete:</span> Goods/services delivered</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-lg font-bold">{metrics.activePOs}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                    <div className="mt-1 text-xs">
                      <span className="text-muted-foreground">Draft: </span>
                      <span className="font-medium">{metrics.draftPOs || 0}</span>
                      <span className="text-muted-foreground"> • Executed: </span>
                      <span className="font-medium">{metrics.executedPOs || 0}</span>
                    </div>
                  </div>

                  <div className="text-muted-foreground">→</div>

                  <div className="flex-1 text-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1">
                      <Truck className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-xs font-medium">Receiving</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs font-semibold mb-1">Receiving Statuses:</p>
                          <p className="text-xs">• <span className="font-medium">Awaiting:</span> PO sent, awaiting delivery</p>
                          <p className="text-xs">• <span className="font-medium">In Transit:</span> Shipment on the way</p>
                          <p className="text-xs">• <span className="font-medium">Received:</span> Goods arrived, pending inspection</p>
                          <p className="text-xs">• <span className="font-medium">Inspected:</span> Quality check complete</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-lg font-bold">{metrics.awaitingDelivery}</p>
                    <p className="text-xs text-muted-foreground">Awaiting</p>
                  </div>
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requisitions Tab */}
        <TabsContent value="requisitions" className="space-y-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Purchase Requisitions</CardTitle>
                  <CardDescription className="text-xs">Manage and track all purchase requests</CardDescription>
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
              {/* Status Filter Buttons */}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <Button 
                  variant={statusFilter === "all" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  All ({requisitions.length})
                </Button>
                <Button 
                  variant={statusFilter === "active" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                >
                  Active ({requisitions.filter((r: any) => 
                    ["draft", "pending_approval", "approved"].includes(r.status)
                  ).length})
                </Button>
                <Button 
                  variant={statusFilter === "pending_approval" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setStatusFilter("pending_approval")}
                >
                  Pending ({requisitions.filter((r: any) => r.status === "pending_approval").length})
                </Button>
                <Button 
                  variant={statusFilter === "approved" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setStatusFilter("approved")}
                >
                  Approved ({requisitions.filter((r: any) => r.status === "approved").length})
                </Button>
                <Button 
                  variant={statusFilter === "rejected" ? "destructive" : "outline"} 
                  size="sm"
                  onClick={() => setStatusFilter("rejected")}
                  className={statusFilter === "rejected" ? "" : "text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20"}
                >
                  Rejected ({requisitions.filter((r: any) => r.status === "rejected").length})
                </Button>
                <Button 
                  variant={statusFilter === "completed" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setStatusFilter("completed")}
                >
                  Completed ({requisitions.filter((r: any) => 
                    ["converted_to_po", "cancelled"].includes(r.status)
                  ).length})
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
                {requisitionsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading requisitions...</p>
                ) : filteredRequisitions.length === 0 ? (
                  <div className="text-center py-6">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No requisitions found</p>
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
                    <div key={req.id} className={`flex items-center justify-between p-2.5 border rounded-lg transition-colors ${
                      req.status === 'converted_to_po' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' :
                      req.status === 'rejected' ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' :
                      req.status === 'pending_approval' ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' :
                      req.status === 'approved' ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' :
                      'hover:bg-accent/50'
                    }`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-medium text-sm">{req.requisitionNumber}</span>
                          <Badge variant={priorityColors[req.priority as keyof typeof priorityColors]} className="text-xs">
                            {req.priority}
                          </Badge>
                          <Badge variant={statusColors[req.status as keyof typeof statusColors]} className="text-xs">
                            {req.status.replace(/_/g, " ")}
                          </Badge>
                          {req.poNumber && (
                            <Badge variant="success" className="text-xs">
                              PO: {req.poNumber}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {req.department} Department • {req.category}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {req.justification?.substring(0, 100)}...
                        </p>
                        {req.status === 'converted_to_po' && req.convertedDate && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Converted to PO on {format(new Date(req.convertedDate), "MMM dd, yyyy")}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-base">${(req.estimatedTotal || 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          Approval {req.currentApprovalLevel || 0}/{req.maxApprovalLevel || 1}
                        </p>
                        {req.requiredByDate && (
                          <p className="text-xs text-muted-foreground">
                            Due {format(new Date(req.requiredByDate), "MMM dd")}
                          </p>
                        )}
                      </div>
                      <div className="ml-3 flex flex-col gap-1.5">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedRequisitionId(req.id)}
                        >
                          View Details
                        </Button>
                        {req.status === 'approved' && !req.isArchived && (
                          <div className="flex flex-col gap-1">
                            {req.hasRfq ? (
                              <div className="text-xs text-muted-foreground bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded px-2 py-1.5">
                                <div className="font-medium">RFQ Created</div>
                                <div>{req.rfqNumber}</div>
                                {req.rfqStatus && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    {req.rfqStatus}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <Button 
                                size="sm"
                                variant="default"
                                className="bg-purple-600 hover:bg-purple-700"
                                onClick={() => {
                                  setCreateRfqFromRequisition(req);
                                  setActiveTab('rfqs');
                                }}
                              >
                                Create RFQ
                              </Button>
                            )}
                            <Button 
                              size="sm"
                              variant="outline"
                              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                              onClick={() => {
                                setConvertingRequisition({ ...req, isEmergency: true });
                                setConvertToPOOpen(true);
                              }}
                              title="Emergency purchase - requires manager approval and justification"
                              disabled={req.hasRfq}
                            >
                              Emergency PO
                            </Button>
                          </div>
                        )}
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
                        {(req.status === 'converted_to_po' || req.status === 'rejected' || req.status === 'cancelled') && !req.isArchived && (
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
        <TabsContent value="approvals" className="space-y-2">
          {/* Pending Approvals Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Pending Your Approval</CardTitle>
                  <CardDescription className="text-xs">Review and approve requisitions requiring your action</CardDescription>
                </div>
                <Badge variant="warning" className="text-sm">
                  {requisitions.filter((r: any) => r.status === 'pending_approval').length} Pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
                {requisitionsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading approvals...</p>
                ) : requisitions.filter((r: any) => r.status === 'pending_approval').length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">All caught up!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No requisitions require your approval
                    </p>
                  </div>
                ) : (
                  requisitions.filter((r: any) => r.status === 'pending_approval').map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-medium text-sm">{req.requisitionNumber}</span>
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
                        <p className="text-xs text-muted-foreground">
                          {req.department} Department • {req.category}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {req.justification?.substring(0, 100)}...
                        </p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="font-semibold text-base">${(req.estimatedTotal || 0).toLocaleString()}</p>
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

          {/* Recently Approved Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recently Approved</CardTitle>
                  <CardDescription className="text-xs">Items you approved in the last 7 days</CardDescription>
                </div>
                <Badge variant="success" className="text-sm">
                  {requisitions.filter((r: any) => {
                    if (r.status !== 'approved') return false;
                    const updatedDate = r.updatedAt ? new Date(r.updatedAt) : null;
                    if (!updatedDate) return false;
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    return updatedDate >= sevenDaysAgo;
                  }).length} This Week
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
                {requisitions.filter((r: any) => {
                  if (r.status !== 'approved') return false;
                  const updatedDate = r.updatedAt ? new Date(r.updatedAt) : null;
                  if (!updatedDate) return false;
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  return updatedDate >= sevenDaysAgo;
                }).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recently approved items
                  </p>
                ) : (
                  requisitions.filter((r: any) => {
                    if (r.status !== 'approved') return false;
                    const updatedDate = r.updatedAt ? new Date(r.updatedAt) : null;
                    if (!updatedDate) return false;
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    return updatedDate >= sevenDaysAgo;
                  }).map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-3 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-sm">{req.requisitionNumber}</span>
                          <span className="text-xs text-muted-foreground">
                            • Approved {req.updatedAt && format(new Date(req.updatedAt), "MMM dd")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {req.department} • ${(req.estimatedTotal || 0).toLocaleString()}
                        </p>
                      </div>
                      {/* All purchases require RFQ unless emergency */}
                      {req.hasRfq ? (
                        <div className="text-xs text-right">
                          <div className="font-medium text-purple-600">RFQ Created</div>
                          <div className="text-muted-foreground">{req.rfqNumber}</div>
                        </div>
                      ) : (
                        <Button 
                          size="sm"
                          variant="outline"
                          className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => {
                            setCreateRfqFromRequisition(req);
                            setActiveTab('rfqs');
                          }}
                        >
                          Create RFQ
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RFQs Tab - Request for Quotes */}
        <TabsContent value="rfqs" className="space-y-2">
          <RFQManagementView 
            requisitionToConvert={createRfqFromRequisition}
            onRequisitionProcessed={() => setCreateRfqFromRequisition(null)}
          />
        </TabsContent>

        {/* Quotes Tab - Supplier Responses */}
        <TabsContent value="quotes" className="space-y-2">
          <QuotesComparisonView />
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders" className="space-y-2">
          <PurchaseOrdersView />
        </TabsContent>

        {/* Receiving Tab - Goods Receipt */}
        <TabsContent value="receiving" className="space-y-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Goods Receiving</CardTitle>
              <CardDescription className="text-xs">Track deliveries and verify receipt of ordered goods</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
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
        <TabsContent value="archived" className="space-y-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Archived Requisitions</CardTitle>
              <CardDescription className="text-xs">View archived purchase requisitions and restore if needed</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
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
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-medium text-sm">{req.requisitionNumber}</span>
                          <Badge variant={statusColors[req.status as keyof typeof statusColors]} className="text-xs">
                            {req.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {req.department} Department • {req.category}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
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

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-2">
          <AuditLogViewer />
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

      {/* Convert to PO Dialog */}
      <ConvertToPODialog
        open={convertToPOOpen}
        onOpenChange={(open) => {
          setConvertToPOOpen(open);
          if (!open) {
            setConvertingRequisition(null);
          }
        }}
        requisition={convertingRequisition}
      />
    </div>
  );
}