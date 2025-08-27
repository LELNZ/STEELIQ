import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  Trophy,
  DollarSign,
  Truck,
  Shield,
  CheckCircle2,
  XCircle,
  Star,
  TrendingDown,
  TrendingUp,
  Calendar,
  FileText,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const responseStatusColors = {
  submitted: "secondary",
  under_review: "warning",
  selected: "success",
  rejected: "destructive",
} as const;

export default function QuotesComparisonView() {
  const [selectedRfqId, setSelectedRfqId] = useState<number | null>(null);
  const [selectWinnerDialog, setSelectWinnerDialog] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const { toast } = useToast();

  // Fetch RFQs with responses
  const { data: rfqs = [], isLoading: rfqsLoading } = useQuery({
    queryKey: ["/api/procurement/rfqs"],
    queryFn: async () => {
      const response = await fetch("/api/procurement/rfqs?status=sent");
      if (!response.ok) throw new Error("Failed to fetch RFQs");
      return response.json();
    },
  });

  // Fetch responses for selected RFQ
  const { data: responses = [] } = useQuery({
    queryKey: selectedRfqId ? [`/api/procurement/rfqs/${selectedRfqId}/responses`] : null,
    enabled: !!selectedRfqId,
  });

  // Select winner mutation
  const selectWinnerMutation = useMutation({
    mutationFn: ({ rfqId, responseId }: { rfqId: number; responseId: number }) =>
      apiRequest(`/api/procurement/rfqs/${rfqId}/select-winner`, "POST", { responseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/rfqs"] });
      queryClient.invalidateQueries({ queryKey: [`/api/procurement/rfqs/${selectedRfqId}/responses`] });
      setSelectWinnerDialog(false);
      setSelectedResponse(null);
      toast({
        title: "Success",
        description: "Winner selected successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to select winner",
        variant: "destructive",
      });
    },
  });

  // Create PO from winning response
  const createPOMutation = useMutation({
    mutationFn: (rfqResponseId: number) =>
      apiRequest("/api/procurement/rfqs/create-po", "POST", { rfqResponseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/procurement/purchase-orders"] });
      toast({
        title: "Success",
        description: "Purchase Order created from winning quote",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create PO",
        variant: "destructive",
      });
    },
  });

  const activeRfqs = rfqs.filter((rfq: any) => rfq.status === 'sent');
  const selectedRfq = rfqs.find((rfq: any) => rfq.id === selectedRfqId);

  // Calculate comparison metrics
  const calculateMetrics = () => {
    if (responses.length === 0) return null;

    const prices = responses.map((r: any) => parseFloat(r.totalAmount) || 0);
    const deliveryDays = responses.map((r: any) => r.deliveryDays || 0);

    return {
      lowestPrice: Math.min(...prices),
      highestPrice: Math.max(...prices),
      averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      fastestDelivery: Math.min(...deliveryDays),
      slowestDelivery: Math.max(...deliveryDays),
    };
  };

  const metrics = calculateMetrics();

  return (
    <>
      {/* RFQ Selection */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select RFQ to Compare Quotes</CardTitle>
          <CardDescription className="text-xs">
            Choose an RFQ to view and compare supplier responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {activeRfqs.length === 0 ? (
              <div className="col-span-3 text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No RFQs with responses</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Send RFQs to suppliers to receive quotes
                </p>
              </div>
            ) : (
              activeRfqs.map((rfq: any) => (
                <div
                  key={rfq.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedRfqId === rfq.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-gray-400"
                  }`}
                  onClick={() => setSelectedRfqId(rfq.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{rfq.rfqNumber}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rfq.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Job: {rfq.jobNumber}
                      </p>
                    </div>
                    <Badge variant="outline">{rfq.responses?.length || 0} quotes</Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Metrics */}
      {selectedRfqId && metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Lowest Quote</p>
                  <p className="text-lg font-bold text-green-600">
                    ${metrics.lowestPrice.toLocaleString()}
                  </p>
                </div>
                <TrendingDown className="h-4 w-4 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Highest Quote</p>
                  <p className="text-lg font-bold text-red-600">
                    ${metrics.highestPrice.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-4 w-4 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Average Quote</p>
                  <p className="text-lg font-bold">
                    ${metrics.averagePrice.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Fastest Delivery</p>
                  <p className="text-lg font-bold">{metrics.fastestDelivery} days</p>
                </div>
                <Truck className="h-4 w-4 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Responses</p>
                  <p className="text-lg font-bold">{responses.length}</p>
                </div>
                <FileText className="h-4 w-4 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quotes Comparison Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Quote Comparison Matrix</CardTitle>
              <CardDescription className="text-xs">
                Compare supplier responses side by side
                {selectedRfq && ` - ${selectedRfq.rfqNumber}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedRfqId ? (
            <div className="text-center py-8 text-muted-foreground">
              Select an RFQ above to view quotes
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Rank</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Warranty</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No quotes received yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    responses
                      .sort((a: any, b: any) => (a.totalScore || 100) - (b.totalScore || 100))
                      .map((response: any, index: number) => (
                        <TableRow key={response.id} className="text-xs">
                          <TableCell>
                            {index === 0 && (
                              <div className="flex items-center gap-1">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                <span>1</span>
                              </div>
                            )}
                            {index === 1 && (
                              <div className="flex items-center gap-1">
                                <Trophy className="h-4 w-4 text-gray-400" />
                                <span>2</span>
                              </div>
                            )}
                            {index === 2 && (
                              <div className="flex items-center gap-1">
                                <Trophy className="h-4 w-4 text-orange-600" />
                                <span>3</span>
                              </div>
                            )}
                            {index > 2 && <span>{index + 1}</span>}
                          </TableCell>
                          <TableCell className="font-medium">
                            {response.supplierName || `Supplier ${response.supplierId}`}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">
                              ${(response.totalAmount || 0).toLocaleString()}
                            </div>
                            {metrics && response.totalAmount === metrics.lowestPrice && (
                              <Badge variant="success" className="text-xs mt-1">Best Price</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {response.deliveryDays} days
                            {metrics && response.deliveryDays === metrics.fastestDelivery && (
                              <Badge variant="success" className="text-xs ml-1">Fastest</Badge>
                            )}
                          </TableCell>
                          <TableCell>{response.paymentTermsOffered}</TableCell>
                          <TableCell>{response.warrantyOffered || "Standard"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= (5 - index)
                                      ? "text-yellow-500 fill-yellow-500"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={responseStatusColors[response.status as keyof typeof responseStatusColors]}>
                              {response.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {response.status === 'submitted' && index === 0 && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedResponse(response);
                                  setSelectWinnerDialog(true);
                                }}
                              >
                                Select Winner
                              </Button>
                            )}
                            {response.status === 'selected' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => createPOMutation.mutate(response.id)}
                              >
                                Create PO
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Select Winner Dialog */}
      <Dialog open={selectWinnerDialog} onOpenChange={setSelectWinnerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Winner Selection</DialogTitle>
            <DialogDescription>
              Are you sure you want to select this supplier as the winner?
            </DialogDescription>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <p className="font-medium">
                  {selectedResponse.supplierName || `Supplier ${selectedResponse.supplierId}`}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Quote Amount:</span>
                    <span className="ml-2 font-medium">
                      ${(selectedResponse.totalAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Delivery:</span>
                    <span className="ml-2 font-medium">{selectedResponse.deliveryDays} days</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                This action will mark this quote as selected and reject all other quotes for this RFQ.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectWinnerDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedResponse && selectedRfqId) {
                  selectWinnerMutation.mutate({
                    rfqId: selectedRfqId,
                    responseId: selectedResponse.id,
                  });
                }
              }}
            >
              Confirm Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}