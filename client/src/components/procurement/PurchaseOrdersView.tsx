import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import ConvertToPODialog from "./ConvertToPODialog";
import PurchaseOrderDetailsDialog from "./PurchaseOrderDetailsDialog";

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
  const { toast } = useToast();

  // Fetch approved requisitions ready for conversion
  const { data: requisitions = [], isLoading: requisitionsLoading } = useQuery({
    queryKey: ["/api/procurement/requisitions"],
  });

  const approvedRequisitions = requisitions.filter((r: any) => r.status === "approved");

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading: posLoading } = useQuery({
    queryKey: ["/api/procurement/purchase-orders"],
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

  const filteredPOs = purchaseOrders.filter((po: any) =>
    po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.supplierId?.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      {/* Approved Requisitions Ready for Conversion */}
      {approvedRequisitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ready for Purchase Order</CardTitle>
            <CardDescription>
              Approved requisitions that can be converted to Purchase Orders
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
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {req.department} • {req.category} •{" "}
                      ${(req.estimatedTotal || 0).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedRequisition(req);
                      setConvertDialogOpen(true);
                    }}
                  >
                    <Package className="h-4 w-4 mr-1" />
                    Convert to PO
                  </Button>
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
                    <TableCell>Supplier #{po.supplierId}</TableCell>
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
                          {po.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateStatusMutation.mutate({ id: po.id, status: "sent" })
                              }
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
                            <DropdownMenuItem
                              onClick={() =>
                                updateStatusMutation.mutate({ id: po.id, status: "draft" })
                              }
                              className="text-green-600"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Reactivate PO
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem>
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
    </div>
  );
}