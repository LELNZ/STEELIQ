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
import { History, AlertCircle, RotateCcw } from 'lucide-react';

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
      
      await apiRequest(`/api/procurement/purchase-orders/${purchaseOrder.id}/status`, 'PATCH', {
        status: selectedStatus,
        reason: reason || undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/procurement/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/procurement/metrics'] });
      toast({
        title: 'Status Updated',
        description: `PO ${purchaseOrder.poNumber} status changed to ${selectedStatus}`,
      });
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

  // Return to requisition mutation
  const returnToRequisitionMutation = useMutation({
    mutationFn: async () => {
      if (!reason) {
        throw new Error('Please provide a reason for returning to requisition');
      }
      
      const response = await apiRequest(`/api/procurement/purchase-orders/${purchaseOrder.id}/return-to-requisition`, 'POST', {
        reason: reason,
        notes: notes || undefined,
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
    { value: 'draft', label: 'Draft', description: 'PO is being prepared' },
    { value: 'sent', label: 'Sent', description: 'PO has been sent to supplier' },
    { value: 'acknowledged', label: 'Acknowledged', description: 'Supplier has acknowledged receipt' },
    { value: 'completed', label: 'Completed', description: 'Order has been delivered' },
    { value: 'cancelled', label: 'Cancelled', description: 'Order has been cancelled' },
    { value: 'return_to_requisition', label: 'Return to Requisition', description: 'Convert back to requisition with approvals intact', icon: RotateCcw },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600';
      case 'sent': return 'text-blue-600';
      case 'acknowledged': return 'text-green-600';
      case 'completed': return 'text-purple-600';
      case 'cancelled': return 'text-red-600';
      case 'return_to_requisition': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getReasonSuggestions = () => {
    if (!purchaseOrder?.status || !selectedStatus) return [];
    
    const suggestions: { [key: string]: string[] } = {
      'acknowledged-sent': ['Supplier requested changes', 'Acknowledgment was incorrect', 'System error'],
      'sent-draft': ['Need to modify items', 'Incorrect supplier selected', 'Price adjustment needed'],
      'completed-sent': ['Delivery incomplete', 'Quality issues', 'Wrong items received'],
      'cancelled-*': ['Budget constraints', 'Project cancelled', 'Supplier unable to fulfill', 'Found better alternative'],
      'return_to_requisition-*': ['Supplier changed', 'Price renegotiation needed', 'Specifications changed', 'Project requirements updated'],
    };
    
    const key = selectedStatus === 'return_to_requisition' 
      ? 'return_to_requisition-*'
      : `${purchaseOrder.status}-${selectedStatus}`;
    return suggestions[key] || suggestions['cancelled-*'] || [];
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Change PO Status - {purchaseOrder?.poNumber}</DialogTitle>
          <DialogDescription>
            Update the status of this purchase order. All changes are logged for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="bg-gray-50 p-3 rounded">
            <Label className="text-sm text-gray-600">Current Status</Label>
            <p className={`font-semibold capitalize ${getStatusColor(purchaseOrder?.status)}`}>
              {purchaseOrder?.status}
            </p>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <Label>New Status</Label>
            <RadioGroup value={selectedStatus} onValueChange={setSelectedStatus}>
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-start space-x-2 p-2 hover:bg-gray-50 rounded">
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <label htmlFor={option.value} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      {option.icon && <option.icon className="h-4 w-4" />}
                      <span className={`font-medium capitalize ${getStatusColor(option.value)}`}>
                        {option.label}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Reason for Change */}
          <div className="space-y-2">
            <Label>Reason for Change {selectedStatus === 'return_to_requisition' && '*'}</Label>
            {getReasonSuggestions().length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {getReasonSuggestions().map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
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
              className="min-h-[60px]"
              required={selectedStatus === 'return_to_requisition'}
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label>Additional Notes (Optional)</Label>
            <Textarea
              placeholder="Any additional notes or comments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {/* Warning for return to requisition */}
          {selectedStatus === 'return_to_requisition' && (
            <div className="bg-orange-50 border border-orange-200 p-3 rounded flex gap-2">
              <RotateCcw className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium">Return to Requisition</p>
                <p>This will:</p>
                <ul className="list-disc ml-4 mt-1">
                  <li>Create a new requisition with approved status</li>
                  <li>Preserve all item details and existing approvals</li>
                  <li>Cancel the current purchase order</li>
                  <li>Allow modifications before re-converting to PO</li>
                </ul>
                <p className="mt-2 font-medium">This action cannot be undone.</p>
              </div>
            </div>
          )}

          {/* Warning for certain changes */}
          {purchaseOrder?.status === 'acknowledged' && ['sent', 'draft'].includes(selectedStatus) && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded flex gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Warning: Reversing Acknowledgment</p>
                <p>This will clear the supplier's acknowledgment data. Make sure this is intended.</p>
              </div>
            </div>
          )}

          {/* Status History Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            {showHistory ? 'Hide' : 'Show'} Status History
          </Button>

          {/* Status History */}
          {showHistory && statusHistory && statusHistory.length > 0 && (
            <ScrollArea className="h-48 border rounded p-3">
              <div className="space-y-3">
                {statusHistory.map((entry: any) => (
                  <div key={entry.id} className="border-l-2 border-gray-200 pl-3 pb-2">
                    <div className="flex justify-between">
                      <div>
                        <span className={`font-medium ${getStatusColor(entry.previousStatus)}`}>
                          {entry.previousStatus}
                        </span>
                        {' → '}
                        <span className={`font-medium ${getStatusColor(entry.newStatus)}`}>
                          {entry.newStatus}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {entry.changeReason}
                      {entry.changeNotes && ` - ${entry.changeNotes}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      By {entry.changedByName} ({entry.changedByRole})
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
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