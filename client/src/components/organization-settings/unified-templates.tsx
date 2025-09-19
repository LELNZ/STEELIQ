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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileText, Package, Mail, Receipt, Truck, FileCheck,
  Code, Eye, Save, Plus, Copy, Trash2, Settings,
  Palette, Edit, Check, X, Download, Upload,
  RefreshCw, Layers, Star, Lock, Users
} from "lucide-react";

interface Template {
  id: string;
  code: string;
  name: string;
  type: string;
  category: string;
  subCategory?: string;
  description?: string;
  htmlTemplate: string;
  subjectTemplate?: string;
  isDefault: boolean;
  status: string;
  sections?: any;
  variables?: any;
  defaultOptions?: any;
  theme?: any;
  createdAt: string;
  updatedAt?: string;
}

interface TemplateCategory {
  id: string;
  label: string;
  icon: any;
  types: string[];
  description: string;
}

const templateCategories: TemplateCategory[] = [
  {
    id: "procurement",
    label: "Procurement Documents",
    icon: Package,
    types: ["PO", "RFQ"],
    description: "Purchase orders and request for quotes"
  },
  {
    id: "sales",
    label: "Sales Documents",
    icon: FileText,
    types: ["Quote", "Invoice"],
    description: "Client quotes and invoices"
  },
  {
    id: "shipping",
    label: "Shipping & Receipts",
    icon: Truck,
    types: ["Receipt", "DeliveryNote"],
    description: "Delivery notes and receipt confirmations"
  },
  {
    id: "communication",
    label: "Email Communications",
    icon: Mail,
    types: ["AcceptanceEmail", "RejectionEmail", "FollowUp", "Reminders"],
    description: "Automated emails and notifications"
  }
];

export default function UnifiedTemplates() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("procurement");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

  // Template editor state
  const [editorContent, setEditorContent] = useState<any>({
    name: "",
    code: "",
    description: "",
    htmlTemplate: "",
    subjectTemplate: "",
    sections: {},
    defaultOptions: {},
    theme: {
      primaryColor: "#1e40af",
      secondaryColor: "#64748b",
      fontFamily: "system-ui, sans-serif"
    }
  });

  // Fetch templates for selected category
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/communication-templates', selectedCategory],
    queryFn: async () => {
      const category = templateCategories.find(c => c.id === selectedCategory);
      if (!category) return [];
      
      const response = await fetch(`/api/communication-templates?types=${category.types.join(',')}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = selectedTemplate?.id
        ? `/api/communication-templates/${selectedTemplate.id}`
        : '/api/communication-templates';
      
      return apiRequest(endpoint, {
        method: selectedTemplate?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template saved successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/communication-templates'] });
      setEditMode(false);
    }
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/communication-templates/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/communication-templates'] });
      setSelectedTemplate(null);
    }
  });

  // Set as default mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/communication-templates/${id}/set-default`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template set as default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/communication-templates'] });
    }
  });

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setEditorContent({
      name: template.name,
      code: template.code,
      description: template.description || "",
      htmlTemplate: template.htmlTemplate,
      subjectTemplate: template.subjectTemplate || "",
      sections: template.sections || {},
      defaultOptions: template.defaultOptions || {},
      theme: template.theme || {}
    });
    setActiveTab("details");
  };

  const handleCreateTemplate = () => {
    const category = templateCategories.find(c => c.id === selectedCategory);
    setSelectedTemplate(null);
    setEditorContent({
      name: "",
      code: "",
      description: "",
      type: category?.types[0] || "PO",
      category: "document",
      htmlTemplate: "",
      subjectTemplate: "",
      sections: {},
      defaultOptions: {},
      theme: {
        primaryColor: "#1e40af",
        secondaryColor: "#64748b",
        fontFamily: "system-ui, sans-serif"
      }
    });
    setEditMode(true);
    setActiveTab("editor");
  };

  const handleSaveTemplate = () => {
    saveMutation.mutate(editorContent);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSetDefault = (id: string) => {
    setDefaultMutation.mutate(id);
  };

  const renderTemplateList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Available Templates</h3>
          <p className="text-sm text-muted-foreground">
            {templateCategories.find(c => c.id === selectedCategory)?.description}
          </p>
        </div>
        <Button onClick={handleCreateTemplate} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      <div className="grid gap-4">
        {templates.map((template: Template) => (
          <Card
            key={template.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleSelectTemplate(template)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {template.name}
                    {template.isDefault && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3 w-3" />
                        Default
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {template.description || `Template code: ${template.code}`}
                  </CardDescription>
                </div>
                <Badge variant={template.status === 'published' ? 'success' : 'secondary'}>
                  {template.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {template.type}
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {template.category}
                </span>
                <span className="ml-auto">
                  Updated: {new Date(template.updatedAt || template.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {templates.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No templates found for this category</p>
            <Button onClick={handleCreateTemplate} variant="outline" className="mt-4">
              Create First Template
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderTemplateDetails = () => {
    if (!selectedTemplate) return null;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedTemplate.description || `Template code: ${selectedTemplate.code}`}
            </p>
          </div>
          <div className="flex gap-2">
            {!selectedTemplate.isDefault && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetDefault(selectedTemplate.id)}
              >
                <Star className="h-4 w-4 mr-2" />
                Set as Default
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditMode(true);
                setActiveTab("editor");
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            {!selectedTemplate.isDefault && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteTemplate(selectedTemplate.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Template Code</Label>
                  <p className="font-medium">{selectedTemplate.code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{selectedTemplate.type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Category</Label>
                  <p className="font-medium">{selectedTemplate.category}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant={selectedTemplate.status === 'published' ? 'success' : 'secondary'}>
                    {selectedTemplate.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedTemplate.theme && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Theme Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Primary Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: selectedTemplate.theme.primaryColor }}
                      />
                      <span className="font-mono text-sm">
                        {selectedTemplate.theme.primaryColor}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Secondary Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: selectedTemplate.theme.secondaryColor }}
                      />
                      <span className="font-mono text-sm">
                        {selectedTemplate.theme.secondaryColor}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedTemplate.sections && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selectedTemplate.sections).map(([key, enabled]) => (
                    <div key={key} className="flex items-center gap-2">
                      {enabled ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  const renderTemplateEditor = () => {
    if (!editMode) return null;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {selectedTemplate ? 'Edit Template' : 'Create New Template'}
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditMode(false);
                setActiveTab(selectedTemplate ? "details" : "list");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Template
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={editorContent.name}
                    onChange={(e) => setEditorContent({ ...editorContent, name: e.target.value })}
                    placeholder="e.g., Standard Purchase Order"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Template Code</Label>
                  <Input
                    id="code"
                    value={editorContent.code}
                    onChange={(e) => setEditorContent({ ...editorContent, code: e.target.value })}
                    placeholder="e.g., PO_STANDARD"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editorContent.description}
                  onChange={(e) => setEditorContent({ ...editorContent, description: e.target.value })}
                  placeholder="Describe the template purpose and use case"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Theme Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={editorContent.theme?.primaryColor || '#1e40af'}
                      onChange={(e) => setEditorContent({
                        ...editorContent,
                        theme: { ...editorContent.theme, primaryColor: e.target.value }
                      })}
                      className="w-20"
                    />
                    <Input
                      value={editorContent.theme?.primaryColor || '#1e40af'}
                      onChange={(e) => setEditorContent({
                        ...editorContent,
                        theme: { ...editorContent.theme, primaryColor: e.target.value }
                      })}
                      placeholder="#1e40af"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={editorContent.theme?.secondaryColor || '#64748b'}
                      onChange={(e) => setEditorContent({
                        ...editorContent,
                        theme: { ...editorContent.theme, secondaryColor: e.target.value }
                      })}
                      className="w-20"
                    />
                    <Input
                      value={editorContent.theme?.secondaryColor || '#64748b'}
                      onChange={(e) => setEditorContent({
                        ...editorContent,
                        theme: { ...editorContent.theme, secondaryColor: e.target.value }
                      })}
                      placeholder="#64748b"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Variables</CardTitle>
              <CardDescription>
                Use these variables in your template - they will be replaced with actual values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted rounded-lg">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Company Details</p>
                  <div className="space-y-1">
                    <code className="text-xs block">{'{company_name}'}</code>
                    <code className="text-xs block">{'{company_address}'}</code>
                    <code className="text-xs block">{'{company_email}'}</code>
                    <code className="text-xs block">{'{company_phone}'}</code>
                    <code className="text-xs block">{'{gst_number}'}</code>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Document Info</p>
                  <div className="space-y-1">
                    <code className="text-xs block">{'{document_number}'}</code>
                    <code className="text-xs block">{'{date}'}</code>
                    <code className="text-xs block">{'{due_date}'}</code>
                    <code className="text-xs block">{'{reference}'}</code>
                    <code className="text-xs block">{'{status}'}</code>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Financial</p>
                  <div className="space-y-1">
                    <code className="text-xs block">{'{subtotal}'}</code>
                    <code className="text-xs block">{'{tax_amount}'}</code>
                    <code className="text-xs block">{'{total}'}</code>
                    <code className="text-xs block">{'{currency}'}</code>
                    <code className="text-xs block">{'{payment_terms}'}</code>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Client/Supplier</p>
                  <div className="space-y-1">
                    <code className="text-xs block">{'{client_name}'}</code>
                    <code className="text-xs block">{'{supplier_name}'}</code>
                    <code className="text-xs block">{'{contact_person}'}</code>
                    <code className="text-xs block">{'{contact_email}'}</code>
                    <code className="text-xs block">{'{delivery_address}'}</code>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Job/Project</p>
                  <div className="space-y-1">
                    <code className="text-xs block">{'{job_name}'}</code>
                    <code className="text-xs block">{'{project_name}'}</code>
                    <code className="text-xs block">{'{job_reference}'}</code>
                    <code className="text-xs block">{'{location}'}</code>
                    <code className="text-xs block">{'{description}'}</code>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Line Items</p>
                  <div className="space-y-1">
                    <code className="text-xs block">{'{items_table}'}</code>
                    <code className="text-xs block">{'{item_code}'}</code>
                    <code className="text-xs block">{'{item_description}'}</code>
                    <code className="text-xs block">{'{quantity}'}</code>
                    <code className="text-xs block">{'{unit_price}'}</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">HTML Template</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editorContent.htmlTemplate}
                onChange={(e) => setEditorContent({ ...editorContent, htmlTemplate: e.target.value })}
                placeholder="Enter HTML template code..."
                rows={15}
                className="font-mono text-sm"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Unified Template Management</h2>
        <p className="text-muted-foreground mt-1">
          Manage all document and communication templates from one central location
        </p>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-4">
          {templateCategories.map((category) => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
              <category.icon className="h-4 w-4" />
              <span className="hidden md:inline">{category.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-fit grid-cols-3">
              <TabsTrigger value="list">Templates</TabsTrigger>
              {selectedTemplate && (
                <TabsTrigger value="details">Details</TabsTrigger>
              )}
              {editMode && (
                <TabsTrigger value="editor">Editor</TabsTrigger>
              )}
            </TabsList>

            <div className="mt-6">
              <TabsContent value="list" className="mt-0">
                {renderTemplateList()}
              </TabsContent>
              
              {selectedTemplate && (
                <TabsContent value="details" className="mt-0">
                  {renderTemplateDetails()}
                </TabsContent>
              )}
              
              {editMode && (
                <TabsContent value="editor" className="mt-0">
                  {renderTemplateEditor()}
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewMode} onOpenChange={setPreviewMode}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              Preview of {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full border rounded-md p-4">
            {selectedTemplate ? (
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Template Information</h3>
                  <p className="text-sm"><strong>Name:</strong> {selectedTemplate.name}</p>
                  <p className="text-sm"><strong>Code:</strong> {selectedTemplate.code}</p>
                  <p className="text-sm"><strong>Type:</strong> {selectedTemplate.templateType || selectedTemplate.type}</p>
                  <p className="text-sm"><strong>Category:</strong> {selectedTemplate.category}</p>
                  {selectedTemplate.description && (
                    <p className="text-sm mt-2"><strong>Description:</strong> {selectedTemplate.description}</p>
                  )}
                </div>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Template preview will display here once the HTML template is configured.
                    Use the editor to add your HTML template content with the available variables.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No template selected.</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}