import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PenTool, CheckCircle, AlertCircle, ExternalLink, Upload } from "lucide-react";

interface ESignatureConfig {
  id?: number;
  provider: "built_in" | "docusign" | "adobe_sign";
  isDefault: boolean;
  signatureFieldConfig?: any;
  docusignAccountId?: string;
  docusignClientId?: string;
  docusignClientSecretEncrypted?: string;
  adobeAccountId?: string;
  adobeClientId?: string;
  adobeClientSecretEncrypted?: string;
  webhookUrl?: string;
  isActive: boolean;
}

export default function ESignatures() {
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<string>("built_in");
  const [showDocusignSecret, setShowDocusignSecret] = useState(false);
  const [showAdobeSecret, setShowAdobeSecret] = useState(false);
  
  const [configForm, setConfigForm] = useState<ESignatureConfig>({
    provider: "built_in",
    isDefault: true,
    isActive: true,
    signatureFieldConfig: {
      position: "bottom_right",
      pageNumber: -1, // Last page
      width: 200,
      height: 50,
    },
  });

  // Fetch e-signature configuration
  const { data: signatureConfig, isLoading } = useQuery({
    queryKey: ["/api/organization/esignature-config"],
  });

  // Save e-signature configuration
  const saveConfigMutation = useMutation({
    mutationFn: async (config: ESignatureConfig) => {
      await apiRequest("/api/organization/esignature-config", {
        method: "PUT",
        body: JSON.stringify(config),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/esignature-config"] });
      toast({
        title: "Success",
        description: "E-signature configuration updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update e-signature configuration",
        variant: "destructive",
      });
    },
  });

  const handleSaveConfig = () => {
    // Validation
    if (configForm.provider === "docusign" && (!configForm.docusignAccountId || !configForm.docusignClientId)) {
      toast({
        title: "Validation Error",
        description: "DocuSign account ID and client ID are required",
        variant: "destructive",
      });
      return;
    }

    if (configForm.provider === "adobe_sign" && (!configForm.adobeAccountId || !configForm.adobeClientId)) {
      toast({
        title: "Validation Error",
        description: "Adobe Sign account ID and client ID are required",
        variant: "destructive",
      });
      return;
    }

    saveConfigMutation.mutate(configForm);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">E-Signature Configuration</h2>
        <p className="text-muted-foreground mt-1">
          Set up electronic signature options for quotes and documents
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>E-Signature Provider</CardTitle>
          <CardDescription>
            Choose how clients will sign quotes electronically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={configForm.provider}
            onValueChange={(value: any) => {
              setConfigForm({ ...configForm, provider: value });
              setSelectedProvider(value);
            }}
          >
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="built_in" id="built_in" />
                <div className="flex-1">
                  <Label htmlFor="built_in" className="font-medium cursor-pointer">
                    Built-in Signature Capture
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Simple signature drawing pad integrated into quotes - no external accounts needed
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem value="docusign" id="docusign" />
                <div className="flex-1">
                  <Label htmlFor="docusign" className="font-medium cursor-pointer">
                    DocuSign Integration
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Industry-leading e-signature platform with advanced features and compliance
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem value="adobe_sign" id="adobe_sign" />
                <div className="flex-1">
                  <Label htmlFor="adobe_sign" className="font-medium cursor-pointer">
                    Adobe Sign Integration
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enterprise e-signature solution with workflow automation
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Built-in Signature Settings */}
      {configForm.provider === "built_in" && (
        <Card>
          <CardHeader>
            <CardTitle>Built-in Signature Settings</CardTitle>
            <CardDescription>
              Configure the signature capture experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Signature Position on Document</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                value={configForm.signatureFieldConfig?.position || "bottom_right"}
                onChange={(e) => setConfigForm({
                  ...configForm,
                  signatureFieldConfig: {
                    ...configForm.signatureFieldConfig,
                    position: e.target.value,
                  }
                })}
              >
                <option value="bottom_left">Bottom Left</option>
                <option value="bottom_center">Bottom Center</option>
                <option value="bottom_right">Bottom Right</option>
                <option value="custom">Custom Position</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="signatureWidth">Signature Width (px)</Label>
                <Input
                  id="signatureWidth"
                  type="number"
                  min="100"
                  max="400"
                  value={configForm.signatureFieldConfig?.width || 200}
                  onChange={(e) => setConfigForm({
                    ...configForm,
                    signatureFieldConfig: {
                      ...configForm.signatureFieldConfig,
                      width: parseInt(e.target.value) || 200,
                    }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="signatureHeight">Signature Height (px)</Label>
                <Input
                  id="signatureHeight"
                  type="number"
                  min="30"
                  max="100"
                  value={configForm.signatureFieldConfig?.height || 50}
                  onChange={(e) => setConfigForm({
                    ...configForm,
                    signatureFieldConfig: {
                      ...configForm.signatureFieldConfig,
                      height: parseInt(e.target.value) || 50,
                    }
                  })}
                />
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Built-in signatures are legally binding in most jurisdictions. We capture IP address, 
                timestamp, and device information for audit trails.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* DocuSign Settings */}
      {configForm.provider === "docusign" && (
        <Card>
          <CardHeader>
            <CardTitle>DocuSign Configuration</CardTitle>
            <CardDescription>
              Connect your DocuSign account for advanced e-signature features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You'll need a DocuSign developer account. Visit{" "}
                <a href="https://developers.docusign.com" target="_blank" rel="noopener noreferrer" className="underline">
                  developers.docusign.com
                </a>{" "}
                to get started.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="docusignAccountId">DocuSign Account ID</Label>
              <Input
                id="docusignAccountId"
                value={configForm.docusignAccountId || ""}
                onChange={(e) => setConfigForm({ ...configForm, docusignAccountId: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>

            <div>
              <Label htmlFor="docusignClientId">Integration Key (Client ID)</Label>
              <Input
                id="docusignClientId"
                value={configForm.docusignClientId || ""}
                onChange={(e) => setConfigForm({ ...configForm, docusignClientId: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>

            <div>
              <Label htmlFor="docusignClientSecret">Secret Key</Label>
              <div className="flex gap-2">
                <Input
                  id="docusignClientSecret"
                  type={showDocusignSecret ? "text" : "password"}
                  value={configForm.docusignClientSecretEncrypted || ""}
                  onChange={(e) => setConfigForm({ ...configForm, docusignClientSecretEncrypted: e.target.value })}
                  placeholder="Enter your DocuSign secret key"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDocusignSecret(!showDocusignSecret)}
                >
                  {showDocusignSecret ? "Hide" : "Show"}
                </Button>
              </div>
            </div>

            <div className="pt-4">
              <h4 className="font-medium mb-2">Features Available:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Multiple signers and signing order</li>
                <li>• Custom branding on signing pages</li>
                <li>• Automated reminders and expiration</li>
                <li>• Mobile-optimized signing experience</li>
                <li>• Comprehensive audit trails</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adobe Sign Settings */}
      {configForm.provider === "adobe_sign" && (
        <Card>
          <CardHeader>
            <CardTitle>Adobe Sign Configuration</CardTitle>
            <CardDescription>
              Connect your Adobe Sign account for enterprise e-signatures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Adobe Sign requires an Adobe Document Cloud subscription. Visit{" "}
                <a href="https://acrobat.adobe.com/us/en/sign/developer-form.html" target="_blank" rel="noopener noreferrer" className="underline">
                  Adobe Sign Developer Portal
                </a>{" "}
                for API access.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="adobeAccountId">Adobe Account ID</Label>
              <Input
                id="adobeAccountId"
                value={configForm.adobeAccountId || ""}
                onChange={(e) => setConfigForm({ ...configForm, adobeAccountId: e.target.value })}
                placeholder="Your Adobe account ID"
              />
            </div>

            <div>
              <Label htmlFor="adobeClientId">Application ID</Label>
              <Input
                id="adobeClientId"
                value={configForm.adobeClientId || ""}
                onChange={(e) => setConfigForm({ ...configForm, adobeClientId: e.target.value })}
                placeholder="Your Adobe Sign application ID"
              />
            </div>

            <div>
              <Label htmlFor="adobeClientSecret">Application Secret</Label>
              <div className="flex gap-2">
                <Input
                  id="adobeClientSecret"
                  type={showAdobeSecret ? "text" : "password"}
                  value={configForm.adobeClientSecretEncrypted || ""}
                  onChange={(e) => setConfigForm({ ...configForm, adobeClientSecretEncrypted: e.target.value })}
                  placeholder="Enter your Adobe Sign secret"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdobeSecret(!showAdobeSecret)}
                >
                  {showAdobeSecret ? "Hide" : "Show"}
                </Button>
              </div>
            </div>

            <div className="pt-4">
              <h4 className="font-medium mb-2">Features Available:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Advanced workflow automation</li>
                <li>• Form field detection and mapping</li>
                <li>• Bulk send capabilities</li>
                <li>• Integration with Adobe Creative Cloud</li>
                <li>• Advanced authentication options</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>
            Receive real-time updates when documents are signed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
            <Input
              id="webhookUrl"
              type="url"
              value={configForm.webhookUrl || ""}
              onChange={(e) => setConfigForm({ ...configForm, webhookUrl: e.target.value })}
              placeholder="https://your-domain.com/webhooks/signature-events"
            />
            <p className="text-xs text-muted-foreground mt-1">
              We'll send POST requests to this URL when signatures are completed or declined
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label>Enable E-Signatures</Label>
            <Switch
              checked={configForm.isActive}
              onCheckedChange={(checked) => setConfigForm({ ...configForm, isActive: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveConfig}
          disabled={saveConfigMutation.isPending}
          size="lg"
        >
          {saveConfigMutation.isPending ? "Saving..." : "Save E-Signature Settings"}
        </Button>
      </div>
    </div>
  );
}