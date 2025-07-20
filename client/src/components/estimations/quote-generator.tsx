import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Eye, 
  Settings, 
  Send, 
  Mail,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface QuoteGeneratorProps {
  estimation: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface QuoteSettings {
  // Display Options
  displayFormat: 'summary' | 'detailed' | 'grouped' | 'phased';
  showCostBreakdown: boolean;
  showMarkups: boolean;
  showSubtotals: boolean;
  showTaxes: boolean;
  showPaymentTerms: boolean;
  showValidityPeriod: boolean;
  
  // Grouping Options
  groupByCategory: boolean;
  groupByPhase: boolean;
  consolidateSimilarItems: boolean;
  
  // Pricing Display
  pricingDisplay: 'itemized' | 'bundled' | 'lump_sum';
  showUnitPrices: boolean;
  showQuantities: boolean;
  showDiscounts: boolean;
  
  // Professional Elements
  includeCompanyLogo: boolean;
  includeTermsAndConditions: boolean;
  includeAcceptanceSection: boolean;
  includeProjectTimeline: boolean;
  
  // Client Preferences
  clientLanguage: 'english' | 'spanish' | 'french';
  currency: 'NZD' | 'AUD' | 'USD';
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY';
  
  // Email Settings
  emailSubject: string;
  emailMessage: string;
  ccEmails: string[];
  attachPDF: boolean;
  requestReadReceipt: boolean;
}

const defaultSettings: QuoteSettings = {
  displayFormat: 'grouped',
  showCostBreakdown: true,
  showMarkups: false,
  showSubtotals: true,
  showTaxes: true,
  showPaymentTerms: true,
  showValidityPeriod: true,
  groupByCategory: true,
  groupByPhase: false,
  consolidateSimilarItems: true,
  pricingDisplay: 'itemized',
  showUnitPrices: true,
  showQuantities: true,
  showDiscounts: true,
  includeCompanyLogo: true,
  includeTermsAndConditions: true,
  includeAcceptanceSection: true,
  includeProjectTimeline: false,
  clientLanguage: 'english',
  currency: 'NZD',
  dateFormat: 'DD/MM/YYYY',
  emailSubject: 'Quote for {{PROJECT_NAME}} - {{QUOTE_NUMBER}}',
  emailMessage: `Dear {{CLIENT_NAME}},

Please find attached our quote for {{PROJECT_NAME}}.

The quote is valid for {{VALIDITY_DAYS}} days from the date of issue.

We look forward to working with you on this project.

Best regards,
{{COMPANY_NAME}}`,
  ccEmails: [],
  attachPDF: true,
  requestReadReceipt: true
};

export default function QuoteGenerator({ estimation, open, onOpenChange }: QuoteGeneratorProps) {
  const [settings, setSettings] = useState<QuoteSettings>(defaultSettings);
  const [selectedTemplate, setSelectedTemplate] = useState('professional');
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('template');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing quotes for this estimation
  const { data: quotes = [] } = useQuery({
    queryKey: [`/api/estimations/${estimation.id}/quotes`],
    enabled: open
  });

  const generateQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/estimations/${estimation.id}/generate-quote`, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/estimations/${estimation.id}/quotes`] });
      toast({
        title: "Quote Generated",
        description: `Quote ${data.quoteNumber} has been saved successfully.`,
      });
      setSelectedQuoteId(data.id);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate quote",
        variant: "destructive",
      });
    }
  });

  const sendQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const { quoteId, ...emailData } = data;
      return apiRequest('POST', `/api/quotes/${quoteId}/send`, emailData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/estimations'] });
      queryClient.invalidateQueries({ queryKey: [`/api/estimations/${estimation.id}/quotes`] });
      toast({
        title: "Quote Sent",
        description: `Quote has been sent to ${estimation.project?.clientName || 'the client'}`,
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send quote",
        variant: "destructive",
      });
    }
  });

  const templates = {
    professional: {
      name: "Professional Services",
      description: "Detailed breakdown with professional formatting",
      features: ["Item descriptions", "Subtotals by category", "Terms & conditions"]
    },
    executive: {
      name: "Executive Summary",
      description: "High-level overview for C-suite executives",
      features: ["Summary view", "Key metrics", "Investment highlights"]
    },
    detailed: {
      name: "Technical Detailed",
      description: "Complete technical specifications and breakdowns",
      features: ["Full specifications", "Material lists", "Labor breakdowns"]
    },
    construction: {
      name: "Construction Industry",
      description: "Standard construction quote format",
      features: ["Phase breakdown", "Progress milestones", "Retention details"]
    }
  };

  const handleGenerateQuote = () => {
    // Generate quote content based on estimation data
    const content = {
      materials: estimation.materials || [],
      labor: estimation.labor || [],
      equipment: estimation.equipment || [],
      consumables: estimation.consumables || [],
      coatings: estimation.coatings || [],
      subcontractors: estimation.subcontractors || [],
      project: estimation.project || {}
    };

    // Generate preview HTML (simplified version)
    const previewHtml = `
      <div style="font-family: Arial, sans-serif;">
        <h1>Quote for ${estimation.project?.name || 'Project'}</h1>
        <p>Client: ${estimation.project?.clientName || 'Client'}</p>
        <p>Date: ${format(new Date(), 'dd/MM/yyyy')}</p>
        <p>Total: $${estimation.totalCost || '0'}</p>
      </div>
    `;

    const quoteData = {
      settings,
      template: selectedTemplate,
      content,
      previewHtml,
      displayOptions: {
        displayFormat: settings.displayFormat,
        pricingDisplay: settings.pricingDisplay,
        showCostBreakdown: settings.showCostBreakdown,
        showMarkups: settings.showMarkups,
        showSubtotals: settings.showSubtotals,
        showTaxes: settings.showTaxes,
        showPaymentTerms: settings.showPaymentTerms,
        showValidityPeriod: settings.showValidityPeriod
      }
    };

    generateQuoteMutation.mutate(quoteData);
  };

  const handleSendQuote = () => {
    if (!selectedQuoteId) {
      toast({
        title: "No Quote Selected",
        description: "Please generate a quote first before sending.",
        variant: "destructive",
      });
      return;
    }

    const emailData = {
      recipientEmail: estimation.project?.clientEmail || '',
      emailSubject: settings.emailSubject
        .replace('{{PROJECT_NAME}}', estimation.project?.name || '')
        .replace('{{QUOTE_NUMBER}}', quotes.find((q: any) => q.id === selectedQuoteId)?.quoteNumber || ''),
      message: settings.emailMessage
        .replace('{{CLIENT_NAME}}', estimation.project?.clientName || '')
        .replace('{{PROJECT_NAME}}', estimation.project?.name || '')
        .replace('{{VALIDITY_DAYS}}', '30')
        .replace('{{COMPANY_NAME}}', 'Lateral Engineering Limited'),
      ccEmails: settings.ccEmails
    };

    sendQuoteMutation.mutate({ ...emailData, quoteId: selectedQuoteId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Professional Quote
          </DialogTitle>
          <DialogDescription>
            Configure how your quote will be presented to {estimation.project.clientName}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="display">Display Options</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="send">Send</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="template" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(templates).map(([key, template]) => (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all ${
                      selectedTemplate === key ? 'ring-2 ring-primary' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedTemplate(key)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {template.name}
                        {selectedTemplate === key && <CheckCircle className="h-5 w-5 text-primary" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                      <ul className="text-sm space-y-1">
                        {template.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="display" className="space-y-6">
              {/* Display Format */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Display Format</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayFormat">Quote Layout</Label>
                    <Select 
                      value={settings.displayFormat} 
                      onValueChange={(value: any) => setSettings({...settings, displayFormat: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="summary">Summary Only</SelectItem>
                        <SelectItem value="detailed">Detailed Line Items</SelectItem>
                        <SelectItem value="grouped">Grouped by Category</SelectItem>
                        <SelectItem value="phased">Phased Breakdown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pricingDisplay">Pricing Display</Label>
                    <Select 
                      value={settings.pricingDisplay} 
                      onValueChange={(value: any) => setSettings({...settings, pricingDisplay: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="itemized">Itemized Pricing</SelectItem>
                        <SelectItem value="bundled">Bundled Categories</SelectItem>
                        <SelectItem value="lump_sum">Lump Sum Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Visibility Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Visibility Options
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Control what information is visible to the client. Hide sensitive data like markups and internal costs.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showCostBreakdown">Show Cost Breakdown</Label>
                    <Switch 
                      id="showCostBreakdown"
                      checked={settings.showCostBreakdown}
                      onCheckedChange={(checked) => setSettings({...settings, showCostBreakdown: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showMarkups" className="flex items-center gap-2">
                      Show Markups
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Reveals internal margin percentages to client
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Switch 
                      id="showMarkups"
                      checked={settings.showMarkups}
                      onCheckedChange={(checked) => setSettings({...settings, showMarkups: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showSubtotals">Show Subtotals</Label>
                    <Switch 
                      id="showSubtotals"
                      checked={settings.showSubtotals}
                      onCheckedChange={(checked) => setSettings({...settings, showSubtotals: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showUnitPrices">Show Unit Prices</Label>
                    <Switch 
                      id="showUnitPrices"
                      checked={settings.showUnitPrices}
                      onCheckedChange={(checked) => setSettings({...settings, showUnitPrices: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showQuantities">Show Quantities</Label>
                    <Switch 
                      id="showQuantities"
                      checked={settings.showQuantities}
                      onCheckedChange={(checked) => setSettings({...settings, showQuantities: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showDiscounts">Show Discounts</Label>
                    <Switch 
                      id="showDiscounts"
                      checked={settings.showDiscounts}
                      onCheckedChange={(checked) => setSettings({...settings, showDiscounts: checked})}
                    />
                  </div>
                </div>
              </div>

              {/* Professional Elements */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Professional Elements</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="includeCompanyLogo">Company Logo</Label>
                    <Switch 
                      id="includeCompanyLogo"
                      checked={settings.includeCompanyLogo}
                      onCheckedChange={(checked) => setSettings({...settings, includeCompanyLogo: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="includeTermsAndConditions">Terms & Conditions</Label>
                    <Switch 
                      id="includeTermsAndConditions"
                      checked={settings.includeTermsAndConditions}
                      onCheckedChange={(checked) => setSettings({...settings, includeTermsAndConditions: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="includeAcceptanceSection">Acceptance Section</Label>
                    <Switch 
                      id="includeAcceptanceSection"
                      checked={settings.includeAcceptanceSection}
                      onCheckedChange={(checked) => setSettings({...settings, includeAcceptanceSection: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="includeProjectTimeline">Project Timeline</Label>
                    <Switch 
                      id="includeProjectTimeline"
                      checked={settings.includeProjectTimeline}
                      onCheckedChange={(checked) => setSettings({...settings, includeProjectTimeline: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showPaymentTerms">Payment Terms</Label>
                    <Switch 
                      id="showPaymentTerms"
                      checked={settings.showPaymentTerms}
                      onCheckedChange={(checked) => setSettings({...settings, showPaymentTerms: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showValidityPeriod">Validity Period</Label>
                    <Switch 
                      id="showValidityPeriod"
                      checked={settings.showValidityPeriod}
                      onCheckedChange={(checked) => setSettings({...settings, showValidityPeriod: checked})}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="h-full">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Quote Preview</span>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Full Preview
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg p-6 bg-white">
                    <div className="text-center mb-6">
                      {settings.includeCompanyLogo && (
                        <div className="h-16 w-48 mx-auto bg-gray-200 rounded mb-4" />
                      )}
                      <h1 className="text-2xl font-bold">QUOTATION</h1>
                      <p className="text-muted-foreground">Q-{estimation.project.projectNumber || estimation.id}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                        <h3 className="font-semibold mb-2">To:</h3>
                        <p>{estimation.project.clientName}</p>
                        <p className="text-sm text-muted-foreground">{estimation.project.clientAddress}</p>
                      </div>
                      <div className="text-right">
                        <p><strong>Date:</strong> {format(new Date(), settings.dateFormat === 'DD/MM/YYYY' ? 'dd/MM/yyyy' : 'MM/dd/yyyy')}</p>
                        {settings.showValidityPeriod && (
                          <p><strong>Valid Until:</strong> {format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), settings.dateFormat === 'DD/MM/YYYY' ? 'dd/MM/yyyy' : 'MM/dd/yyyy')}</p>
                        )}
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="font-semibold mb-2">Project: {estimation.project.name}</h3>
                      {estimation.project.description && (
                        <p className="text-sm text-muted-foreground">{estimation.project.description}</p>
                      )}
                    </div>

                    {/* Pricing Display based on settings */}
                    {settings.displayFormat === 'summary' ? (
                      <div className="mb-6">
                        <table className="w-full">
                          <tbody>
                            <tr className="border-b">
                              <td className="py-2">Total Project Cost</td>
                              <td className="text-right font-bold">${estimation.totalCost?.toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="mb-6">
                        <table className="w-full">
                          <thead className="border-b">
                            <tr>
                              <th className="text-left py-2">Description</th>
                              {settings.showQuantities && <th className="text-center">Qty</th>}
                              {settings.showUnitPrices && <th className="text-right">Unit Price</th>}
                              <th className="text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Sample items - would be populated from estimation data */}
                            <tr className="border-b">
                              <td className="py-2">Steel Materials</td>
                              {settings.showQuantities && <td className="text-center">-</td>}
                              {settings.showUnitPrices && <td className="text-right">-</td>}
                              <td className="text-right">${(estimation.materials?.reduce((sum: number, m: any) => sum + m.totalCost, 0) || 0).toLocaleString()}</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2">Labor</td>
                              {settings.showQuantities && <td className="text-center">-</td>}
                              {settings.showUnitPrices && <td className="text-right">-</td>}
                              <td className="text-right">${(estimation.labor?.reduce((sum: number, l: any) => sum + l.totalCost, 0) || 0).toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {settings.showPaymentTerms && (
                      <div className="mb-6">
                        <h3 className="font-semibold mb-2">Payment Terms</h3>
                        <p className="text-sm">Net 30 days from invoice date</p>
                      </div>
                    )}

                    {settings.includeTermsAndConditions && (
                      <div className="mb-6">
                        <h3 className="font-semibold mb-2">Terms & Conditions</h3>
                        <p className="text-xs text-muted-foreground">
                          1. This quote is valid for 30 days from the date of issue<br/>
                          2. Prices exclude GST unless otherwise stated<br/>
                          3. Subject to our standard terms and conditions
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="send" className="space-y-4">
              {/* Quote Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Quote Versions</span>
                    <Button 
                      onClick={handleGenerateQuote}
                      disabled={generateQuoteMutation.isPending}
                      size="sm"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Generate New Quote
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {quotes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>No quotes generated yet</p>
                      <p className="text-sm mt-2">Click "Generate New Quote" to create your first quote</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {quotes.map((quote: any) => (
                        <div 
                          key={quote.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedQuoteId === quote.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedQuoteId(quote.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{quote.quoteNumber}</h4>
                              <p className="text-sm text-muted-foreground">
                                Version {quote.version} • Created {format(new Date(quote.createdAt), 'dd/MM/yyyy HH:mm')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">${quote.totalAmount?.toLocaleString() || '0'}</p>
                              <p className="text-sm text-muted-foreground">{quote.status}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Email Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailTo">To</Label>
                    <Input 
                      id="emailTo"
                      value={estimation.project?.clientEmail || estimation.project?.clientName || ''}
                      disabled
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailSubject">Subject</Label>
                    <Input 
                      id="emailSubject"
                      value={settings.emailSubject
                        .replace('{{PROJECT_NAME}}', estimation.project?.name || '')
                        .replace('{{QUOTE_NUMBER}}', `Q-${estimation.project?.projectNumber || estimation.id}`)}
                      onChange={(e) => setSettings({...settings, emailSubject: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailMessage">Message</Label>
                    <Textarea 
                      id="emailMessage"
                      rows={8}
                      value={settings.emailMessage}
                      onChange={(e) => setSettings({...settings, emailMessage: e.target.value})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="attachPDF">Attach Quote as PDF</Label>
                    <Switch 
                      id="attachPDF"
                      checked={settings.attachPDF}
                      onCheckedChange={(checked) => setSettings({...settings, attachPDF: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="requestReadReceipt">Request Read Receipt</Label>
                    <Switch 
                      id="requestReadReceipt"
                      checked={settings.requestReadReceipt}
                      onCheckedChange={(checked) => setSettings({...settings, requestReadReceipt: checked})}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      Sending this quote will:
                    </h4>
                    <ul className="text-sm space-y-1 text-blue-900">
                      <li>• Update the estimation status to "Sent"</li>
                      <li>• Record timestamp and recipient details</li>
                      <li>• Create an audit trail entry</li>
                      <li>• Start the validity period countdown</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {activeTab === "send" ? (
            <Button 
              onClick={handleSendQuote}
              disabled={sendQuoteMutation.isPending || !selectedQuoteId}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Quote
            </Button>
          ) : (
            <Button 
              onClick={handleGenerateQuote}
              disabled={generateQuoteMutation.isPending}
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Quote
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}