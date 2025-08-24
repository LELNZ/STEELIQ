import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, AlertCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RequisitionItem {
  materialId?: number;
  description: string;
  specification?: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice?: number;
  estimatedTotal?: number;
  requiredByDate?: Date;
  suggestedSupplierId?: number;
  notes?: string;
}

interface CreateRequisitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId?: number;
  jobNumber?: string;
}

export default function CreateRequisitionDialog({ 
  open, 
  onOpenChange, 
  jobId, 
  jobNumber 
}: CreateRequisitionDialogProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<RequisitionItem[]>([{
    description: "",
    quantity: 1,
    unit: "each",
  }]);
  
  const [formData, setFormData] = useState({
    jobId: jobId || undefined,
    department: "fabrication",
    category: "materials",
    priority: "standard",
    justification: "",
    deliveryLocation: "Workshop",
    preferredSupplierId: undefined as number | undefined,
    requiredByDate: undefined as Date | undefined,
    notes: "",
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/procurement/categories"],
  });

  // Fetch suppliers for preferred supplier dropdown
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  // Fetch materials for item selection
  const { data: materials = [] } = useQuery({
    queryKey: ["/api/materials"],
  });

  // Fetch jobs for job selection
  const { data: jobs = [] } = useQuery({
    queryKey: ["/api/jobs"],
  });

  const createRequisitionMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/procurement/requisitions", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/metrics"] });
      toast({
        title: "Success",
        description: "Requisition created and sent for approval",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create requisition",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      jobId: jobId || undefined,
      department: "fabrication",
      category: "materials",
      priority: "standard",
      justification: "",
      deliveryLocation: "Workshop",
      preferredSupplierId: undefined,
      requiredByDate: undefined,
      notes: "",
    });
    setItems([{
      description: "",
      quantity: 1,
      unit: "each",
    }]);
  };

  const addItem = () => {
    setItems([...items, {
      description: "",
      quantity: 1,
      unit: "each",
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof RequisitionItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calculate estimated total if price and quantity are set
    if (field === 'quantity' || field === 'estimatedUnitPrice') {
      const item = updatedItems[index];
      if (item.quantity && item.estimatedUnitPrice) {
        item.estimatedTotal = item.quantity * item.estimatedUnitPrice;
      }
    }
    
    setItems(updatedItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.estimatedTotal || 0), 0);
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.justification) {
      toast({
        title: "Validation Error",
        description: "Please provide justification for this requisition",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0 || items.some(item => !item.description)) {
      toast({
        title: "Validation Error",
        description: "Please add at least one item with description",
        variant: "destructive",
      });
      return;
    }

    const requisitionData = {
      ...formData,
      estimatedTotal: calculateTotal(),
      items: items,
    };

    createRequisitionMutation.mutate(requisitionData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Requisition</DialogTitle>
          <DialogDescription>
            Request materials, services, or equipment for approval
            {jobNumber && <span className="ml-2 font-medium">for Job: {jobNumber}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job">Job (Optional)</Label>
              <Select 
                value={formData.jobId?.toString()} 
                onValueChange={(value) => setFormData({ ...formData, jobId: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select job..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Job</SelectItem>
                  {jobs.map((job: any) => (
                    <SelectItem key={job.id} value={job.id.toString()}>
                      {job.jobNumber} - {job.projectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select 
                value={formData.department} 
                onValueChange={(value) => setFormData({ ...formData, department: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fabrication">Fabrication</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requiredBy">Required By</Label>
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

            <div className="space-y-2">
              <Label htmlFor="deliveryLocation">Delivery Location</Label>
              <Input
                id="deliveryLocation"
                value={formData.deliveryLocation}
                onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                placeholder="e.g., Workshop, Office"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="preferredSupplier">Preferred Supplier (Optional)</Label>
              <Select 
                value={formData.preferredSupplierId?.toString()} 
                onValueChange={(value) => setFormData({ ...formData, preferredSupplierId: value === "none" ? undefined : parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preference</SelectItem>
                  {suppliers.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label htmlFor="justification">
              Justification <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="justification"
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              placeholder="Explain why this requisition is needed, what it will be used for, and its business impact..."
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Industry best practice: Provide clear justification for audit trail and approval decisions
            </p>
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" onClick={addItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Label>Description <span className="text-red-500">*</span></Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    <div>
                      <Label>Specification</Label>
                      <Input
                        value={item.specification || ""}
                        onChange={(e) => updateItem(index, 'specification', e.target.value)}
                        placeholder="Size, grade, etc."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value))}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Select 
                        value={item.unit} 
                        onValueChange={(value) => updateItem(index, 'unit', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="each">Each</SelectItem>
                          <SelectItem value="m">Meters</SelectItem>
                          <SelectItem value="kg">Kilograms</SelectItem>
                          <SelectItem value="box">Box</SelectItem>
                          <SelectItem value="pack">Pack</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Est. Unit Price</Label>
                      <Input
                        type="number"
                        value={item.estimatedUnitPrice || ""}
                        onChange={(e) => updateItem(index, 'estimatedUnitPrice', parseFloat(e.target.value))}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Est. Total</Label>
                      <Input
                        type="number"
                        value={item.estimatedTotal || ""}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Input
                      value={item.notes || ""}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      placeholder="Additional notes for this item..."
                      className="flex-1 mr-2"
                    />
                    {items.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => removeItem(index)}
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Total */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estimated Total:</span>
              <span className="text-2xl font-bold">${calculateTotal().toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This requisition will require approval based on the total amount
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createRequisitionMutation.isPending}
          >
            {createRequisitionMutation.isPending ? "Creating..." : "Submit for Approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}