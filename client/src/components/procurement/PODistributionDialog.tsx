import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Mail, 
  User, 
  Building, 
  Phone, 
  FileText, 
  Download,
  Eye,
  Plus,
  X,
  Printer,
  AlertCircle,
  CheckCircle,
  Clock,
  Trophy,
  TrendingUp,
  DollarSign
} from "lucide-react";

interface PODistributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: any;
  onSend?: () => void;
}

export default function PODistributionDialog({ 
  open, 
  onOpenChange, 
  purchaseOrder,
  onSend 
}: PODistributionDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("contact");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [bccEmails, setBccEmails] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("default");
  const [deliveryMethod, setDeliveryMethod] = useState("email");
  const [formats, setFormats] = useState({ pdf: true, excel: false, csv: false });
  const [requireSignature, setRequireSignature] = useState(false);
  const [newCcEmail, setNewCcEmail] = useState("");
  const [newBccEmail, setNewBccEmail] = useState("");
  
  // Template content options
  const [templateOptions, setTemplateOptions] = useState({
    showLineItems: true,
    showSingleLineItem: false,
    showDescriptions: true,
    showSubtotals: false,
    showTotals: true,
    showTerms: true,
    showSignature: false,
    showNotes: true,
    showDeliveryDetails: true,
    showPaymentTerms: true
  });

  // Fetch quote history for this PO
  const { data: quoteHistory } = useQuery({
    queryKey: [`/api/procurement/purchase-orders/${purchaseOrder?.id}/quote-history`],
    enabled: open && !!purchaseOrder?.id,
  });

  // Fetch all suppliers for dropdown
  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
    enabled: open,
  });

  // Fetch selected supplier details
  const { data: supplier } = useQuery({
    queryKey: [`/api/suppliers/${selectedSupplierId || purchaseOrder?.supplierId}`],
    enabled: !!(selectedSupplierId || purchaseOrder?.supplierId),
  });

  // Fetch available templates - use mock data since API returns different structure
  const templates = [
    { id: "default", name: "Standard Template", description: "Company default PO template with blue theme" },
    { id: "detailed", name: "Detailed Template", description: "Includes extended item descriptions with green theme" },
    { id: "simple", name: "Simple Template", description: "Minimal information, prices only with gray theme" }
  ];

  // Initialize selected supplier from PO
  useEffect(() => {
    if (purchaseOrder?.supplierId && !selectedSupplierId) {
      setSelectedSupplierId(purchaseOrder.supplierId.toString());
    }
  }, [purchaseOrder]);

  // Update form when supplier changes
  useEffect(() => {
    if (supplier && purchaseOrder) {
      // Use primary contact email if available, otherwise fall back to supplier email
      setPrimaryEmail(supplier.primaryContact?.email || supplier.email || "");
      setEmailSubject(`Purchase Order ${purchaseOrder.poNumber} - Lateral Engineering`);
      setEmailBody(`Dear ${supplier.primaryContact?.name || supplier.accountManager || supplier.name || "Supplier"},

Please find attached Purchase Order ${purchaseOrder.poNumber} for your review and acknowledgment.

Requested Delivery Date: ${purchaseOrder.requestedDeliveryDate ? new Date(purchaseOrder.requestedDeliveryDate).toLocaleDateString() : "As per agreement"}
Delivery Address: ${purchaseOrder.deliveryAddress || "As per agreement"}

Please confirm receipt of this purchase order and the delivery schedule at your earliest convenience.

Best regards,
Lateral Engineering Procurement Team`);
    }
  }, [supplier, purchaseOrder]);

  // Send PO mutation
  const sendMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest(`/api/procurement/purchase-orders/${purchaseOrder.id}/send`, "POST", data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: purchaseOrder?.status === "sent" 
          ? "Purchase order resent successfully" 
          : "Purchase order sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/procurement/purchase-orders`] });
      if (onSend) {
        onSend();
      }
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send purchase order",
        variant: "destructive",
      });
    },
  });

  const handleAddCcEmail = () => {
    if (newCcEmail && !ccEmails.includes(newCcEmail)) {
      setCcEmails([...ccEmails, newCcEmail]);
      setNewCcEmail("");
    }
  };

  const handleAddBccEmail = () => {
    if (newBccEmail && !bccEmails.includes(newBccEmail)) {
      setBccEmails([...bccEmails, newBccEmail]);
      setNewBccEmail("");
    }
  };

  const handleSend = () => {
    if (!selectedSupplierId) {
      toast({
        title: "Error",
        description: "Please select a supplier",
        variant: "destructive",
      });
      return;
    }

    if (!primaryEmail) {
      toast({
        title: "Error",
        description: "Primary email address is required",
        variant: "destructive",
      });
      return;
    }

    console.log('Sending PO with:', {
      templateId: selectedTemplate,
      formats,
      requireSignature,
      deliveryMethod
    });

    sendMutation.mutate({
      supplierId: selectedSupplierId ? parseInt(selectedSupplierId) : undefined,
      to: [primaryEmail],
      cc: ccEmails,
      bcc: bccEmails,
      subject: emailSubject,
      body: emailBody,
      templateId: selectedTemplate,
      templateOptions,
      deliveryMethod,
      formats,
      requireSignature,
      requestAcknowledgment: requireSignature,
      includePortalLink: true
    });
  };

  const handlePreview = () => {
    // Build query params for template options
    const optionsParams = Object.entries(templateOptions)
      .filter(([_, value]) => value === true)
      .map(([key, _]) => `${key}=true`)
      .join('&');
    
    // Open preview in new tab with template and options
    window.open(
      `/api/procurement/purchase-orders/${purchaseOrder.id}/preview?template=${selectedTemplate}&${optionsParams}`, 
      '_blank'
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {purchaseOrder?.status === "sent" ? "Resend" : "Send"} Purchase Order - {purchaseOrder?.poNumber}
          </DialogTitle>
        </DialogHeader>

        {/* Resend Notice - shown when PO has been sent before */}
        {purchaseOrder?.status === "sent" && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                This Purchase Order has been sent before
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                You can resend it with updated contact details, different template, or additional recipients.
                All send activities are tracked in the audit trail.
              </p>
            </div>
          </div>
        )}

        {/* Quote Summary Card - shown when quotes exist */}
        {quoteHistory?.quotes?.length > 0 && (
          <Card className="mb-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-blue-600" />
                Quote Selection Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Selected Quote</p>
                  <p className="font-medium">
                    {quoteHistory.quotes.find((q: any) => q.id === quoteHistory.winningQuoteId)?.supplierName || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Winning Price</p>
                  <p className="font-medium">
                    ${parseFloat(
                      quoteHistory.quotes.find((q: any) => q.id === quoteHistory.winningQuoteId)?.totalAmount || "0"
                    ).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Quotes</p>
                  <p className="font-medium">{quoteHistory.quotes.length} suppliers</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Savings</p>
                  <p className="font-medium text-green-600">
                    ${(
                      Math.max(...quoteHistory.quotes.map((q: any) => parseFloat(q.totalAmount))) -
                      parseFloat(
                        quoteHistory.quotes.find((q: any) => q.id === quoteHistory.winningQuoteId)?.totalAmount || "0"
                      )
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
              {quoteHistory.rfqNumber && (
                <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  <span>RFQ Reference: {quoteHistory.rfqNumber}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="contact">
              <User className="h-4 w-4 mr-2" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="template">
              <FileText className="h-4 w-4 mr-2" />
              Template
            </TabsTrigger>
            <TabsTrigger value="delivery">
              <Send className="h-4 w-4 mr-2" />
              Delivery
            </TabsTrigger>
            <TabsTrigger value="review">
              <Eye className="h-4 w-4 mr-2" />
              Review
            </TabsTrigger>
          </TabsList>

          {/* Contact Details Tab */}
          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Supplier Information</CardTitle>
                <CardDescription>Verify and update contact details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="supplier">Select Supplier *</Label>
                    <Select
                      value={selectedSupplierId}
                      onValueChange={setSelectedSupplierId}
                    >
                      <SelectTrigger id="supplier" className="mt-1">
                        <SelectValue placeholder="Choose a supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((sup: any) => (
                          <SelectItem key={sup.id} value={sup.id.toString()}>
                            {sup.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Company</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{supplier?.name || "N/A"}</span>
                      </div>
                    </div>
                    <div>
                      <Label>Contact Person</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{supplier?.primaryContact?.name || supplier?.accountManager || "N/A"}</span>
                      </div>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{supplier?.primaryContact?.phone || supplier?.phone || "N/A"}</span>
                      </div>
                    </div>
                    {supplier?.company && supplier.company !== supplier.name && (
                      <div>
                        <Label>Company Name</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{supplier.company}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="primaryEmail">Primary Email (To) *</Label>
                    <Input
                      id="primaryEmail"
                      type="email"
                      value={primaryEmail}
                      onChange={(e) => setPrimaryEmail(e.target.value)}
                      placeholder="supplier@example.com"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>CC Emails</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="email"
                        value={newCcEmail}
                        onChange={(e) => setNewCcEmail(e.target.value)}
                        placeholder="Add CC email"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddCcEmail()}
                      />
                      <Button onClick={handleAddCcEmail} size="icon" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {ccEmails.map((email, index) => (
                        <Badge key={index} variant="secondary">
                          {email}
                          <button
                            onClick={() => setCcEmails(ccEmails.filter((_, i) => i !== index))}
                            className="ml-2"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>BCC Emails</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="email"
                        value={newBccEmail}
                        onChange={(e) => setNewBccEmail(e.target.value)}
                        placeholder="Add BCC email"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddBccEmail()}
                      />
                      <Button onClick={handleAddBccEmail} size="icon" variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {bccEmails.map((email, index) => (
                        <Badge key={index} variant="secondary">
                          {email}
                          <button
                            onClick={() => setBccEmails(bccEmails.filter((_, i) => i !== index))}
                            className="ml-2"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Template Selection Tab */}
          <TabsContent value="template" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Select Template</CardTitle>
                <CardDescription>Choose the PO format and layout</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {templates.map((template: any) => (
                    <div
                      key={template.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedTemplate === template.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        </div>
                        {selectedTemplate === template.id && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Content Options */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Content Options</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select which sections to include in the purchase order
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showLineItems"
                        checked={templateOptions.showLineItems}
                        onCheckedChange={(checked) =>
                          setTemplateOptions({ ...templateOptions, showLineItems: checked as boolean })
                        }
                      />
                      <label htmlFor="showLineItems" className="text-sm">
                        All Line Items
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showSingleLineItem"
                        checked={templateOptions.showSingleLineItem}
                        onCheckedChange={(checked) =>
                          setTemplateOptions({ ...templateOptions, showSingleLineItem: checked as boolean })
                        }
                        disabled={templateOptions.showLineItems}
                      />
                      <label htmlFor="showSingleLineItem" className="text-sm">
                        Single Line Summary
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showDescriptions"
                        checked={templateOptions.showDescriptions}
                        onCheckedChange={(checked) =>
                          setTemplateOptions({ ...templateOptions, showDescriptions: checked as boolean })
                        }
                      />
                      <label htmlFor="showDescriptions" className="text-sm">
                        Item Descriptions
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showSubtotals"
                        checked={templateOptions.showSubtotals}
                        onCheckedChange={(checked) =>
                          setTemplateOptions({ ...templateOptions, showSubtotals: checked as boolean })
                        }
                      />
                      <label htmlFor="showSubtotals" className="text-sm">
                        Subtotals
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showTotals"
                        checked={templateOptions.showTotals}
                        onCheckedChange={(checked) =>
                          setTemplateOptions({ ...templateOptions, showTotals: checked as boolean })
                        }
                      />
                      <label htmlFor="showTotals" className="text-sm">
                        Total Amount
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showDeliveryDetails"
                        checked={templateOptions.showDeliveryDetails}
                        onCheckedChange={(checked) =>
                          setTemplateOptions({ ...templateOptions, showDeliveryDetails: checked as boolean })
                        }
                      />
                      <label htmlFor="showDeliveryDetails" className="text-sm">
                        Delivery Details
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showTerms"
                        checked={templateOptions.showTerms}
                        onCheckedChange={(checked) =>
                          setTemplateOptions({ ...templateOptions, showTerms: checked as boolean })
                        }
                      />
                      <label htmlFor="showTerms" className="text-sm">
                        Terms & Conditions
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showPaymentTerms"
                        checked={templateOptions.showPaymentTerms}
                        onCheckedChange={(checked) =>
                          setTemplateOptions({ ...templateOptions, showPaymentTerms: checked as boolean })
                        }
                      />
                      <label htmlFor="showPaymentTerms" className="text-sm">
                        Payment Terms
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showNotes"
                        checked={templateOptions.showNotes}
                        onCheckedChange={(checked) =>
                          setTemplateOptions({ ...templateOptions, showNotes: checked as boolean })
                        }
                      />
                      <label htmlFor="showNotes" className="text-sm">
                        Additional Notes
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="showSignature"
                        checked={templateOptions.showSignature}
                        onCheckedChange={(checked) =>
                          setTemplateOptions({ ...templateOptions, showSignature: checked as boolean })
                        }
                      />
                      <label htmlFor="showSignature" className="text-sm">
                        Signature Block
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button variant="outline" onClick={handlePreview} className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview with Options
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Options Tab */}
          <TabsContent value="delivery" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Method</CardTitle>
                <CardDescription>Choose how to send the purchase order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      deliveryMethod === "email"
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setDeliveryMethod("email")}
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5" />
                      <div>
                        <h4 className="font-medium">Email</h4>
                        <p className="text-sm text-muted-foreground">
                          Send directly to supplier's email with tracking
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      deliveryMethod === "portal"
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setDeliveryMethod("portal")}
                  >
                    <div className="flex items-center gap-3">
                      <Download className="h-5 w-5" />
                      <div>
                        <h4 className="font-medium">Supplier Portal</h4>
                        <p className="text-sm text-muted-foreground">
                          Upload to portal for supplier to download
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      deliveryMethod === "print"
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setDeliveryMethod("print")}
                  >
                    <div className="flex items-center gap-3">
                      <Printer className="h-5 w-5" />
                      <div>
                        <h4 className="font-medium">Print/Fax</h4>
                        <p className="text-sm text-muted-foreground">
                          Print for manual delivery or faxing
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {deliveryMethod === "email" && (
                  <>
                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="emailSubject">Email Subject</Label>
                        <Input
                          id="emailSubject"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="emailBody">Email Message</Label>
                        <Textarea
                          id="emailBody"
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          rows={6}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-4">
                      <Label>File Formats</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="pdf"
                            checked={formats.pdf}
                            onCheckedChange={(checked) =>
                              setFormats({ ...formats, pdf: checked as boolean })
                            }
                          />
                          <label htmlFor="pdf" className="text-sm font-medium">
                            PDF (Recommended)
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="excel"
                            checked={formats.excel}
                            onCheckedChange={(checked) =>
                              setFormats({ ...formats, excel: checked as boolean })
                            }
                          />
                          <label htmlFor="excel" className="text-sm font-medium">
                            Excel Spreadsheet
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="csv"
                            checked={formats.csv}
                            onCheckedChange={(checked) =>
                              setFormats({ ...formats, csv: checked as boolean })
                            }
                          />
                          <label htmlFor="csv" className="text-sm font-medium">
                            CSV File
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-4">
                      <Checkbox
                        id="signature"
                        checked={requireSignature}
                        onCheckedChange={(checked) => setRequireSignature(checked as boolean)}
                      />
                      <label htmlFor="signature" className="text-sm font-medium">
                        Require Electronic Signature
                      </label>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Review & Send</CardTitle>
                <CardDescription>Confirm details before sending</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Purchase Order</span>
                    <span className="font-medium">{purchaseOrder?.poNumber}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Supplier</span>
                    <span className="font-medium">{supplier?.name || "Not selected"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Total Amount</span>
                    <span className="font-medium">
                      ${purchaseOrder?.totalAmount?.toLocaleString() || "0.00"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Primary Email</span>
                    <span className="font-medium">{primaryEmail || "Not set"}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">CC Recipients</span>
                    <span className="font-medium">{ccEmails.length} emails</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Template</span>
                    <span className="font-medium">
                      {templates.find((t: any) => t.id === selectedTemplate)?.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-muted-foreground">Delivery Method</span>
                    <span className="font-medium capitalize">{deliveryMethod}</span>
                  </div>
                  {deliveryMethod === "email" && (
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">Formats</span>
                      <div className="flex gap-2">
                        {formats.pdf && <Badge variant="secondary">PDF</Badge>}
                        {formats.excel && <Badge variant="secondary">Excel</Badge>}
                        {formats.csv && <Badge variant="secondary">CSV</Badge>}
                      </div>
                    </div>
                  )}
                  {requireSignature && (
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-sm text-muted-foreground">E-Signature</span>
                      <Badge variant="default">Required</Badge>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Important Notes
                      </p>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                        <li>• Email delivery includes read receipt tracking</li>
                        <li>• Automatic reminders will be sent after 48 hours if not acknowledged</li>
                        <li>• All communications are logged for audit purposes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sendMutation.isPending}>
            {sendMutation.isPending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Purchase Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}