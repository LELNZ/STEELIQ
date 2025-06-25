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
import { User, Bell, Palette, Globe, Save, RotateCcw, Info, Shield, Clock } from "lucide-react";
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
    estimationDefaults: {
      defaultMargin: number;
      defaultOverhead: number;
      autoCalculateCoatings: boolean;
    };
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
      estimationDefaults: {
        defaultMargin: 20,
        defaultOverhead: 25,
        autoCalculateCoatings: true
      }
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
        estimationDefaults: {
          defaultMargin: 20,
          defaultOverhead: 25,
          autoCalculateCoatings: true
        }
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
              <Label>Default Margin (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={preferences.workflow.estimationDefaults.defaultMargin}
                onChange={(e) => setPreferences({
                  ...preferences,
                  workflow: { 
                    ...preferences.workflow, 
                    estimationDefaults: { 
                      ...preferences.workflow.estimationDefaults, 
                      defaultMargin: parseFloat(e.target.value) || 20 
                    }
                  }
                })}
              />
            </div>
            <div>
              <Label>Default Overhead (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={preferences.workflow.estimationDefaults.defaultOverhead}
                onChange={(e) => setPreferences({
                  ...preferences,
                  workflow: { 
                    ...preferences.workflow, 
                    estimationDefaults: { 
                      ...preferences.workflow.estimationDefaults, 
                      defaultOverhead: parseFloat(e.target.value) || 25 
                    }
                  }
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-calculate Coatings</Label>
                <p className="text-xs text-muted-foreground">Automatically calculate coating requirements</p>
              </div>
              <Switch
                checked={preferences.workflow.estimationDefaults.autoCalculateCoatings}
                onCheckedChange={(checked) => setPreferences({
                  ...preferences,
                  workflow: { 
                    ...preferences.workflow, 
                    estimationDefaults: { 
                      ...preferences.workflow.estimationDefaults, 
                      autoCalculateCoatings: checked 
                    }
                  }
                })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}