import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Package, Loader2 } from "lucide-react";

interface ConvertToPODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisition: any;
}

export default function ConvertToPODialog({
  open,
  onOpenChange,
  requisition,
}: ConvertToPODialogProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const { toast } = useToast();

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
    enabled: open,
  });

  // Convert to PO mutation
  const convertMutation = useMutation({
    mutationFn: ({ requisitionId, supplierId }: { requisitionId: number; supplierId: number }) =>
      apiRequest(`/api/procurement/requisitions/${requisitionId}/convert-to-po`, "POST", {
        supplierId,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/metrics"] });
      toast({
        title: "Success",
        description: `Purchase Order ${data.purchaseOrder.poNumber} created successfully`,
      });
      onOpenChange(false);
      setSelectedSupplierId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert to Purchase Order",
        variant: "destructive",
      });
    },
  });

  const handleConvert = () => {
    if (!selectedSupplierId) {
      toast({
        title: "Error",
        description: "Please select a supplier",
        variant: "destructive",
      });
      return;
    }

    convertMutation.mutate({
      requisitionId: requisition.id,
      supplierId: parseInt(selectedSupplierId),
    });
  };

  // Use preferred supplier as default if available
  const preferredSupplierId = requisition?.preferredSupplierId?.toString() || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Convert to Purchase Order
          </DialogTitle>
          <DialogDescription>
            Convert requisition {requisition?.requisitionNumber} to a Purchase Order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Requisition Details</Label>
            <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Number:</span>
                <span className="font-medium">{requisition?.requisitionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department:</span>
                <span className="font-medium">{requisition?.department || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium">{requisition?.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-medium">
                  ${(requisition?.estimatedTotal || 0).toLocaleString()}
                </span>
              </div>
              {requisition?.requiredByDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Required By:</span>
                  <span className="font-medium">
                    {new Date(requisition.requiredByDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Select Supplier *</Label>
            <Select
              value={selectedSupplierId}
              onValueChange={setSelectedSupplierId}
              defaultValue={preferredSupplierId}
            >
              <SelectTrigger id="supplier">
                <SelectValue placeholder="Choose a supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier: any) => (
                  <SelectItem key={supplier.id} value={supplier.id.toString()}>
                    {supplier.name}
                    {supplier.id === requisition?.preferredSupplierId && (
                      <span className="text-xs text-muted-foreground ml-2">(Preferred)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {requisition?.preferredSupplierId && (
              <p className="text-xs text-muted-foreground">
                A preferred supplier was specified for this requisition
              </p>
            )}
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              This will create a draft Purchase Order that can be reviewed and sent to the supplier.
              All items from the requisition will be included.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={convertMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConvert}
            disabled={!selectedSupplierId || convertMutation.isPending}
          >
            {convertMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Convert to PO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}