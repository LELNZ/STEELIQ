import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2, Globe, Clock, Shield, Truck, Package, Calculator, FileText, Settings, Save, RotateCcw, Info, Database, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGlobalSettings, type GlobalSettings } from "@/hooks/useGlobalSettings";

export default function GlobalSettings() {
  const { toast } = useToast();
  const { settings, updateSettings, resetToDefaults: resetSettings } = useGlobalSettings();

  const setSettings = (newSettings: any) => {
    updateSettings(newSettings);
  };

  const saveSettings = () => {
    toast({
      title: "Global Settings Saved",
      description: "Company-wide settings have been updated successfully.",
    });
  };

  const resetToDefaults = () => {
    resetSettings();
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default values.",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Global System Settings</h1>
          <p className="text-muted-foreground">Configure company-wide settings for the steel fabrication management system</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={saveSettings}>
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="fabrication">Fabrication</TabsTrigger>
          <TabsTrigger value="quality">Quality & Safety</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="integration">Integration</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={settings.company.name}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, name: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>ABN/NZBN</Label>
                  <Input
                    value={settings.company.abn}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, abn: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Business Address</Label>
                  <Input
                    value={settings.company.address}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, address: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={settings.company.phone}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, phone: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={settings.company.email}
                    onChange={(e) => setSettings({
                      ...settings,
                      company: { ...settings.company, email: e.target.value }
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* System Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Default Currency</Label>
                  <Select 
                    value={settings.system.defaultCurrency} 
                    onValueChange={(value) => setSettings({
                      ...settings,
                      system: { ...settings.system, defaultCurrency: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Units System</Label>
                  <Select 
                    value={settings.system.unitsSystem} 
                    onValueChange={(value: 'metric' | 'imperial') => setSettings({
                      ...settings,
                      system: { ...settings.system, unitsSystem: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">Metric (mm, kg, m²)</SelectItem>
                      <SelectItem value="imperial">Imperial (inches, lbs, ft²)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date Format</Label>
                  <Select 
                    value={settings.system.dateFormat} 
                    onValueChange={(value) => setSettings({
                      ...settings,
                      system: { ...settings.system, dateFormat: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (NZ/AU)</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    min="30"
                    max="1440"
                    value={settings.system.sessionTimeout}
                    onChange={(e) => setSettings({
                      ...settings,
                      system: { ...settings.system, sessionTimeout: parseInt(e.target.value) || 480 }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Backup Enabled</Label>
                    <p className="text-xs text-muted-foreground">Automatically backup system data</p>
                  </div>
                  <Switch
                    checked={settings.system.autoBackupEnabled}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      system: { ...settings.system, autoBackupEnabled: checked }
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fabrication" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fabrication Standards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="w-5 h-5 mr-2" />
                  Fabrication Standards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Label>Default Kerf Width (mm)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Standard cutting kerf width for optimization calculations</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.fabrication.defaultKerf}
                    onChange={(e) => setSettings({
                      ...settings,
                      fabrication: { ...settings.fabrication, defaultKerf: parseFloat(e.target.value) || 2.4 }
                    })}
                  />
                </div>
                <div>
                  <Label>Default Tolerance (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.fabrication.defaultTolerance}
                    onChange={(e) => setSettings({
                      ...settings,
                      fabrication: { ...settings.fabrication, defaultTolerance: parseFloat(e.target.value) || 0.5 }
                    })}
                  />
                </div>
                <div>
                  <Label>Minimum Offcut Length (mm)</Label>
                  <Input
                    type="number"
                    value={settings.fabrication.minimumOffcutLength}
                    onChange={(e) => setSettings({
                      ...settings,
                      fabrication: { ...settings.fabrication, minimumOffcutLength: parseInt(e.target.value) || 500 }
                    })}
                  />
                </div>
                <div>
                  <Label>Material Waste Allowance (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings.fabrication.materialWasteAllowance}
                    onChange={(e) => setSettings({
                      ...settings,
                      fabrication: { ...settings.fabrication, materialWasteAllowance: parseFloat(e.target.value) || 5 }
                    })}
                  />
                </div>
                <div>
                  <Label>Default Steel Grade</Label>
                  <Select 
                    value={settings.fabrication.defaultSteelGrade} 
                    onValueChange={(value) => setSettings({
                      ...settings,
                      fabrication: { ...settings.fabrication, defaultSteelGrade: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AS/NZS 3679.1-300">AS/NZS 3679.1-300</SelectItem>
                      <SelectItem value="AS/NZS 3679.1-250">AS/NZS 3679.1-250</SelectItem>
                      <SelectItem value="AS/NZS 1163 C450">AS/NZS 1163 C450</SelectItem>
                      <SelectItem value="ASTM A572 Grade 50">ASTM A572 Grade 50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Estimation Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="w-5 h-5 mr-2" />
                  Estimation Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Labor Rate Structure</Label>
                  <Select 
                    value={settings.estimation.laborRateStructure} 
                    onValueChange={(value: 'hourly' | 'piece' | 'hybrid') => setSettings({
                      ...settings,
                      estimation: { ...settings.estimation, laborRateStructure: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly Rates</SelectItem>
                      <SelectItem value="piece">Piece Rates</SelectItem>
                      <SelectItem value="hybrid">Hybrid (Hourly + Piece)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Apprentice Rate ($/hour)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.estimation.defaultLabourRates.apprentice}
                    onChange={(e) => setSettings({
                      ...settings,
                      estimation: { 
                        ...settings.estimation, 
                        defaultLabourRates: { 
                          ...settings.estimation.defaultLabourRates, 
                          apprentice: parseFloat(e.target.value) || 35 
                        }
                      }
                    })}
                  />
                </div>
                <div>
                  <Label>Tradesman Rate ($/hour)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.estimation.defaultLabourRates.tradesman}
                    onChange={(e) => setSettings({
                      ...settings,
                      estimation: { 
                        ...settings.estimation, 
                        defaultLabourRates: { 
                          ...settings.estimation.defaultLabourRates, 
                          tradesman: parseFloat(e.target.value) || 55 
                        }
                      }
                    })}
                  />
                </div>
                <div>
                  <Label>Approval Threshold ($)</Label>
                  <Input
                    type="number"
                    value={settings.estimation.requireApprovalThreshold}
                    onChange={(e) => setSettings({
                      ...settings,
                      estimation: { ...settings.estimation, requireApprovalThreshold: parseFloat(e.target.value) || 50000 }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto Calculate Coatings</Label>
                    <p className="text-xs text-muted-foreground">Automatically calculate coating requirements</p>
                  </div>
                  <Switch
                    checked={settings.estimation.autoCalculateCoatings}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      estimation: { ...settings.estimation, autoCalculateCoatings: checked }
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quality Control */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Quality Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>WPS Database</Label>
                    <p className="text-xs text-muted-foreground">Welding Procedure Specification tracking</p>
                  </div>
                  <Switch
                    checked={settings.quality.wpsDatabase}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      quality: { ...settings.quality, wpsDatabase: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Inspection Checkpoints</Label>
                    <p className="text-xs text-muted-foreground">Mandatory quality inspection points</p>
                  </div>
                  <Switch
                    checked={settings.quality.inspectionCheckpoints}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      quality: { ...settings.quality, inspectionCheckpoints: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Photo Documentation</Label>
                    <p className="text-xs text-muted-foreground">Require photos for quality records</p>
                  </div>
                  <Switch
                    checked={settings.quality.photoDocumentationMandatory}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      quality: { ...settings.quality, photoDocumentationMandatory: checked }
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Safety Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Health & Safety
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Risk Assessment Mandatory</Label>
                    <p className="text-xs text-muted-foreground">Require risk assessments for all jobs</p>
                  </div>
                  <Switch
                    checked={settings.safety.riskAssessmentMandatory}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      safety: { ...settings.safety, riskAssessmentMandatory: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SWMS Required</Label>
                    <p className="text-xs text-muted-foreground">Safe Work Method Statements required</p>
                  </div>
                  <Switch
                    checked={settings.safety.swmsRequired}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      safety: { ...settings.safety, swmsRequired: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Incident Reporting</Label>
                    <p className="text-xs text-muted-foreground">Enable incident reporting system</p>
                  </div>
                  <Switch
                    checked={settings.safety.incidentReporting}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      safety: { ...settings.safety, incidentReporting: checked }
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Financial Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>GST/VAT Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="30"
                    value={settings.financial.gstRate}
                    onChange={(e) => setSettings({
                      ...settings,
                      financial: { ...settings.financial, gstRate: parseFloat(e.target.value) || 15 }
                    })}
                  />
                </div>
                <div>
                  <Label>Default Payment Terms (days)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="90"
                    value={settings.financial.paymentTermsDefault}
                    onChange={(e) => setSettings({
                      ...settings,
                      financial: { ...settings.financial, paymentTermsDefault: parseInt(e.target.value) || 30 }
                    })}
                  />
                </div>
                <div>
                  <Label>Late Payment Penalty (%/month)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={settings.financial.latePaymentPenalty}
                    onChange={(e) => setSettings({
                      ...settings,
                      financial: { ...settings.financial, latePaymentPenalty: parseFloat(e.target.value) || 1.5 }
                    })}
                  />
                </div>
                <div>
                  <Label>Quote Validity Period (days)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="365"
                    value={settings.financial.quoteValidityPeriod}
                    onChange={(e) => setSettings({
                      ...settings,
                      financial: { ...settings.financial, quoteValidityPeriod: parseInt(e.target.value) || 30 }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Credit Limit Check</Label>
                    <p className="text-xs text-muted-foreground">Check customer credit limits before orders</p>
                  </div>
                  <Switch
                    checked={settings.financial.creditLimitCheck}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      financial: { ...settings.financial, creditLimitCheck: checked }
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Integration Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  System Integration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Accounting Software</Label>
                  <Select 
                    value={settings.integration.accountingSoftware} 
                    onValueChange={(value) => setSettings({
                      ...settings,
                      integration: { ...settings.integration, accountingSoftware: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Xero">Xero</SelectItem>
                      <SelectItem value="QuickBooks">QuickBooks</SelectItem>
                      <SelectItem value="MYOB">MYOB</SelectItem>
                      <SelectItem value="None">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CAD Software</Label>
                  <Select 
                    value={settings.integration.cadSoftware} 
                    onValueChange={(value) => setSettings({
                      ...settings,
                      integration: { ...settings.integration, cadSoftware: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AutoCAD">AutoCAD</SelectItem>
                      <SelectItem value="SolidWorks">SolidWorks</SelectItem>
                      <SelectItem value="Inventor">Inventor</SelectItem>
                      <SelectItem value="Tekla">Tekla Structures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weather API</Label>
                    <p className="text-xs text-muted-foreground">Enable weather data for site work planning</p>
                  </div>
                  <Switch
                    checked={settings.integration.weatherAPI}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      integration: { ...settings.integration, weatherAPI: checked }
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Third-Party Integrations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Map Service</Label>
                  <Select 
                    value={settings.integration.mapService} 
                    onValueChange={(value) => setSettings({
                      ...settings,
                      integration: { ...settings.integration, mapService: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Google Maps">Google Maps</SelectItem>
                      <SelectItem value="MapBox">MapBox</SelectItem>
                      <SelectItem value="OpenStreetMap">OpenStreetMap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cloud Storage</Label>
                  <Select 
                    value={settings.integration.cloudStorage} 
                    onValueChange={(value) => setSettings({
                      ...settings,
                      integration: { ...settings.integration, cloudStorage: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Replit Storage">Replit Storage</SelectItem>
                      <SelectItem value="AWS S3">AWS S3</SelectItem>
                      <SelectItem value="Google Drive">Google Drive</SelectItem>
                      <SelectItem value="Dropbox">Dropbox</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workflow Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Workflow Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Approval Workflows</Label>
                    <p className="text-xs text-muted-foreground">Enable multi-stage approval processes</p>
                  </div>
                  <Switch
                    checked={settings.workflow.approvalWorkflows}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      workflow: { ...settings.workflow, approvalWorkflows: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Project Stage Gates</Label>
                    <p className="text-xs text-muted-foreground">Require approval between project phases</p>
                  </div>
                  <Switch
                    checked={settings.workflow.projectStageGates}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      workflow: { ...settings.workflow, projectStageGates: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Client Portal</Label>
                    <p className="text-xs text-muted-foreground">Enable client access portal</p>
                  </div>
                  <Switch
                    checked={settings.workflow.clientPortalEnabled}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      workflow: { ...settings.workflow, clientPortalEnabled: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Document Version Control</Label>
                    <p className="text-xs text-muted-foreground">Track document versions and changes</p>
                  </div>
                  <Switch
                    checked={settings.workflow.documentVersionControl}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      workflow: { ...settings.workflow, documentVersionControl: checked }
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Mobile & Reporting */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Mobile & Reporting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Offline Mode</Label>
                    <p className="text-xs text-muted-foreground">Enable mobile offline capabilities</p>
                  </div>
                  <Switch
                    checked={settings.mobile.offlineModeEnabled}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      mobile: { ...settings.mobile, offlineModeEnabled: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>GPS Tracking</Label>
                    <p className="text-xs text-muted-foreground">Track mobile user locations</p>
                  </div>
                  <Switch
                    checked={settings.mobile.gpsTrackingEnabled}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      mobile: { ...settings.mobile, gpsTrackingEnabled: checked }
                    })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>KPI Dashboard</Label>
                    <p className="text-xs text-muted-foreground">Enable key performance indicators</p>
                  </div>
                  <Switch
                    checked={settings.reporting.kpiDashboardEnabled}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      reporting: { ...settings.reporting, kpiDashboardEnabled: checked }
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
      </Tabs>
    </div>
  );
}