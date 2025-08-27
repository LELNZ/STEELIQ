import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Archive, RotateCcw, Eye, Loader2 } from 'lucide-react';
import type { PurchaseOrder } from '@shared/schema';

interface POArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function POArchiveDialog({ open, onOpenChange }: POArchiveDialogProps) {
  const { toast } = useToast();

  // Fetch archived purchase orders
  const { data: archivedPOs = [], isLoading } = useQuery({
    queryKey: ['/api/procurement/purchase-orders/archived/list'],
    enabled: open,
  });

  // Unarchive mutation
  const unarchiveMutation = useMutation({
    mutationFn: async (poId: number) => {
      await apiRequest(`/api/procurement/purchase-orders/${poId}/unarchive`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/procurement/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/procurement/purchase-orders/archived/list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/procurement/metrics'] });
      toast({
        title: "Success",
        description: "Purchase order restored from archive",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unarchive purchase order",
        variant: "destructive",
      });
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'cancelled': return 'destructive';
      case 'completed': return 'default';
      case 'returned_to_requisition': return 'secondary';
      default: return 'outline';
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-NZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(Number(amount));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Purchase Order Archive
          </DialogTitle>
          <DialogDescription>
            View and manage archived purchase orders. Following Fortune 500 best practices like STRUMIS and Procore, 
            archived POs are preserved for audit trails and can be restored if needed.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : archivedPOs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No archived purchase orders found
          </div>
        ) : (
          <ScrollArea className="h-[400px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Archived Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedPOs.map((po: PurchaseOrder) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>
                      {po.supplier?.name || `Supplier #${po.supplierId}`}
                    </TableCell>
                    <TableCell>{formatCurrency(po.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(po.status)}>
                        {po.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(po.archivedAt)}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={po.archivedReason || ''}>
                      {po.archivedReason || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Navigate to PO detail view
                            window.location.href = `/procurement/purchase-orders/${po.id}`;
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {po.status === 'cancelled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unarchiveMutation.mutate(po.id)}
                            disabled={unarchiveMutation.isPending}
                          >
                            {unarchiveMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Archive Best Practices (Fortune 500 Standard)</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Cancelled POs:</strong> Archive after cancellation to maintain clean active list</li>
            <li>• <strong>Completed POs:</strong> Archive after 30 days or financial period close</li>
            <li>• <strong>Returned POs:</strong> Automatically archived when converted back to requisition</li>
            <li>• <strong>Audit Trail:</strong> All archived POs preserve complete history and can be viewed</li>
            <li>• <strong>Restoration:</strong> Cancelled POs can be unarchived if needed for reactivation</li>
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}