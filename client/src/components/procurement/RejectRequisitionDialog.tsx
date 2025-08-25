import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

interface RejectRequisitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisitionNumber: string;
  amount: number;
  onReject: (reason: string) => void;
}

export function RejectRequisitionDialog({
  open,
  onOpenChange,
  requisitionNumber,
  amount,
  onReject,
}: RejectRequisitionDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleReject = () => {
    if (!reason.trim()) {
      setError("Rejection reason is required");
      return;
    }
    onReject(reason);
    setReason("");
    setError("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setReason("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Reject Requisition
          </DialogTitle>
          <DialogDescription>
            You are about to reject requisition <span className="font-semibold">{requisitionNumber}</span> 
            {" "}for <span className="font-semibold">${amount.toLocaleString()}</span>.
            Please provide a detailed reason for rejection.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="Enter a detailed reason for rejecting this requisition..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              className="min-h-[100px]"
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-sm text-destructive">
              <strong>Note:</strong> This action cannot be undone. The requisition will be marked as rejected 
              and the requester will be notified with your reason.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleReject}>
            Reject Requisition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}