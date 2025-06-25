import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, Bell, Palette, Globe, Save, RotateCcw, Info, Shield, Clock, Package, Calculator, FileText, Slice } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserPreferences {
  personal: {
    name: string;
    email: string;
    position: string;
    avatar: string;
  };
  application: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    dateFormat: string;
    currency: string;
    timezone: string;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    lowStockAlerts: boolean;
    jobStatusUpdates: boolean;
    quoteReminders: boolean;
  };
  workflow: {
    autoSaveInterval: number; // minutes
    defaultProject: string;
    defaultEstimationTemplate: string;
    autoCalculateCoatings: boolean;
    showAdvancedFeatures: boolean;
    confirmDeleteActions: boolean;
    autoBackupFrequency: number; // hours
  };
  display: {
    unitsSystem: 'metric' | 'imperial';
    decimalPlaces: number;
    showTooltips: boolean;
    compactMode: boolean;
    showGridLines: boolean;
    highlightChanges: boolean;
    animateTransitions: boolean;
  };
  cutting: {
    defaultKerf: number; // mm
    defaultTolerance: number; // mm
    preferredOptimization: 'speed' | 'material' | 'balanced';
    autoGenerateLabels: boolean;
    includeOffcuts: boolean;
    minimumOffcutLength: number; // mm
  };
  materials: {
    defaultSupplier: string;
    showStockLevels: boolean;
    warnLowStock: boolean;
    autoUpdatePrices: boolean;
    preferredGrades: string[];
    showCertificates: boolean;
  };
  estimation: {
    showDetailedBreakdown: boolean;
    includeContingency: boolean;
    defaultContingencyRate: number; // %
    showHourlyRates: boolean;
    autoSaveProgress: boolean;
    trackTimeSpent: boolean;
    showCompetitorAnalysis: boolean;
  };
  reporting: {
    defaultFormat: 'pdf' | 'excel' | 'csv';
    includeCharts: boolean;
    showCostBreakdown: boolean;
    watermarkDocuments: boolean;
    autoEmailReports: boolean;
    reportLanguage: string;
  };
  mobile: {
    enableOfflineMode: boolean;
    syncFrequency: number; // minutes
    cameraQuality: 'low' | 'medium' | 'high';
    autoUploadPhotos: boolean;
    voiceNotes: boolean;
    gpsTracking: boolean;
  };
  security: {
    sessionTimeout: number; // minutes
    requirePasswordChange: boolean;
    twoFactorAuth: boolean;
  };
}

export default function UserPreferences() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences>({
    personal: {
      name: '',
      email: '',
      position: '',
      avatar: ''
    },
    application: {
      theme: 'system',
      language: 'en',
      dateFormat: 'DD/MM/YYYY',
      currency: 'NZD',
      timezone: 'Pacific/Auckland'
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      lowStockAlerts: true,
      jobStatusUpdates: true,
      quoteReminders: true
    },
    workflow: {
      autoSaveInterval: 10,
      defaultProject: '',
      defaultEstimationTemplate: '',
      autoCalculateCoatings: true,
      showAdvancedFeatures: true,
      confirmDeleteActions: true,
      autoBackupFrequency: 24
    },
    display: {
      unitsSystem: 'metric',
      decimalPlaces: 2,
      showTooltips: true,
      compactMode: false,
      showGridLines: true,
      highlightChanges: true,
      animateTransitions: true
    },
    cutting: {
      defaultKerf: 2.4,
      defaultTolerance: 0.5,
      preferredOptimization: 'balanced',
      autoGenerateLabels: true,
      includeOffcuts: true,
      minimumOffcutLength: 500
    },
    materials: {
      defaultSupplier: '',
      showStockLevels: true,
      warnLowStock: true,
      autoUpdatePrices: false,
      preferredGrades: ['AS/NZS 3679.1-300'],
      showCertificates: true
    },
    estimation: {
      showDetailedBreakdown: true,
      includeContingency: false,
      defaultContingencyRate: 5,
      showHourlyRates: true,
      autoSaveProgress: true,
      trackTimeSpent: false,
      showCompetitorAnalysis: false
    },
    reporting: {
      defaultFormat: 'pdf',
      includeCharts: true,
      showCostBreakdown: true,
      watermarkDocuments: true,
      autoEmailReports: false,
      reportLanguage: 'en'
    },
    mobile: {
      enableOfflineMode: false,
      syncFrequency: 15,
      cameraQuality: 'high',
      autoUploadPhotos: true,
      voiceNotes: false,
      gpsTracking: false
    },
    security: {
      sessionTimeout: 480, // 8 hours
      requirePasswordChange: false,
      twoFactorAuth: false
    }
  });

  const savePreferences = () => {
    localStorage.setItem('lateralEngineering_userPreferences', JSON.stringify(preferences));
    toast({
      title: "Preferences Saved",
      description: "Your personal preferences have been updated successfully.",
    });
  };

  const resetToDefaults = () => {
    setPreferences({
      personal: {
        name: '',
        email: '',
        position: '',
        avatar: ''
      },
      application: {
        theme: 'system',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        currency: 'NZD',
        timezone: 'Pacific/Auckland'
      },
      notifications: {
        emailNotifications: true,
        pushNotifications: false,
        lowStockAlerts: true,
        jobStatusUpdates: true,
        quoteReminders: true
      },
      workflow: {
        autoSaveInterval: 10,
        defaultProject: '',
        defaultEstimationTemplate: '',
        autoCalculateCoatings: true,
        showAdvancedFeatures: true,
        confirmDeleteActions: true,
        autoBackupFrequency: 24
      },
      display: {
        unitsSystem: 'metric',
        decimalPlaces: 2,
        showTooltips: true,
        compactMode: false,
        showGridLines: true,
        highlightChanges: true,
        animateTransitions: true
      },
      cutting: {
        defaultKerf: 2.4,
        defaultTolerance: 0.5,
        preferredOptimization: 'balanced',
        autoGenerateLabels: true,
        includeOffcuts: true,
        minimumOffcutLength: 500
      },
      materials: {
        defaultSupplier: '',
        showStockLevels: true,
        warnLowStock: true,
        autoUpdatePrices: false,
        preferredGrades: ['AS/NZS 3679.1-300'],
        showCertificates: true
      },
      estimation: {
        showDetailedBreakdown: true,
        includeContingency: false,
        defaultContingencyRate: 5,
        showHourlyRates: true,
        autoSaveProgress: true,
        trackTimeSpent: false,
        showCompetitorAnalysis: false
      },
      reporting: {
        defaultFormat: 'pdf',
        includeCharts: true,
        showCostBreakdown: true,
        watermarkDocuments: true,
        autoEmailReports: false,
        reportLanguage: 'en'
      },
      mobile: {
        enableOfflineMode: false,
        syncFrequency: 15,
        cameraQuality: 'high',
        autoUploadPhotos: true,
        voiceNotes: false,
        gpsTracking: false
      },
      security: {
        sessionTimeout: 480,
        requirePasswordChange: false,
        twoFactorAuth: false
      }
    });
  };

  // Load saved preferences on component mount
  useEffect(() => {
    const saved = localStorage.getItem('lateralEngineering_userPreferences');
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Preferences</h1>
          <p className="text-muted-foreground">Customize your personal settings and application behavior</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={savePreferences}>
            <Save className="w-4 h-4 mr-2" />
            Save Preferences
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input
                value={preferences.personal.name}
                onChange={(e) => setPreferences({
                  ...preferences,
                  personal: { ...preferences.personal, name: e.target.value }
                })}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={preferences.personal.email}
                onChange={(e) => setPreferences({
                  ...preferences,
                  personal: { ...preferences.personal, email: e.target.value }
                })}
                placeholder="your.email@company.com"
              />
            </div>
            <div>
              <Label>Position/Role</Label>
              <Input
                value={preferences.personal.position}
                onChange={(e) => setPreferences({
                  ...preferences,
                  personal: { ...preferences.personal, position: e.target.value }
                })}
                placeholder="e.g. Project Manager, Estimator, Fabricator"
              />
            </div>
          </CardContent>
        </Card>

        {/* Application Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Application Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Theme</Label>
              <Select 
                value={preferences.application.theme} 
                onValueChange={(value: 'light' | 'dark' | 'system') => setPreferences({
                  ...preferences,
                  application: { ...preferences.application, theme: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System Default</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date Format</Label>
              <Select 
                value={preferences.application.dateFormat} 
                onValueChange={(value) => setPreferences({
                  ...preferences,
                  application: { ...preferences.application, dateFormat: value }
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
              <Label>Currency</Label>
              <Select 
                value={preferences.application.currency} 
                onValueChange={(value) => setPreferences({
                  ...preferences,
                  application: { ...preferences.application, currency: value }
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
              <Label>Timezone</Label>
              <Select 
                value={preferences.application.timezone} 
                onValueChange={(value) => setPreferences({
                  ...preferences,
                  application: { ...preferences.application, timezone: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pacific/Auckland">Pacific/Auckland (NZST)</SelectItem>
                  <SelectItem value="Australia/Sydney">Australia/Sydney (AEST)</SelectItem>
                  <SelectItem value="Australia/Perth">Australia/Perth (AWST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch
                checked={preferences.notifications.emailNotifications}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  notifications: { ...preferences.notifications, emailNotifications: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Stock Alerts</Label>
                <p className="text-xs text-muted-foreground">Alert when inventory is low</p>
              </div>
              <Switch
                checked={preferences.notifications.lowStockAlerts}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  notifications: { ...preferences.notifications, lowStockAlerts: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Job Status Updates</Label>
                <p className="text-xs text-muted-foreground">Notifications for job progress</p>
              </div>
              <Switch
                checked={preferences.notifications.jobStatusUpdates}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  notifications: { ...preferences.notifications, jobStatusUpdates: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Quote Reminders</Label>
                <p className="text-xs text-muted-foreground">Reminders for pending quotes</p>
              </div>
              <Switch
                checked={preferences.notifications.quoteReminders}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  notifications: { ...preferences.notifications, quoteReminders: checked }
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Display Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Units System</Label>
              <Select 
                value={preferences.display.unitsSystem} 
                onValueChange={(value: 'metric' | 'imperial') => setPreferences({
                  ...preferences,
                  display: { ...preferences.display, unitsSystem: value }
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
              <Label>Decimal Places</Label>
              <Select 
                value={preferences.display.decimalPlaces.toString()} 
                onValueChange={(value) => setPreferences({
                  ...preferences,
                  display: { ...preferences.display, decimalPlaces: parseInt(value) }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 (whole numbers)</SelectItem>
                  <SelectItem value="1">1 decimal place</SelectItem>
                  <SelectItem value="2">2 decimal places</SelectItem>
                  <SelectItem value="3">3 decimal places</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Tooltips</Label>
                <p className="text-xs text-muted-foreground">Display helpful tooltips throughout the app</p>
              </div>
              <Switch
                checked={preferences.display.showTooltips}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  display: { ...preferences.display, showTooltips: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Compact Mode</Label>
                <p className="text-xs text-muted-foreground">Show more data in less space</p>
              </div>
              <Switch
                checked={preferences.display.compactMode}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  display: { ...preferences.display, compactMode: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Highlight Changes</Label>
                <p className="text-xs text-muted-foreground">Highlight recently modified data</p>
              </div>
              <Switch
                checked={preferences.display.highlightChanges}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  display: { ...preferences.display, highlightChanges: checked }
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Workflow Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Workflow Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Label>Auto-save Interval (minutes)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>How often to automatically save estimation work</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                type="number"
                min="1"
                max="60"
                value={preferences.workflow.autoSaveInterval}
                onChange={(e) => setPreferences({
                  ...preferences,
                  workflow: { ...preferences.workflow, autoSaveInterval: parseInt(e.target.value) || 10 }
                })}
              />
            </div>
            <div>
              <Label>Auto-backup Frequency (hours)</Label>
              <Input
                type="number"
                min="1"
                max="168"
                value={preferences.workflow.autoBackupFrequency}
                onChange={(e) => setPreferences({
                  ...preferences,
                  workflow: { ...preferences.workflow, autoBackupFrequency: parseInt(e.target.value) || 24 }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-calculate Coatings</Label>
                <p className="text-xs text-muted-foreground">Automatically calculate coating requirements</p>
              </div>
              <Switch
                checked={preferences.workflow.autoCalculateCoatings}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  workflow: { ...preferences.workflow, autoCalculateCoatings: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Advanced Features</Label>
                <p className="text-xs text-muted-foreground">Display advanced tools and options</p>
              </div>
              <Switch
                checked={preferences.workflow.showAdvancedFeatures}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  workflow: { ...preferences.workflow, showAdvancedFeatures: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Confirm Delete Actions</Label>
                <p className="text-xs text-muted-foreground">Ask for confirmation before deleting</p>
              </div>
              <Switch
                checked={preferences.workflow.confirmDeleteActions}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  workflow: { ...preferences.workflow, confirmDeleteActions: checked }
                })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cutting Optimization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Slice className="w-5 h-5 mr-2" />
              Cutting Optimization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Kerf Width (mm)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={preferences.cutting.defaultKerf}
                onChange={(e) => setPreferences({
                  ...preferences,
                  cutting: { ...preferences.cutting, defaultKerf: parseFloat(e.target.value) || 2.4 }
                })}
              />
            </div>
            <div>
              <Label>Default Tolerance (mm)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={preferences.cutting.defaultTolerance}
                onChange={(e) => setPreferences({
                  ...preferences,
                  cutting: { ...preferences.cutting, defaultTolerance: parseFloat(e.target.value) || 0.5 }
                })}
              />
            </div>
            <div>
              <Label>Preferred Optimization</Label>
              <Select 
                value={preferences.cutting.preferredOptimization} 
                onValueChange={(value: 'speed' | 'material' | 'balanced') => setPreferences({
                  ...preferences,
                  cutting: { ...preferences.cutting, preferredOptimization: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="speed">Speed (faster calculation)</SelectItem>
                  <SelectItem value="material">Material (minimize waste)</SelectItem>
                  <SelectItem value="balanced">Balanced (speed + efficiency)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Minimum Offcut Length (mm)</Label>
              <Input
                type="number"
                min="0"
                value={preferences.cutting.minimumOffcutLength}
                onChange={(e) => setPreferences({
                  ...preferences,
                  cutting: { ...preferences.cutting, minimumOffcutLength: parseInt(e.target.value) || 500 }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Generate Labels</Label>
                <p className="text-xs text-muted-foreground">Automatically create QR codes for cuts</p>
              </div>
              <Switch
                checked={preferences.cutting.autoGenerateLabels}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  cutting: { ...preferences.cutting, autoGenerateLabels: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Offcuts</Label>
                <p className="text-xs text-muted-foreground">Track reusable offcut pieces</p>
              </div>
              <Switch
                checked={preferences.cutting.includeOffcuts}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  cutting: { ...preferences.cutting, includeOffcuts: checked }
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Materials & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Materials & Inventory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Stock Levels</Label>
                <p className="text-xs text-muted-foreground">Display current inventory levels</p>
              </div>
              <Switch
                checked={preferences.materials.showStockLevels}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  materials: { ...preferences.materials, showStockLevels: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Stock Warnings</Label>
                <p className="text-xs text-muted-foreground">Alert when materials are running low</p>
              </div>
              <Switch
                checked={preferences.materials.warnLowStock}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  materials: { ...preferences.materials, warnLowStock: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Update Prices</Label>
                <p className="text-xs text-muted-foreground">Automatically fetch latest supplier prices</p>
              </div>
              <Switch
                checked={preferences.materials.autoUpdatePrices}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  materials: { ...preferences.materials, autoUpdatePrices: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Certificates</Label>
                <p className="text-xs text-muted-foreground">Display mill certificates and heat numbers</p>
              </div>
              <Switch
                checked={preferences.materials.showCertificates}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  materials: { ...preferences.materials, showCertificates: checked }
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Estimation Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              Estimation Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Contingency Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={preferences.estimation.defaultContingencyRate}
                onChange={(e) => setPreferences({
                  ...preferences,
                  estimation: { ...preferences.estimation, defaultContingencyRate: parseFloat(e.target.value) || 5 }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Detailed Breakdown</Label>
                <p className="text-xs text-muted-foreground">Display itemized cost details</p>
              </div>
              <Switch
                checked={preferences.estimation.showDetailedBreakdown}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  estimation: { ...preferences.estimation, showDetailedBreakdown: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Contingency</Label>
                <p className="text-xs text-muted-foreground">Add contingency to estimates by default</p>
              </div>
              <Switch
                checked={preferences.estimation.includeContingency}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  estimation: { ...preferences.estimation, includeContingency: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Hourly Rates</Label>
                <p className="text-xs text-muted-foreground">Display labor rates in estimates</p>
              </div>
              <Switch
                checked={preferences.estimation.showHourlyRates}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  estimation: { ...preferences.estimation, showHourlyRates: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Track Time Spent</Label>
                <p className="text-xs text-muted-foreground">Monitor time spent on estimation</p>
              </div>
              <Switch
                checked={preferences.estimation.trackTimeSpent}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  estimation: { ...preferences.estimation, trackTimeSpent: checked }
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reporting & Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Reporting & Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Export Format</Label>
              <Select 
                value={preferences.reporting.defaultFormat} 
                onValueChange={(value: 'pdf' | 'excel' | 'csv') => setPreferences({
                  ...preferences,
                  reporting: { ...preferences.reporting, defaultFormat: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Documents</SelectItem>
                  <SelectItem value="excel">Excel Spreadsheets</SelectItem>
                  <SelectItem value="csv">CSV Files</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Charts</Label>
                <p className="text-xs text-muted-foreground">Add charts and graphs to reports</p>
              </div>
              <Switch
                checked={preferences.reporting.includeCharts}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  reporting: { ...preferences.reporting, includeCharts: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Cost Breakdown</Label>
                <p className="text-xs text-muted-foreground">Include detailed cost analysis</p>
              </div>
              <Switch
                checked={preferences.reporting.showCostBreakdown}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  reporting: { ...preferences.reporting, showCostBreakdown: checked }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Watermark Documents</Label>
                <p className="text-xs text-muted-foreground">Add company watermark to exports</p>
              </div>
              <Switch
                checked={preferences.reporting.watermarkDocuments}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  reporting: { ...preferences.reporting, watermarkDocuments: checked }
                })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}