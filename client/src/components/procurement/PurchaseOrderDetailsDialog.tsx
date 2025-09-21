import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Package,
  Calendar,
  MapPin,
  FileText,
  Loader2,
  Download,
  Printer,
  Send,
  CheckCircle,
  Archive,
  Shield,
  Trophy,
} from "lucide-react";
import PODistributionDialog from "./PODistributionDialog";
import { POAuditTrail } from "./POAuditTrail";
import QuoteHistoryPanel from "./QuoteHistoryPanel";
import DocumentActions from "./DocumentActions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PurchaseOrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: any;
  onStatusChange?: (id: number, status: string) => void;
}

const poStatusColors = {
  draft: "secondary",
  sent: "default",
  acknowledged: "warning",
  partial: "warning",
  completed: "success",
  cancelled: "destructive",
} as const;

export default function PurchaseOrderDetailsDialog({
  open,
  onOpenChange,
  purchaseOrder,
  onStatusChange,
}: PurchaseOrderDetailsDialogProps) {
  const [showDistributionDialog, setShowDistributionDialog] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const { toast } = useToast();

  // Fetch PO items
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: [`/api/procurement/purchase-orders/${purchaseOrder?.id}/items`],
    enabled: open && !!purchaseOrder?.id,
  });

  // Fetch supplier details
  const { data: supplier, isLoading: supplierLoading } = useQuery({
    queryKey: [`/api/suppliers/${purchaseOrder?.supplierId}`],
    enabled: open && !!purchaseOrder?.supplierId,
  });

  // Fetch quote history for this PO
  const { data: quoteHistory, isLoading: quoteHistoryLoading } = useQuery({
    queryKey: [`/api/procurement/purchase-orders/${purchaseOrder?.id}/quote-history`],
    enabled: open && !!purchaseOrder?.id,
  });

  // For now, we'll just display the delivery address as stored
  // In future, this could be enhanced to link to actual location entities
  const deliveryLocation = null;


  const handleSendToSupplier = () => {
    setShowDistributionDialog(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Package className="h-5 w-5" />
                Purchase Order Details
              </DialogTitle>
              <DialogDescription>
                {purchaseOrder?.poNumber}
              </DialogDescription>
            </div>
            <Badge
              variant={poStatusColors[purchaseOrder?.status as keyof typeof poStatusColors]}
              className="text-sm"
            >
              {purchaseOrder?.status}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Order Details</TabsTrigger>
            <TabsTrigger value="quotes" className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              Quote History
              {quoteHistory?.quotes?.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                  {quoteHistory.quotes.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-4">
          {/* Header Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">PO Number</p>
                <p className="font-medium">{purchaseOrder?.poNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-medium">
                  {purchaseOrder?.orderDate
                    ? format(new Date(purchaseOrder.orderDate), "MMMM dd, yyyy")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requested Delivery</p>
                <p className="font-medium">
                  {purchaseOrder?.requestedDeliveryDate
                    ? format(new Date(purchaseOrder.requestedDeliveryDate), "MMMM dd, yyyy")
                    : "-"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Supplier</p>
                {supplierLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <p className="font-medium">{supplier?.name || 'Loading...'}</p>
                    {(supplier?.primaryContact?.email || supplier?.email) && (
                      <p className="text-xs text-muted-foreground">{supplier?.primaryContact?.email || supplier?.email}</p>
                    )}
                    {(supplier?.primaryContact?.name || supplier?.accountManager) && (
                      <p className="text-xs text-muted-foreground">Contact: {supplier?.primaryContact?.name || supplier?.accountManager}</p>
                    )}
                    {(supplier?.primaryContact?.phone || supplier?.phone) && (
                      <p className="text-xs text-muted-foreground">Phone: {supplier?.primaryContact?.phone || supplier?.phone}</p>
                    )}
                  </>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivery Address</p>
                <p className="font-medium">
                  {purchaseOrder?.deliveryAddress || "Main Warehouse"}
                </p>
                {/* Display standard company address for known locations */}
                {(purchaseOrder?.deliveryAddress === "Workshop" || purchaseOrder?.deliveryAddress === "workshop") && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      107 Harris Road, East Tāmaki
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Auckland 2013, New Zealand
                    </p>
                  </>
                )}
                {(purchaseOrder?.deliveryAddress === "Main Warehouse" || !purchaseOrder?.deliveryAddress) && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      107 Harris Road, East Tāmaki
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Auckland 2013, New Zealand
                    </p>
                  </>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Terms</p>
                <p className="font-medium">{supplier?.paymentTerms || purchaseOrder?.paymentTerms || "Net 30"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div>
            <h3 className="font-semibold mb-3">Line Items</h3>
            {itemsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No items in this purchase order
              </p>
            ) : (
              <div className="border rounded-lg">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium">Description</th>
                      <th className="px-3 py-2 text-right text-sm font-medium">Quantity</th>
                      <th className="px-3 py-2 text-center text-sm font-medium">Unit</th>
                      <th className="px-3 py-2 text-right text-sm font-medium">Unit Price</th>
                      <th className="px-3 py-2 text-right text-sm font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, index: number) => (
                      <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-muted/20"}>
                        <td className="px-3 py-2 text-sm">{item.description}</td>
                        <td className="px-3 py-2 text-sm text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-sm text-center">{item.unit || "each"}</td>
                        <td className="px-3 py-2 text-sm text-right">
                          ${(item.unitPrice || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-medium">
                          ${(item.lineTotal || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${(purchaseOrder?.subtotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>GST (15%):</span>
              <span>${(purchaseOrder?.gstAmount || 0).toLocaleString()}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total Amount:</span>
              <span>${(purchaseOrder?.totalAmount || 0).toLocaleString()}</span>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {purchaseOrder?.currency || "NZD"}
            </div>
          </div>

          {/* Special Instructions */}
          {purchaseOrder?.specialInstructions && (
            <div>
              <h3 className="font-semibold mb-2">Special Instructions</h3>
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                {purchaseOrder.specialInstructions}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAuditTrail(true)}
              className="mr-auto"
            >
              <Shield className="h-4 w-4 mr-1" />
              View Audit Trail
            </Button>
            <DocumentActions
              purchaseOrderId={purchaseOrder?.id}
              purchaseOrderNumber={purchaseOrder?.poNumber}
              variant="buttons"
            />
            {(purchaseOrder?.status === "draft" || 
              purchaseOrder?.status === "approved" || 
              purchaseOrder?.status === "sent") && (
              <Button size="sm" onClick={handleSendToSupplier}>
                <Send className="h-4 w-4 mr-1" />
                {purchaseOrder?.status === "sent" ? "Resend to Supplier" : "Send to Supplier"}
              </Button>
            )}
            {purchaseOrder?.status === "cancelled" && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  onClick={async () => {
                    await apiRequest('/api/procurement/purchase-orders/archive', 'POST', { 
                      id: purchaseOrder.id 
                    });
                    queryClient.invalidateQueries({ queryKey: ['/api/procurement/purchase-orders'] });
                    toast({
                      title: "Purchase Order Archived",
                      description: `PO ${purchaseOrder.poNumber} has been archived.`,
                    });
                    onOpenChange(false);
                  }}
                >
                  <Archive className="h-4 w-4 mr-1" />
                  Archive PO
                </Button>
                <Button 
                  size="sm" 
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => onStatusChange?.(purchaseOrder.id, "draft")}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Reactivate PO
                </Button>
              </>
            )}
          </div>
          </TabsContent>

          <TabsContent value="quotes" className="mt-4">
            {quoteHistoryLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : quoteHistory?.quotes?.length > 0 ? (
              <QuoteHistoryPanel
                rfqId={quoteHistory.rfqId}
                rfqNumber={quoteHistory.rfqNumber}
                poId={purchaseOrder?.id}
                quotes={quoteHistory.quotes}
                winningQuoteId={quoteHistory.winningQuoteId}
                showComparison={true}
                showActions={true}
              />
            ) : (
              <div className="text-center p-8">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {quoteHistory?.message || "No quote history available for this purchase order."}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* PO Distribution Dialog */}
    <PODistributionDialog
      open={showDistributionDialog}
      onOpenChange={setShowDistributionDialog}
      purchaseOrder={purchaseOrder}
      onSend={() => {
        // Status is already updated to "sent" by the server during the send operation
        // No need to make a separate status update call
        setShowDistributionDialog(false);
      }}
    />
    
    {/* PO Audit Trail Dialog */}
    {purchaseOrder && (
      <POAuditTrail
        isOpen={showAuditTrail}
        onClose={() => setShowAuditTrail(false)}
        purchaseOrderId={purchaseOrder.id}
        poNumber={purchaseOrder.poNumber}
      />
    )}
    </>
  );
}