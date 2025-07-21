import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FileText, Plus, Edit, Trash2, Copy, Download, Upload, Shield, CheckCircle, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TermsTemplate {
  id?: number;
  templateName: string;
  templateCode: string;
  category: "payment" | "warranty" | "delivery" | "general" | "liability" | "custom";
  version: string;
  effectiveDate: string;
  content: string;
  isDefault: boolean;
  isActive: boolean;
  industrySpecific: boolean;
  tags?: string[];
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

const TEMPLATE_CATEGORIES = [
  { value: "payment", label: "Payment Terms", icon: "$" },
  { value: "warranty", label: "Warranty & Guarantee", icon: "✓" },
  { value: "delivery", label: "Delivery & Installation", icon: "🚚" },
  { value: "general", label: "General Terms", icon: "📄" },
  { value: "liability", label: "Liability & Insurance", icon: "⚠️" },
  { value: "custom", label: "Custom Terms", icon: "✏️" },
];

export default function TermsConditions() {
  const { toast } = useToast();
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TermsTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const [templateForm, setTemplateForm] = useState<TermsTemplate>({
    templateName: "",
    templateCode: "",
    category: "general",
    version: "1.0",
    effectiveDate: new Date().toISOString().split("T")[0],
    content: "",
    isDefault: false,
    isActive: true,
    industrySpecific: true,
    tags: [],
  });

  // Fetch terms templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["/api/organization/terms-templates"],
  });

  // Save terms template
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: TermsTemplate) => {
      if (template.id) {
        await apiRequest(`/api/organization/terms-templates/${template.id}`, {
          method: "PUT",
          body: JSON.stringify(template),
        });
      } else {
        await apiRequest("/api/organization/terms-templates", {
          method: "POST",
          body: JSON.stringify(template),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/terms-templates"] });
      toast({
        title: "Success",
        description: `Terms template ${templateForm.id ? "updated" : "created"} successfully`,
      });
      setIsEditingTemplate(false);
      resetTemplateForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${templateForm.id ? "update" : "create"} terms template`,
        variant: "destructive",
      });
    },
  });

  // Delete terms template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/organization/terms-templates/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/terms-templates"] });
      toast({
        title: "Success",
        description: "Terms template deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete terms template",
        variant: "destructive",
      });
    },
  });

  // Duplicate terms template
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/organization/terms-templates/${id}/duplicate`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/terms-templates"] });
      toast({
        title: "Success",
        description: "Terms template duplicated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate terms template",
        variant: "destructive",
      });
    },
  });

  const resetTemplateForm = () => {
    setTemplateForm({
      templateName: "",
      templateCode: "",
      category: "general",
      version: "1.0",
      effectiveDate: new Date().toISOString().split("T")[0],
      content: "",
      isDefault: false,
      isActive: true,
      industrySpecific: true,
      tags: [],
    });
    setSelectedTemplate(null);
  };

  const handleEditTemplate = (template: TermsTemplate) => {
    setTemplateForm(template);
    setSelectedTemplate(template);
    setIsEditingTemplate(true);
  };

  const handleSaveTemplate = () => {
    // Basic validation
    if (!templateForm.templateName || !templateForm.templateCode || !templateForm.content) {
      toast({
        title: "Validation Error",
        description: "Please provide template name, code, and content",
        variant: "destructive",
      });
      return;
    }

    saveTemplateMutation.mutate(templateForm);
  };

  const filteredTemplates = selectedCategory === "all" 
    ? templates 
    : templates.filter((t: TermsTemplate) => t.category === selectedCategory);

  const getCategoryIcon = (category: string) => {
    const cat = TEMPLATE_CATEGORIES.find(c => c.value === category);
    return cat?.icon || "📄";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Terms & Conditions</h2>
        <p className="text-muted-foreground mt-1">
          Manage terms and conditions library for quotes and contracts
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Terms Library</CardTitle>
              <CardDescription>
                Pre-approved terms and conditions templates
              </CardDescription>
            </div>
            <Dialog open={isEditingTemplate} onOpenChange={setIsEditingTemplate}>
              <DialogTrigger asChild>
                <Button onClick={() => resetTemplateForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Terms Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedTemplate ? "Edit" : "Add"} Terms Template</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="templateName">Template Name</Label>
                      <Input
                        id="templateName"
                        value={templateForm.templateName}
                        onChange={(e) => setTemplateForm({ ...templateForm, templateName: e.target.value })}
                        placeholder="Standard Payment Terms"
                      />
                    </div>
                    <div>
                      <Label htmlFor="templateCode">Template Code</Label>
                      <Input
                        id="templateCode"
                        value={templateForm.templateCode}
                        onChange={(e) => setTemplateForm({ ...templateForm, templateCode: e.target.value })}
                        placeholder="PAY-001"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={templateForm.category}
                        onValueChange={(value: any) => setTemplateForm({ ...templateForm, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.icon} {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="version">Version</Label>
                        <Input
                          id="version"
                          value={templateForm.version}
                          onChange={(e) => setTemplateForm({ ...templateForm, version: e.target.value })}
                          placeholder="1.0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="effectiveDate">Effective Date</Label>
                        <Input
                          id="effectiveDate"
                          type="date"
                          value={templateForm.effectiveDate}
                          onChange={(e) => setTemplateForm({ ...templateForm, effectiveDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="content">Terms Content</Label>
                    <Textarea
                      id="content"
                      value={templateForm.content}
                      onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                      placeholder="Enter the terms and conditions content..."
                      rows={15}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={templateForm.tags?.join(", ") || ""}
                      onChange={(e) => {
                        const tags = e.target.value.split(",").map(tag => tag.trim()).filter(tag => tag);
                        setTemplateForm({ ...templateForm, tags });
                      }}
                      placeholder="steel fabrication, commercial, standard"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="industrySpecific"
                          checked={templateForm.industrySpecific}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, industrySpecific: checked })}
                        />
                        <Label htmlFor="industrySpecific">Steel Industry Specific</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isDefault"
                          checked={templateForm.isDefault}
                          onCheckedChange={(checked) => setTemplateForm({ ...templateForm, isDefault: checked })}
                        />
                        <Label htmlFor="isDefault">Default for Category</Label>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={templateForm.isActive}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, isActive: checked })}
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditingTemplate(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTemplate} disabled={saveTemplateMutation.isPending}>
                    {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Templates</TabsTrigger>
              {TEMPLATE_CATEGORIES.map(cat => (
                <TabsTrigger key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory}>
              {loadingTemplates ? (
                <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No terms templates in this category. Click "Add Terms Template" to create one.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTemplates.map((template: TermsTemplate) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{template.templateName}</div>
                            <code className="text-xs text-muted-foreground">{template.templateCode}</code>
                            {template.isDefault && (
                              <span className="text-xs text-primary ml-2">Default</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            {getCategoryIcon(template.category)}
                            {TEMPLATE_CATEGORIES.find(c => c.value === template.category)?.label}
                          </span>
                        </TableCell>
                        <TableCell>v{template.version}</TableCell>
                        <TableCell>{new Date(template.effectiveDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {template.tags?.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="text-xs bg-muted px-2 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                            {template.tags && template.tags.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{template.tags.length - 3}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${template.isActive ? "text-green-600" : "text-muted-foreground"}`}>
                            {template.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => template.id && duplicateTemplateMutation.mutate(template.id)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{template.templateName}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => template.id && deleteTemplateMutation.mutate(template.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Standard Terms Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Industry Standard Terms</CardTitle>
          <CardDescription>
            Common terms and conditions for steel fabrication projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Payment Terms (30 Days Net)</h4>
              <p className="text-sm text-muted-foreground">
                Payment is due within 30 days of invoice date. A 1.5% monthly finance charge 
                applies to overdue accounts. Progress payments may be required for projects 
                exceeding $50,000.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Material Warranty</h4>
              <p className="text-sm text-muted-foreground">
                All steel materials conform to AS/NZS standards. Fabrication warranty covers 
                workmanship defects for 12 months. Coating warranties as per manufacturer 
                specifications.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Delivery & Site Access</h4>
              <p className="text-sm text-muted-foreground">
                Client to ensure site access for delivery vehicles. Crane/forklift offloading 
                by client unless specified. Delivery dates subject to weather and site conditions.
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Variations & Changes</h4>
              <p className="text-sm text-muted-foreground">
                Design changes after fabrication commencement incur additional costs. 
                All variations require written approval. Rush orders subject to 25% surcharge.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}