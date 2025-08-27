import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { History, AlertCircle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface POStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: any;
}

export function POStatusDialog({
  open,
  onOpenChange,
  purchaseOrder,
}: POStatusDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState(purchaseOrder?.status || '');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Fetch status history
  const { data: statusHistory } = useQuery({
    queryKey: [`/api/procurement/purchase-orders/${purchaseOrder?.id}/status-history`],
    enabled: !!purchaseOrder?.id && open,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStatus) {
        throw new Error('Please select a status');
      }
      
      await apiRequest(`/api/procurement/purchase-orders/${purchaseOrder.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: selectedStatus,
          reason: reason || undefined,
          notes: notes || undefined,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/procurement/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/procurement/metrics'] });
      toast({
        title: 'Status Updated',
        description: `PO ${purchaseOrder.poNumber} status changed to ${selectedStatus}`,
      });
      
      // If cancelled, show option to archive
      if (selectedStatus === 'cancelled') {
        toast({
          title: 'Archive Recommended',
          description: 'Consider archiving this cancelled PO to keep your active list clean',
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                archivePOMutation.mutate();
              }}
            >
              Archive Now
            </Button>
          ),
        });
      }
      
      onOpenChange(false);
      setReason('');
      setNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update PO status',
        variant: 'destructive',
      });
    },
  });

  // Archive PO mutation
  const archivePOMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('/api/procurement/purchase-orders/archive', {
        method: 'POST',
        body: JSON.stringify({ 
          id: purchaseOrder.id,
          reason: notes || 'Archived after cancellation',
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/procurement/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/procurement/metrics'] });
      toast({
        title: 'PO Archived',
        description: `PO ${purchaseOrder.poNumber} has been archived`,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Archive Failed',
        description: error.message || 'Failed to archive PO',
        variant: 'destructive',
      });
    },
  });

  // Return to requisition mutation
  const returnToRequisitionMutation = useMutation({
    mutationFn: async () => {
      if (!reason) {
        throw new Error('Please provide a reason for returning to requisition');
      }
      
      const response = await apiRequest(`/api/procurement/purchase-orders/${purchaseOrder.id}/return-to-requisition`, {
        method: 'POST',
        body: JSON.stringify({
          reason: reason,
          notes: notes || undefined,
        }),
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/procurement/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/procurement/requisitions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/procurement/metrics'] });
      toast({
        title: 'Returned to Requisition',
        description: data.message || `PO ${purchaseOrder.poNumber} has been converted back to requisition`,
      });
      onOpenChange(false);
      setReason('');
      setNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Return Failed',
        description: error.message || 'Failed to return PO to requisition',
        variant: 'destructive',
      });
    },
  });

  const statusOptions = [
    { value: 'draft', label: 'Draft', description: 'PO is being prepared', color: 'bg-gray-100 text-gray-700' },
    { value: 'sent', label: 'Sent', description: 'Sent to supplier', color: 'bg-blue-100 text-blue-700' },
    { value: 'acknowledged', label: 'Acknowledged', description: 'Supplier acknowledged', color: 'bg-green-100 text-green-700' },
    { value: 'completed', label: 'Completed', description: 'Order delivered', color: 'bg-purple-100 text-purple-700' },
    { value: 'cancelled', label: 'Cancelled', description: 'Order cancelled', color: 'bg-red-100 text-red-700' },
    { value: 'return_to_requisition', label: 'Return to Requisition', description: 'Convert back to requisition', color: 'bg-orange-100 text-orange-700', icon: RotateCcw },
  ];

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(o => o.value === status);
    return option ? option.color : 'bg-gray-100 text-gray-700';
  };

  const getReasonSuggestions = () => {
    if (!selectedStatus) return [];
    
    const suggestions: { [key: string]: string[] } = {
      'cancelled': ['Budget constraints', 'Project cancelled', 'Supplier unable to fulfill'],
      'return_to_requisition': ['Supplier changed', 'Price renegotiation needed', 'Specifications changed'],
      'default': ['Need to modify items', 'Incorrect supplier selected', 'Price adjustment needed'],
    };
    
    if (selectedStatus === 'return_to_requisition') return suggestions['return_to_requisition'];
    if (selectedStatus === 'cancelled') return suggestions['cancelled'];
    return suggestions['default'];
  };

  const handleSubmit = () => {
    if (selectedStatus === 'return_to_requisition') {
      returnToRequisitionMutation.mutate();
    } else {
      updateStatusMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Change Status - {purchaseOrder?.poNumber}</DialogTitle>
          <DialogDescription>
            Update the purchase order status. All changes are logged for audit.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="px-6 pb-2 max-h-[calc(90vh-180px)]">
          <div className="space-y-4">
            {/* Current Status */}
            <Card className="p-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm text-muted-foreground">Current Status</Label>
                <Badge className={getStatusBadge(purchaseOrder?.status)}>
                  {purchaseOrder?.status}
                </Badge>
              </div>
            </Card>

            {/* Status Selection */}
            <div className="space-y-2">
              <Label>Select New Status</Label>
              <RadioGroup value={selectedStatus} onValueChange={setSelectedStatus}>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map((option) => (
                    <label
                      key={option.value}
                      htmlFor={option.value}
                      className={`flex items-start p-3 rounded-lg border cursor-pointer hover:bg-accent transition-colors ${
                        selectedStatus === option.value ? 'border-primary bg-accent' : 'border-border'
                      }`}
                    >
                      <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center gap-1">
                          {option.icon && <option.icon className="h-3 w-3" />}
                          <span className="font-medium text-sm">{option.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Reason for Change */}
            {selectedStatus && (
              <div className="space-y-2">
                <Label>
                  Reason for Change
                  {selectedStatus === 'return_to_requisition' && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {getReasonSuggestions().length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {getReasonSuggestions().map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setReason(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
                <Textarea
                  placeholder={selectedStatus === 'return_to_requisition' 
                    ? "Required: Enter reason for returning to requisition..." 
                    : "Enter reason for status change..."}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[60px] text-sm"
                  required={selectedStatus === 'return_to_requisition'}
                />
              </div>
            )}

            {/* Additional Notes */}
            {selectedStatus && (
              <div className="space-y-2">
                <Label>Additional Notes (Optional)</Label>
                <Textarea
                  placeholder="Any additional notes or comments..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
              </div>
            )}

            {/* Warning for return to requisition */}
            {selectedStatus === 'return_to_requisition' && (
              <Card className="p-3 border-orange-200 bg-orange-50">
                <div className="flex gap-2">
                  <RotateCcw className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium text-orange-900">Return to Requisition</p>
                    <ul className="list-disc ml-4 space-y-0.5 text-xs text-orange-800">
                      <li>Creates new requisition with approved status</li>
                      <li>Preserves all item details and approvals</li>
                      <li>Cancels the current purchase order</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              </Card>
            )}

            {/* Warning for reversing acknowledgment */}
            {purchaseOrder?.status === 'acknowledged' && ['sent', 'draft'].includes(selectedStatus) && (
              <Card className="p-3 border-yellow-200 bg-yellow-50">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-900">Warning: Reversing Acknowledgment</p>
                    <p className="text-xs text-yellow-800 mt-0.5">This will clear the supplier's acknowledgment data.</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Status History */}
            <Collapsible open={showHistory} onOpenChange={setShowHistory}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <History className="h-3 w-3" />
                    Status History
                  </span>
                  {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {statusHistory && statusHistory.length > 0 ? (
                  <Card className="mt-2 p-3">
                    <ScrollArea className="h-32">
                      <div className="space-y-2">
                        {statusHistory.map((entry: any) => (
                          <div key={entry.id} className="border-l-2 border-gray-200 pl-3 pb-2">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <Badge className={`${getStatusBadge(entry.previousStatus)} h-5 text-xs`}>
                                  {entry.previousStatus}
                                </Badge>
                                <span className="text-xs text-muted-foreground">→</span>
                                <Badge className={`${getStatusBadge(entry.newStatus)} h-5 text-xs`}>
                                  {entry.newStatus}
                                </Badge>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(entry.createdAt), 'MMM dd, HH:mm')}
                              </span>
                            </div>
                            {entry.changeReason && (
                              <p className="text-xs text-muted-foreground mt-1">{entry.changeReason}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              By {entry.changedByName}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </Card>
                ) : (
                  <Card className="mt-2 p-3">
                    <p className="text-xs text-muted-foreground text-center">No status history available</p>
                  </Card>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateStatusMutation.isPending || returnToRequisitionMutation.isPending || !selectedStatus}
            className={selectedStatus === 'return_to_requisition' ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            {updateStatusMutation.isPending || returnToRequisitionMutation.isPending
              ? 'Processing...'
              : selectedStatus === 'return_to_requisition'
              ? 'Return to Requisition'
              : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}