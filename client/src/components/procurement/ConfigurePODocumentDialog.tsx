import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ConfigurePODocumentDialogProps {
  open: boolean;
  onClose: () => void;
  purchaseOrderId: number;
  purchaseOrderNumber: string;
  onConfigSaved: () => void;
}

interface GranularOptions {
  showLineItems: boolean;
  showDescriptions: boolean;
  showTotals: boolean;
  showTerms: boolean;
  showDeliveryDetails: boolean;
  showPaymentTerms: boolean;
  showSupplierDetails: boolean;
  showJobDetails: boolean;
  showSignatureLines: boolean;
  showNotes: boolean;
  showGSTBreakdown: boolean;
  showContactInfo: boolean;
}

const defaultGranularOptions: GranularOptions = {
  showLineItems: true,
  showDescriptions: true,
  showTotals: true,
  showTerms: true,
  showDeliveryDetails: true,
  showPaymentTerms: true,
  showSupplierDetails: true,
  showJobDetails: false,
  showSignatureLines: true,
  showNotes: true,
  showGSTBreakdown: true,
  showContactInfo: true,
};

export default function ConfigurePODocumentDialog({
  open,
  onClose,
  purchaseOrderId,
  purchaseOrderNumber,
  onConfigSaved,
}: ConfigurePODocumentDialogProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [granularOptions, setGranularOptions] = useState<GranularOptions>(defaultGranularOptions);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch existing configuration
  const { data: existingConfig } = useQuery({
    queryKey: [`/api/procurement/purchase-orders/${purchaseOrderId}/document-config`],
    enabled: open && !!purchaseOrderId,
  });

  // Fetch available templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/communication-templates?types=PO'],
    enabled: open,
  });

  // Filter for Document category templates
  const documentTemplates = templates.filter((t: any) => t.category === 'Documents');

  // Load existing config or set defaults
  useEffect(() => {
    if (existingConfig) {
      setSelectedTemplate(existingConfig.templateCode);
      setGranularOptions(existingConfig.granularOptions);
    } else if (documentTemplates.length > 0) {
      // Find default template or use first available
      const defaultTemplate = documentTemplates.find((t: any) => t.isDefault) || 
                             documentTemplates.find((t: any) => t.code === 'PO_STANDARD') || 
                             documentTemplates[0];
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.code);
      }
    }
  }, [existingConfig, documentTemplates]);

  // Save configuration mutation
  const saveConfig = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/procurement/purchase-orders/${purchaseOrderId}/document-config`, {
        method: 'PUT',
        body: JSON.stringify({
          templateCode: selectedTemplate,
          granularOptions,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: `Document settings for ${purchaseOrderNumber} have been saved.`,
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/procurement/purchase-orders/${purchaseOrderId}/document-config`] 
      });
      onConfigSaved();
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save document configuration",
      });
    },
  });

  const handleOptionChange = (key: keyof GranularOptions) => {
    setGranularOptions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePreview = () => {
    // Build query string with template and options
    const params = new URLSearchParams({
      templateCode: selectedTemplate,
      ...Object.entries(granularOptions).reduce((acc, [key, value]) => {
        acc[key] = value.toString();
        return acc;
      }, {} as Record<string, string>),
    });

    // Open preview in new tab
    window.open(`/api/procurement/purchase-orders/${purchaseOrderId}/preview?${params}`, '_blank');
  };

  const optionGroups = [
    {
      title: "Content Sections",
      options: [
        { key: "showLineItems" as keyof GranularOptions, label: "Show Line Items" },
        { key: "showDescriptions" as keyof GranularOptions, label: "Show Item Descriptions" },
        { key: "showTotals" as keyof GranularOptions, label: "Show Totals" },
        { key: "showGSTBreakdown" as keyof GranularOptions, label: "Show GST Breakdown" },
      ],
    },
    {
      title: "Terms & Conditions",
      options: [
        { key: "showTerms" as keyof GranularOptions, label: "Show Terms & Conditions" },
        { key: "showPaymentTerms" as keyof GranularOptions, label: "Show Payment Terms" },
        { key: "showDeliveryDetails" as keyof GranularOptions, label: "Show Delivery Details" },
        { key: "showNotes" as keyof GranularOptions, label: "Show Special Notes" },
      ],
    },
    {
      title: "Additional Information",
      options: [
        { key: "showSupplierDetails" as keyof GranularOptions, label: "Show Supplier Details" },
        { key: "showJobDetails" as keyof GranularOptions, label: "Show Job/Project Details" },
        { key: "showContactInfo" as keyof GranularOptions, label: "Show Contact Information" },
        { key: "showSignatureLines" as keyof GranularOptions, label: "Show Signature Lines" },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure PDF Document</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Configure how {purchaseOrderNumber} will be displayed in PDF format. 
            These settings will be saved and used for all future downloads and prints of this PO.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Document Template</Label>
            <Select
              value={selectedTemplate}
              onValueChange={setSelectedTemplate}
              disabled={templatesLoading}
            >
              <SelectTrigger id="template">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {documentTemplates.map((template: any) => (
                  <SelectItem key={template.id} value={template.code}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {template.name}
                      {template.isDefault && (
                        <span className="text-xs text-muted-foreground ml-2">(Default)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground">
                {documentTemplates.find((t: any) => t.code === selectedTemplate)?.description}
              </p>
            )}
          </div>

          <Separator />

          {/* Granular Options */}
          <div className="space-y-4">
            <h4 className="font-medium">Document Options</h4>
            {optionGroups.map((group) => (
              <Card key={group.title}>
                <CardContent className="pt-6">
                  <h5 className="text-sm font-medium mb-4">{group.title}</h5>
                  <div className="space-y-3">
                    {group.options.map((option) => (
                      <div key={option.key} className="flex items-center justify-between">
                        <Label htmlFor={option.key} className="font-normal cursor-pointer">
                          {option.label}
                        </Label>
                        <Switch
                          id={option.key}
                          checked={granularOptions[option.key]}
                          onCheckedChange={() => handleOptionChange(option.key)}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={!selectedTemplate}
            className="mr-auto"
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={() => saveConfig.mutate()}
              disabled={!selectedTemplate || saveConfig.isPending}
            >
              {saveConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}