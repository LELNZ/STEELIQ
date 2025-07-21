import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Monitor, Shield, Mail, Clock, Eye, Download, MessageSquare, Bell, CheckCircle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ClientPortalSettings {
  id?: number;
  // Portal Access
  isEnabled: boolean;
  requirePasswordChange: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  
  // Portal Features
  features: {
    viewQuotes: boolean;
    downloadQuotes: boolean;
    acceptQuotes: boolean;
    requestRevisions: boolean;
    viewInvoices: boolean;
    downloadInvoices: boolean;
    viewProjectStatus: boolean;
    messaging: boolean;
    documentLibrary: boolean;
  };
  
  // Notification Settings
  notifications: {
    newQuoteEmail: boolean;
    quoteExpiryEmail: boolean;
    projectUpdatesEmail: boolean;
    invoiceEmail: boolean;
    welcomeEmail: boolean;
  };
  
  // Portal Branding
  branding: {
    portalTitle: string;
    welcomeMessage: string;
    supportEmail: string;
    supportPhone: string;
    customCss?: string;
    logoPosition: "left" | "center" | "right";
  };
  
  // Access Restrictions
  restrictions: {
    ipWhitelist: string[];
    accessHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
      timezone: string;
    };
    requireMfa: boolean;
  };
}

export default function ClientPortal() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<ClientPortalSettings>({
    isEnabled: false,
    requirePasswordChange: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    features: {
      viewQuotes: true,
      downloadQuotes: true,
      acceptQuotes: true,
      requestRevisions: true,
      viewInvoices: true,
      downloadInvoices: true,
      viewProjectStatus: true,
      messaging: false,
      documentLibrary: true,
    },
    notifications: {
      newQuoteEmail: true,
      quoteExpiryEmail: true,
      projectUpdatesEmail: true,
      invoiceEmail: true,
      welcomeEmail: true,
    },
    branding: {
      portalTitle: "Client Portal - Lateral Engineering",
      welcomeMessage: "Welcome to your project portal. View quotes, track progress, and manage documents.",
      supportEmail: "support@lateral-engineering.com",
      supportPhone: "+64 9 123 4567",
      logoPosition: "left",
    },
    restrictions: {
      ipWhitelist: [],
      accessHours: {
        enabled: false,
        startTime: "08:00",
        endTime: "18:00",
        timezone: "Pacific/Auckland",
      },
      requireMfa: false,
    },
  });

  // Fetch portal settings
  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["/api/organization/client-portal-settings"],
    onSuccess: (data: ClientPortalSettings) => {
      if (data) setSettings(data);
    },
  });

  // Save portal settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: ClientPortalSettings) => {
      await apiRequest("/api/organization/client-portal-settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/client-portal-settings"] });
      toast({
        title: "Success",
        description: "Client portal settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update client portal settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const addIpToWhitelist = () => {
    const ip = prompt("Enter IP address to whitelist:");
    if (ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
      setSettings({
        ...settings,
        restrictions: {
          ...settings.restrictions,
          ipWhitelist: [...settings.restrictions.ipWhitelist, ip],
        },
      });
    } else if (ip) {
      toast({
        title: "Invalid IP",
        description: "Please enter a valid IP address",
        variant: "destructive",
      });
    }
  };

  const removeIpFromWhitelist = (ip: string) => {
    setSettings({
      ...settings,
      restrictions: {
        ...settings.restrictions,
        ipWhitelist: settings.restrictions.ipWhitelist.filter(i => i !== ip),
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Client Portal</h2>
        <p className="text-muted-foreground mt-1">
          Configure self-service portal for clients to view quotes and track projects
        </p>
      </div>

      {/* Portal Status */}
      <Card>
        <CardHeader>
          <CardTitle>Portal Status</CardTitle>
          <CardDescription>
            Enable or disable the client portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Client Portal Access</Label>
              <p className="text-sm text-muted-foreground">
                Allow clients to log in and view their information
              </p>
            </div>
            <Switch
              checked={settings.isEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, isEnabled: checked })}
            />
          </div>

          {settings.isEnabled && (
            <Alert className="mt-4">
              <Monitor className="h-4 w-4" />
              <AlertDescription>
                Portal URL: https://portal.lateral-engineering.com
                <br />
                Clients will receive login credentials via email when quotes are sent.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Portal Features */}
      <Card>
        <CardHeader>
          <CardTitle>Portal Features</CardTitle>
          <CardDescription>
            Control what clients can access and do in the portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Quotes & Estimates</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>View Quotes</Label>
                  <Switch
                    checked={settings.features.viewQuotes}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      features: { ...settings.features, viewQuotes: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Download PDF</Label>
                  <Switch
                    checked={settings.features.downloadQuotes}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      features: { ...settings.features, downloadQuotes: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Accept/Decline Online</Label>
                  <Switch
                    checked={settings.features.acceptQuotes}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      features: { ...settings.features, acceptQuotes: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Request Revisions</Label>
                  <Switch
                    checked={settings.features.requestRevisions}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      features: { ...settings.features, requestRevisions: checked }
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Projects & Documents</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>View Invoices</Label>
                  <Switch
                    checked={settings.features.viewInvoices}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      features: { ...settings.features, viewInvoices: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Download Invoices</Label>
                  <Switch
                    checked={settings.features.downloadInvoices}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      features: { ...settings.features, downloadInvoices: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Project Status Tracking</Label>
                  <Switch
                    checked={settings.features.viewProjectStatus}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      features: { ...settings.features, viewProjectStatus: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Document Library</Label>
                  <Switch
                    checked={settings.features.documentLibrary}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      features: { ...settings.features, documentLibrary: checked }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>In-Portal Messaging</Label>
                <p className="text-xs text-muted-foreground">
                  Allow clients to send messages directly through the portal
                </p>
              </div>
              <Switch
                checked={settings.features.messaging}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  features: { ...settings.features, messaging: checked }
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Configure authentication and access controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sessionTimeout">
                Session Timeout (minutes)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 ml-1 inline-block" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Automatically log out users after this period of inactivity
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="sessionTimeout"
                type="number"
                min="5"
                max="120"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 30 })}
              />
            </div>
            
            <div>
              <Label htmlFor="maxLoginAttempts">
                Max Login Attempts
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 ml-1 inline-block" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Lock account after this many failed login attempts
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                min="3"
                max="10"
                value={settings.maxLoginAttempts}
                onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Require Password Change on First Login</Label>
              <Switch
                checked={settings.requirePasswordChange}
                onCheckedChange={(checked) => setSettings({ ...settings, requirePasswordChange: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Require Two-Factor Authentication</Label>
              <Switch
                checked={settings.restrictions.requireMfa}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  restrictions: { ...settings.restrictions, requireMfa: checked }
                })}
              />
            </div>
          </div>

          {/* IP Whitelist */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <Label>IP Address Whitelist</Label>
              <Button size="sm" variant="outline" onClick={addIpToWhitelist}>
                Add IP
              </Button>
            </div>
            {settings.restrictions.ipWhitelist.length > 0 ? (
              <div className="space-y-1">
                {settings.restrictions.ipWhitelist.map((ip) => (
                  <div key={ip} className="flex items-center justify-between p-2 bg-muted rounded">
                    <code className="text-sm">{ip}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeIpFromWhitelist(ip)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No IP restrictions (allow all)
              </p>
            )}
          </div>

          {/* Access Hours */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <Label>Restrict Access Hours</Label>
              <Switch
                checked={settings.restrictions.accessHours.enabled}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  restrictions: {
                    ...settings.restrictions,
                    accessHours: { ...settings.restrictions.accessHours, enabled: checked }
                  }
                })}
              />
            </div>
            {settings.restrictions.accessHours.enabled && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={settings.restrictions.accessHours.startTime}
                    onChange={(e) => setSettings({
                      ...settings,
                      restrictions: {
                        ...settings.restrictions,
                        accessHours: { ...settings.restrictions.accessHours, startTime: e.target.value }
                      }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={settings.restrictions.accessHours.endTime}
                    onChange={(e) => setSettings({
                      ...settings,
                      restrictions: {
                        ...settings.restrictions,
                        accessHours: { ...settings.restrictions.accessHours, endTime: e.target.value }
                      }
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={settings.restrictions.accessHours.timezone}
                    onValueChange={(value) => setSettings({
                      ...settings,
                      restrictions: {
                        ...settings.restrictions,
                        accessHours: { ...settings.restrictions.accessHours, timezone: value }
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pacific/Auckland">Auckland (NZ)</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney (AU)</SelectItem>
                      <SelectItem value="Australia/Melbourne">Melbourne (AU)</SelectItem>
                      <SelectItem value="Australia/Brisbane">Brisbane (AU)</SelectItem>
                      <SelectItem value="Australia/Perth">Perth (AU)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Portal Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Portal Branding</CardTitle>
          <CardDescription>
            Customize the look and messaging of the client portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="portalTitle">Portal Title</Label>
            <Input
              id="portalTitle"
              value={settings.branding.portalTitle}
              onChange={(e) => setSettings({
                ...settings,
                branding: { ...settings.branding, portalTitle: e.target.value }
              })}
              placeholder="Client Portal - Your Company"
            />
          </div>

          <div>
            <Label htmlFor="welcomeMessage">Welcome Message</Label>
            <Textarea
              id="welcomeMessage"
              value={settings.branding.welcomeMessage}
              onChange={(e) => setSettings({
                ...settings,
                branding: { ...settings.branding, welcomeMessage: e.target.value }
              })}
              placeholder="Welcome to your project portal..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={settings.branding.supportEmail}
                onChange={(e) => setSettings({
                  ...settings,
                  branding: { ...settings.branding, supportEmail: e.target.value }
                })}
                placeholder="support@example.com"
              />
            </div>
            <div>
              <Label htmlFor="supportPhone">Support Phone</Label>
              <Input
                id="supportPhone"
                value={settings.branding.supportPhone}
                onChange={(e) => setSettings({
                  ...settings,
                  branding: { ...settings.branding, supportPhone: e.target.value }
                })}
                placeholder="+64 9 123 4567"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="logoPosition">Logo Position</Label>
            <Select
              value={settings.branding.logoPosition}
              onValueChange={(value: any) => setSettings({
                ...settings,
                branding: { ...settings.branding, logoPosition: value }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>
            Configure automated emails sent to clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Welcome Email</Label>
              <p className="text-xs text-muted-foreground">
                Send when client account is created
              </p>
            </div>
            <Switch
              checked={settings.notifications.welcomeEmail}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, welcomeEmail: checked }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>New Quote Available</Label>
              <p className="text-xs text-muted-foreground">
                Notify when new quotes are ready to view
              </p>
            </div>
            <Switch
              checked={settings.notifications.newQuoteEmail}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, newQuoteEmail: checked }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Quote Expiry Reminder</Label>
              <p className="text-xs text-muted-foreground">
                Remind before quotes expire
              </p>
            </div>
            <Switch
              checked={settings.notifications.quoteExpiryEmail}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, quoteExpiryEmail: checked }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Project Updates</Label>
              <p className="text-xs text-muted-foreground">
                Send updates on project progress
              </p>
            </div>
            <Switch
              checked={settings.notifications.projectUpdatesEmail}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, projectUpdatesEmail: checked }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Invoice Ready</Label>
              <p className="text-xs text-muted-foreground">
                Notify when invoices are available
              </p>
            </div>
            <Switch
              checked={settings.notifications.invoiceEmail}
              onCheckedChange={(checked) => setSettings({
                ...settings,
                notifications: { ...settings.notifications, invoiceEmail: checked }
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveSettingsMutation.isPending}
          size="lg"
        >
          {saveSettingsMutation.isPending ? "Saving..." : "Save Portal Settings"}
        </Button>
      </div>
    </div>
  );
}