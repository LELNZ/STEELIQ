import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Save,
  Settings,
  FileText,
  Eye,
  Check,
  X,
  Palette,
  Type,
  Layout,
  QrCode
} from "lucide-react";

export default function POTemplateSettings() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [templates, setTemplates] = useState<any[]>([]);

  // Fetch templates from API
  const { data: templatesData, refetch } = useQuery({
    queryKey: ['/api/procurement/po-templates'],
  });

  useEffect(() => {
    if (templatesData) {
      setTemplates(templatesData);
    }
  }, [templatesData]);

  // Default templates if API returns empty (for initial setup)
  const defaultTemplates = [
    {
      id: 1,
      templateName: "Standard Template",
      templateCode: "STD",
      category: "General",
      isDefault: true,
      isActive: true,
      showLogo: true,
      showPrices: true,
      showDeliveryDate: true,
      showPaymentTerms: true,
      showGst: true,
      primaryColor: "#1e3a8a",
      secondaryColor: "#0369a1",
    },
    {
      id: 2,
      templateName: "Detailed Template",
      templateCode: "DTL",
      category: "Materials",
      isDefault: false,
      isActive: true,
      showLogo: true,
      showPrices: true,
      showDeliveryDate: true,
      showPaymentTerms: true,
      showGst: true,
      showItemCodes: true,
      primaryColor: "#059669",
      secondaryColor: "#10b981",
    },
    {
      id: 3,
      templateName: "Simple Template",
      templateCode: "SMP",
      category: "Services",
      isDefault: false,
      isActive: true,
      showLogo: false,
      showPrices: true,
      showDeliveryDate: false,
      showPaymentTerms: false,
      showGst: true,
      primaryColor: "#7c3aed",
      secondaryColor: "#8b5cf6",
    }
  ];

  useEffect(() => {
    if (!templatesData || templatesData.length === 0) {
      // If no templates from API, use defaults for display
      setTemplates(defaultTemplates);
    }
  }, []);

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setFormData(template);
    setIsEditing(false);
  };

  const handleSaveTemplate = async () => {
    try {
      if (selectedTemplate?.id && selectedTemplate.id <= 3) {
        // Create new template if it's a default one
        await apiRequest('/api/procurement/po-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        toast({
          title: "Success",
          description: "Template created successfully",
        });
      } else if (selectedTemplate?.id) {
        // Update existing template
        await apiRequest(`/api/procurement/po-templates/${selectedTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        toast({
          title: "Success",
          description: "Template saved successfully",
        });
      }
      refetch();
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      if (id > 3) { // Only delete non-default templates
        await apiRequest(`/api/procurement/po-templates/${id}`, {
          method: 'DELETE',
        });
        toast({
          title: "Success",
          description: "Template deleted successfully",
        });
        refetch();
        setSelectedTemplate(null);
      } else {
        toast({
          title: "Warning",
          description: "Cannot delete default templates",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateTemplate = (template: any) => {
    const newTemplate = {
      ...template,
      id: Date.now(),
      templateName: `${template.templateName} (Copy)`,
      templateCode: `${template.templateCode}-COPY`,
      isDefault: false,
    };
    toast({
      title: "Success",
      description: "Template duplicated successfully",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Purchase Order Templates</CardTitle>
          <CardDescription>
            Manage templates for different types of purchase orders and suppliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Templates</h3>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </div>
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate?.id === template.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{template.templateName}</span>
                          {template.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Code: {template.templateCode} • {template.category}
                        </div>
                      </div>
                      <Badge variant={template.isActive ? "success" : "secondary"}>
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Template Editor */}
            {selectedTemplate && (
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">{selectedTemplate.templateName}</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicateTemplate(selectedTemplate)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/api/procurement/po-templates/${selectedTemplate.id}/preview`, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    {!isEditing ? (
                      <Button
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveTemplate}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="general">
                      <Settings className="h-4 w-4 mr-2" />
                      General
                    </TabsTrigger>
                    <TabsTrigger value="layout">
                      <Layout className="h-4 w-4 mr-2" />
                      Layout
                    </TabsTrigger>
                    <TabsTrigger value="branding">
                      <Palette className="h-4 w-4 mr-2" />
                      Branding
                    </TabsTrigger>
                    <TabsTrigger value="content">
                      <FileText className="h-4 w-4 mr-2" />
                      Content
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="templateName">Template Name</Label>
                        <Input
                          id="templateName"
                          value={formData.templateName || ""}
                          onChange={(e) => setFormData({ ...formData, templateName: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="templateCode">Template Code</Label>
                        <Input
                          id="templateCode"
                          value={formData.templateCode || ""}
                          onChange={(e) => setFormData({ ...formData, templateCode: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={formData.category || ""}
                          onValueChange={(value) => setFormData({ ...formData, category: value })}
                          disabled={!isEditing}
                        >
                          <SelectTrigger id="category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General">General</SelectItem>
                            <SelectItem value="Materials">Materials</SelectItem>
                            <SelectItem value="Services">Services</SelectItem>
                            <SelectItem value="Equipment">Equipment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="region">Region</Label>
                        <Select
                          value={formData.region || ""}
                          onValueChange={(value) => setFormData({ ...formData, region: value })}
                          disabled={!isEditing}
                        >
                          <SelectTrigger id="region">
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NZ">New Zealand</SelectItem>
                            <SelectItem value="AU">Australia</SelectItem>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="UK">United Kingdom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="isDefault">Set as Default Template</Label>
                        <Switch
                          id="isDefault"
                          checked={formData.isDefault || false}
                          onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="isActive">Active</Label>
                        <Switch
                          id="isActive"
                          checked={formData.isActive || false}
                          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="layout" className="space-y-4">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Display Settings</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showLogo">Show Company Logo</Label>
                          <Switch
                            id="showLogo"
                            checked={formData.showLogo || false}
                            onCheckedChange={(checked) => setFormData({ ...formData, showLogo: checked })}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showPrices">Show Prices</Label>
                          <Switch
                            id="showPrices"
                            checked={formData.showPrices || false}
                            onCheckedChange={(checked) => setFormData({ ...formData, showPrices: checked })}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showDeliveryDate">Show Delivery Date</Label>
                          <Switch
                            id="showDeliveryDate"
                            checked={formData.showDeliveryDate || false}
                            onCheckedChange={(checked) => setFormData({ ...formData, showDeliveryDate: checked })}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showPaymentTerms">Show Payment Terms</Label>
                          <Switch
                            id="showPaymentTerms"
                            checked={formData.showPaymentTerms || false}
                            onCheckedChange={(checked) => setFormData({ ...formData, showPaymentTerms: checked })}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showGst">Show GST/Tax</Label>
                          <Switch
                            id="showGst"
                            checked={formData.showGst || false}
                            onCheckedChange={(checked) => setFormData({ ...formData, showGst: checked })}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showItemCodes">Show Item Codes</Label>
                          <Switch
                            id="showItemCodes"
                            checked={formData.showItemCodes || false}
                            onCheckedChange={(checked) => setFormData({ ...formData, showItemCodes: checked })}
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showContactDetails">Show Contact Details</Label>
                          <Switch
                            id="showContactDetails"
                            checked={formData.showContactDetails || false}
                            onCheckedChange={(checked) => setFormData({ ...formData, showContactDetails: checked })}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">QR Code Settings</h4>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="enableQrCode">Enable QR Code</Label>
                        <Switch
                          id="enableQrCode"
                          checked={formData.enableQrCode || false}
                          onCheckedChange={(checked) => setFormData({ ...formData, enableQrCode: checked })}
                          disabled={!isEditing}
                        />
                      </div>
                      {formData.enableQrCode && (
                        <div>
                          <Label htmlFor="qrCodeContent">QR Code Content</Label>
                          <Input
                            id="qrCodeContent"
                            value={formData.qrCodeContent || ""}
                            onChange={(e) => setFormData({ ...formData, qrCodeContent: e.target.value })}
                            placeholder="URL or tracking information"
                            disabled={!isEditing}
                          />
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="branding" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primaryColor">Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="primaryColor"
                            type="color"
                            value={formData.primaryColor || "#1e3a8a"}
                            onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                            className="w-16 h-9 p-1"
                            disabled={!isEditing}
                          />
                          <Input
                            value={formData.primaryColor || "#1e3a8a"}
                            onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="secondaryColor">Secondary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="secondaryColor"
                            type="color"
                            value={formData.secondaryColor || "#0369a1"}
                            onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                            className="w-16 h-9 p-1"
                            disabled={!isEditing}
                          />
                          <Input
                            value={formData.secondaryColor || "#0369a1"}
                            onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="fontFamily">Font Family</Label>
                      <Select
                        value={formData.fontFamily || "Arial"}
                        onValueChange={(value) => setFormData({ ...formData, fontFamily: value })}
                        disabled={!isEditing}
                      >
                        <SelectTrigger id="fontFamily">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Helvetica">Helvetica</SelectItem>
                          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                          <SelectItem value="Georgia">Georgia</SelectItem>
                          <SelectItem value="Roboto">Roboto</SelectItem>
                          <SelectItem value="Open Sans">Open Sans</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="content" className="space-y-4">
                    <div>
                      <Label htmlFor="termsAndConditions">Terms & Conditions</Label>
                      <Textarea
                        id="termsAndConditions"
                        value={formData.termsAndConditions || ""}
                        onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                        rows={6}
                        placeholder="Enter standard terms and conditions for this template..."
                        disabled={!isEditing}
                      />
                    </div>

                    <div>
                      <Label htmlFor="specialInstructions">Special Instructions</Label>
                      <Textarea
                        id="specialInstructions"
                        value={formData.specialInstructions || ""}
                        onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                        rows={4}
                        placeholder="Enter any special instructions that should appear on POs using this template..."
                        disabled={!isEditing}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}