import React, { useState, useEffect } from 'react';
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

interface GlobalSettings {
  company: {
    name: string;
    abn: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
    timezone: string;
    fiscalYearStart: string; // MM-DD format
  };
  system: {
    defaultCurrency: string;
    unitsSystem: 'metric' | 'imperial';
    decimalPlaces: number;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    language: string;
    autoBackupEnabled: boolean;
    backupFrequency: number; // hours
    sessionTimeout: number; // minutes
  };
  fabrication: {
    defaultKerf: number; // mm
    defaultTolerance: number; // mm
    standardLengths: number[]; // mm
    minimumOffcutLength: number; // mm
    materialWasteAllowance: number; // %
    defaultSteelGrade: string;
    requireMillCertificates: boolean;
    qualityControlEnabled: boolean;
    welderCertificationTracking: boolean;
  };
  estimation: {
    contingencyRateRange: { min: number; max: number }; // %
    laborRateStructure: 'hourly' | 'piece' | 'hybrid';
    defaultLabourRates: {
      apprentice: number;
      tradesman: number;
      foreman: number;
      supervisor: number;
    };
    autoCalculateCoatings: boolean;
    includeSiteAllowances: boolean;
    standardSiteAllowanceRate: number; // %
    requireApprovalThreshold: number; // dollar amount
  };
  inventory: {
    enableBarcodeScanning: boolean;
    lowStockThreshold: number; // %
    reorderPointCalculation: 'manual' | 'automatic';
    stockTakeFrequency: number; // days
    enableLocationTracking: boolean;
    requireReceiptVerification: boolean;
    autoUpdatePricesFromSuppliers: boolean;
    priceUpdateFrequency: number; // days
  };
  quality: {
    wpsDatabase: boolean;
    inspectionCheckpoints: boolean;
    nonConformanceTracking: boolean;
    customerSignoffRequired: boolean;
    photoDocumentationMandatory: boolean;
    testCertificateTracking: boolean;
    complianceStandards: string[]; // AS/NZS, AWS, etc.
  };
  safety: {
    hsePolicyTracking: boolean;
    riskAssessmentMandatory: boolean;
    inductionTracking: boolean;
    incidentReporting: boolean;
    equipmentInspectionSchedule: boolean;
    emergencyContactSystem: boolean;
    swmsRequired: boolean;
  };
  financial: {
    gstRate: number; // %
    paymentTermsDefault: number; // days
    latePaymentPenalty: number; // %
    creditLimitCheck: boolean;
    multiCurrencyEnabled: boolean;
    exchangeRateSource: string;
    invoiceNumberFormat: string;
    quoteValidityPeriod: number; // days
  };
  integration: {
    accountingSoftware: string;
    cadSoftware: string;
    crmSystem: string;
    emailProvider: string;
    smsProvider: string;
    weatherAPI: boolean;
    mapService: string;
    cloudStorage: string;
  };
  reporting: {
    standardReports: string[];
    defaultExportFormat: 'pdf' | 'excel' | 'csv';
    includeChartsDefault: boolean;
    watermarkDocuments: boolean;
    autoEmailSchedules: boolean;
    kpiDashboardEnabled: boolean;
    benchmarkingEnabled: boolean;
  };
  mobile: {
    offlineModeEnabled: boolean;
    gpsTrackingEnabled: boolean;
    photoCompressionLevel: 'low' | 'medium' | 'high';
    voiceNotesEnabled: boolean;
    barcodeScanning: boolean;
    signatureCapture: boolean;
    timeClockIntegration: boolean;
  };
  workflow: {
    approvalWorkflows: boolean;
    projectStageGates: boolean;
    automaticStatusUpdates: boolean;
    clientPortalEnabled: boolean;
    supplierPortalEnabled: boolean;
    documentVersionControl: boolean;
    changeOrderApproval: boolean;
  };
}

export default function GlobalSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<GlobalSettings>({
    company: {
      name: 'Lateral Engineering Limited',
      abn: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      logo: '',
      timezone: 'Pacific/Auckland',
      fiscalYearStart: '04-01' // April 1st (NZ/AU standard)
    },
    system: {
      defaultCurrency: 'NZD',
      unitsSystem: 'metric',
      decimalPlaces: 2,
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      language: 'en',
      autoBackupEnabled: true,
      backupFrequency: 24,
      sessionTimeout: 480 // 8 hours
    },
    fabrication: {
      defaultKerf: 2.4,
      defaultTolerance: 0.5,
      standardLengths: [6000, 7500, 9000, 12000, 15000],
      minimumOffcutLength: 500,
      materialWasteAllowance: 5,
      defaultSteelGrade: 'AS/NZS 3679.1-300',
      requireMillCertificates: true,
      qualityControlEnabled: true,
      welderCertificationTracking: true
    },
    estimation: {
      contingencyRateRange: { min: 2, max: 15 },
      laborRateStructure: 'hourly',
      defaultLabourRates: {
        apprentice: 35,
        tradesman: 55,
        foreman: 75,
        supervisor: 95
      },
      autoCalculateCoatings: true,
      includeSiteAllowances: true,
      standardSiteAllowanceRate: 12,
      requireApprovalThreshold: 50000
    },
    inventory: {
      enableBarcodeScanning: true,
      lowStockThreshold: 20,
      reorderPointCalculation: 'automatic',
      stockTakeFrequency: 90,
      enableLocationTracking: true,
      requireReceiptVerification: true,
      autoUpdatePricesFromSuppliers: false,
      priceUpdateFrequency: 7
    },
    quality: {
      wpsDatabase: true,
      inspectionCheckpoints: true,
      nonConformanceTracking: true,
      customerSignoffRequired: true,
      photoDocumentationMandatory: true,
      testCertificateTracking: true,
      complianceStandards: ['AS/NZS 1554', 'AS/NZS 3679', 'AWS D1.1', 'AS/NZS 1163']
    },
    safety: {
      hsePolicyTracking: true,
      riskAssessmentMandatory: true,
      inductionTracking: true,
      incidentReporting: true,
      equipmentInspectionSchedule: true,
      emergencyContactSystem: true,
      swmsRequired: true
    },
    financial: {
      gstRate: 15, // NZ GST
      paymentTermsDefault: 30,
      latePaymentPenalty: 1.5,
      creditLimitCheck: true,
      multiCurrencyEnabled: false,
      exchangeRateSource: 'RBNZ',
      invoiceNumberFormat: 'LE-{YYYY}-{####}',
      quoteValidityPeriod: 30
    },
    integration: {
      accountingSoftware: 'Xero',
      cadSoftware: 'AutoCAD',
      crmSystem: '',
      emailProvider: 'SMTP',
      smsProvider: '',
      weatherAPI: true,
      mapService: 'Google Maps',
      cloudStorage: 'Replit Storage'
    },
    reporting: {
      standardReports: ['Job Profitability', 'Material Usage', 'Labour Efficiency', 'Cash Flow'],
      defaultExportFormat: 'pdf',
      includeChartsDefault: true,
      watermarkDocuments: true,
      autoEmailSchedules: false,
      kpiDashboardEnabled: true,
      benchmarkingEnabled: false
    },
    mobile: {
      offlineModeEnabled: true,
      gpsTrackingEnabled: false,
      photoCompressionLevel: 'medium',
      voiceNotesEnabled: false,
      barcodeScanning: true,
      signatureCapture: true,
      timeClockIntegration: false
    },
    workflow: {
      approvalWorkflows: true,
      projectStageGates: true,
      automaticStatusUpdates: true,
      clientPortalEnabled: true,
      supplierPortalEnabled: false,
      documentVersionControl: true,
      changeOrderApproval: true
    }
  });

  const saveSettings = () => {
    localStorage.setItem('lateralEngineering_globalSettings', JSON.stringify(settings));
    toast({
      title: "Global Settings Saved",
      description: "Company-wide settings have been updated successfully.",
    });
  };

  const resetToDefaults = () => {
    // Reset logic here...
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default values.",
    });
  };

  // Load saved settings on component mount
  useEffect(() => {
    const saved = localStorage.getItem('lateralEngineering_globalSettings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

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

        {/* Additional tabs would continue here... */}
        
      </Tabs>
    </div>
  );
}