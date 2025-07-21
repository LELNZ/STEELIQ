import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FileText, Calendar, Hash, Lock, Clock, Shield, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DocumentSettings {
  id?: number;
  // Quote Validity
  defaultValidityDays: number;
  expiryReminderDays: number[];
  autoExpireAction: "archive" | "notify" | "both" | "none";
  
  // Numbering System
  quoteNumberPrefix: string;
  quoteNumberFormat: string; // e.g., "QTE-{YYYY}-{MM}-{SEQ}"
  sequenceResetPeriod: "never" | "yearly" | "monthly";
  currentSequenceNumber: number;
  
  // Security Settings
  requirePasswordForView: boolean;
  passwordComplexity: "simple" | "medium" | "strong";
  allowDownload: boolean;
  watermarkEnabled: boolean;
  watermarkText?: string;
  watermarkOpacity?: number;
  
  // Document Options
  includeTermsConditions: boolean;
  includeCompanyLogo: boolean;
  includePageNumbers: boolean;
  pageNumberFormat: string;
  dateFormat: string;
  currencyFormat: string;
  
  // Revision Tracking
  enableRevisions: boolean;
  revisionNaming: string; // e.g., "Rev {N}" or "Version {N}"
  showRevisionHistory: boolean;
  maxRevisions?: number;
}

export default function DocumentSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<DocumentSettings>({
    defaultValidityDays: 30,
    expiryReminderDays: [7, 3, 1],
    autoExpireAction: "notify",
    quoteNumberPrefix: "QTE",
    quoteNumberFormat: "{PREFIX}-{YYYY}-{MM}-{SEQ}",
    sequenceResetPeriod: "yearly",
    currentSequenceNumber: 1,
    requirePasswordForView: false,
    passwordComplexity: "medium",
    allowDownload: true,
    watermarkEnabled: false,
    watermarkText: "CONFIDENTIAL",
    watermarkOpacity: 20,
    includeTermsConditions: true,
    includeCompanyLogo: true,
    includePageNumbers: true,
    pageNumberFormat: "Page {PAGE} of {TOTAL}",
    dateFormat: "DD/MM/YYYY",
    currencyFormat: "NZD",
    enableRevisions: true,
    revisionNaming: "Rev {N}",
    showRevisionHistory: true,
    maxRevisions: 10,
  });

  // Fetch document settings
  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["/api/organization/document-settings"],
    onSuccess: (data: DocumentSettings) => {
      if (data) setSettings(data);
    },
  });

  // Save document settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: DocumentSettings) => {
      await apiRequest("/api/organization/document-settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/document-settings"] });
      toast({
        title: "Success",
        description: "Document settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update document settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const formatExamples = {
    quote: settings.quoteNumberFormat
      .replace("{PREFIX}", settings.quoteNumberPrefix)
      .replace("{YYYY}", new Date().getFullYear().toString())
      .replace("{MM}", String(new Date().getMonth() + 1).padStart(2, "0"))
      .replace("{SEQ}", String(settings.currentSequenceNumber).padStart(4, "0")),
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Document Settings</h2>
        <p className="text-muted-foreground mt-1">
          Configure quote validity, numbering, security, and document options
        </p>
      </div>

      {/* Quote Validity Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Validity</CardTitle>
          <CardDescription>
            Set default expiration and reminder settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="defaultValidityDays">
                Default Validity Period (days)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 ml-1 inline-block" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        How long quotes remain valid after creation. Industry standard is 30 days.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="defaultValidityDays"
                type="number"
                min="1"
                max="365"
                value={settings.defaultValidityDays}
                onChange={(e) => setSettings({ ...settings, defaultValidityDays: parseInt(e.target.value) || 30 })}
              />
            </div>
            
            <div>
              <Label htmlFor="expiryReminderDays">
                Reminder Days Before Expiry
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 ml-1 inline-block" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Send automated reminders at these intervals (comma-separated days)
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="expiryReminderDays"
                value={settings.expiryReminderDays.join(", ")}
                onChange={(e) => {
                  const days = e.target.value.split(",").map(d => parseInt(d.trim())).filter(n => !isNaN(n));
                  setSettings({ ...settings, expiryReminderDays: days });
                }}
                placeholder="7, 3, 1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="autoExpireAction">Action on Expiry</Label>
            <Select
              value={settings.autoExpireAction}
              onValueChange={(value: any) => setSettings({ ...settings, autoExpireAction: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Action</SelectItem>
                <SelectItem value="notify">Notify Sales Team</SelectItem>
                <SelectItem value="archive">Archive Quote</SelectItem>
                <SelectItem value="both">Notify & Archive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Numbering System */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Numbering</CardTitle>
          <CardDescription>
            Configure automatic quote number generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quoteNumberPrefix">Number Prefix</Label>
              <Input
                id="quoteNumberPrefix"
                value={settings.quoteNumberPrefix}
                onChange={(e) => setSettings({ ...settings, quoteNumberPrefix: e.target.value })}
                placeholder="QTE"
                maxLength={10}
              />
            </div>
            
            <div>
              <Label htmlFor="sequenceResetPeriod">Sequence Reset</Label>
              <Select
                value={settings.sequenceResetPeriod}
                onValueChange={(value: any) => setSettings({ ...settings, sequenceResetPeriod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never Reset</SelectItem>
                  <SelectItem value="yearly">Reset Yearly</SelectItem>
                  <SelectItem value="monthly">Reset Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="quoteNumberFormat">
              Number Format
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 ml-1 inline-block" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Available variables: {"{PREFIX}"}, {"{YYYY}"}, {"{YY}"}, {"{MM}"}, {"{DD}"}, {"{SEQ}"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="quoteNumberFormat"
              value={settings.quoteNumberFormat}
              onChange={(e) => setSettings({ ...settings, quoteNumberFormat: e.target.value })}
              placeholder="{PREFIX}-{YYYY}-{MM}-{SEQ}"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Example: {formatExamples.quote}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security & Access</CardTitle>
          <CardDescription>
            Control document access and security features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Password Protection</Label>
              <p className="text-xs text-muted-foreground">
                Require password to view quotes
              </p>
            </div>
            <Switch
              checked={settings.requirePasswordForView}
              onCheckedChange={(checked) => setSettings({ ...settings, requirePasswordForView: checked })}
            />
          </div>

          {settings.requirePasswordForView && (
            <div>
              <Label htmlFor="passwordComplexity">Password Complexity</Label>
              <Select
                value={settings.passwordComplexity}
                onValueChange={(value: any) => setSettings({ ...settings, passwordComplexity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple (4+ characters)</SelectItem>
                  <SelectItem value="medium">Medium (8+ chars, mixed case)</SelectItem>
                  <SelectItem value="strong">Strong (12+ chars, special symbols)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow PDF Download</Label>
              <p className="text-xs text-muted-foreground">
                Clients can download quote as PDF
              </p>
            </div>
            <Switch
              checked={settings.allowDownload}
              onCheckedChange={(checked) => setSettings({ ...settings, allowDownload: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Watermark</Label>
              <p className="text-xs text-muted-foreground">
                Add watermark to quote documents
              </p>
            </div>
            <Switch
              checked={settings.watermarkEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, watermarkEnabled: checked })}
            />
          </div>

          {settings.watermarkEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="watermarkText">Watermark Text</Label>
                <Input
                  id="watermarkText"
                  value={settings.watermarkText}
                  onChange={(e) => setSettings({ ...settings, watermarkText: e.target.value })}
                  placeholder="CONFIDENTIAL"
                />
              </div>
              <div>
                <Label htmlFor="watermarkOpacity">Opacity (%)</Label>
                <Input
                  id="watermarkOpacity"
                  type="number"
                  min="5"
                  max="50"
                  value={settings.watermarkOpacity}
                  onChange={(e) => setSettings({ ...settings, watermarkOpacity: parseInt(e.target.value) || 20 })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Options */}
      <Card>
        <CardHeader>
          <CardTitle>Document Options</CardTitle>
          <CardDescription>
            Configure what appears in quote documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Include Terms & Conditions</Label>
              <Switch
                checked={settings.includeTermsConditions}
                onCheckedChange={(checked) => setSettings({ ...settings, includeTermsConditions: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Include Company Logo</Label>
              <Switch
                checked={settings.includeCompanyLogo}
                onCheckedChange={(checked) => setSettings({ ...settings, includeCompanyLogo: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Include Page Numbers</Label>
              <Switch
                checked={settings.includePageNumbers}
                onCheckedChange={(checked) => setSettings({ ...settings, includePageNumbers: checked })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateFormat">Date Format</Label>
              <Select
                value={settings.dateFormat}
                onValueChange={(value) => setSettings({ ...settings, dateFormat: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  <SelectItem value="DD MMM YYYY">DD MMM YYYY</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="currencyFormat">Currency</Label>
              <Select
                value={settings.currencyFormat}
                onValueChange={(value) => setSettings({ ...settings, currencyFormat: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revision Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Revision Tracking</CardTitle>
          <CardDescription>
            Manage quote versions and revision history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Revisions</Label>
              <p className="text-xs text-muted-foreground">
                Track changes and maintain revision history
              </p>
            </div>
            <Switch
              checked={settings.enableRevisions}
              onCheckedChange={(checked) => setSettings({ ...settings, enableRevisions: checked })}
            />
          </div>

          {settings.enableRevisions && (
            <>
              <div>
                <Label htmlFor="revisionNaming">
                  Revision Naming Format
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 ml-1 inline-block" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Use {"{N}"} for revision number. Examples: "Rev {"{N}"}", "Version {"{N}"}", "v{"{N}"}"
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="revisionNaming"
                  value={settings.revisionNaming}
                  onChange={(e) => setSettings({ ...settings, revisionNaming: e.target.value })}
                  placeholder="Rev {N}"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label>Show Revision History</Label>
                  <Switch
                    checked={settings.showRevisionHistory}
                    onCheckedChange={(checked) => setSettings({ ...settings, showRevisionHistory: checked })}
                  />
                </div>

                <div>
                  <Label htmlFor="maxRevisions">Max Revisions to Keep</Label>
                  <Input
                    id="maxRevisions"
                    type="number"
                    min="1"
                    max="50"
                    value={settings.maxRevisions}
                    onChange={(e) => setSettings({ ...settings, maxRevisions: parseInt(e.target.value) || 10 })}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saveSettingsMutation.isPending}
          size="lg"
        >
          {saveSettingsMutation.isPending ? "Saving..." : "Save Document Settings"}
        </Button>
      </div>
    </div>
  );
}