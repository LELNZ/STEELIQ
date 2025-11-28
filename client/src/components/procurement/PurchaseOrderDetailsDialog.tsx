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

  // Fetch company locations
  const { data: companyLocations = [] } = useQuery({
    queryKey: ['/api/company-locations'],
    enabled: open,
  });

  // Find the delivery location based on the purchase order's delivery address
  const getDeliveryLocation = () => {
    if (!purchaseOrder?.deliveryAddress || companyLocations.length === 0) return null;
    
    // Normalize the address - remove punctuation, extra spaces, etc.
    const normalizedAddress = purchaseOrder.deliveryAddress
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
      .replace(/\s+/g, ' ')       // Multiple spaces to single space
      .trim();
    
    // 1. First, try common aliases (including variations)
    const addressMapping: Record<string, string> = {
      'workshop': 'Auckland Head Office',
      'workshop east tamaki': 'Auckland Head Office',
      'main warehouse': 'Auckland Head Office',
      'head office': 'Auckland Head Office',
      'auckland workshop': 'Auckland Head Office',
      'main office': 'Auckland Head Office',
      'hq': 'Auckland Head Office',
      'headquarters': 'Auckland Head Office',
    };
    
    // Check all aliases for matches
    for (const [alias, locationName] of Object.entries(addressMapping)) {
      if (normalizedAddress.includes(alias) || alias.includes(normalizedAddress)) {
        const location = companyLocations.find((loc: any) => 
          loc.locationName === locationName
        );
        if (location) return location;
      }
    }
    
    // 2. Try exact location name match
    const exactNameMatch = companyLocations.find((loc: any) => 
      loc.locationName?.toLowerCase() === normalizedAddress
    );
    if (exactNameMatch) return exactNameMatch;
    
    // 3. Check if the delivery address contains any of the database address fields
    // This handles cases where PO has full address like "107 Harris Road, East Tamaki"
    for (const location of companyLocations) {
      // Check if delivery address contains the location's street address
      if (location.addressLine1) {
        const normalizedLine1 = location.addressLine1.toLowerCase();
        if (normalizedAddress.includes(normalizedLine1) || 
            normalizedLine1.includes(normalizedAddress)) {
          return location;
        }
      }
      
      // Check if delivery address contains key parts of the location
      const addressParts = [
        location.addressLine1,
        location.addressLine2,
        location.city,
        location.postalCode
      ].filter(Boolean).map(part => part.toLowerCase());
      
      // Count how many parts of the database address appear in the PO address
      const matchCount = addressParts.filter(part => 
        normalizedAddress.includes(part)
      ).length;
      
      // If we have multiple matches, this is likely the right location
      if (matchCount >= 2) {
        return location;
      }
    }
    
    // 4. Finally, try partial name match
    const partialNameMatch = companyLocations.find((loc: any) => 
      loc.locationName?.toLowerCase().includes(normalizedAddress) ||
      normalizedAddress.includes(loc.locationName?.toLowerCase())
    );
    
    // Return null if no confident match found - don't force a wrong location
    // This allows the UI to properly display custom/drop-ship addresses
    return partialNameMatch || null;
  };

  const deliveryLocation = getDeliveryLocation();


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
                {/* Display actual location address from database */}
                {deliveryLocation && (
                  <>
                    {deliveryLocation.addressLine1 && (
                      <p className="text-xs text-muted-foreground">
                        {deliveryLocation.addressLine1}
                        {deliveryLocation.addressLine2 && `, ${deliveryLocation.addressLine2}`}
                      </p>
                    )}
                    {(deliveryLocation.city || deliveryLocation.postalCode || deliveryLocation.country) && (
                      <p className="text-xs text-muted-foreground">
                        {[
                          deliveryLocation.city,
                          deliveryLocation.postalCode,
                          deliveryLocation.country
                        ].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {deliveryLocation.phone && (
                      <p className="text-xs text-muted-foreground">
                        Phone: {deliveryLocation.phone}
                      </p>
                    )}
                  </>
                )}
                {/* Show default or custom address if no location match */}
                {!deliveryLocation && purchaseOrder?.deliveryAddress && purchaseOrder.deliveryAddress !== "Main Warehouse" && (
                  <p className="text-xs text-muted-foreground">
                    Custom delivery address
                  </p>
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