import { useState, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
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
import { useToast } from '@/hooks/use-toast';
import {
  Code2, Eye, Save, Palette, Variable, FileText,
  Copy, Plus, ChevronRight, Settings, Play, History,
  Download, Upload, RefreshCw, Search, BookOpen
} from 'lucide-react';

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
  orderNumber: 'PO-2025-001',
  orderDate: '19/09/2025',
  dueDate: '26/09/2025',
  rfqNumber: 'RFQ-2025-042',
  quoteNumber: 'Q-2025-123',
  invoiceNumber: 'INV-2025-456',
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
  const [htmlContent, setHtmlContent] = useState(template?.htmlTemplate || '');
  const [subjectContent, setSubjectContent] = useState(template?.subjectTemplate || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('company');
  const [previewHtml, setPreviewHtml] = useState('');

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

  // Process template with sample data for preview
  const processTemplate = useCallback((templateStr: string, data: any) => {
    let processed = templateStr;
    
    // Simple variable replacement for demo (in production, use a proper template engine like Handlebars)
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Handle nested objects
        Object.keys(value).forEach(nestedKey => {
          const regex = new RegExp(`{{${key}\\.${nestedKey}}}`, 'g');
          processed = processed.replace(regex, value[nestedKey]);
        });
      } else if (!Array.isArray(value)) {
        // Handle simple values
        const regex = new RegExp(`{{${key}}}`, 'g');
        processed = processed.replace(regex, value);
      }
    });
    
    // Handle loops (simplified for demo)
    const loopRegex = /{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g;
    processed = processed.replace(loopRegex, (match, arrayName, loopContent) => {
      const items = data[arrayName];
      if (!items || !Array.isArray(items)) return '';
      
      return items.map(item => {
        let itemContent = loopContent;
        Object.keys(item).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          itemContent = itemContent.replace(regex, item[key]);
        });
        return itemContent;
      }).join('');
    });
    
    return processed;
  }, []);

  // Update preview when content changes
  useEffect(() => {
    const processed = processTemplate(htmlContent, sampleData);
    setPreviewHtml(processed);
  }, [htmlContent, processTemplate]);

  const handleSave = () => {
    onSave({
      ...template,
      htmlTemplate: htmlContent,
      subjectTemplate: subjectContent,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-lg font-semibold">Template Editor</h2>
          <p className="text-sm text-muted-foreground">
            {template?.name || 'New Template'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Variable Palette */}
        <div className="w-80 border-r bg-muted/20 p-4 overflow-auto">
          <div className="space-y-4">
            <div>
              <Label>Search Variables</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(templateVariables).map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-2">
                {templateVariables[selectedCategory as keyof typeof templateVariables]
                  .filter(v => 
                    searchTerm === '' || 
                    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    v.description.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((variable) => (
                    <Card
                      key={variable.name}
                      className="p-3 cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => insertVariable(variable.name)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <code className="text-xs font-mono text-primary">
                            {`{{${variable.name}}}`}
                          </code>
                          <p className="text-xs text-muted-foreground mt-1">
                            {variable.description}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            Example: {variable.example}
                          </p>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Editor and Preview */}
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="mx-4 mt-4 w-fit">
              <TabsTrigger value="editor">
                <Code2 className="h-4 w-4 mr-2" />
                Editor
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
                        />
                      </div>
                      <div>
                        <Label>Template Code</Label>
                        <Input
                          value={template?.code || ''}
                          placeholder="e.g., PO_STANDARD"
                          className="mt-1"
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
                      />
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