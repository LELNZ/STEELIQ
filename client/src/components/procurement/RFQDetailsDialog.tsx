import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  Package,
  Users,
  FileText,
  Clock,
  DollarSign,
  Building2,
  Briefcase,
  ClipboardList,
  AlertCircle,
  CheckCircle,
  XCircle,
  Send,
  Archive,
  Mail,
  Phone,
  MapPin,
  Star,
  TrendingUp,
  Truck,
  CreditCard,
  Timer,
  Target,
  Edit,
  Calculator,
  Receipt,
} from "lucide-react";

interface RFQDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfqId: number;
  onViewComparison?: () => void;
  onEditRfq?: (rfq: any) => void;
}

export function RFQDetailsDialog({ open, onOpenChange, rfqId, onViewComparison, onEditRfq }: RFQDetailsDialogProps) {
  // Fetch RFQ details
  const { data: rfq, isLoading, refetch: refetchRfq } = useQuery<any>({
    queryKey: [`/api/procurement/rfqs/${rfqId}`],
    enabled: open && !!rfqId,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always refetch when dialog opens
  });

  // Fetch RFQ responses
  const { data: responses = [], refetch: refetchResponses } = useQuery<any[]>({
    queryKey: [`/api/procurement/rfqs/${rfqId}/responses`],
    enabled: open && !!rfqId,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always refetch when dialog opens
  });

  // Fetch requisition details if RFQ has requisitionId
  const { data: requisition } = useQuery<any>({
    queryKey: [`/api/procurement/requisitions/${rfq?.requisitionId}`],
    enabled: open && !!rfq?.requisitionId,
    refetchOnWindowFocus: false,
  });

  // Refetch data when dialog opens
  useEffect(() => {
    if (open && rfqId) {
      refetchRfq();
      refetchResponses();
    }
  }, [open, rfqId, refetchRfq, refetchResponses]);

  // Fetch suppliers data
  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
    enabled: open && !!rfqId,
  });

  if (isLoading || !rfq) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'sent':
        return <Badge variant="default" className="bg-blue-500">Sent</Badge>;
      case 'evaluating':
        return <Badge variant="secondary" className="bg-amber-500">Evaluating</Badge>;
      case 'closed':
        return <Badge variant="default" className="bg-green-500">Closed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-gray-500">Archived</Badge>;
      case 'completed':
        return <Badge>Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const invitedSuppliersList = rfq.invitedSuppliers || [];
  const invitedSuppliersDetails = suppliers.filter((s: any) => 
    invitedSuppliersList.includes(s.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-500" />
              RFQ Details: {rfq.rfqNumber}
            </DialogTitle>
            {getStatusBadge(rfq.status)}
          </div>
          <DialogDescription className="text-base">
            {rfq.title}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="suppliers">
              Suppliers ({invitedSuppliersList.length})
            </TabsTrigger>
            <TabsTrigger value="responses">
              Responses ({responses.length})
            </TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6 mt-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Basic Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    Job Number
                  </p>
                  <p className="font-medium">{rfq.jobNumber || 'Not linked'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    Category
                  </p>
                  <p className="font-medium capitalize">{rfq.category || 'General'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Response Deadline
                  </p>
                  <p className="font-medium">
                    {rfq.responseDeadline ? format(new Date(rfq.responseDeadline), "PPp") : 'Not set'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    Delivery Required
                  </p>
                  <p className="font-medium">
                    {rfq.deliveryRequiredBy ? format(new Date(rfq.deliveryRequiredBy), "PP") : 'ASAP'}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Financial Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financial Details
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calculator className="h-4 w-4" />
                    Estimated Value
                  </p>
                  <p className="text-xl font-bold mt-1">
                    ${rfq.estimatedValue || requisition?.estimatedTotal || '0.00'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Excluding GST</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Receipt className="h-4 w-4" />
                    With GST (15%)
                  </p>
                  <p className="text-xl font-bold mt-1">
                    ${((rfq.estimatedValue || requisition?.estimatedTotal || 0) * 1.15).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Total Including GST</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">Currency</p>
                  <p className="text-xl font-bold mt-1">{rfq.currency || 'NZD'}</p>
                  <p className="text-xs text-muted-foreground mt-1">New Zealand Dollar</p>
                </div>
              </div>
              
              {/* Line Items if available */}
              {(requisition?.items && requisition.items.length > 0) && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Line Items</p>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2">Description</th>
                          <th className="text-right p-2">Quantity</th>
                          <th className="text-right p-2">Unit Price</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requisition.items.map((item: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">{item.description}</td>
                            <td className="text-right p-2">{item.quantity} {item.unit}</td>
                            <td className="text-right p-2">${item.estimatedUnitPrice || '0.00'}</td>
                            <td className="text-right p-2 font-medium">
                              ${item.estimatedTotal || '0.00'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Description */}
            {rfq.description && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Description
                </h3>
                <p className="text-sm leading-relaxed">{rfq.description}</p>
              </div>
            )}

            {/* Terms & Conditions */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Terms & Conditions
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    Delivery Terms
                  </p>
                  <p className="font-medium">
                    {typeof rfq.deliveryTerms === 'object' 
                      ? (rfq.deliveryTerms as any)?.label || (rfq.deliveryTerms as any)?.value || 'Standard'
                      : rfq.deliveryTerms || 'Standard'
                    }
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    Payment Terms
                  </p>
                  <p className="font-medium">
                    {typeof rfq.paymentTerms === 'object'
                      ? (rfq.paymentTerms as any)?.label || (rfq.paymentTerms as any)?.value || 'Net 30'
                      : rfq.paymentTerms || 'Net 30'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Special Requirements */}
            {rfq.specialRequirements && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Special Requirements
                </h3>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm">{rfq.specialRequirements}</p>
                </div>
              </div>
            )}

            {/* Evaluation Criteria */}
            {rfq.evaluationCriteria && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Evaluation Criteria
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Price Weight</p>
                    <p className="font-semibold">{rfq.evaluationCriteria.price_weight || 40}%</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Quality Weight</p>
                    <p className="font-semibold">{rfq.evaluationCriteria.quality_weight || 30}%</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Delivery Weight</p>
                    <p className="font-semibold">{rfq.evaluationCriteria.delivery_weight || 30}%</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-4 mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Invited Suppliers ({invitedSuppliersList.length})
            </h3>
            {invitedSuppliersDetails.length > 0 ? (
              <div className="grid gap-3">
                {invitedSuppliersDetails.map((supplier: any) => {
                  const hasResponded = responses.some((r: any) => r.supplierId === supplier.id);
                  return (
                    <div key={supplier.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {supplier.name}
                          </p>
                          <p className="text-sm text-muted-foreground">{supplier.company}</p>
                        </div>
                        {hasResponded ? (
                          <Badge variant="default" className="text-xs bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Responded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Awaiting
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                        {supplier.email && (
                          <p className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {supplier.email}
                          </p>
                        )}
                        {supplier.phone && (
                          <p className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {supplier.phone}
                          </p>
                        )}
                        {supplier.location && (
                          <p className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {supplier.location}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No suppliers invited yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="responses" className="space-y-4 mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Supplier Responses ({responses.length})
            </h3>
            {responses.length > 0 ? (
              <div className="grid gap-3">
                {responses.map((response: any) => {
                  const supplier = suppliers.find((s: any) => s.id === response.supplierId);
                  return (
                    <div key={response.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{supplier?.name || 'Unknown Supplier'}</p>
                          <p className="text-sm text-muted-foreground">
                            Response #{response.responseNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            ${response.totalAmount}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Valid for {response.validityDays} days
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-muted-foreground">
                          Delivery: <span className="font-medium">{response.deliveryDays} days</span>
                        </p>
                        <p className="text-muted-foreground">
                          Score: <span className="font-medium">{response.totalScore || 'Not evaluated'}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No responses received yet</p>
                <p className="text-sm mt-1">
                  Responses will appear here as suppliers submit their quotes
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4 mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              RFQ Timeline
            </h3>
            <div className="space-y-3">
              {/* Created */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">RFQ Created</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(rfq.createdAt), "PPp")}
                  </p>
                </div>
              </div>

              {/* Status Updates - Dynamic based on current and historical status */}
              {rfq.status === 'draft' && rfq.sentAt && (
                <>
                  {/* Previously sent */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Send className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Sent to Suppliers</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(rfq.sentAt), "PPp")}
                      </p>
                    </div>
                  </div>
                  {/* Cancelled */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">RFQ Cancelled</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(rfq.updatedAt), "PPp")}
                      </p>
                    </div>
                  </div>
                  {/* Reverted to Draft */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Reverted to Draft</p>
                      <p className="text-sm text-muted-foreground">
                        Status changed back to draft for editing
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Normal flow - Sent */}
              {rfq.sentAt && rfq.status !== 'draft' && rfq.status !== 'cancelled' && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Send className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Sent to Suppliers</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(rfq.sentAt), "PPp")}
                    </p>
                  </div>
                </div>
              )}

              {/* Response Deadline */}
              {rfq.responseDeadline && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Timer className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Response Deadline</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(rfq.responseDeadline), "PPp")}
                    </p>
                  </div>
                </div>
              )}

              {/* Status: Cancelled */}
              {rfq.status === 'cancelled' && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">RFQ Cancelled</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(rfq.updatedAt), "PPp")}
                    </p>
                  </div>
                </div>
              )}

              {/* Status: Archived */}
              {rfq.status === 'archived' && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-900/30 flex items-center justify-center">
                    <Archive className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">RFQ Archived</p>
                    <p className="text-sm text-muted-foreground">
                      Moved to archive
                    </p>
                  </div>
                </div>
              )}

              {/* Closed */}
              {rfq.closedAt && rfq.status !== 'cancelled' && rfq.status !== 'archived' && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Archive className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">RFQ Closed</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(rfq.closedAt), "PPp")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="mt-6" />

        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            {rfq.status === 'draft' && onEditRfq && (
              <Button 
                variant="outline"
                onClick={() => {
                  onEditRfq(rfq);
                  onOpenChange(false);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit RFQ
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {rfq.status === 'sent' && responses.length > 0 && (
              <Button 
                onClick={() => {
                  onOpenChange(false);
                  onViewComparison?.();
                }}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                View Comparison
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}