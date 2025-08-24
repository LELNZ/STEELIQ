import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  FileText
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

  // Fetch requisition details with items
  const { data: requisition, isLoading } = useQuery({
    queryKey: [`/api/procurement/requisitions/${requisitionId}`],
    enabled: open && !!requisitionId,
  });

  // Fetch approval history
  const { data: approvalHistory = [] } = useQuery({
    queryKey: [`/api/procurement/requisitions/${requisitionId}/history`],
    enabled: open && !!requisitionId,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: () => 
      apiRequest(`/api/procurement/requisitions/${requisitionId}/approve`, "POST", { 
        comments: approvalComments 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/requisitions"] });
      queryClient.invalidateQueries({ queryKey: [`/api/procurement/requisitions/${requisitionId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/approvals/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/metrics"] });
      toast({
        title: "Success",
        description: "Requisition approved successfully",
      });
      setApprovalComments("");
      onOpenChange(false);
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
                  {requisition.items?.map((item: any, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="p-2 text-sm">{item.description || "-"}</td>
                      <td className="p-2 text-sm">{item.specification || "-"}</td>
                      <td className="text-right p-2 text-sm">{item.quantity || 0}</td>
                      <td className="p-2 text-sm">{item.unit || "-"}</td>
                      <td className="text-right p-2 text-sm">
                        ${(Number(item.estimatedUnitPrice) || 0).toFixed(2)}
                      </td>
                      <td className="text-right p-2 text-sm font-medium">
                        ${(Number(item.estimatedTotal) || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
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

              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-900">Requisition Approved</p>
              </div>
              {requisition.approvalNotes && (
                <p className="text-sm text-green-800 mt-1">{requisition.approvalNotes}</p>
              )}
            </div>
          )}

          {requisition.status === 'rejected' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <p className="font-medium text-red-900">Requisition Rejected</p>
              </div>
              {requisition.approvalNotes && (
                <p className="text-sm text-red-800 mt-1">{requisition.approvalNotes}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}