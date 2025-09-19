import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import Editor from '@monaco-editor/react';
import Handlebars from 'handlebars';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/hooks/use-toast';
import {
  Code2, Eye, Save, Palette, Variable, FileText,
  Copy, Plus, ChevronRight, Settings, Play, History,
  Download, Upload, RefreshCw, Search, BookOpen, Brush, Code, Loader2
} from 'lucide-react';

// Lazy load the visual builder for better performance
const VisualTemplateBuilder = lazy(() => 
  import('./VisualTemplateBuilder').then(module => ({ 
    default: module.VisualTemplateBuilder 
  }))
);

// Define available template variables by category
const templateVariables = {
  company: [
    { name: 'company.name', description: 'Company Name', example: 'Lateral Engineering Limited' },
    { name: 'company.address', description: 'Company Address', example: '123 Main Street' },
    { name: 'company.city', description: 'Company City', example: 'Auckland' },
    { name: 'company.phone', description: 'Company Phone', example: '+64 9 123 4567' },
    { name: 'company.email', description: 'Company Email', example: 'info@lateral.co.nz' },
    { name: 'company.website', description: 'Company Website', example: 'www.lateral.co.nz' },
    { name: 'company.abn', description: 'Company ABN/GST Number', example: '123-456-789' },
    { name: 'company.logo', description: 'Company Logo URL', example: '/assets/logo.png' }
  ],
  document: [
    { name: 'orderNumber', description: 'Order/Document Number', example: 'PO-2025-001' },
    { name: 'orderDate', description: 'Order Date', example: '19/09/2025' },
    { name: 'dueDate', description: 'Due Date', example: '26/09/2025' },
    { name: 'reference', description: 'Reference Number', example: 'REF-12345' },
    { name: 'status', description: 'Document Status', example: 'Pending' },
    { name: 'terms', description: 'Terms and Conditions', example: 'Standard terms apply...' },
    { name: 'paymentTerms', description: 'Payment Terms', example: 'Net 30 days' },
    { name: 'deliveryTerms', description: 'Delivery Terms', example: 'FOB Auckland' }
  ],
  supplier: [
    { name: 'supplier.name', description: 'Supplier Name', example: 'Steel Supplies Ltd' },
    { name: 'supplier.address', description: 'Supplier Address', example: '456 Industrial Ave' },
    { name: 'supplier.city', description: 'Supplier City', example: 'Wellington' },
    { name: 'supplier.contact', description: 'Contact Person', example: 'John Smith' },
    { name: 'supplier.phone', description: 'Supplier Phone', example: '+64 4 987 6543' },
    { name: 'supplier.email', description: 'Supplier Email', example: 'contact@steelsupplies.co.nz' }
  ],
  client: [
    { name: 'client.name', description: 'Client Name', example: 'ABC Construction' },
    { name: 'client.address', description: 'Client Address', example: '789 Builder St' },
    { name: 'client.city', description: 'Client City', example: 'Christchurch' },
    { name: 'client.contact', description: 'Contact Person', example: 'Jane Doe' },
    { name: 'client.phone', description: 'Client Phone', example: '+64 3 555 0123' },
    { name: 'client.email', description: 'Client Email', example: 'jane@abcconstruction.co.nz' }
  ],
  financial: [
    { name: 'subtotal', description: 'Subtotal Amount', example: '$10,000.00' },
    { name: 'tax', description: 'Tax Amount', example: '$1,500.00' },
    { name: 'taxRate', description: 'Tax Rate', example: '15' },
    { name: 'shipping', description: 'Shipping Cost', example: '$250.00' },
    { name: 'total', description: 'Total Amount', example: '$11,750.00' },
    { name: 'currency', description: 'Currency', example: 'NZD' },
    { name: 'exchangeRate', description: 'Exchange Rate', example: '1.00' }
  ],
  job: [
    { name: 'job.number', description: 'Job Number', example: 'JOB-2025-042' },
    { name: 'job.name', description: 'Job/Project Name', example: 'Bridge Construction' },
    { name: 'job.location', description: 'Job Location', example: 'Auckland Harbor' },
    { name: 'job.manager', description: 'Project Manager', example: 'Mike Johnson' },
    { name: 'job.startDate', description: 'Start Date', example: '01/09/2025' },
    { name: 'job.endDate', description: 'End Date', example: '31/12/2025' }
  ],
  delivery: [
    { name: 'delivery.name', description: 'Delivery Name/Company', example: 'Site Office' },
    { name: 'delivery.address', description: 'Delivery Address', example: '100 Construction Site Rd' },
    { name: 'delivery.city', description: 'Delivery City', example: 'Auckland' },
    { name: 'delivery.date', description: 'Delivery Date', example: '25/09/2025' },
    { name: 'delivery.method', description: 'Delivery Method', example: 'Truck' },
    { name: 'delivery.instructions', description: 'Special Instructions', example: 'Call before delivery' }
  ],
  loops: [
    { name: '#each lineItems', description: 'Loop through line items', example: '{{#each lineItems}}...{{/each}}' },
    { name: 'itemNumber', description: 'Item Number (in loop)', example: '001' },
    { name: 'description', description: 'Item Description (in loop)', example: 'Steel Beam 200x100x6' },
    { name: 'quantity', description: 'Item Quantity (in loop)', example: '10' },
    { name: 'unit', description: 'Unit of Measure (in loop)', example: 'EA' },
    { name: 'unitPrice', description: 'Unit Price (in loop)', example: '$500.00' },
    { name: 'total', description: 'Line Total (in loop)', example: '$5,000.00' }
  ],
  conditions: [
    { name: '#if', description: 'Conditional block', example: '{{#if tax}}...{{/if}}' },
    { name: '#unless', description: 'Negative conditional', example: '{{#unless paid}}...{{/unless}}' },
    { name: '#eq', description: 'Equality check', example: '{{#eq status "approved"}}...{{/eq}}' }
  ]
};

// Sample data for preview
const sampleData = {
  company: {
    name: 'Lateral Engineering Limited',
    address: '123 Main Street',
    city: 'Auckland',
    state: 'Auckland',
    zip: '1010',
    phone: '+64 9 123 4567',
    email: 'accounts@lateralengineering.co.nz',
    website: 'www.lateralengineering.co.nz',
    abn: '123-456-789',
    logo: '/assets/logo.png'
  },
  supplier: {
    name: 'Steel Supplies Ltd',
    address: '456 Industrial Avenue',
    city: 'Wellington',
    state: 'Wellington',
    zip: '6011',
    contact: 'John Smith',
    phone: '+64 4 987 6543',
    email: 'contact@steelsupplies.co.nz'
  },
  client: {
    name: 'ABC Construction',
    address: '789 Builder Street',
    city: 'Christchurch',
    state: 'Canterbury',
    zip: '8011',
    contact: 'Jane Doe',
    phone: '+64 3 555 0123',
    email: 'jane@abcconstruction.co.nz'
  },
  job: {
    number: 'JOB-2025-042',
    name: 'Bridge Construction Project',
    location: 'Auckland Harbor',
    manager: 'Mike Johnson',
    startDate: '01/09/2025',
    endDate: '31/12/2025'
  },
  delivery: {
    name: 'Site Office',
    address: '100 Construction Site Road',
    city: 'Auckland',
    state: 'Auckland',
    zip: '1010',
    date: '25/09/2025',
    method: 'Truck',
    instructions: 'Please call site manager before delivery'
  },
  recipient: {
    name: 'Steel Supplies Ltd',
    address: '456 Industrial Avenue',
    city: 'Wellington',
    state: 'Wellington',
    zip: '6011',
    contact: 'John Smith',
    phone: '+64 4 987 6543'
  },
  orderNumber: 'PO-2025-001',
  orderDate: '19/09/2025',
  dueDate: '26/09/2025',
  rfqNumber: 'RFQ-2025-042',
  quoteNumber: 'Q-2025-123',
  invoiceNumber: 'INV-2025-456',
  documentNumber: 'PO-2025-001',
  documentTitle: 'PURCHASE ORDER',
  date: '19/09/2025',
  validUntil: '26/09/2025',
  reference: 'REF-12345',
  status: 'Pending Approval',
  subtotal: 10000.00,
  tax: 1500.00,
  taxRate: 15,
  shipping: 250.00,
  total: 11750.00,
  currency: 'NZD',
  terms: 'Standard terms and conditions apply. All prices exclude GST unless otherwise stated.',
  paymentTerms: 'Net 30 days from invoice date',
  deliveryTerms: 'FOB Auckland - Buyer arranges shipping',
  buttonText: 'View Full Document',
  lineItems: [
    {
      itemNumber: '001',
      description: 'Steel Beam 200x100x6mm Grade 300',
      quantity: 10,
      unit: 'EA',
      unitPrice: 500.00,
      total: 5000.00
    },
    {
      itemNumber: '002',
      description: 'Steel Plate 10mm Grade 250',
      quantity: 5,
      unit: 'M2',
      unitPrice: 750.00,
      total: 3750.00
    },
    {
      itemNumber: '003',
      description: 'Welding Consumables',
      quantity: 25,
      unit: 'KG',
      unitPrice: 50.00,
      total: 1250.00
    }
  ]
};

interface TemplateEditorProps {
  template: any;
  onSave: (template: any) => void;
  onCancel: () => void;
}

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('editor');
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>(template?.editorMode || 'code');
  const [htmlContent, setHtmlContent] = useState(template?.htmlTemplate || '');
  const [subjectContent, setSubjectContent] = useState(template?.subjectTemplate || '');
  const [visualProjectData, setVisualProjectData] = useState(template?.visualProjectJson || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('company');
  const [previewHtml, setPreviewHtml] = useState('');

  // Handle save
  const handleSave = () => {
    onSave({
      ...template,
      htmlTemplate: htmlContent,
      subjectTemplate: subjectContent,
      visualProjectJson: visualProjectData,
      editorMode: editorMode
    });
    toast({
      title: 'Template saved',
      description: 'Your template has been saved successfully.'
    });
  };

  // Handle visual editor changes
  const handleVisualChange = useCallback((html: string, projectData: any) => {
    setHtmlContent(html);
    setVisualProjectData(projectData);
  }, []);

  // Get all variables as flat array for visual builder
  const getAllVariables = () => {
    const allVars: string[] = [];
    Object.values(templateVariables).forEach(category => {
      category.forEach(variable => {
        if (!variable.name.startsWith('#')) {
          allVars.push(variable.name);
        }
      });
    });
    return allVars;
  };

  // Insert variable at cursor position
  const insertVariable = useCallback((variable: string) => {
    // In a real implementation, this would insert at cursor position in Monaco
    const insertion = `{{${variable}}}`;
    setHtmlContent(prev => prev + insertion);
    toast({
      description: `Inserted variable: ${insertion}`,
      duration: 2000
    });
  }, [toast]);

  // Process template with sample data for preview using Handlebars
  const processTemplate = useCallback((templateStr: string, data: any) => {
    try {
      const compiledTemplate = Handlebars.compile(templateStr);
      return compiledTemplate(data);
    } catch (error) {
      console.error('Template processing error:', error);
      return `<div class="text-red-500">Error processing template: ${error.message}</div>`;
    }
  }, []);

  // Update preview when HTML content changes
  useEffect(() => {
    const processed = processTemplate(htmlContent, sampleData);
    setPreviewHtml(processed);
  }, [htmlContent, processTemplate]);

  // Filter variables based on search
  const filteredVariables = templateVariables[selectedCategory].filter(
    variable => 
      variable.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Template Editor</h2>
            <Badge variant="outline">
              {template?.type || 'Template'}
            </Badge>
            {/* Editor Mode Toggle */}
            <ToggleGroup 
              type="single" 
              value={editorMode} 
              onValueChange={(value) => value && setEditorMode(value as 'visual' | 'code')}
              className="border rounded-md"
            >
              <ToggleGroupItem value="visual" aria-label="Visual Editor">
                <Brush className="h-4 w-4 mr-2" />
                Visual Builder
              </ToggleGroupItem>
              <ToggleGroupItem value="code" aria-label="Code Editor">
                <Code className="h-4 w-4 mr-2" />
                HTML Code
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Variables Panel - Only show in code mode */}
        {editorMode === 'code' && (
          <div className="w-72 border-r bg-background flex flex-col">
            <div className="p-3 border-b">
              <h3 className="text-sm font-semibold mb-2">Template Variables</h3>
              <Input
                placeholder="Search variables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8"
                prefix={<Search className="h-3 w-3" />}
              />
            </div>
            <div className="p-3 border-b">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(templateVariables).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {filteredVariables.map((variable) => (
                  <div
                    key={variable.name}
                    className="group flex items-start gap-2 p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => insertVariable(variable.name)}
                  >
                    <Variable className="h-3 w-3 mt-1 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-primary">{`{{${variable.name}}}`}</p>
                      <p className="text-xs text-muted-foreground">{variable.description}</p>
                      <p className="text-xs text-muted-foreground italic">e.g. {variable.example}</p>
                    </div>
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start rounded-none border-b bg-background px-4">
              <TabsTrigger value="editor">
                {editorMode === 'visual' ? (
                  <>
                    <Brush className="h-4 w-4 mr-2" />
                    Visual Editor
                  </>
                ) : (
                  <>
                    <Code2 className="h-4 w-4 mr-2" />
                    HTML Editor
                  </>
                )}
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 p-4">
              <TabsContent value="editor" className="h-full mt-0">
                {editorMode === 'visual' ? (
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Loading visual editor...</span>
                    </div>
                  }>
                    <VisualTemplateBuilder
                      initialHtml={htmlContent}
                      initialProject={visualProjectData}
                      variables={getAllVariables()}
                      onChange={handleVisualChange}
                      templateType={template?.type || 'document'}
                    />
                  </Suspense>
                ) : (
                  <div className="space-y-4 h-full">
                    <div>
                      <Label>Subject Template (for emails)</Label>
                      <Input
                        value={subjectContent}
                        onChange={(e) => setSubjectContent(e.target.value)}
                        placeholder="e.g., Purchase Order #{{orderNumber}} - {{company.name}}"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label>HTML Template</Label>
                      <div className="mt-1 h-[calc(100vh-300px)] border rounded-md">
                        <Editor
                          height="100%"
                          defaultLanguage="html"
                          value={htmlContent}
                          onChange={(value) => setHtmlContent(value || '')}
                          theme="vs-dark"
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            wordWrap: 'on',
                            automaticLayout: true,
                            formatOnPaste: true,
                            formatOnType: true
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="preview" className="h-full mt-0">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Template Preview</CardTitle>
                    <CardDescription>
                      Preview with sample data - actual values will be replaced when generating documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg p-6 bg-white h-[calc(100vh-350px)] overflow-auto">
                      <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="h-full mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Template Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Template Name</Label>
                        <Input
                          value={template?.name || ''}
                          placeholder="e.g., Standard Purchase Order"
                          className="mt-1"
                          disabled
                        />
                      </div>
                      <div>
                        <Label>Template Code</Label>
                        <Input
                          value={template?.code || ''}
                          placeholder="e.g., PO_STANDARD"
                          className="mt-1"
                          disabled
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={template?.description || ''}
                        placeholder="Describe the purpose and use of this template..."
                        className="mt-1"
                        rows={3}
                        disabled
                      />
                    </div>
                    <div>
                      <Label>Default Editor Mode</Label>
                      <Select value={editorMode} onValueChange={(value) => setEditorMode(value as 'visual' | 'code')}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visual">Visual Builder (Drag & Drop)</SelectItem>
                          <SelectItem value="code">HTML Code Editor</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose the default editor mode for this template
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}