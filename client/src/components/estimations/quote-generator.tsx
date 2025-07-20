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
  Info,
  Download,
  Printer
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  QuoteFortune500Banner, 
  QuoteComparisonTable, 
  QuoteMetrics 
} from "./quote-fortune500-features";

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

// Fortune 500-standard quote preview HTML generator
function generateQuotePreviewHTML({ estimation, settings, template, quoteNumber }: any) {
  const subtotal = parseFloat(estimation.totalCost || '0');
  const taxRate = 0.15; // 15% GST
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  // Professional HTML template matching STRUMIS/Procore standards
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 20px; 
          color: #333;
          line-height: 1.6;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: start;
          border-bottom: 2px solid #0066cc;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .company-info h1 { 
          color: #0066cc; 
          margin: 0;
          font-size: 28px;
        }
        .company-info p { 
          margin: 5px 0;
          color: #666;
        }
        .quote-info { 
          text-align: right;
        }
        .quote-info h2 {
          color: #0066cc;
          margin: 0;
          font-size: 24px;
        }
        .quote-info p { 
          margin: 5px 0;
          font-weight: bold;
        }
        .client-info {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .client-info h3 {
          margin: 0 0 10px 0;
          color: #0066cc;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th {
          background: #0066cc;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }
        td {
          padding: 10px 12px;
          border-bottom: 1px solid #e0e0e0;
        }
        tr:hover {
          background: #f9f9f9;
        }
        .category-header {
          background: #f0f0f0;
          font-weight: bold;
          color: #0066cc;
        }
        .total-row {
          font-weight: bold;
          background: #f5f5f5;
        }
        .grand-total {
          font-size: 1.2em;
          color: #0066cc;
          background: #e6f2ff;
        }
        .terms {
          margin-top: 30px;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
        }
        .terms h3 {
          color: #0066cc;
          margin-top: 0;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          color: #666;
          font-size: 0.9em;
        }
        .validity-box {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .acceptance-section {
          margin-top: 40px;
          padding: 20px;
          border: 2px dashed #ccc;
          border-radius: 8px;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <h1>Lateral Engineering Limited</h1>
          <p>123 Industrial Way, Auckland, New Zealand</p>
          <p>Phone: +64 9 123 4567 | Email: info@lateralengineering.co.nz</p>
          <p>GST: 123-456-789</p>
        </div>
        <div class="quote-info">
          <h2>QUOTATION</h2>
          <p>Quote No: ${quoteNumber}</p>
          <p>Date: ${format(new Date(), 'dd/MM/yyyy')}</p>
          <p>Valid Until: ${format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy')}</p>
        </div>
      </div>

      <div class="client-info">
        <h3>Prepared For:</h3>
        <p><strong>${estimation.project?.clientName || 'Client'}</strong></p>
        <p>${estimation.project?.clientEmail || ''}</p>
        <p>Project: ${estimation.project?.name || 'Project'}</p>
      </div>

      <div class="validity-box">
        <strong>⚠️ Quote Validity:</strong> This quotation is valid for 30 days from the date of issue. 
        Prices are subject to change after this period.
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 50%">Description</th>
            <th style="width: 15%; text-align: center">Quantity</th>
            <th style="width: 15%; text-align: right">Unit Price</th>
            <th style="width: 20%; text-align: right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${generateItemRows(estimation, settings)}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="3" style="text-align: right">Subtotal:</td>
            <td style="text-align: right">$${subtotal.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr class="total-row">
            <td colspan="3" style="text-align: right">GST (15%):</td>
            <td style="text-align: right">$${taxAmount.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
          <tr class="grand-total">
            <td colspan="3" style="text-align: right">Total (incl. GST):</td>
            <td style="text-align: right">$${totalAmount.toLocaleString('en-NZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tfoot>
      </table>

      ${settings.showPaymentTerms ? `
      <div class="terms">
        <h3>Terms & Conditions</h3>
        <ul>
          <li><strong>Payment Terms:</strong> Net 30 days from invoice date</li>
          <li><strong>Delivery:</strong> 4-6 weeks from confirmation of order</li>
          <li><strong>Warranty:</strong> 12 months on workmanship</li>
          <li><strong>Variations:</strong> Any changes to scope will be quoted separately</li>
          <li><strong>Standards:</strong> All work complies with AS/NZS standards</li>
        </ul>
      </div>
      ` : ''}

      ${settings.includeAcceptanceSection ? `
      <div class="acceptance-section">
        <h3>Quote Acceptance</h3>
        <p>To accept this quotation, please sign below and return via email.</p>
        <div style="margin-top: 30px;">
          <div style="display: inline-block; width: 45%;">
            <p>_________________________________</p>
            <p>Authorized Signature</p>
          </div>
          <div style="display: inline-block; width: 45%; margin-left: 8%;">
            <p>_________________________________</p>
            <p>Date</p>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="footer">
        <p>Thank you for the opportunity to quote on your project.</p>
        <p>© ${new Date().getFullYear()} Lateral Engineering Limited. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

// Generate item rows for the quote table
function generateItemRows(estimation: any, settings: any) {
  let rows = '';
  
  // Materials
  if (estimation.materials?.length > 0) {
    rows += '<tr class="category-header"><td colspan="4">MATERIALS</td></tr>';
    estimation.materials.forEach((item: any) => {
      rows += `
        <tr>
          <td>${item.description || item.material?.name || 'Material'}</td>
          <td style="text-align: center">${item.quantity || 0} ${item.unit || 'EA'}</td>
          <td style="text-align: right">${settings.showUnitPrices ? `$${(item.unitCost || 0).toFixed(2)}` : '-'}</td>
          <td style="text-align: right">$${(item.totalCost || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    });
  }

  // Labor
  if (estimation.labor?.length > 0) {
    rows += '<tr class="category-header"><td colspan="4">LABOR</td></tr>';
    estimation.labor.forEach((item: any) => {
      rows += `
        <tr>
          <td>${item.description || 'Labor'}</td>
          <td style="text-align: center">${item.hours || 0} hrs</td>
          <td style="text-align: right">${settings.showUnitPrices ? `$${(item.rate || 0).toFixed(2)}/hr` : '-'}</td>
          <td style="text-align: right">$${(item.totalCost || 0).toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    });
  }

  // Add other categories similarly...
  
  return rows;
}

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

  // PDF Download function
  const downloadQuotePDF = async (quoteId: number) => {
    try {
      const response = await fetch(`/api/estimations/${estimation.id}/quotes/${quoteId}/pdf`, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quote-${estimation.project.projectNumber || estimation.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Quote PDF downloaded successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

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
      project: estimation.project || {},
      // Include financial calculations
      subtotal: estimation.subtotal || 0,
      totalCost: estimation.totalCost || 0,
      overheads: estimation.overheads || { percentage: 15, amount: 0 },
      margin: estimation.margin || { percentage: 20, amount: 0 }
    };

    // Generate comprehensive preview HTML matching Fortune 500 standards
    const previewHtml = generateQuotePreviewHTML({
      estimation,
      settings,
      template: selectedTemplate,
      quoteNumber: `Q-${estimation.project?.projectNumber || estimation.id}-V${(quotes.length + 1)}`
    });

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

        {/* Fortune 500 Features Banner */}
        <div className="px-6">
          <QuoteFortune500Banner />
        </div>

        {/* Quote Metrics */}
        <div className="px-6">
          <QuoteMetrics estimation={estimation} />
        </div>

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
                    <div className="flex gap-2">
                      {selectedQuoteId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadQuotePDF(selectedQuoteId)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.print()}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {selectedQuoteId ? (
                    <iframe
                      srcDoc={quotes.find((q: any) => q.id === selectedQuoteId)?.previewHtml || ''}
                      className="w-full h-[600px] border-0"
                      title="Quote Preview"
                    />
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-lg font-medium mb-2">No Quote Selected</p>
                      <p>Generate a quote first, then select it to preview</p>
                    </div>
                  )}
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
                          onClick={() => {
                            setSelectedQuoteId(quote.id);
                            setActiveTab('preview'); // Automatically switch to preview tab
                          }}
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