import { useState, useRef, useEffect } from "react";
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
import { FileText, Plus, Edit, Trash2, Copy, Eye, Download, Upload, GripVertical, Settings, Palette } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface TemplateSection {
  id: string;
  type: "header" | "client_info" | "quote_table" | "terms" | "signature" | "footer" | "custom";
  label: string;
  visible: boolean;
  settings?: any;
}

interface QuoteTemplate {
  id?: number;
  templateName: string;
  templateCode: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  layout: "professional" | "modern" | "classic" | "minimal";
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  sections: TemplateSection[];
  customCss?: string;
  pageSettings: {
    size: "A4" | "Letter" | "Legal";
    orientation: "portrait" | "landscape";
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
}

const DEFAULT_SECTIONS: TemplateSection[] = [
  { id: "header", type: "header", label: "Company Header", visible: true },
  { id: "client", type: "client_info", label: "Client Information", visible: true },
  { id: "quote", type: "quote_table", label: "Quote Details", visible: true },
  { id: "terms", type: "terms", label: "Terms & Conditions", visible: true },
  { id: "signature", type: "signature", label: "Signature Block", visible: true },
  { id: "footer", type: "footer", label: "Footer", visible: true },
];

export default function QuoteTemplates() {
  const { toast } = useToast();
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const [templateForm, setTemplateForm] = useState<QuoteTemplate>({
    templateName: "",
    templateCode: "",
    description: "",
    isDefault: false,
    isActive: true,
    layout: "professional",
    colorScheme: {
      primary: "#2563eb",
      secondary: "#64748b",
      accent: "#f59e0b",
      text: "#1e293b",
      background: "#ffffff",
    },
    sections: DEFAULT_SECTIONS,
    customCss: "",
    pageSettings: {
      size: "A4",
      orientation: "portrait",
      margins: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
      },
    },
  });

  // Fetch quote templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["/api/organization/quote-templates"],
  });

  // Save quote template
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: QuoteTemplate) => {
      if (template.id) {
        await apiRequest(`/api/organization/quote-templates/${template.id}`, {
          method: "PUT",
          body: JSON.stringify(template),
        });
      } else {
        await apiRequest("/api/organization/quote-templates", {
          method: "POST",
          body: JSON.stringify(template),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/quote-templates"] });
      toast({
        title: "Success",
        description: `Template ${templateForm.id ? "updated" : "created"} successfully`,
      });
      setIsEditingTemplate(false);
      resetTemplateForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${templateForm.id ? "update" : "create"} template`,
        variant: "destructive",
      });
    },
  });

  // Delete quote template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/organization/quote-templates/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/quote-templates"] });
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  // Duplicate quote template
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/organization/quote-templates/${id}/duplicate`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/quote-templates"] });
      toast({
        title: "Success",
        description: "Template duplicated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate template",
        variant: "destructive",
      });
    },
  });

  const resetTemplateForm = () => {
    setTemplateForm({
      templateName: "",
      templateCode: "",
      description: "",
      isDefault: false,
      isActive: true,
      layout: "professional",
      colorScheme: {
        primary: "#2563eb",
        secondary: "#64748b",
        accent: "#f59e0b",
        text: "#1e293b",
        background: "#ffffff",
      },
      sections: DEFAULT_SECTIONS,
      customCss: "",
      pageSettings: {
        size: "A4",
        orientation: "portrait",
        margins: {
          top: 20,
          right: 20,
          bottom: 20,
          left: 20,
        },
      },
    });
    setSelectedTemplate(null);
  };

  const handleEditTemplate = (template: QuoteTemplate) => {
    setTemplateForm(template);
    setSelectedTemplate(template);
    setIsEditingTemplate(true);
  };

  const handleSaveTemplate = () => {
    // Basic validation
    if (!templateForm.templateName || !templateForm.templateCode) {
      toast({
        title: "Validation Error",
        description: "Please provide template name and code",
        variant: "destructive",
      });
      return;
    }

    saveTemplateMutation.mutate(templateForm);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const sections = Array.from(templateForm.sections);
    const [reorderedItem] = sections.splice(result.source.index, 1);
    sections.splice(result.destination.index, 0, reorderedItem);

    setTemplateForm({ ...templateForm, sections });
  };

  const toggleSectionVisibility = (sectionId: string) => {
    const sections = templateForm.sections.map(section =>
      section.id === sectionId ? { ...section, visible: !section.visible } : section
    );
    setTemplateForm({ ...templateForm, sections });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Quote Templates</h2>
        <p className="text-muted-foreground mt-1">
          Design and customize professional quote templates with drag-and-drop sections
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Template Library</CardTitle>
              <CardDescription>
                Manage your quote template designs
              </CardDescription>
            </div>
            <Dialog open={isEditingTemplate} onOpenChange={setIsEditingTemplate}>
              <DialogTrigger asChild>
                <Button onClick={() => resetTemplateForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedTemplate ? "Edit" : "Create"} Quote Template</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="templateName">Template Name</Label>
                      <Input
                        id="templateName"
                        value={templateForm.templateName}
                        onChange={(e) => setTemplateForm({ ...templateForm, templateName: e.target.value })}
                        placeholder="Professional Quote"
                      />
                    </div>
                    <div>
                      <Label htmlFor="templateCode">Template Code</Label>
                      <Input
                        id="templateCode"
                        value={templateForm.templateCode}
                        onChange={(e) => setTemplateForm({ ...templateForm, templateCode: e.target.value })}
                        placeholder="PROF-001"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                      placeholder="Professional template with company branding..."
                      rows={2}
                    />
                  </div>

                  {/* Layout & Design */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Layout & Design</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="layout">Layout Style</Label>
                        <Select
                          value={templateForm.layout}
                          onValueChange={(value: any) => setTemplateForm({ ...templateForm, layout: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="modern">Modern</SelectItem>
                            <SelectItem value="classic">Classic</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Color Scheme</Label>
                        <div className="flex gap-2 mt-2">
                          <div className="flex-1">
                            <input
                              type="color"
                              value={templateForm.colorScheme.primary}
                              onChange={(e) => setTemplateForm({
                                ...templateForm,
                                colorScheme: { ...templateForm.colorScheme, primary: e.target.value }
                              })}
                              className="w-full h-10 rounded cursor-pointer"
                              title="Primary Color"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="color"
                              value={templateForm.colorScheme.secondary}
                              onChange={(e) => setTemplateForm({
                                ...templateForm,
                                colorScheme: { ...templateForm.colorScheme, secondary: e.target.value }
                              })}
                              className="w-full h-10 rounded cursor-pointer"
                              title="Secondary Color"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="color"
                              value={templateForm.colorScheme.accent}
                              onChange={(e) => setTemplateForm({
                                ...templateForm,
                                colorScheme: { ...templateForm.colorScheme, accent: e.target.value }
                              })}
                              className="w-full h-10 rounded cursor-pointer"
                              title="Accent Color"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section Management */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Template Sections</h3>
                    <p className="text-sm text-muted-foreground">
                      Drag to reorder sections, toggle visibility as needed
                    </p>
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="sections">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                            {templateForm.sections.map((section, index) => (
                              <Draggable key={section.id} draggableId={section.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`flex items-center justify-between p-3 border rounded-lg ${
                                      snapshot.isDragging ? "bg-muted" : "bg-background"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div {...provided.dragHandleProps}>
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                      <span className="font-medium">{section.label}</span>
                                    </div>
                                    <Switch
                                      checked={section.visible}
                                      onCheckedChange={() => toggleSectionVisibility(section.id)}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>

                  {/* Page Settings */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Page Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pageSize">Page Size</Label>
                        <Select
                          value={templateForm.pageSettings.size}
                          onValueChange={(value: any) => setTemplateForm({
                            ...templateForm,
                            pageSettings: { ...templateForm.pageSettings, size: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A4">A4</SelectItem>
                            <SelectItem value="Letter">Letter</SelectItem>
                            <SelectItem value="Legal">Legal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="orientation">Orientation</Label>
                        <Select
                          value={templateForm.pageSettings.orientation}
                          onValueChange={(value: any) => setTemplateForm({
                            ...templateForm,
                            pageSettings: { ...templateForm.pageSettings, orientation: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="portrait">Portrait</SelectItem>
                            <SelectItem value="landscape">Landscape</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Status Settings */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isDefault"
                        checked={templateForm.isDefault}
                        onCheckedChange={(checked) => setTemplateForm({ ...templateForm, isDefault: checked })}
                      />
                      <Label htmlFor="isDefault">Set as default template</Label>
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
          {loadingTemplates ? (
            <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No quote templates created yet. Click "Create Template" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Layout</TableHead>
                  <TableHead>Sections</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template: QuoteTemplate) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.templateName}</div>
                        {template.isDefault && (
                          <span className="text-xs text-primary">Default</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-1 py-0.5 rounded">
                        {template.templateCode}
                      </code>
                    </TableCell>
                    <TableCell className="capitalize">{template.layout}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {template.sections.filter(s => s.visible).length} / {template.sections.length} visible
                      </span>
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
                          onClick={() => setShowPreview(true)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
        </CardContent>
      </Card>
    </div>
  );
}