import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { 
  Calendar, 
  MapPin, 
  User, 
  Building2, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Plus,
  Package
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SupplierForm, SupplierFormData } from "@/components/forms/supplier-form";

interface RequisitionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisitionId: number;
}

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

export default function RequisitionDetailsDialog({ 
  open, 
  onOpenChange, 
  requisitionId 
}: RequisitionDetailsDialogProps) {
  const { toast } = useToast();
  const [approvalComments, setApprovalComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);

  // Fetch requisition details with items
  const { data: requisition, isLoading } = useQuery({
    queryKey: [`/api/procurement/requisitions/${requisitionId}`],
    enabled: open && !!requisitionId,
  });

  // Initialize selectedSupplierId when requisition loads
  React.useEffect(() => {
    if (requisition?.preferredSupplierId) {
      setSelectedSupplierId(requisition.preferredSupplierId.toString());
    } else {
      setSelectedSupplierId("");
    }
  }, [requisition]);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setApprovalComments("");
      setRejectionReason("");
      setSelectedSupplierId("");
      setShowSupplierForm(false);
    }
  }, [open]);

  // Fetch approval history
  const { data: approvalHistory = [] } = useQuery({
    queryKey: [`/api/procurement/requisitions/${requisitionId}/history`],
    enabled: open && !!requisitionId,
  });

  // Fetch suppliers
  const { data: suppliers = [], refetch: refetchSuppliers } = useQuery({
    queryKey: ["/api/suppliers"],
    enabled: open,
  });

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (supplierData: SupplierFormData) => {
      return apiRequest("/api/suppliers", "POST", supplierData);
    },
    onSuccess: (newSupplier) => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setShowSupplierForm(false);
      setSelectedSupplierId(newSupplier.id.toString());
      toast({ title: "Supplier created successfully" });
      refetchSuppliers();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error creating supplier", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const handleCreateSupplier = async (data: SupplierFormData) => {
    setIsCreatingSupplier(true);
    try {
      await createSupplierMutation.mutateAsync(data);
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: () => 
      apiRequest(`/api/procurement/requisitions/${requisitionId}/approve`, "POST", { 
        comments: approvalComments,
        supplierId: selectedSupplierId ? parseInt(selectedSupplierId) : undefined
      }),
    onSuccess: (data) => {
      // Invalidate all related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/requisitions"] });
      queryClient.invalidateQueries({ queryKey: [`/api/procurement/requisitions/${requisitionId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/procurement/requisitions/${requisitionId}/history`] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/metrics"] });
      toast({
        title: "Success",
        description: "Requisition approved successfully. Status will update momentarily.",
      });
      setApprovalComments("");
      // Close dialog after a brief delay to show success message
      setTimeout(() => onOpenChange(false), 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve requisition",
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: () => 
      apiRequest(`/api/procurement/requisitions/${requisitionId}/reject`, "POST", { 
        comments: rejectionReason 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/requisitions"] });
      queryClient.invalidateQueries({ queryKey: [`/api/procurement/requisitions/${requisitionId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/metrics"] });
      toast({
        title: "Success",
        description: "Requisition rejected",
      });
      setRejectionReason("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject requisition",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  if (!requisition) return null;

  const canApprove = requisition.status === 'pending_approval';

  // If showing supplier form, render that instead
  if (showSupplierForm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Supplier</DialogTitle>
            <DialogDescription>
              Add a new supplier for this requisition
            </DialogDescription>
          </DialogHeader>
          <SupplierForm
            mode="create"
            onSubmit={handleCreateSupplier}
            onCancel={() => setShowSupplierForm(false)}
            isLoading={isCreatingSupplier}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{requisition.requisitionNumber}</DialogTitle>
              <DialogDescription className="mt-2">
                Requisition Details and Approval
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant={priorityColors[requisition.priority as keyof typeof priorityColors]}>
                {requisition.priority}
              </Badge>
              <Badge variant={statusColors[requisition.status as keyof typeof statusColors]}>
                {requisition.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Department:</span>
                <span className="font-medium">{requisition.department}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium">{requisition.category}</span>
              </div>
              {requisition.jobId && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Job:</span>
                  <span className="font-medium">Job #{requisition.jobId}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Required By:</span>
                <span className="font-medium">
                  {requisition.requiredByDate 
                    ? format(new Date(requisition.requiredByDate), "MMM dd, yyyy")
                    : "Not specified"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Delivery Location:</span>
                <span className="font-medium">{requisition.deliveryLocation || "Workshop"}</span>
              </div>
              {requisition.preferredSupplierId && (
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Supplier:</span>
                  <span className="font-medium">
                    {suppliers?.find((s: any) => s.id === requisition.preferredSupplierId)?.name || "Loading..."}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">
                  {format(new Date(requisition.createdAt), "MMM dd, yyyy")}
                </span>
              </div>
            </div>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Justification</Label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{requisition.justification}</p>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Items</Label>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 text-sm">Description</th>
                    <th className="text-left p-2 text-sm">Specification</th>
                    <th className="text-right p-2 text-sm">Quantity</th>
                    <th className="text-left p-2 text-sm">Unit</th>
                    <th className="text-right p-2 text-sm">Unit Price</th>
                    <th className="text-right p-2 text-sm">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {requisition.items?.map((item: any, index: number) => {
                    const unitPrice = typeof item.estimatedUnitPrice === 'number' 
                      ? item.estimatedUnitPrice 
                      : parseFloat(item.estimatedUnitPrice || "0") || 0;
                    const total = typeof item.estimatedTotal === 'number'
                      ? item.estimatedTotal
                      : parseFloat(item.estimatedTotal || "0") || 0;
                    const quantity = typeof item.quantity === 'number'
                      ? item.quantity
                      : parseFloat(item.quantity || "0") || 0;
                    
                    return (
                      <tr key={index} className="border-t">
                        <td className="p-2 text-sm">{item.description || "-"}</td>
                        <td className="p-2 text-sm">{item.specification || "-"}</td>
                        <td className="text-right p-2 text-sm">{quantity}</td>
                        <td className="p-2 text-sm">{item.unit || "-"}</td>
                        <td className="text-right p-2 text-sm">
                          ${unitPrice.toFixed(2)}
                        </td>
                        <td className="text-right p-2 text-sm font-medium">
                          ${total.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted">
                  <tr>
                    <td colSpan={5} className="text-right p-2 font-medium">Total:</td>
                    <td className="text-right p-2 text-lg font-bold">
                      ${(requisition.estimatedTotal || 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Additional Notes */}
          {requisition.notes && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Additional Notes</Label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{requisition.notes}</p>
              </div>
            </div>
          )}

          {/* Approval History Section */}
          {approvalHistory && approvalHistory.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Approval History</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-2 text-sm">Date</th>
                      <th className="text-left p-2 text-sm">Level</th>
                      <th className="text-left p-2 text-sm">Approver</th>
                      <th className="text-left p-2 text-sm">Action</th>
                      <th className="text-left p-2 text-sm">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvalHistory.map((history: any, index: number) => (
                      <tr key={history.id} className="border-t">
                        <td className="p-2 text-sm">
                          {format(new Date(history.actionAt || history.action_at), "MMM dd, yyyy HH:mm")}
                        </td>
                        <td className="p-2 text-sm">Level {history.approvalLevel || history.approval_level}</td>
                        <td className="p-2 text-sm">
                          {history.approverName || `User ${history.approverId || history.approver_id}`}
                        </td>
                        <td className="p-2">
                          <Badge 
                            variant={
                              history.action === 'approved' ? 'success' : 
                              history.action === 'rejected' ? 'destructive' : 
                              'secondary'
                            }
                            className="text-xs"
                          >
                            {history.action}
                          </Badge>
                        </td>
                        <td className="p-2 text-sm">{history.comments || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Approval Section - Only show if pending */}
          {canApprove && (
            <div className="border-t pt-4 space-y-4">
              <Label className="text-sm font-medium">Approval Decision</Label>
              
              <div className="bg-warning/10 border border-warning/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium text-sm">Approval Required</p>
                    <p className="text-xs text-muted-foreground">
                      Level {requisition.currentApprovalLevel + 1} of {requisition.maxApprovalLevel} required
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="supplier">Select Supplier *</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSupplierForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Supplier
                    </Button>
                  </div>
                  <Select
                    value={selectedSupplierId}
                    onValueChange={setSelectedSupplierId}
                  >
                    <SelectTrigger id="supplier">
                      <SelectValue placeholder="Choose a supplier (required)" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier: any) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    A supplier must be selected before approving the requisition
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comments">Comments (Optional for Approval)</Label>
                  <Textarea
                    id="comments"
                    value={approvalComments}
                    onChange={(e) => setApprovalComments(e.target.value)}
                    placeholder="Add any comments about this approval..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    if (!selectedSupplierId) {
                      toast({
                        title: "Error",
                        description: "Please select a supplier before approving",
                        variant: "destructive",
                      });
                      return;
                    }
                    approveMutation.mutate();
                  }}
                  disabled={approveMutation.isPending || !selectedSupplierId}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {approveMutation.isPending ? "Approving..." : "Approve Requisition"}
                </Button>
                
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    if (!rejectionReason) {
                      toast({
                        title: "Error",
                        description: "Please provide a reason for rejection",
                        variant: "destructive",
                      });
                      return;
                    }
                    rejectMutation.mutate();
                  }}
                  disabled={rejectMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {rejectMutation.isPending ? "Rejecting..." : "Reject Requisition"}
                </Button>
              </div>

              {/* Rejection Reason - Show only when rejection is selected */}
              <div className="space-y-2">
                <Label htmlFor="rejection">Rejection Reason (Required for Rejection)</Label>
                <Textarea
                  id="rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={3}
                  className="border-destructive/50"
                />
              </div>
            </div>
          )}

          {/* Show approval/rejection status if already processed */}
          {requisition.status === 'approved' && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 dark:text-green-100">Requisition Approved</p>
                  {approvalHistory && approvalHistory.length > 0 && (
                    <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                      All {approvalHistory.filter((h: any) => h.action === 'approved').length} approval levels completed
                    </p>
                  )}
                </div>
              </div>
              {requisition.approvalNotes && (
                <p className="text-sm text-green-800 dark:text-green-200 mt-2 italic">
                  "{requisition.approvalNotes}"
                </p>
              )}
            </div>
          )}

          {requisition.status === 'rejected' && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                  <p className="font-medium text-red-900 dark:text-red-100">Requisition Rejected</p>
                  {approvalHistory && approvalHistory.length > 0 && (
                    <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                      Rejected at Level {approvalHistory.find((h: any) => h.action === 'rejected')?.approvalLevel || requisition.currentApprovalLevel}
                    </p>
                  )}
                </div>
              </div>
              {requisition.approvalNotes && (
                <div className="mt-2">
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">Rejection Reason:</p>
                  <p className="text-sm text-red-800 dark:text-red-200 italic">
                    "{requisition.approvalNotes}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}