import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Code, 
  Eye, 
  Save, 
  Plus, 
  Copy, 
  Trash2, 
  FileText,
  Settings,
  Palette,
  Mail,
  Edit,
  Check,
  X,
  ChevronRight,
  FileCode,
  History,
  Download,
  Upload,
  RefreshCw,
  Layers,
  Type,
  Image,
  Link
} from "lucide-react";

interface Template {
  id: string;
  templateName: string;
  templateCode: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  showLogo: boolean;
  showFooter: boolean;
  showTerms: boolean;
  showSignature: boolean;
  footerText?: string;
  termsAndConditions?: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt?: string;
}

export default function TemplateBuilder() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [activeTab, setActiveTab] = useState("editor");
  const [templateType, setTemplateType] = useState("purchase_order");
  const [isDirty, setIsDirty] = useState(false);

  // Template editor state
  const [editorContent, setEditorContent] = useState({
    templateName: "",
    templateCode: "",
    subject: "",
    htmlContent: "",
    textContent: "",
    primaryColor: "#1e3a8a",
    secondaryColor: "#059669",
    logoUrl: "",
    showLogo: true,
    showFooter: true,
    showTerms: false,
    showSignature: false,
    footerText: "© 2025 Lateral Engineering Limited. All rights reserved.",
    termsAndConditions: "",
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/templates', templateType],
    queryFn: async () => {
      const response = await fetch(`/api/templates/${templateType}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (selectedTemplate?.id) {
        return apiRequest(`/api/templates/${selectedTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } else {
        return apiRequest('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, templateType })
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template saved successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setEditMode(false);
      setIsDirty(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive"
      });
    }
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template deleted"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setSelectedTemplate(null);
    }
  });

  // Clone template mutation
  const cloneMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/templates/${id}/clone`, { method: 'POST' }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template cloned successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
    }
  });

  // Load template for editing
  const loadTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setEditorContent({
      templateName: template.templateName,
      templateCode: template.templateCode,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || "",
      primaryColor: template.primaryColor,
      secondaryColor: template.secondaryColor,
      logoUrl: template.logoUrl || "",
      showLogo: template.showLogo,
      showFooter: template.showFooter,
      showTerms: template.showTerms,
      showSignature: template.showSignature,
      footerText: template.footerText || "",
      termsAndConditions: template.termsAndConditions || "",
    });
    setEditMode(true);
    generatePreview(template.htmlContent);
  };

  // Generate preview
  const generatePreview = (htmlContent: string) => {
    // Replace variables with sample data
    const sampleData = {
      "{{po.number}}": "PO-2025-001",
      "{{po.date}}": new Date().toLocaleDateString(),
      "{{po.totalAmount}}": "5,250.00",
      "{{supplier.name}}": "ABC Steel Supplies",
      "{{supplier.email}}": "supplier@example.com",
      "{{company.name}}": "Lateral Engineering Limited",
      "{{company.email}}": "accounts@lateralengineering.co.nz",
    };

    let preview = htmlContent;
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    setPreviewHtml(preview);
  };

  // Handle content changes
  const handleContentChange = (field: string, value: any) => {
    setEditorContent(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    
    if (field === 'htmlContent') {
      generatePreview(value);
    }
  };

  // Save template
  const handleSave = () => {
    if (!editorContent.templateName || !editorContent.templateCode) {
      toast({
        title: "Validation Error",
        description: "Template name and code are required",
        variant: "destructive"
      });
      return;
    }
    saveMutation.mutate(editorContent);
  };

  // Template variables reference
  const templateVariables = {
    "Purchase Order": [
      "{{po.number}}", "{{po.date}}", "{{po.totalAmount}}", 
      "{{po.currency}}", "{{po.specialInstructions}}"
    ],
    "Supplier": [
      "{{supplier.name}}", "{{supplier.email}}", "{{supplier.phone}}", 
      "{{supplier.address}}", "{{supplier.contactPerson}}"
    ],
    "Company": [
      "{{company.name}}", "{{company.email}}", "{{company.phone}}", 
      "{{company.address}}", "{{company.website}}"
    ],
    "Items": [
      "{{#each po.items}}", "{{this.description}}", "{{this.quantity}}", 
      "{{this.unitPrice}}", "{{this.totalPrice}}", "{{/each}}"
    ],
    "Conditionals": [
      "{{#if condition}}", "{{#section name}}", "{{/if}}", "{{/section}}"
    ]
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Template Builder</h1>
          <p className="text-muted-foreground">
            Create and manage email templates for procurement communications
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={templateType} onValueChange={setTemplateType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="purchase_order">Purchase Orders</SelectItem>
              <SelectItem value="rfq">RFQs</SelectItem>
              <SelectItem value="quote">Quotes</SelectItem>
              <SelectItem value="invoice">Invoices</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => {
            setSelectedTemplate(null);
            setEditorContent({
              templateName: "",
              templateCode: "",
              subject: "",
              htmlContent: "",
              textContent: "",
              primaryColor: "#1e3a8a",
              secondaryColor: "#059669",
              logoUrl: "",
              showLogo: true,
              showFooter: true,
              showTerms: false,
              showSignature: false,
              footerText: "© 2025 Lateral Engineering Limited. All rights reserved.",
              termsAndConditions: "",
            });
            setEditMode(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Template List */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Templates</CardTitle>
              <CardDescription>
                {templates.length} templates available
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[700px]">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Loading...</div>
                ) : templates.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">No templates found</div>
                ) : (
                  <div className="p-2">
                    {templates.map((template: Template) => (
                      <div
                        key={template.id}
                        className={`p-3 rounded-lg cursor-pointer mb-2 transition-colors ${
                          selectedTemplate?.id === template.id 
                            ? 'bg-primary/10 border border-primary' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => loadTemplate(template)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{template.templateName}</h4>
                            <p className="text-sm text-muted-foreground">{template.templateCode}</p>
                          </div>
                          {template.isActive && (
                            <Badge variant="default" className="ml-2">Active</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            v{template.version}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(template.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Template Editor */}
        <div className="col-span-9">
          {editMode ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {selectedTemplate ? `Edit: ${selectedTemplate.templateName}` : 'New Template'}
                  </CardTitle>
                  <div className="flex gap-2">
                    {selectedTemplate && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => cloneMutation.mutate(selectedTemplate.id)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Clone
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this template?')) {
                              deleteMutation.mutate(selectedTemplate.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </>
                    )}
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditMode(false);
                        setIsDirty(false);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleSave}
                      disabled={!isDirty || saveMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="editor">Editor</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>

                  {/* Editor Tab */}
                  <TabsContent value="editor" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="templateName">Template Name</Label>
                        <Input
                          id="templateName"
                          value={editorContent.templateName}
                          onChange={(e) => handleContentChange('templateName', e.target.value)}
                          placeholder="e.g., Standard Purchase Order"
                        />
                      </div>
                      <div>
                        <Label htmlFor="templateCode">Template Code</Label>
                        <Input
                          id="templateCode"
                          value={editorContent.templateCode}
                          onChange={(e) => handleContentChange('templateCode', e.target.value)}
                          placeholder="e.g., STD"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="subject">Email Subject</Label>
                      <Input
                        id="subject"
                        value={editorContent.subject}
                        onChange={(e) => handleContentChange('subject', e.target.value)}
                        placeholder="e.g., Purchase Order {{po.number}} from {{company.name}}"
                      />
                    </div>

                    <div>
                      <Label htmlFor="htmlContent">HTML Content</Label>
                      <Textarea
                        id="htmlContent"
                        value={editorContent.htmlContent}
                        onChange={(e) => handleContentChange('htmlContent', e.target.value)}
                        className="font-mono text-sm h-[400px]"
                        placeholder="Enter HTML template with variables..."
                      />
                    </div>
                  </TabsContent>

                  {/* Settings Tab */}
                  <TabsContent value="settings" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primaryColor">Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="primaryColor"
                            type="color"
                            value={editorContent.primaryColor}
                            onChange={(e) => handleContentChange('primaryColor', e.target.value)}
                            className="w-20"
                          />
                          <Input
                            value={editorContent.primaryColor}
                            onChange={(e) => handleContentChange('primaryColor', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="secondaryColor">Secondary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="secondaryColor"
                            type="color"
                            value={editorContent.secondaryColor}
                            onChange={(e) => handleContentChange('secondaryColor', e.target.value)}
                            className="w-20"
                          />
                          <Input
                            value={editorContent.secondaryColor}
                            onChange={(e) => handleContentChange('secondaryColor', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="logoUrl">Logo URL</Label>
                      <Input
                        id="logoUrl"
                        value={editorContent.logoUrl}
                        onChange={(e) => handleContentChange('logoUrl', e.target.value)}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showLogo">Show Logo</Label>
                        <Switch
                          id="showLogo"
                          checked={editorContent.showLogo}
                          onCheckedChange={(checked) => handleContentChange('showLogo', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showFooter">Show Footer</Label>
                        <Switch
                          id="showFooter"
                          checked={editorContent.showFooter}
                          onCheckedChange={(checked) => handleContentChange('showFooter', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showTerms">Show Terms & Conditions</Label>
                        <Switch
                          id="showTerms"
                          checked={editorContent.showTerms}
                          onCheckedChange={(checked) => handleContentChange('showTerms', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="showSignature">Show Signature Block</Label>
                        <Switch
                          id="showSignature"
                          checked={editorContent.showSignature}
                          onCheckedChange={(checked) => handleContentChange('showSignature', checked)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="footerText">Footer Text</Label>
                      <Textarea
                        id="footerText"
                        value={editorContent.footerText}
                        onChange={(e) => handleContentChange('footerText', e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="termsAndConditions">Terms & Conditions</Label>
                      <Textarea
                        id="termsAndConditions"
                        value={editorContent.termsAndConditions}
                        onChange={(e) => handleContentChange('termsAndConditions', e.target.value)}
                        rows={4}
                      />
                    </div>
                  </TabsContent>

                  {/* Variables Tab */}
                  <TabsContent value="variables">
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Use these variables in your templates. They will be replaced with actual data when sending.
                      </p>
                      {Object.entries(templateVariables).map(([category, vars]) => (
                        <div key={category}>
                          <h4 className="font-medium mb-2">{category}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {vars.map(variable => (
                              <div
                                key={variable}
                                className="flex items-center justify-between p-2 bg-muted rounded-lg"
                              >
                                <code className="text-sm">{variable}</code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    navigator.clipboard.writeText(variable);
                                    toast({
                                      title: "Copied",
                                      description: `${variable} copied to clipboard`
                                    });
                                  }}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Preview Tab */}
                  <TabsContent value="preview">
                    <div className="border rounded-lg bg-white p-4 min-h-[500px]">
                      {previewHtml ? (
                        <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                      ) : (
                        <div className="text-center text-muted-foreground py-20">
                          No preview available. Enter HTML content to see preview.
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-20 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Select or Create a Template</h3>
                <p className="text-muted-foreground">
                  Choose a template from the list or create a new one to get started
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}