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
  X,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [notifyingResponse, setNotifyingResponse] = useState<any>(null);
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [rejectionTemplate, setRejectionTemplate] = useState("standard");
  const [acceptanceDialog, setAcceptanceDialog] = useState(false);
  const [acceptanceMessage, setAcceptanceMessage] = useState("");
  const [acceptanceTemplate, setAcceptanceTemplate] = useState("standard");
  const [overrideJustification, setOverrideJustification] = useState("");
  const [manualQuoteForm, setManualQuoteForm] = useState({
    supplierId: '',
    totalAmount: '',
    deliveryDays: '',
    paymentTermsOffered: 'Net 30',
    warrantyOffered: '',
    notes: '',
  });
  const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Acceptance message templates
  const acceptanceTemplates = {
    standard: {
      title: "Standard Acceptance",
      message: `We are pleased to inform you that your quote for {RFQ_NUMBER} - {RFQ_TITLE} has been selected.

Quote Details:
- Amount: {QUOTE_AMOUNT}
- Delivery: {DELIVERY_DAYS} days

A Purchase Order will be issued shortly with complete details and terms. Please confirm receipt of this notification and your readiness to proceed.

Thank you for your competitive pricing and commitment to meeting our requirements.`,
    },
    urgent: {
      title: "Urgent Acceptance",
      message: `Your quote for {RFQ_NUMBER} has been selected for this urgent requirement.

We need you to:
1. Confirm availability to meet the delivery deadline of {DELIVERY_DATE}
2. Verify stock availability
3. Provide an updated production schedule

Please respond within 24 hours to confirm. The Purchase Order will follow upon your confirmation.`,
    },
    partnership: {
      title: "Partnership Focus",
      message: `Congratulations! We are delighted to select your quote for {RFQ_NUMBER}.

This selection reinforces our strong partnership. Your competitive pricing and proven track record made you the clear choice.

Next steps:
- Purchase Order will be issued within 48 hours
- Please confirm your project manager for this order
- Delivery schedule to be confirmed as per your quoted timeline

We look forward to another successful project together.`,
    },
    custom: {
      title: "Custom Message",
      message: "",
    },
  };

  // Rejection message templates
  const rejectionTemplates = {
    standard: {
      title: "Standard Rejection",
      message: `Thank you for submitting your quote for {RFQ_NUMBER}. After careful evaluation of all proposals, we have decided to proceed with another supplier whose quote better aligns with our current requirements.\n\nWe appreciate the time and effort you put into preparing your proposal and hope to have the opportunity to work with you on future projects.`,
    },
    price: {
      title: "Price-Based Rejection",
      message: `Thank you for your proposal for {RFQ_NUMBER}. While we value your capabilities and the quality of your offering, we have selected a supplier whose pricing better fits our budget constraints for this project.\n\nWe encourage you to remain competitive in future RFQs as we value our relationship with your company.`,
    },
    delivery: {
      title: "Delivery Timeline Rejection",
      message: `Thank you for your quote submission for {RFQ_NUMBER}. After reviewing all proposals, we have chosen a supplier who can meet our urgent delivery requirements.\n\nWe recognize your company's quality standards and hope to work together when our timeline requirements better align with your production schedule.`,
    },
    technical: {
      title: "Technical Requirements Rejection",
      message: `Thank you for participating in {RFQ_NUMBER}. After technical evaluation, we have selected a supplier whose solution more closely matches our specific technical requirements for this project.\n\nWe value your expertise and encourage you to participate in future opportunities that may be better suited to your technical capabilities.`,
    },
    custom: {
      title: "Custom Message",
      message: "",
    },
  };

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  // Fetch RFQs with sent, evaluation and closed/awarded statuses (exclude draft)
  const { data: rfqs = [], isLoading: rfqsLoading } = useQuery({
    queryKey: ["/api/procurement/rfqs"],
    queryFn: async () => {
      const response = await fetch("/api/procurement/rfqs");
      if (!response.ok) throw new Error("Failed to fetch RFQs");
      const allRfqs = await response.json();
      // Filter for sent, evaluation, and closed statuses - EXCLUDE draft RFQs
      return allRfqs.filter((rfq: any) => 
        ['sent', 'evaluation', 'closed'].includes(rfq.status) && rfq.status !== 'draft'
      );
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

  // Send acceptance notification mutation
  const sendAcceptanceNotificationMutation = useMutation({
    mutationFn: async ({ responseId, message }: { responseId: number; message: string }) =>
      apiRequest(`/api/procurement/rfqs/responses/${responseId}/notify-acceptance`, "POST", { message, templateKey: acceptanceTemplate }),
    onSuccess: () => {
      setAcceptanceDialog(false);
      setNotifyingResponse(null);
      setAcceptanceMessage("");
      setAcceptanceTemplate("standard");
      toast({
        title: "Success",
        description: "Acceptance notification sent to supplier",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/procurement/rfqs/${selectedRfqId}/responses`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send acceptance notification",
        variant: "destructive",
      });
    },
  });

  // Send rejection notification mutation
  const sendRejectionNotificationMutation = useMutation({
    mutationFn: async ({ responseId, message }: { responseId: number; message: string }) =>
      apiRequest(`/api/procurement/rfqs/responses/${responseId}/notify-rejection`, "POST", { message }),
    onSuccess: () => {
      setNotifySupplierDialog(false);
      setNotifyingResponse(null);
      setRejectionMessage("");
      setRejectionTemplate("standard");
      toast({
        title: "Success",
        description: "Rejection notification sent to supplier",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/procurement/rfqs/${selectedRfqId}/responses`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      });
    },
  });

  // Submit manual quote mutation
  const submitManualQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      // If there's a document, upload it first
      let attachments = [];
      if (uploadedDocument) {
        const formData = new FormData();
        formData.append('document', uploadedDocument);
        formData.append('type', 'quote_pdf');
        
        try {
          setIsUploading(true);
          const uploadResponse = await fetch('/api/procurement/documents/upload', {
            method: 'POST',
            body: formData,
          });
          
          if (!uploadResponse.ok) {
            throw new Error('Failed to upload document');
          }
          
          const uploadResult = await uploadResponse.json();
          attachments = [uploadResult];
        } catch (error) {
          console.error('Document upload failed:', error);
          // Continue without document if upload fails
        } finally {
          setIsUploading(false);
        }
      }
      
      return apiRequest(`/api/procurement/rfqs/${selectedRfqId}/responses`, "POST", {
        ...data,
        attachments,
      });
    },
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
      setUploadedDocument(null);
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

  // Show all sent RFQs (with or without responses)
  const activeRfqs = rfqs;
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
            {rfqsLoading ? (
              <div className="col-span-3 text-center py-8">
                <p className="text-muted-foreground">Loading RFQs...</p>
              </div>
            ) : activeRfqs.length === 0 ? (
              <div className="col-span-3 text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No RFQs available for quotes</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Send RFQs to suppliers to start receiving quotes
                </p>
              </div>
            ) : (
              activeRfqs.map((rfq: any) => (
                <div
                  key={rfq.id}
                  className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedRfqId === rfq.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : rfq.winningResponseId
                      ? "border-green-300 bg-green-50 hover:border-green-400"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                  onClick={() => setSelectedRfqId(rfq.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{rfq.rfqNumber}</p>
                        {rfq.winningResponseId && (
                          <Badge className="bg-green-600 text-white">
                            <Trophy className="h-3 w-3 mr-1" />
                            AWARDED
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{rfq.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Job: {rfq.jobNumber || 'No job linked'}
                      </p>
                    </div>
                    <div className="text-right">
                      {rfq.responseCount > 0 ? (
                        <Badge variant="outline" className="mb-1">
                          {rfq.responseCount} quotes
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="mb-1">
                          Awaiting quotes
                        </Badge>
                      )}
                      {rfq.winningResponseId && (
                        <p className="text-xs text-green-600 font-medium">Winner Selected</p>
                      )}
                      {rfq.status === 'sent' && !rfq.responseCount && (
                        <p className="text-xs text-amber-600 mt-1">
                          {rfq.responseDeadline ? 
                            `Due: ${format(new Date(rfq.responseDeadline), 'MMM d')}` : 
                            'No deadline'}
                        </p>
                      )}
                    </div>
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
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="flex flex-col items-center gap-3">
                          <FileText className="h-10 w-10 text-muted-foreground" />
                          <p className="text-muted-foreground font-medium">No quotes received yet</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedRfq?.responseDeadline ? 
                              `Response deadline: ${format(new Date(selectedRfq.responseDeadline), 'MMM d, yyyy')}` : 
                              'Awaiting supplier responses'}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setManualQuoteDialog(true)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add First Quote Manually
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    responses
                      .sort((a: any, b: any) => (a.totalScore || 100) - (b.totalScore || 100))
                      .map((response: any, index: number) => (
                        <TableRow 
                          key={response.id} 
                          className={`text-xs ${
                            response.status === 'selected' 
                              ? 'bg-green-100 border-l-4 border-l-green-500 font-medium shadow-sm' 
                              : response.status === 'rejected'
                              ? 'opacity-60 bg-gray-50'
                              : ''
                          }`}
                        >
                          <TableCell>
                            {response.status === 'selected' ? (
                              <div className="flex items-center gap-1 text-green-700 font-bold">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                <span>WINNER</span>
                              </div>
                            ) : (
                              response.totalScore ? (
                                <div className="flex items-center gap-1">
                                  {response.totalScore === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
                                  {response.totalScore === 2 && <Trophy className="h-4 w-4 text-gray-400" />}
                                  {response.totalScore === 3 && <Trophy className="h-4 w-4 text-orange-600" />}
                                  <span>{response.totalScore || index + 1}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">{index + 1}</span>
                              )
                            )}
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
                            {response.status === 'selected' ? (
                              <Badge className="bg-green-600 text-white hover:bg-green-700">
                                AWARDED
                              </Badge>
                            ) : (
                              <Badge variant={responseStatusColors[response.status as keyof typeof responseStatusColors]}>
                                {response.status}
                              </Badge>
                            )}
                            {response.notes && response.notes.includes('OVERRIDE') && (
                              <Badge variant="warning" className="ml-1">Manual Override</Badge>
                            )}
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
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => {
                                      setNotifyingResponse(response);
                                      setAcceptanceTemplate("standard");
                                      const template = acceptanceTemplates.standard;
                                      const rfq = rfqs.find((r: any) => r.id === selectedRfqId);
                                      setAcceptanceMessage(
                                        template.message
                                          .replace("{RFQ_NUMBER}", rfq?.rfqNumber || "")
                                          .replace("{RFQ_TITLE}", rfq?.title || "")
                                          .replace("{QUOTE_AMOUNT}", response.totalAmount?.toLocaleString('en-NZ', { style: 'currency', currency: response.currency || 'NZD' }) || "")
                                          .replace("{DELIVERY_DAYS}", response.deliveryDays?.toString() || "")
                                          .replace("{DELIVERY_DATE}", new Date(Date.now() + (response.deliveryDays || 0) * 24 * 60 * 60 * 1000).toLocaleDateString('en-NZ'))
                                      );
                                      setAcceptanceDialog(true);
                                    }}
                                  >
                                    <Send className="h-3 w-3 mr-1" />
                                    Notify Winner
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
                                      setNotifyingResponse(response);
                                      setRejectionTemplate("standard");
                                      const template = rejectionTemplates.standard;
                                      const rfq = rfqs.find((r: any) => r.id === selectedRfqId);
                                      setRejectionMessage(
                                        template.message.replace("{RFQ_NUMBER}", rfq?.rfqNumber || "")
                                      );
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
              <Label htmlFor="documents">Attach Quote Document (Optional)</Label>
              <div className="space-y-2">
                {!uploadedDocument ? (
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf,.doc,.docx,.xls,.xlsx';
                      input.onchange = (e: any) => {
                        const file = e.target?.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast({
                              title: "File too large",
                              description: "Please select a file under 10MB",
                              variant: "destructive",
                            });
                            return;
                          }
                          setUploadedDocument(file);
                        }
                      };
                      input.click();
                    }}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, Word, Excel files (up to 10MB)
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{uploadedDocument.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(uploadedDocument.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setUploadedDocument(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
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
              disabled={submitManualQuoteMutation.isPending || isUploading}
            >
              {submitManualQuoteMutation.isPending || isUploading ? "Adding..." : "Add Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify Supplier Dialog - Industry Best Practice: Manual Notifications */}
      <Dialog open={notifySupplierDialog} onOpenChange={setNotifySupplierDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Rejection Notification</DialogTitle>
            <DialogDescription>
              Send a professional notification to the unsuccessful supplier. Select a template or create a custom message.
            </DialogDescription>
          </DialogHeader>
          {notifyingResponse && (
            <div className="space-y-4">
              <div className="p-3 border rounded bg-muted/50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{notifyingResponse.supplierName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Quote Amount: ${notifyingResponse.totalAmount?.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Delivery: {notifyingResponse.deliveryDays} days
                    </p>
                  </div>
                  <Badge variant="destructive">Rejected</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Message Template</Label>
                <Select 
                  value={rejectionTemplate} 
                  onValueChange={(value) => {
                    setRejectionTemplate(value);
                    if (value !== 'custom') {
                      const template = rejectionTemplates[value as keyof typeof rejectionTemplates];
                      const rfq = rfqs.find((r: any) => r.id === selectedRfqId);
                      setRejectionMessage(
                        template.message.replace("{RFQ_NUMBER}", rfq?.rfqNumber || "")
                      );
                    } else {
                      setRejectionMessage("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Rejection</SelectItem>
                    <SelectItem value="price">Price-Based Rejection</SelectItem>
                    <SelectItem value="delivery">Delivery Timeline Rejection</SelectItem>
                    <SelectItem value="technical">Technical Requirements Rejection</SelectItem>
                    <SelectItem value="custom">Custom Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Rejection Message</Label>
                <Textarea
                  placeholder="Enter rejection message..."
                  value={rejectionMessage}
                  onChange={(e) => setRejectionMessage(e.target.value)}
                  className="min-h-[150px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {rejectionMessage.length} characters
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
            <Button 
              variant="outline" 
              onClick={() => {
                setNotifySupplierDialog(false);
                setNotifyingResponse(null);
                setRejectionMessage("");
                setRejectionTemplate("standard");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!rejectionMessage.trim()) {
                  toast({
                    title: "Error",
                    description: "Please enter a rejection message",
                    variant: "destructive",
                  });
                  return;
                }
                sendRejectionNotificationMutation.mutate({
                  responseId: notifyingResponse.id,
                  message: rejectionMessage,
                });
              }}
              disabled={sendRejectionNotificationMutation.isPending || !rejectionMessage.trim()}
            >
              {sendRejectionNotificationMutation.isPending ? (
                <>Sending...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />Send Notification</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Acceptance Notification Dialog */}
      <Dialog open={acceptanceDialog} onOpenChange={setAcceptanceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Trophy className="h-5 w-5 text-green-600 mr-2" />
              Send Acceptance Notification
            </DialogTitle>
            <DialogDescription>
              Notify the winning supplier about their successful quote
            </DialogDescription>
          </DialogHeader>
          
          {notifyingResponse && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200">
                <p className="font-medium text-green-900 dark:text-green-100">Winning Supplier</p>
                <p className="text-green-700 dark:text-green-300">{notifyingResponse.supplierName}</p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Quote Amount: {notifyingResponse.totalAmount?.toLocaleString('en-NZ', { 
                    style: 'currency', 
                    currency: notifyingResponse.currency || 'NZD' 
                  })}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Acceptance Template</Label>
                <Select value={acceptanceTemplate} onValueChange={setAcceptanceTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Acceptance</SelectItem>
                    <SelectItem value="urgent">Urgent Acceptance</SelectItem>
                    <SelectItem value="partnership">Partnership Focus</SelectItem>
                    <SelectItem value="custom">Custom Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Acceptance Message</Label>
                <Textarea
                  placeholder="Enter acceptance message..."
                  value={acceptanceMessage}
                  onChange={(e) => setAcceptanceMessage(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: {'{RFQ_NUMBER}'}, {'{RFQ_TITLE}'}, {'{QUOTE_AMOUNT}'}, {'{DELIVERY_DAYS}'}, {'{DELIVERY_DATE}'}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Industry Best Practice:</strong> Send acceptance notifications immediately after winner selection 
                  to secure supplier commitment and maintain professional communication standards.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setAcceptanceDialog(false);
                setNotifyingResponse(null);
                setAcceptanceMessage("");
                setAcceptanceTemplate("standard");
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (!acceptanceMessage.trim()) {
                  toast({
                    title: "Error",
                    description: "Please enter an acceptance message",
                    variant: "destructive",
                  });
                  return;
                }
                sendAcceptanceNotificationMutation.mutate({
                  responseId: notifyingResponse.id,
                  message: acceptanceMessage,
                });
              }}
              disabled={sendAcceptanceNotificationMutation.isPending || !acceptanceMessage.trim()}
            >
              {sendAcceptanceNotificationMutation.isPending ? (
                <>Sending...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />Send Acceptance</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}