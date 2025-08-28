import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { DELIVERY_TERMS } from "@shared/constants/deliveryTerms";
import {
  Send,
  FileText,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Calendar,
  DollarSign,
  Building,
  Mail,
  Phone,
  User,
  Check,
  History,
  MoreHorizontal,
  UserPlus,
  RefreshCw,
  Edit,
  Eye,
  Copy,
  X,
  Archive,
  Bell,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { RFQDetailsDialog } from "./RFQDetailsDialog";
import { RFQComparisonView } from "./RFQComparisonView";

const rfqStatusColors = {
  draft: "secondary",
  sent: "warning",
  evaluating: "warning",
  closed: "default",
  completed: "success",
  cancelled: "destructive",
  archived: "outline",
} as const;

interface RFQManagementViewProps {
  requisitionToConvert?: any;
  onRequisitionProcessed?: () => void;
}

export default function RFQManagementView({ requisitionToConvert, onRequisitionProcessed }: RFQManagementViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [createRfqDialog, setCreateRfqDialog] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<any>(null);
  const [sendRfqDialog, setSendRfqDialog] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<any>(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [showNewSupplierForm, setShowNewSupplierForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", email: "", phone: "", company: "" });
  const [additionalSuppliersDialog, setAdditionalSuppliersDialog] = useState(false);
  const [rfqForAdditionalSuppliers, setRfqForAdditionalSuppliers] = useState<any>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null);
  const [comparisonDialog, setComparisonDialog] = useState(false);
  const [comparisonRfqId, setComparisonRfqId] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();
  
  // Handle requisition passed from parent
  useEffect(() => {
    if (requisitionToConvert) {
      setSelectedRequisition(requisitionToConvert);
      setCreateRfqDialog(true);
      onRequisitionProcessed?.();
    }
  }, [requisitionToConvert, onRequisitionProcessed]);

  // Fetch RFQs
  const { data: rfqs = [], isLoading: rfqsLoading } = useQuery({
    queryKey: ["/api/procurement/rfqs"],
  });

  // Fetch all requisitions to see full workflow
  const { data: requisitions = [] } = useQuery({
    queryKey: ["/api/procurement/requisitions"],
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  // Create RFQ mutation
  const createRfqMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/procurement/rfqs", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/rfqs"] });
      setCreateRfqDialog(false);
      setSelectedRequisition(null);
      toast({
        title: "Success",
        description: "RFQ created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create RFQ",
        variant: "destructive",
      });
    },
  });

  // Send RFQ mutation
  const sendRfqMutation = useMutation({
    mutationFn: ({ rfqId, supplierIds }: { rfqId: number; supplierIds: number[] }) =>
      apiRequest(`/api/procurement/rfqs/${rfqId}/send`, "POST", { supplierIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/rfqs"] });
      setSendRfqDialog(false);
      setSelectedRfq(null);
      setSelectedSuppliers([]);
      toast({
        title: "Success",
        description: "RFQ sent to suppliers",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send RFQ",
        variant: "destructive",
      });
    },
  });

  // Update RFQ status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ rfqId, status }: { rfqId: number; status: string }) =>
      apiRequest(`/api/procurement/rfqs/${rfqId}`, "PATCH", { status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/rfqs"] });
      toast({
        title: "Status Updated",
        description: `RFQ status changed to ${status}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update RFQ status",
        variant: "destructive",
      });
    },
  });

  // Send Reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: (rfqId: number) => 
      apiRequest(`/api/procurement/rfqs/${rfqId}/reminder`, "POST", {}),
    onSuccess: () => {
      toast({
        title: "Reminder Sent",
        description: "Reminder emails have been sent to all non-responsive suppliers",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send reminder emails",
        variant: "destructive",
      });
    },
  });

  // Duplicate RFQ mutation
  const duplicateRfqMutation = useMutation({
    mutationFn: (rfqId: number) => 
      apiRequest(`/api/procurement/rfqs/${rfqId}/duplicate`, "POST", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/rfqs"] });
      toast({
        title: "RFQ Duplicated",
        description: "A copy of the RFQ has been created as a draft",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate RFQ",
        variant: "destructive",
      });
    },
  });

  // Send to additional suppliers mutation
  const sendToAdditionalMutation = useMutation({
    mutationFn: ({ rfqId, supplierIds }: { rfqId: number; supplierIds: number[] }) =>
      apiRequest(`/api/procurement/rfqs/${rfqId}/send-additional`, "POST", { supplierIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/rfqs"] });
      setAdditionalSuppliersDialog(false);
      setRfqForAdditionalSuppliers(null);
      setSelectedSuppliers([]);
      toast({
        title: "Success",
        description: "RFQ sent to additional suppliers",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send RFQ to additional suppliers",
        variant: "destructive",
      });
    },
  });

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/suppliers", "POST", data),
    onSuccess: (newSupplierData) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setSelectedSuppliers(prev => [...prev, newSupplierData.id]);
      setShowNewSupplierForm(false);
      setNewSupplier({ name: "", email: "", phone: "", company: "" });
      toast({
        title: "Success",
        description: `${newSupplierData.company} has been added and selected`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create supplier",
        variant: "destructive",
      });
    },
  });

  const filteredRfqs = rfqs.filter((rfq: any) => {
    const matchesSearch = 
      rfq.rfqNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfq.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Hide archived unless explicitly shown
    const matchesArchiveFilter = showArchived ? true : rfq.status !== 'archived';
    
    return matchesSearch && matchesArchiveFilter;
  });

  const approvedRequisitions = requisitions.filter((r: any) => 
    r.status === 'approved' && !rfqs.some((rfq: any) => rfq.requisitionId === r.id)
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Request for Quotes Management</CardTitle>
              <CardDescription className="text-xs">
                Send approved requisitions to suppliers for competitive quotes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
                className="h-9"
              >
                <Archive className="h-4 w-4 mr-2" />
                {showArchived ? 'Hide' : 'Show'} Archived
              </Button>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search RFQs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {/* Approved Requisitions Ready for RFQ */}
          {approvedRequisitions.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  Approved Requisitions Ready for RFQ
                </h4>
                <Badge variant="secondary">{approvedRequisitions.length}</Badge>
              </div>
              <div className="space-y-2">
                {approvedRequisitions.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded">
                    <div>
                      <span className="font-medium text-sm">{req.requisitionNumber}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {req.category} • ${req.estimatedTotal?.toLocaleString()}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedRequisition(req);
                        setCreateRfqDialog(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create RFQ
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RFQs Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>RFQ Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response Deadline</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rfqsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Loading RFQs...
                    </TableCell>
                  </TableRow>
                ) : filteredRfqs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No RFQs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRfqs.map((rfq: any) => (
                    <TableRow key={rfq.id} className="text-xs">
                      <TableCell className="font-medium">{rfq.rfqNumber}</TableCell>
                      <TableCell>{rfq.title}</TableCell>
                      <TableCell>{rfq.jobNumber}</TableCell>
                      <TableCell>{rfq.category}</TableCell>
                      <TableCell>
                        <Badge variant={rfqStatusColors[rfq.status as keyof typeof rfqStatusColors]}>
                          {rfq.status === 'completed' ? 'PO Created' : rfq.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rfq.responseDeadline && format(new Date(rfq.responseDeadline), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rfq.responses?.length || 0}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 items-center">
                          {rfq.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRfq(rfq);
                                setSendRfqDialog(true);
                              }}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Send
                            </Button>
                          )}
                          {rfq.status === 'sent' && rfq.responses?.length > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setComparisonRfqId(rfq.id);
                                setComparisonDialog(true);
                              }}
                            >
                              Compare
                            </Button>
                          )}
                          {rfq.status === 'closed' && rfq.winningResponseId && (
                            <Badge variant="success" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Winner Selected
                            </Badge>
                          )}
                          {rfq.status === 'closed' && !rfq.winningResponseId && (
                            <Badge variant="secondary" className="text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Closed - No Winner
                            </Badge>
                          )}
                          {rfq.status === 'completed' && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              PO Created
                            </Badge>
                          )}
                          
                          {/* 3-dots Options Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs">RFQ Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              {/* View Details */}
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRfqId(rfq.id);
                                  setDetailsDialog(true);
                                }}
                              >
                                <Eye className="h-3 w-3 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              
                              {/* Send to Additional Suppliers - Only for 'sent' status */}
                              {rfq.status === 'sent' && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setRfqForAdditionalSuppliers(rfq);
                                    setAdditionalSuppliersDialog(true);
                                  }}
                                  className="text-blue-600 dark:text-blue-400"
                                >
                                  <UserPlus className="h-3 w-3 mr-2" />
                                  Send to More Suppliers
                                </DropdownMenuItem>
                              )}
                              
                              {/* Resend Reminder - Only for 'sent' status */}
                              {rfq.status === 'sent' && (
                                <DropdownMenuItem
                                  onClick={() => sendReminderMutation.mutate(rfq.id)}
                                >
                                  <Bell className="h-3 w-3 mr-2" />
                                  Send Reminder
                                </DropdownMenuItem>
                              )}
                              
                              {/* Edit - Only for 'draft' status */}
                              {rfq.status === 'draft' && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    toast({
                                      title: "Edit RFQ",
                                      description: "Opening RFQ editor",
                                    });
                                  }}
                                >
                                  <Edit className="h-3 w-3 mr-2" />
                                  Edit Draft
                                </DropdownMenuItem>
                              )}
                              
                              {/* Mark as Evaluating - Only for 'sent' status with responses */}
                              {rfq.status === 'sent' && rfq.responses?.length > 0 && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    updateStatusMutation.mutate({ 
                                      rfqId: rfq.id, 
                                      status: 'evaluating' 
                                    });
                                  }}
                                >
                                  <RefreshCw className="h-3 w-3 mr-2" />
                                  Start Evaluation
                                </DropdownMenuItem>
                              )}
                              
                              {/* Close RFQ - For 'sent' or 'evaluating' status */}
                              {(rfq.status === 'sent' || rfq.status === 'evaluating') && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    updateStatusMutation.mutate({ 
                                      rfqId: rfq.id, 
                                      status: 'closed' 
                                    });
                                  }}
                                >
                                  <Archive className="h-3 w-3 mr-2" />
                                  Close RFQ
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuSeparator />
                              
                              {/* Duplicate RFQ */}
                              <DropdownMenuItem
                                onClick={() => duplicateRfqMutation.mutate(rfq.id)}
                              >
                                <Copy className="h-3 w-3 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              
                              {/* Cancel RFQ - Only if not completed */}
                              {rfq.status !== 'completed' && rfq.status !== 'cancelled' && rfq.status !== 'archived' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (window.confirm(`Are you sure you want to cancel RFQ ${rfq.rfqNumber}? You can revert this action later.`)) {
                                        updateStatusMutation.mutate({ 
                                          rfqId: rfq.id, 
                                          status: 'cancelled' 
                                        });
                                      }
                                    }}
                                    className="text-red-600 dark:text-red-400"
                                  >
                                    <X className="h-3 w-3 mr-2" />
                                    Cancel RFQ
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              {/* Revert Cancelled RFQ */}
                              {rfq.status === 'cancelled' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      updateStatusMutation.mutate({ 
                                        rfqId: rfq.id, 
                                        status: 'draft' 
                                      });
                                    }}
                                    className="text-green-600 dark:text-green-400"
                                  >
                                    <RefreshCw className="h-3 w-3 mr-2" />
                                    Revert to Draft
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      updateStatusMutation.mutate({ 
                                        rfqId: rfq.id, 
                                        status: 'archived' 
                                      });
                                    }}
                                  >
                                    <Archive className="h-3 w-3 mr-2" />
                                    Archive RFQ
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create RFQ Dialog */}
      <Dialog open={createRfqDialog} onOpenChange={setCreateRfqDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create RFQ from Requisition</DialogTitle>
            <DialogDescription>
              Create a Request for Quote from approved requisition: {selectedRequisition?.requisitionNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">RFQ Title</Label>
              <Input
                id="title"
                defaultValue={`RFQ for ${selectedRequisition?.requisitionNumber}`}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                defaultValue={selectedRequisition?.justification}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="responseDeadline">Response Deadline</Label>
                <Input
                  id="responseDeadline"
                  type="date"
                  defaultValue={format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")}
                />
              </div>
              <div>
                <Label htmlFor="deliveryTerms">Delivery Terms</Label>
                <Select defaultValue="delivery_workshop">
                  <SelectTrigger id="deliveryTerms">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_TERMS.map((term) => (
                      <SelectItem key={term.value} value={term.value}>
                        {term.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRfqDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                createRfqMutation.mutate({
                  requisitionId: selectedRequisition?.id,
                  title: `RFQ for ${selectedRequisition?.requisitionNumber}`,
                  description: selectedRequisition?.justification,
                });
              }}
            >
              Create RFQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Send RFQ Dialog */}
      <Dialog open={sendRfqDialog} onOpenChange={(open) => {
        setSendRfqDialog(open);
        if (!open) {
          setSelectedSuppliers([]);
          setSupplierSearchTerm("");
          setShowNewSupplierForm(false);
          setNewSupplier({ name: "", email: "", phone: "", company: "" });
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send RFQ to Suppliers</DialogTitle>
            <DialogDescription>
              Select suppliers to send RFQ: {selectedRfq?.rfqNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers by name, email, or company..."
                value={supplierSearchTerm}
                onChange={(e) => setSupplierSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selected Suppliers Count */}
            {selectedSuppliers.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <span className="text-sm font-medium">
                  {selectedSuppliers.length} supplier{selectedSuppliers.length !== 1 ? 's' : ''} selected
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedSuppliers([])}
                  className="text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Recent Suppliers Section */}
            {!supplierSearchTerm && !showNewSupplierForm && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <History className="h-3.5 w-3.5" />
                  Recent Suppliers
                </div>
                <div className="space-y-1">
                  {suppliers.slice(0, 3).map((supplier: any) => (
                    <div
                      key={supplier.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selectedSuppliers.includes(supplier.id)
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                      onClick={() => {
                        setSelectedSuppliers(prev =>
                          prev.includes(supplier.id)
                            ? prev.filter(id => id !== supplier.id)
                            : [...prev, supplier.id]
                        );
                      }}
                    >
                      <div className="flex-shrink-0">
                        {selectedSuppliers.includes(supplier.id) ? (
                          <div className="h-5 w-5 rounded bg-blue-600 flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded border-2 border-gray-300 dark:border-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{supplier.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {supplier.company} • {supplier.email}
                        </div>
                      </div>
                      {supplier.categories && (
                        <Badge variant="secondary" className="text-xs">
                          {supplier.categories}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Supplier List */}
            <div className="space-y-2">
              {supplierSearchTerm && (
                <div className="text-sm font-medium text-muted-foreground">
                  Search Results
                </div>
              )}
              
              {/* Add New Supplier Option */}
              {!showNewSupplierForm && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => setShowNewSupplierForm(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add New Supplier
                </Button>
              )}

              {/* New Supplier Form */}
              {showNewSupplierForm && (
                <div className="p-3 border rounded-lg space-y-3 bg-gray-50 dark:bg-gray-900">
                  <div className="font-medium text-sm flex items-center justify-between">
                    Add New Supplier
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowNewSupplierForm(false);
                        setNewSupplier({ name: "", email: "", phone: "", company: "" });
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Contact Name *"
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    />
                    <Input
                      placeholder="Company *"
                      value={newSupplier.company}
                      onChange={(e) => setNewSupplier({ ...newSupplier, company: e.target.value })}
                    />
                    <Input
                      placeholder="Email *"
                      type="email"
                      value={newSupplier.email}
                      onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    />
                    <Input
                      placeholder="Phone"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!newSupplier.name || !newSupplier.company || !newSupplier.email || createSupplierMutation.isPending}
                    onClick={() => {
                      createSupplierMutation.mutate({
                        name: newSupplier.name,
                        company: newSupplier.company,
                        email: newSupplier.email,
                        phone: newSupplier.phone,
                        contactName: newSupplier.name,
                        categories: "materials", // Default category
                        isActive: true,
                      });
                    }}
                  >
                    {createSupplierMutation.isPending ? "Adding..." : "Add Supplier"}
                  </Button>
                </div>
              )}

              {/* Filtered Supplier List */}
              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {suppliers
                  .filter((supplier: any) => {
                    if (!supplierSearchTerm) return !showNewSupplierForm;
                    const search = supplierSearchTerm.toLowerCase();
                    return (
                      supplier.name?.toLowerCase().includes(search) ||
                      supplier.contactName?.toLowerCase().includes(search) ||
                      supplier.email?.toLowerCase().includes(search) ||
                      supplier.company?.toLowerCase().includes(search)
                    );
                  })
                  .map((supplier: any) => (
                    <div
                      key={supplier.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selectedSuppliers.includes(supplier.id)
                          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                      onClick={() => {
                        setSelectedSuppliers(prev =>
                          prev.includes(supplier.id)
                            ? prev.filter(id => id !== supplier.id)
                            : [...prev, supplier.id]
                        );
                      }}
                    >
                      <div className="flex-shrink-0">
                        {selectedSuppliers.includes(supplier.id) ? (
                          <div className="h-5 w-5 rounded bg-blue-600 flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded border-2 border-gray-300 dark:border-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-sm">{supplier.company}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{supplier.name || supplier.contactName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">{supplier.email}</span>
                          </div>
                          {supplier.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{supplier.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {supplier.categories && (
                        <Badge variant="outline" className="text-xs">
                          {supplier.categories}
                        </Badge>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="flex-1">
              {selectedSuppliers.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  RFQ will be sent to {selectedSuppliers.length} supplier{selectedSuppliers.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSendRfqDialog(false)}>
                Cancel
              </Button>
              <Button
                disabled={selectedSuppliers.length === 0}
                onClick={() => {
                  sendRfqMutation.mutate({
                    rfqId: selectedRfq?.id,
                    supplierIds: selectedSuppliers,
                  });
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Send to {selectedSuppliers.length || 'Selected'} Suppliers
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send to Additional Suppliers Dialog */}
      <Dialog open={additionalSuppliersDialog} onOpenChange={(open) => {
        setAdditionalSuppliersDialog(open);
        if (!open) {
          setSelectedSuppliers([]);
          setSupplierSearchTerm("");
          setShowNewSupplierForm(false);
          setNewSupplier({ name: "", email: "", phone: "", company: "" });
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send RFQ to Additional Suppliers</DialogTitle>
            <DialogDescription>
              Add more suppliers to RFQ: {rfqForAdditionalSuppliers?.rfqNumber}
              <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  <p className="font-medium">Best Practice:</p>
                  <p>Sending to additional suppliers after initial distribution ensures fair competition and may result in better pricing.</p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers by name, email, or company..."
                value={supplierSearchTerm}
                onChange={(e) => setSupplierSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Selected Suppliers Count */}
            {selectedSuppliers.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <span className="text-sm font-medium">
                  {selectedSuppliers.length} additional supplier{selectedSuppliers.length !== 1 ? 's' : ''} selected
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedSuppliers([])}
                  className="text-xs"
                >
                  Clear all
                </Button>
              </div>
            )}

            {/* Add New Supplier Option */}
            {!showNewSupplierForm && (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setShowNewSupplierForm(true)}
              >
                <Plus className="h-4 w-4" />
                Add New Supplier
              </Button>
            )}

            {/* New Supplier Form */}
            {showNewSupplierForm && (
              <div className="p-3 border rounded-lg space-y-3 bg-gray-50 dark:bg-gray-900">
                <div className="font-medium text-sm flex items-center justify-between">
                  Add New Supplier
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowNewSupplierForm(false);
                      setNewSupplier({ name: "", email: "", phone: "", company: "" });
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Contact Name *"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  />
                  <Input
                    placeholder="Company *"
                    value={newSupplier.company}
                    onChange={(e) => setNewSupplier({ ...newSupplier, company: e.target.value })}
                  />
                  <Input
                    placeholder="Email *"
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                  />
                  <Input
                    placeholder="Phone"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!newSupplier.name || !newSupplier.company || !newSupplier.email || createSupplierMutation.isPending}
                  onClick={() => {
                    createSupplierMutation.mutate({
                      name: newSupplier.name,
                      company: newSupplier.company,
                      email: newSupplier.email,
                      phone: newSupplier.phone || '',
                      categories: 'materials',
                    });
                  }}
                >
                  {createSupplierMutation.isPending ? "Adding..." : "Add Supplier"}
                </Button>
              </div>
            )}

            {/* Supplier List */}
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {suppliers
                .filter((supplier: any) => {
                  if (!supplierSearchTerm) return !showNewSupplierForm;
                  const search = supplierSearchTerm.toLowerCase();
                  return (
                    supplier.name?.toLowerCase().includes(search) ||
                    supplier.contactName?.toLowerCase().includes(search) ||
                    supplier.email?.toLowerCase().includes(search) ||
                    supplier.company?.toLowerCase().includes(search)
                  );
                })
                .map((supplier: any) => (
                  <div
                    key={supplier.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      selectedSuppliers.includes(supplier.id)
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                    }`}
                    onClick={() => {
                      setSelectedSuppliers(prev =>
                        prev.includes(supplier.id)
                          ? prev.filter(id => id !== supplier.id)
                          : [...prev, supplier.id]
                      );
                    }}
                  >
                    <div className="flex-shrink-0">
                      {selectedSuppliers.includes(supplier.id) ? (
                        <div className="h-5 w-5 rounded bg-blue-600 flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded border-2 border-gray-300 dark:border-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Building className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-sm">{supplier.company}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{supplier.name || supplier.contactName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate">{supplier.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="flex-1">
              {selectedSuppliers.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Adding {selectedSuppliers.length} more supplier{selectedSuppliers.length !== 1 ? 's' : ''} to this RFQ
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAdditionalSuppliersDialog(false)}>
                Cancel
              </Button>
              <Button
                disabled={selectedSuppliers.length === 0}
                onClick={() => {
                  sendToAdditionalMutation.mutate({
                    rfqId: rfqForAdditionalSuppliers?.id,
                    supplierIds: selectedSuppliers,
                  });
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Send to {selectedSuppliers.length || 'Selected'} More Suppliers
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RFQ Details Dialog */}
      {selectedRfqId && (
        <RFQDetailsDialog
          open={detailsDialog}
          onOpenChange={setDetailsDialog}
          rfqId={selectedRfqId}
          onViewComparison={() => {
            setComparisonRfqId(selectedRfqId);
            setComparisonDialog(true);
          }}
        />
      )}

      {/* RFQ Comparison Dialog */}
      {comparisonRfqId && (
        <Dialog open={comparisonDialog} onOpenChange={setComparisonDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Quote Comparison Matrix
              </DialogTitle>
              <DialogDescription>
                Analyzing supplier responses to help you make the best decision
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6">
              <RFQComparisonView rfqId={comparisonRfqId} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}