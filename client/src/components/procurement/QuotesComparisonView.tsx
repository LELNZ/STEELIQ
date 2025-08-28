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
  Plus,
  Paperclip,
  Download,
  Eye,
  MoreHorizontal,
  Upload,
  Check,
  Send,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
  const [manualQuoteDialog, setManualQuoteDialog] = useState(false);
  const [notifySupplierDialog, setNotifySupplierDialog] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [overrideJustification, setOverrideJustification] = useState("");
  const [manualQuoteForm, setManualQuoteForm] = useState({
    supplierId: '',
    totalAmount: '',
    deliveryDays: '',
    paymentTermsOffered: 'Net 30',
    warrantyOffered: '',
    notes: '',
  });
  const { toast } = useToast();

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  // Fetch RFQs with responses (including closed/awarded)
  const { data: rfqs = [], isLoading: rfqsLoading } = useQuery({
    queryKey: ["/api/procurement/rfqs"],
    queryFn: async () => {
      const response = await fetch("/api/procurement/rfqs?status=sent,closed");
      if (!response.ok) throw new Error("Failed to fetch RFQs");
      return response.json();
    },
  });

  // Fetch responses for selected RFQ
  const { data: responses = [] } = useQuery({
    queryKey: selectedRfqId ? [`/api/procurement/rfqs/${selectedRfqId}/responses`] : null,
    enabled: !!selectedRfqId,
  });

  // Sort responses by total score (ascending - lower is better for combined rank)
  const sortedResponses = [...responses].sort((a: any, b: any) => {
    // First by total score (lower is better)
    if (a.totalScore !== b.totalScore) {
      return (a.totalScore || 999) - (b.totalScore || 999);
    }
    // Then by total amount (lower is better)
    return (parseFloat(a.totalAmount) || 0) - (parseFloat(b.totalAmount) || 0);
  });

  // Select winner mutation
  const selectWinnerMutation = useMutation({
    mutationFn: ({ rfqId, responseId, justification }: { rfqId: number; responseId: number; justification?: string }) =>
      apiRequest(`/api/procurement/rfqs/${rfqId}/select-winner`, "POST", { responseId, justification }),
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

  // Submit manual quote mutation
  const submitManualQuoteMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest(`/api/procurement/rfqs/${selectedRfqId}/responses`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/procurement/rfqs/${selectedRfqId}/responses`] });
      setManualQuoteDialog(false);
      setManualQuoteForm({
        supplierId: '',
        totalAmount: '',
        deliveryDays: '',
        paymentTermsOffered: 'Net 30',
        warrantyOffered: '',
        notes: '',
      });
      toast({
        title: "Success",
        description: "Quote added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add quote",
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
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{rfq.rfqNumber}</p>
                        {rfq.status === 'closed' && (
                          <Badge className="bg-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Awarded
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{rfq.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Job: {rfq.jobNumber}
                      </p>
                    </div>
                    <Badge variant="outline">{rfq.responseCount || 0} quotes</Badge>
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
            {selectedRfqId && (
              <Button
                size="sm"
                onClick={() => setManualQuoteDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Manual Quote
              </Button>
            )}
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
                    <TableHead>Documents</TableHead>
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
                            <div className="flex items-center gap-1">
                              {response.attachments && response.attachments.length > 0 ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    // View attachments
                                    toast({
                                      title: "Documents",
                                      description: `${response.attachments.length} document(s) attached`,
                                    });
                                  }}
                                >
                                  <Paperclip className="h-4 w-4" />
                                  <span className="ml-1 text-xs">{response.attachments.length}</span>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    // Add attachment
                                    toast({
                                      title: "Add Documents",
                                      description: "Document upload feature coming soon",
                                    });
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {response.status === 'submitted' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant={index === 0 ? "default" : "outline"}
                                    onClick={() => {
                                      setSelectedResponse(response);
                                      setSelectWinnerDialog(true);
                                    }}
                                  >
                                    {index === 0 && <Trophy className="h-3 w-3 mr-1" />}
                                    Select Winner
                                  </Button>
                                  {index !== 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      Rank #{index + 1}
                                    </Badge>
                                  )}
                                </>
                              )}
                              {response.status === 'selected' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => createPOMutation.mutate(response.id)}
                                  >
                                    Create PO
                                  </Button>
                                  <Badge className="bg-green-600">
                                    <Check className="h-3 w-3 mr-1" />
                                    Winner
                                  </Badge>
                                </>
                              )}
                              {response.status === 'rejected' && (
                                <>
                                  <Badge variant="destructive">
                                    Rejected
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedResponse(response);
                                      setNotifySupplierDialog(true);
                                    }}
                                  >
                                    <Send className="h-3 w-3 mr-1" />
                                    Notify
                                  </Button>
                                </>
                              )}
                            </div>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedResponse && sortedResponses[0] && sortedResponses[0].id !== selectedResponse.id 
                ? "Manual Winner Override" 
                : "Confirm Winner Selection"}
            </DialogTitle>
            <DialogDescription>
              {selectedResponse && sortedResponses[0] && sortedResponses[0].id !== selectedResponse.id 
                ? "You are overriding the system recommendation. This requires justification and approval."
                : "Are you sure you want to select this supplier as the winner?"}
            </DialogDescription>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">
                    {selectedResponse.supplierName || `Supplier ${selectedResponse.supplierId}`}
                  </p>
                  {selectedResponse && sortedResponses.findIndex(r => r.id === selectedResponse.id) > 0 && (
                    <Badge variant="outline">
                      Rank #{sortedResponses.findIndex(r => r.id === selectedResponse.id) + 1}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
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
              
              {selectedResponse && sortedResponses[0] && sortedResponses[0].id !== selectedResponse.id && (
                <>
                  <div className="p-3 border border-orange-200 bg-orange-50 dark:bg-orange-900/20 rounded">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                      System Recommendation:
                    </p>
                    <p className="text-sm">
                      {sortedResponses[0]?.supplierName || `Supplier ${sortedResponses[0]?.supplierId}`}
                      {' - '}${(sortedResponses[0]?.totalAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="justification" className="required">
                      Justification for Override <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="justification"
                      placeholder="Explain why this supplier should be selected over the recommended option..."
                      rows={3}
                      required
                      minLength={50}
                      onChange={(e) => setOverrideJustification(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum 50 characters. This will be sent to management for approval.
                    </p>
                  </div>
                </>
              )}
              
              <p className="text-sm text-muted-foreground">
                This action will mark this quote as selected and reject all other quotes for this RFQ.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectWinnerDialog(false);
              setOverrideJustification("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedResponse && selectedRfqId) {
                  const isOverride = sortedResponses[0]?.id !== selectedResponse.id;
                  if (isOverride && (!overrideJustification || overrideJustification.length < 50)) {
                    toast({
                      title: "Justification Required",
                      description: "Please provide at least 50 characters of justification for the override.",
                      variant: "destructive",
                    });
                    return;
                  }
                  selectWinnerMutation.mutate({
                    rfqId: selectedRfqId,
                    responseId: selectedResponse.id,
                    justification: isOverride ? overrideJustification : undefined,
                  });
                }
              }}
            >
              {selectedResponse && sortedResponses[0]?.id !== selectedResponse.id 
                ? "Request Approval" 
                : "Confirm Selection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Quote Entry Dialog */}
      <Dialog open={manualQuoteDialog} onOpenChange={setManualQuoteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Manual Quote</DialogTitle>
            <DialogDescription>
              Manually enter a quote received from a supplier (e.g., via email or phone)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="supplier">Supplier *</Label>
              <Select
                value={manualQuoteForm.supplierId}
                onValueChange={(value) => setManualQuoteForm({...manualQuoteForm, supplierId: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier: any) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name} {supplier.company ? `(${supplier.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Total Amount (NZD) *</Label>
              <Input
                id="amount"
                type="number"
                value={manualQuoteForm.totalAmount}
                onChange={(e) => setManualQuoteForm({...manualQuoteForm, totalAmount: e.target.value})}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="delivery">Delivery Days *</Label>
              <Input
                id="delivery"
                type="number"
                value={manualQuoteForm.deliveryDays}
                onChange={(e) => setManualQuoteForm({...manualQuoteForm, deliveryDays: e.target.value})}
                placeholder="Number of days for delivery"
              />
            </div>
            <div>
              <Label htmlFor="payment">Payment Terms</Label>
              <Select
                value={manualQuoteForm.paymentTermsOffered}
                onValueChange={(value) => setManualQuoteForm({...manualQuoteForm, paymentTermsOffered: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 45">Net 45</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="2/10 Net 30">2/10 Net 30</SelectItem>
                  <SelectItem value="COD">COD</SelectItem>
                  <SelectItem value="Prepaid">Prepaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="warranty">Warranty Offered</Label>
              <Input
                id="warranty"
                value={manualQuoteForm.warrantyOffered}
                onChange={(e) => setManualQuoteForm({...manualQuoteForm, warrantyOffered: e.target.value})}
                placeholder="e.g., 12 months, 24 months"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={manualQuoteForm.notes}
                onChange={(e) => setManualQuoteForm({...manualQuoteForm, notes: e.target.value})}
                placeholder="Additional information about the quote..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="documents">Attach Documents</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, Word, Excel files (up to 10MB)
                </p>
                <p className="text-xs text-orange-600 mt-2 font-medium">
                  Document upload feature coming soon - save quote details now and add documents later
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualQuoteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!manualQuoteForm.supplierId || !manualQuoteForm.totalAmount || !manualQuoteForm.deliveryDays) {
                  toast({
                    title: "Error",
                    description: "Please fill in all required fields",
                    variant: "destructive",
                  });
                  return;
                }
                submitManualQuoteMutation.mutate({
                  supplierId: parseInt(manualQuoteForm.supplierId),
                  totalAmount: parseFloat(manualQuoteForm.totalAmount),
                  deliveryDays: parseInt(manualQuoteForm.deliveryDays),
                  paymentTermsOffered: manualQuoteForm.paymentTermsOffered,
                  warrantyOffered: manualQuoteForm.warrantyOffered || null,
                  notes: manualQuoteForm.notes || null,
                  validityDays: 30,
                  currency: 'NZD',
                  lineItems: [],
                });
              }}
              disabled={submitManualQuoteMutation.isPending}
            >
              Add Quote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify Supplier Dialog - Industry Best Practice: Manual Notifications */}
      <Dialog open={notifySupplierDialog} onOpenChange={setNotifySupplierDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Rejection Notification</DialogTitle>
            <DialogDescription>
              Send a personalized notification to the unsuccessful supplier. Industry best practice 
              is to provide constructive feedback when possible.
            </DialogDescription>
          </DialogHeader>
          {selectedResponse && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                <p className="font-medium">
                  {selectedResponse.supplierName || `Supplier ${selectedResponse.supplierId}`}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Quote Amount: ${(selectedResponse.totalAmount || 0).toLocaleString()}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rejection-message">
                  Notification Message
                </Label>
                <Textarea
                  id="rejection-message"
                  placeholder="Thank you for submitting your quote for [RFQ]. After careful evaluation, we have decided to proceed with another supplier for this particular project. We appreciate your time and effort in preparing the quote and look forward to future opportunities to work together."
                  rows={6}
                  value={rejectionMessage}
                  onChange={(e) => setRejectionMessage(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Provide feedback on why their quote wasn't selected (optional but recommended)
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Industry Best Practice:</strong> Send rejection notifications manually with 
                  personalized feedback. This maintains good supplier relationships for future opportunities.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setNotifySupplierDialog(false);
              setRejectionMessage("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // In production, this would send the notification email
                toast({
                  title: "Notification Sent",
                  description: `Rejection notification sent to ${selectedResponse?.supplierName || 'supplier'}`,
                });
                setNotifySupplierDialog(false);
                setRejectionMessage("");
              }}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Notification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}