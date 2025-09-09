import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Trophy, 
  DollarSign, 
  Clock, 
  Shield, 
  FileText, 
  Calendar,
  Building,
  User,
  Phone,
  Mail,
  Download,
  ExternalLink,
  Package,
  Star,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";

interface QuoteDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: any;
  isWinner?: boolean;
}

export default function QuoteDetailsDialog({
  open,
  onOpenChange,
  quote,
  isWinner = false
}: QuoteDetailsDialogProps) {
  if (!quote) return null;

  const formatCurrency = (amount: string | number, currency: string = "NZD") => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-NZ", {
      style: "currency",
      currency: currency,
    }).format(numAmount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quote Details - {quote.responseNumber}
            </div>
            {isWinner && (
              <Badge className="bg-green-500 text-white">
                <Trophy className="h-3 w-3 mr-1" />
                Selected Quote
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="items">Line Items</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Supplier Information */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Supplier Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Company Name</p>
                    <p className="font-medium">{quote.supplierName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quote Number</p>
                    <p className="font-medium">{quote.responseNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted Date</p>
                    <p className="font-medium">
                      {format(new Date(quote.submittedAt), "MMM dd, yyyy hh:mm a")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valid Until</p>
                    <p className="font-medium">
                      {quote.validUntil ? 
                        format(new Date(quote.validUntil), "MMM dd, yyyy") : 
                        "30 days from submission"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Terms */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing & Commercial Terms
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(quote.totalAmount, quote.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Currency</p>
                    <p className="font-medium">{quote.currency || "NZD"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Terms</p>
                    <p className="font-medium">{quote.paymentTermsOffered || "Net 30"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tax/GST</p>
                    <p className="font-medium">
                      {quote.taxAmount ? formatCurrency(quote.taxAmount) : "Included"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Discount Offered</p>
                    <p className="font-medium">
                      {quote.discountOffered || "None"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Shipping Costs</p>
                    <p className="font-medium">
                      {quote.shippingCost ? formatCurrency(quote.shippingCost) : "Included"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Delivery & Quality */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Delivery & Quality
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Time</p>
                    <p className="font-medium">{quote.deliveryDays} days</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Warranty Period</p>
                    <p className="font-medium">{quote.warrantyOffered || "12 months"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Method</p>
                    <p className="font-medium">{quote.deliveryMethod || "Standard Shipping"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quality Certifications</p>
                    <p className="font-medium">{quote.certifications || "ISO 9001"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scoring */}
            {quote.totalScore && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Evaluation Scores
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Score</p>
                      <p className="text-xl font-bold text-primary">
                        {parseFloat(quote.totalScore.toString()).toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price Score</p>
                      <p className="font-medium">
                        {parseFloat(quote.priceScore.toString()).toFixed(1)} / 10
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Quality Score</p>
                      <p className="font-medium">
                        {parseFloat(quote.qualityScore.toString()).toFixed(1)} / 10
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery Score</p>
                      <p className="font-medium">
                        {parseFloat(quote.deliveryScore.toString()).toFixed(1)} / 10
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">Ranking</p>
                    <p className="font-medium">#{quote.ranking} out of all quotes</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {quote.notes && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Supplier Notes & Comments</h3>
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded">
                    {quote.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Special Terms */}
            {quote.specialTerms && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Special Terms & Conditions</h3>
                  <p className="text-sm whitespace-pre-wrap">
                    {quote.specialTerms}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="items" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Quote Line Items</h3>
                {quote.lineItems && quote.lineItems.length > 0 ? (
                  <div className="space-y-2">
                    {quote.lineItems.map((item: any, index: number) => (
                      <div key={index} className="border rounded p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{item.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.specifications || item.partNumber}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(item.totalPrice || item.quantity * item.unitPrice)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between pt-2">
                      <p className="font-semibold">Total</p>
                      <p className="font-bold text-lg">
                        {formatCurrency(quote.totalAmount, quote.currency)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No line items available. Total quote amount: {formatCurrency(quote.totalAmount)}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Attached Documents</h3>
                {quote.attachments && quote.attachments.length > 0 ? (
                  <div className="space-y-2">
                    {quote.attachments.map((doc: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{doc.name || `Document ${index + 1}`}</p>
                            <p className="text-sm text-muted-foreground">
                              {doc.size || "PDF Document"}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No documents attached to this quote
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}