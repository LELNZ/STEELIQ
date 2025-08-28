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
  converted: "default",
  converted_to_po: "default",
  cancelled: "secondary",
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
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/requisitions"] });
      queryClient.invalidateQueries({ queryKey: [`/api/procurement/requisitions/${requisitionId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/procurement/requisitions/${requisitionId}/history`] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/metrics"] });
      toast({
        title: "Success",
        description: "Requisition approved successfully",
      });
      setApprovalComments("");
      setTimeout(() => onOpenChange(false), 1000);
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
        <DialogContent className="max-w-3xl">
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
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
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
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">{requisition.requisitionNumber}</DialogTitle>
            <Badge variant={statusColors[requisition.status as keyof typeof statusColors]}>
              {requisition.status === 'pending_approval' ? 'pending approval' : requisition.status}
            </Badge>
          </div>
          <DialogDescription className="mt-1">
            Requisition Details and Approval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Compact Basic Info */}
          <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Department:</span>
              <span className="font-medium">{requisition.department}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Required:</span>
              <span className="font-medium">
                {requisition.requiredByDate ? format(new Date(requisition.requiredByDate), "dd MMM") : "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Supplier:</span>
              <span className="font-medium">
                {requisition.preferredSupplierId 
                  ? suppliers?.find((s: any) => s.id === requisition.preferredSupplierId)?.name || "Loading..."
                  : "None"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Category:</span>
              <span className="font-medium">{requisition.category}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Delivery:</span>
              <span className="font-medium">{requisition.deliveryLocation || "Workshop"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium">{format(new Date(requisition.createdAt), "dd MMM")}</span>
            </div>
          </div>

          {/* Justification */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">Justification</Label>
            <div className="p-2 bg-muted rounded text-sm">{requisition.justification}</div>
          </div>

          {/* Compact Items Table */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1 block">Items</Label>
            <div className="border rounded">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-1.5">Description</th>
                    <th className="text-left p-1.5">Specification</th>
                    <th className="text-right p-1.5">Qty</th>
                    <th className="text-left p-1.5">Unit</th>
                    <th className="text-right p-1.5">Unit Price</th>
                    <th className="text-right p-1.5">Total</th>
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
                        <td className="p-1.5">{item.description || "-"}</td>
                        <td className="p-1.5">{item.specification || "-"}</td>
                        <td className="text-right p-1.5">{quantity}</td>
                        <td className="p-1.5">{item.unit || "each"}</td>
                        <td className="text-right p-1.5">${unitPrice.toFixed(2)}</td>
                        <td className="text-right p-1.5 font-medium">${total.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-muted/50 border-t">
                  <tr>
                    <td colSpan={5} className="text-right p-1.5 font-medium">Total:</td>
                    <td className="text-right p-1.5 font-bold">${(requisition.estimatedTotal || 0).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Additional Notes */}
          {requisition.notes && (
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Additional Notes</Label>
              <div className="p-2 bg-muted rounded text-sm">{requisition.notes}</div>
            </div>
          )}

          {/* Approval Decision Section - More Compact */}
          {canApprove && (
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">Approval Required</span>
                  <Badge variant="outline" className="text-xs">
                    Level {requisition.currentApprovalLevel + 1} of {requisition.maxApprovalLevel}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSupplierForm(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  New Supplier
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedSupplierId}
                    onValueChange={setSelectedSupplierId}
                  >
                    <SelectTrigger className="flex-1 h-8">
                      <SelectValue placeholder="Select Supplier *" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier: any) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Comments (Optional for Approval)"
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  className="flex-1 h-8"
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
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  {approveMutation.isPending ? "Approving..." : "Approve"}
                </Button>
                
                <Button 
                  variant="destructive"
                  className="flex-1 h-8"
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
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                </Button>
              </div>

              {/* Rejection Reason - Compact */}
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Rejection Reason (Required for Rejection)"
                rows={2}
                className="text-sm border-destructive/30"
              />
            </div>
          )}

          {/* Status Messages - Compact */}
          {requisition.status === 'approved' && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded p-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-900 dark:text-green-100">
                  Approved - Ready for RFQ/PO creation
                </span>
              </div>
            </div>
          )}

          {requisition.status === 'rejected' && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-900 dark:text-red-100">Rejected</span>
              </div>
              {approvalHistory && approvalHistory.length > 0 && (
                <p className="text-xs text-red-800 dark:text-red-200 mt-1 ml-6">
                  {approvalHistory[approvalHistory.length - 1]?.comments || "No reason provided"}
                </p>
              )}
            </div>
          )}

          {requisition.status === 'converted' && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Converted to Purchase Order
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}