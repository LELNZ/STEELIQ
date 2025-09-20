import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  FileText,
  MoreHorizontal,
  Send,
  Eye,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  Package,
  Search,
  Filter,
  Loader2,
  History,
  Archive,
} from "lucide-react";
import ConvertToPODialog from "./ConvertToPODialog";
import PurchaseOrderDetailsDialog from "./PurchaseOrderDetailsDialog";
import PODistributionDialog from "./PODistributionDialog";
import { POStatusDialog } from "./POStatusDialog";
import { POArchiveDialog } from "./POArchiveDialog";

const poStatusColors = {
  draft: "secondary",
  sent: "default",
  acknowledged: "warning",
  partial: "warning",
  completed: "success",
  cancelled: "destructive",
} as const;

export default function PurchaseOrdersView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<any>(null);
  const [distributionDialogOpen, setDistributionDialogOpen] = useState(false);
  const [poToSend, setPOToSend] = useState<any>(null);
  const [cancelRequisitionOpen, setCancelRequisitionOpen] = useState(false);
  const [requisitionToCancel, setRequisitionToCancel] = useState<any>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusDialogPO, setStatusDialogPO] = useState<any>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch approved requisitions ready for conversion
  const { data: requisitions = [], isLoading: requisitionsLoading } = useQuery({
    queryKey: ["/api/procurement/requisitions"],
  });

  // Only show approved requisitions that are explicitly marked as emergency
  const approvedRequisitions = requisitions.filter((r: any) => 
    r.status === "approved" && r.isEmergency === true
  );

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading: posLoading } = useQuery({
    queryKey: ["/api/procurement/purchase-orders"],
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  // Update PO status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/procurement/purchase-orders/${id}/status`, "PATCH", { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/metrics"] });
      toast({
        title: "Success",
        description: "Purchase Order status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  // Cancel approved requisition (send back to pending_approval)
  const cancelApprovedRequisitionMutation = useMutation({
    mutationFn: (requisitionId: number) =>
      apiRequest(`/api/procurement/requisitions/${requisitionId}/cancel-approval`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/approvals/pending"] });
      toast({
        title: "Success",
        description: "Requisition sent back to approvals",
      });
      setCancelRequisitionOpen(false);
      setRequisitionToCancel(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel approval",
        variant: "destructive",
      });
    },
  });

  const filteredPOs = purchaseOrders.filter((po: any) => {
    const supplier = suppliers.find((s: any) => s.id === po.supplierId);
    const supplierName = supplier?.name || '';
    return po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplierName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Helper function to get supplier name
  const getSupplierName = (supplierId: number) => {
    const supplier = suppliers.find((s: any) => s.id === supplierId);
    return supplier?.name || `Supplier #${supplierId}`;
  };

  return (
    <div className="space-y-4">
      {/* Approved Requisitions Ready for Conversion */}
      {approvedRequisitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ready for Purchase Order</CardTitle>
            <CardDescription>
              Emergency purchases that bypassed RFQ process (requires manager approval)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {approvedRequisitions.map((req: any) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-green-50 dark:bg-green-950/20"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{req.requisitionNumber}</span>
                      <Badge variant="success" className="text-xs">
                        Approved
                      </Badge>
                      <Badge variant="destructive" className="text-xs">
                        Emergency - No RFQ
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {req.department} • {req.category} •{" "}
                      ${(req.estimatedTotal || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRequisitionToCancel(req);
                        setCancelRequisitionOpen(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancel PO
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        // Check if supplier is selected
                        if (!req.preferredSupplierId) {
                          toast({
                            title: "Supplier Required",
                            description: "Please select a supplier in the approvals process before converting to PO",
                            variant: "destructive",
                          });
                          return;
                        }
                        setSelectedRequisition(req);
                        setConvertDialogOpen(true);
                      }}
                    >
                      <Package className="h-4 w-4 mr-1" />
                      Convert to PO
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase Orders List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>Manage and track purchase orders</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search POs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => setArchiveDialogOpen(true)}
                className="gap-2"
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {posLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No purchase orders yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Convert approved requisitions to create purchase orders
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map((po: any) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>{getSupplierName(po.supplierId)}</TableCell>
                    <TableCell>
                      {po.orderDate ? format(new Date(po.orderDate), "MMM dd, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      {po.requestedDeliveryDate
                        ? format(new Date(po.requestedDeliveryDate), "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${(po.totalAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={poStatusColors[po.status as keyof typeof poStatusColors]}>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedPO(po);
                              setDetailsOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setStatusDialogPO(po);
                              setStatusDialogOpen(true);
                            }}
                          >
                            <History className="mr-2 h-4 w-4" />
                            Change Status
                          </DropdownMenuItem>
                          {po.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setPOToSend(po);
                                setDistributionDialogOpen(true);
                              }}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Send to Supplier
                            </DropdownMenuItem>
                          )}
                          {po.status === "sent" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateStatusMutation.mutate({ id: po.id, status: "acknowledged" })
                              }
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Acknowledged
                            </DropdownMenuItem>
                          )}
                          {["draft", "sent"].includes(po.status) && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateStatusMutation.mutate({ id: po.id, status: "cancelled" })
                              }
                              className="text-destructive"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel PO
                            </DropdownMenuItem>
                          )}
                          {po.status === "cancelled" && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({ id: po.id, status: "draft" })
                                }
                                className="text-green-600"
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Reactivate PO
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  await apiRequest('/api/procurement/purchase-orders/archive', 'POST', { 
                                    id: po.id 
                                  });
                                  queryClient.invalidateQueries({ queryKey: ['/api/procurement/purchase-orders'] });
                                  toast({
                                    title: "Purchase Order Archived",
                                    description: `PO ${po.poNumber} has been archived.`,
                                  });
                                }}
                                className="text-orange-600"
                              >
                                <Archive className="mr-2 h-4 w-4" />
                                Archive PO
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              // Download PDF with default template
                              const link = document.createElement('a');
                              link.href = `/api/procurement/purchase-orders/${po.id}/pdf?templateCode=PO_STANDARD&showLineItems=true&showDescriptions=true&showTotals=true&showTerms=true&showDeliveryDetails=true&showPaymentTerms=true&download=true`;
                              link.download = `PO-${po.poNumber}.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              
                              toast({
                                title: "Downloading PDF",
                                description: `Purchase Order ${po.poNumber} is being downloaded`,
                              });
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              // Open PDF in new tab for printing
                              window.open(
                                `/api/procurement/purchase-orders/${po.id}/pdf?templateCode=PO_STANDARD&showLineItems=true&showDescriptions=true&showTotals=true&showTerms=true&showDeliveryDetails=true&showPaymentTerms=true`,
                                '_blank'
                              );
                              
                              toast({
                                title: "Opening PDF",
                                description: "Opening PDF for printing in new tab",
                              });
                            }}
                          >
                            <Printer className="mr-2 h-4 w-4" />
                            Print
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Convert to PO Dialog */}
      {selectedRequisition && (
        <ConvertToPODialog
          open={convertDialogOpen}
          onOpenChange={setConvertDialogOpen}
          requisition={selectedRequisition}
        />
      )}

      {/* PO Status Change Dialog */}
      {statusDialogPO && (
        <POStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          purchaseOrder={statusDialogPO}
        />
      )}

      {/* PO Details Dialog */}
      {selectedPO && (
        <PurchaseOrderDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          purchaseOrder={selectedPO}
          onStatusChange={(id, status) => {
            updateStatusMutation.mutate({ id, status });
            if (status === "draft") {
              toast({
                title: "Purchase Order Reactivated",
                description: "The PO has been restored to draft status and can be edited.",
              });
            }
          }}
        />
      )}

      {/* PO Distribution Dialog */}
      {poToSend && (
        <PODistributionDialog
          open={distributionDialogOpen}
          onOpenChange={setDistributionDialogOpen}
          purchaseOrder={poToSend}
          onSend={() => {
            updateStatusMutation.mutate({ id: poToSend.id, status: "sent" });
            setDistributionDialogOpen(false);
            setPOToSend(null);
          }}
        />
      )}

      {/* Cancel PO Confirmation Dialog */}
      <AlertDialog open={cancelRequisitionOpen} onOpenChange={setCancelRequisitionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Purchase Order Process?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to send <span className="font-semibold">{requisitionToCancel?.requisitionNumber}</span> back to approvals?
              This will change its status from "Approved" to "Pending Approval" and require re-approval before it can be converted to a Purchase Order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Approved</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (requisitionToCancel) {
                  cancelApprovedRequisitionMutation.mutate(requisitionToCancel.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Send Back to Approvals
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Archive Dialog */}
      <POArchiveDialog 
        open={archiveDialogOpen} 
        onOpenChange={setArchiveDialogOpen} 
      />
    </div>
  );
}