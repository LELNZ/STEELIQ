import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Mail, Plus, Edit, Trash2, CheckCircle, XCircle, Send, AlertCircle } from "lucide-react";

interface EmailConfig {
  id?: number;
  configName: string;
  providerType: "smtp" | "google" | "office365";
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPasswordEncrypted?: string;
  smtpEncryption?: "tls" | "ssl" | "none";
  oauthClientId?: string;
  oauthClientSecretEncrypted?: string;
  fromEmail: string;
  fromName?: string;
  replyToEmail?: string;
  isDefault: boolean;
  isActive: boolean;
  testStatus?: string;
  lastTestedAt?: string;
}

interface EmailTemplate {
  id?: number;
  templateName: string;
  templateCode: string;
  templateType: string;
  subjectLine: string;
  emailBodyHtml: string;
  emailBodyPlain?: string;
  isFollowUp: boolean;
  followUpDays?: number[];
  stopOnReply: boolean;
  isActive: boolean;
}

export default function EmailConfiguration() {
  const { toast } = useToast();
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<EmailConfig | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [configForm, setConfigForm] = useState<EmailConfig>({
    configName: "",
    providerType: "smtp",
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpPasswordEncrypted: "",
    smtpEncryption: "tls",
    fromEmail: "",
    fromName: "",
    replyToEmail: "",
    isDefault: false,
    isActive: true,
  });

  const [templateForm, setTemplateForm] = useState<EmailTemplate>({
    templateName: "",
    templateCode: "",
    templateType: "quote_sent",
    subjectLine: "",
    emailBodyHtml: "",
    emailBodyPlain: "",
    isFollowUp: false,
    followUpDays: [3, 7, 14],
    stopOnReply: true,
    isActive: true,
  });

  // Fetch email configurations
  const { data: configs = [], isLoading: loadingConfigs } = useQuery({
    queryKey: ["/api/organization/email-configs"],
  });

  // Fetch email templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["/api/organization/email-templates"],
  });

  // Save email configuration
  const saveConfigMutation = useMutation({
    mutationFn: async (config: EmailConfig) => {
      if (config.id) {
        await apiRequest(`/api/organization/email-configs/${config.id}`, {
          method: "PUT",
          body: JSON.stringify(config),
        });
      } else {
        await apiRequest("/api/organization/email-configs", {
          method: "POST",
          body: JSON.stringify(config),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/email-configs"] });
      toast({
        title: "Success",
        description: `Email configuration ${configForm.id ? "updated" : "created"} successfully`,
      });
      setIsEditingConfig(false);
      resetConfigForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: `Failed to ${configForm.id ? "update" : "create"} email configuration`,
        variant: "destructive",
      });
    },
  });

  // Delete email configuration
  const deleteConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/organization/email-configs/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/email-configs"] });
      toast({
        title: "Success",
        description: "Email configuration deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete email configuration",
        variant: "destructive",
      });
    },
  });

  // Test email configuration
  const testConfigMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/organization/email-configs/${id}/test`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/email-configs"] });
      toast({
        title: "Success",
        description: "Test email sent successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  const resetConfigForm = () => {
    setConfigForm({
      configName: "",
      providerType: "smtp",
      smtpHost: "",
      smtpPort: 587,
      smtpUsername: "",
      smtpPasswordEncrypted: "",
      smtpEncryption: "tls",
      fromEmail: "",
      fromName: "",
      replyToEmail: "",
      isDefault: false,
      isActive: true,
    });
    setSelectedConfig(null);
    setShowPassword(false);
  };

  const handleEditConfig = (config: EmailConfig) => {
    setConfigForm(config);
    setSelectedConfig(config);
    setIsEditingConfig(true);
  };

  const handleSaveConfig = () => {
    // Basic validation
    if (!configForm.configName || !configForm.fromEmail) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (configForm.providerType === "smtp" && (!configForm.smtpHost || !configForm.smtpUsername)) {
      toast({
        title: "Validation Error",
        description: "SMTP settings are required for SMTP provider",
        variant: "destructive",
      });
      return;
    }

    saveConfigMutation.mutate(configForm);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "google":
        return "📧 Google Workspace";
      case "office365":
        return "📬 Office 365";
      default:
        return "📮 SMTP";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Email Configuration</h2>
        <p className="text-muted-foreground mt-1">
          Set up email providers and templates for automated quote communications
        </p>
      </div>

      {/* Email Configurations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Providers</CardTitle>
              <CardDescription>
                Configure SMTP settings or connect email services
              </CardDescription>
            </div>
            <Dialog open={isEditingConfig} onOpenChange={setIsEditingConfig}>
              <DialogTrigger asChild>
                <Button onClick={() => resetConfigForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Configuration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{selectedConfig ? "Edit" : "Add"} Email Configuration</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="configName">Configuration Name</Label>
                      <Input
                        id="configName"
                        value={configForm.configName}
                        onChange={(e) => setConfigForm({ ...configForm, configName: e.target.value })}
                        placeholder="Primary Email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="providerType">Provider Type</Label>
                      <Select
                        value={configForm.providerType}
                        onValueChange={(value: any) => setConfigForm({ ...configForm, providerType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="smtp">SMTP Server</SelectItem>
                          <SelectItem value="google">Google Workspace</SelectItem>
                          <SelectItem value="office365">Office 365</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {configForm.providerType === "smtp" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="smtpHost">SMTP Host</Label>
                          <Input
                            id="smtpHost"
                            value={configForm.smtpHost}
                            onChange={(e) => setConfigForm({ ...configForm, smtpHost: e.target.value })}
                            placeholder="smtp.gmail.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="smtpPort">SMTP Port</Label>
                          <Input
                            id="smtpPort"
                            type="number"
                            value={configForm.smtpPort}
                            onChange={(e) => setConfigForm({ ...configForm, smtpPort: parseInt(e.target.value) || 587 })}
                            placeholder="587"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="smtpUsername">SMTP Username</Label>
                        <Input
                          id="smtpUsername"
                          value={configForm.smtpUsername}
                          onChange={(e) => setConfigForm({ ...configForm, smtpUsername: e.target.value })}
                          placeholder="your-email@domain.com"
                        />
                      </div>

                      <div>
                        <Label htmlFor="smtpPassword">SMTP Password</Label>
                        <div className="flex gap-2">
                          <Input
                            id="smtpPassword"
                            type={showPassword ? "text" : "password"}
                            value={configForm.smtpPasswordEncrypted}
                            onChange={(e) => setConfigForm({ ...configForm, smtpPasswordEncrypted: e.target.value })}
                            placeholder="Enter password"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? "Hide" : "Show"}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="smtpEncryption">Encryption</Label>
                        <Select
                          value={configForm.smtpEncryption}
                          onValueChange={(value: any) => setConfigForm({ ...configForm, smtpEncryption: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tls">TLS</SelectItem>
                            <SelectItem value="ssl">SSL</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {(configForm.providerType === "google" || configForm.providerType === "office365") && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="oauthClientId">Client ID</Label>
                        <Input
                          id="oauthClientId"
                          value={configForm.oauthClientId}
                          onChange={(e) => setConfigForm({ ...configForm, oauthClientId: e.target.value })}
                          placeholder="Your OAuth client ID"
                        />
                      </div>
                      <div>
                        <Label htmlFor="oauthClientSecret">Client Secret</Label>
                        <Input
                          id="oauthClientSecret"
                          type={showPassword ? "text" : "password"}
                          value={configForm.oauthClientSecretEncrypted}
                          onChange={(e) => setConfigForm({ ...configForm, oauthClientSecretEncrypted: e.target.value })}
                          placeholder="Your OAuth client secret"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fromEmail">From Email</Label>
                      <Input
                        id="fromEmail"
                        type="email"
                        value={configForm.fromEmail}
                        onChange={(e) => setConfigForm({ ...configForm, fromEmail: e.target.value })}
                        placeholder="quotes@company.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fromName">From Name (Optional)</Label>
                      <Input
                        id="fromName"
                        value={configForm.fromName}
                        onChange={(e) => setConfigForm({ ...configForm, fromName: e.target.value })}
                        placeholder="Lateral Engineering"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="replyToEmail">Reply-To Email (Optional)</Label>
                    <Input
                      id="replyToEmail"
                      type="email"
                      value={configForm.replyToEmail}
                      onChange={(e) => setConfigForm({ ...configForm, replyToEmail: e.target.value })}
                      placeholder="sales@company.com"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isDefault"
                        checked={configForm.isDefault}
                        onCheckedChange={(checked) => setConfigForm({ ...configForm, isDefault: checked })}
                      />
                      <Label htmlFor="isDefault">Set as default</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={configForm.isActive}
                        onCheckedChange={(checked) => setConfigForm({ ...configForm, isActive: checked })}
                      />
                      <Label htmlFor="isActive">Active</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditingConfig(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveConfig} disabled={saveConfigMutation.isPending}>
                    {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loadingConfigs ? (
            <div className="text-center py-8 text-muted-foreground">Loading configurations...</div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No email configurations added yet. Click "Add Configuration" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Configuration</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config: EmailConfig) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{config.configName}</div>
                        {config.isDefault && (
                          <span className="text-xs text-primary">Default</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getProviderIcon(config.providerType)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{config.fromEmail}</div>
                        {config.fromName && (
                          <div className="text-muted-foreground">{config.fromName}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(config.testStatus)}
                        <span className="text-sm">
                          {config.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => config.id && testConfigMutation.mutate(config.id)}
                          disabled={testConfigMutation.isPending}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditConfig(config)}
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
                              <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{config.configName}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => config.id && deleteConfigMutation.mutate(config.id)}
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

      {/* Email Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Create and manage email templates for quotes and follow-ups
              </CardDescription>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Email templates will be implemented in the next phase
          </div>
        </CardContent>
      </Card>
    </div>
  );
}