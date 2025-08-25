import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ResubmitRequisitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisition: any;
  onResubmit: (updates: any) => void;
}

export function ResubmitRequisitionDialog({
  open,
  onOpenChange,
  requisition,
  onResubmit,
}: ResubmitRequisitionDialogProps) {
  const [formData, setFormData] = useState({
    department: requisition?.department || "",
    category: requisition?.category || "",
    priority: requisition?.priority || "standard",
    justification: requisition?.justification || "",
    estimatedTotal: requisition?.estimatedTotal || 0,
    requiredByDate: requisition?.requiredByDate ? new Date(requisition.requiredByDate) : undefined,
    preferredSupplier: requisition?.preferredSupplier || "",
    shipToAddress: requisition?.shipToAddress || "",
  });

  const handleSubmit = () => {
    onResubmit(formData);
  };

  if (!requisition) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resubmit Requisition</DialogTitle>
          <DialogDescription>
            Edit and resubmit the rejected requisition #{requisition.requisitionNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Previous Rejection Reason:</strong>
              <br />
              {requisition.lastRejectionReason || requisition.rejectionReason || "No reason provided"}
              <br />
              <span className="text-xs text-muted-foreground mt-1">
                Please address the rejection reason before resubmitting
              </span>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="fabrication">Fabrication</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="administration">Administration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="materials">Materials</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="tools">Tools</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="consumables">Consumables</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="estimatedTotal">Estimated Total ($)</Label>
              <Input
                id="estimatedTotal"
                type="number"
                value={formData.estimatedTotal}
                onChange={(e) => setFormData({ ...formData, estimatedTotal: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="requiredByDate">Required By Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.requiredByDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.requiredByDate ? format(formData.requiredByDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.requiredByDate}
                    onSelect={(date) => setFormData({ ...formData, requiredByDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="preferredSupplier">Preferred Supplier</Label>
              <Input
                id="preferredSupplier"
                value={formData.preferredSupplier}
                onChange={(e) => setFormData({ ...formData, preferredSupplier: e.target.value })}
                placeholder="Enter supplier name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="justification">Business Justification</Label>
            <Textarea
              id="justification"
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              placeholder="Explain the business need and address the rejection reason..."
              rows={4}
              className="resize-none"
            />
          </div>

          <div>
            <Label htmlFor="shipToAddress">Ship To Address</Label>
            <Input
              id="shipToAddress"
              value={formData.shipToAddress}
              onChange={(e) => setFormData({ ...formData, shipToAddress: e.target.value })}
              placeholder="Enter delivery address"
            />
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium">What happens next?</p>
            <ul className="text-xs text-muted-foreground mt-1 space-y-1">
              <li>• A new requisition will be created with your changes</li>
              <li>• The approval workflow will restart from Level 1</li>
              <li>• The original rejected requisition will remain archived for audit</li>
              <li>• You'll be notified of the approval status</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Resubmit Requisition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}