import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Bell, Mail, MessageCircle, Clock, Shield, Save, AlertCircle } from "lucide-react";

interface NotificationPreference {
  id?: string;
  userId?: string;
  category: string;
  type?: string;
  channels: {
    email: boolean;
    inApp: boolean;
    whatsapp: boolean;
  };
  priority: string;
  frequency: string;
  timezone?: string;
  quietHours?: {
    enabled: boolean;
    start: string;
    end: string;
  };
  // Policy settings (from server)
  mandatoryChannels?: {
    email: boolean;
    inApp: boolean;
    whatsapp: boolean;
  };
  userCanModify?: boolean;
}

const NOTIFICATION_CATEGORIES = [
  { 
    id: 'time_clock',
    name: 'Time & Attendance',
    description: 'Clock-in/out confirmations, shift reminders, overtime alerts',
    icon: Clock
  },
  {
    id: 'payroll',
    name: 'Payroll',
    description: 'Payslip notifications, payment confirmations, tax documents',
    icon: Shield
  },
  {
    id: 'approvals',
    name: 'Approvals & Reviews',
    description: 'Time corrections, leave requests, expense approvals',
    icon: Bell
  },
  {
    id: 'compliance',
    name: 'Compliance & Security',
    description: 'Security alerts, policy updates, audit notifications',
    icon: AlertCircle
  }
];

const FREQUENCY_OPTIONS = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'batched_15min', label: 'Every 15 minutes' },
  { value: 'batched_hourly', label: 'Hourly' },
  { value: 'daily_digest', label: 'Daily Digest' },
  { value: 'weekly_summary', label: 'Weekly Summary' }
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Notifications' },
  { value: 'high', label: 'High & Critical Only' },
  { value: 'critical', label: 'Critical Only' }
];

export default function NotificationPreferences() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('time_clock');
  const [preferences, setPreferences] = useState<Record<string, NotificationPreference>>({});

  // Fetch user preferences
  const { data: preferencesData, isLoading } = useQuery({
    queryKey: ['/api/notifications/preferences'],
    enabled: true
  });

  useEffect(() => {
    if (preferencesData?.preferences) {
      const prefMap: Record<string, NotificationPreference> = {};
      preferencesData.preferences.forEach((pref: NotificationPreference) => {
        prefMap[pref.category] = pref;
      });
      setPreferences(prefMap);
    }
  }, [preferencesData]);

  // Save preferences mutation
  const savePreferences = useMutation({
    mutationFn: (updates: Partial<NotificationPreference>) => 
      apiRequest('/api/notifications/preferences', 'POST', updates),
    onSuccess: () => {
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/preferences'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive"
      });
    }
  });

  const handleChannelToggle = (category: string, channel: keyof NotificationPreference['channels']) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        channels: {
          ...prev[category]?.channels,
          [channel]: !prev[category]?.channels?.[channel]
        }
      }
    }));
  };

  const handleFrequencyChange = (category: string, frequency: string) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        frequency
      }
    }));
  };

  const handlePriorityChange = (category: string, priority: string) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        priority
      }
    }));
  };

  const handleQuietHoursToggle = (category: string) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        quietHours: {
          ...prev[category]?.quietHours,
          enabled: !prev[category]?.quietHours?.enabled,
          start: prev[category]?.quietHours?.start || '22:00',
          end: prev[category]?.quietHours?.end || '08:00'
        }
      }
    }));
  };

  const handleSavePreferences = () => {
    const currentPref = preferences[selectedCategory];
    if (currentPref) {
      // Only send the fields that the backend expects
      // Don't send policy fields like mandatoryChannels, userCanModify, etc.
      savePreferences.mutate({
        category: selectedCategory,
        channels: currentPref.channels || { email: true, inApp: true, whatsapp: false },
        priority: currentPref.priority || 'all',
        frequency: currentPref.frequency || 'immediate',
        quietHours: currentPref.quietHours || { enabled: false, start: '22:00', end: '08:00' }
      });
    }
  };

  const currentPref = preferences[selectedCategory] || {
    channels: { email: true, inApp: true, whatsapp: false },
    frequency: 'immediate',
    priority: 'all',
    quietHours: { enabled: false, start: '22:00', end: '08:00' }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Notification Preferences</h1>
        <p className="text-muted-foreground mt-1">
          Manage how and when you receive notifications across different channels
        </p>
        
        {/* Explanatory Note */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                <strong>Your Personal Settings:</strong> These are your individual notification preferences. 
                Channels marked as "Required" are set by your organization's policy and cannot be disabled.
                Your changes here affect only your own notifications - they don't change the organization's policies.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Selector */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Categories</CardTitle>
              <CardDescription>Select a category to configure</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {NOTIFICATION_CATEGORIES.map(category => {
                  const Icon = category.icon;
                  const isActive = selectedCategory === category.id;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors ${
                        isActive ? 'bg-accent border-l-4 border-primary' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={`h-5 w-5 mt-0.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{category.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {NOTIFICATION_CATEGORIES.find(c => c.id === selectedCategory)?.name} Settings
              </CardTitle>
              <CardDescription>
                Configure delivery channels and preferences for this category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Delivery Channels */}
              <div>
                <h3 className="text-sm font-medium mb-4">Delivery Channels</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="email-toggle" className="cursor-pointer">
                        <div>
                          <p className="font-medium">
                            Email
                            {currentPref.mandatoryChannels?.email && (
                              <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Receive notifications to your registered email
                          </p>
                        </div>
                      </Label>
                    </div>
                    <Switch
                      id="email-toggle"
                      checked={currentPref.channels?.email || currentPref.mandatoryChannels?.email || false}
                      onCheckedChange={() => handleChannelToggle(selectedCategory, 'email')}
                      disabled={currentPref.mandatoryChannels?.email || !currentPref.userCanModify}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="inapp-toggle" className="cursor-pointer">
                        <div>
                          <p className="font-medium">
                            In-App
                            {currentPref.mandatoryChannels?.inApp && (
                              <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Real-time notifications while using the app
                          </p>
                        </div>
                      </Label>
                    </div>
                    <Switch
                      id="inapp-toggle"
                      checked={currentPref.channels?.inApp || currentPref.mandatoryChannels?.inApp || false}
                      onCheckedChange={() => handleChannelToggle(selectedCategory, 'inApp')}
                      disabled={currentPref.mandatoryChannels?.inApp || !currentPref.userCanModify}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="whatsapp-toggle" className="cursor-pointer">
                        <div>
                          <p className="font-medium">
                            WhatsApp Business
                            {currentPref.mandatoryChannels?.whatsapp && (
                              <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Receive messages via WhatsApp (requires opt-in)
                          </p>
                        </div>
                      </Label>
                    </div>
                    <Switch
                      id="whatsapp-toggle"
                      checked={currentPref.channels?.whatsapp || currentPref.mandatoryChannels?.whatsapp || false}
                      onCheckedChange={() => handleChannelToggle(selectedCategory, 'whatsapp')}
                      disabled={currentPref.mandatoryChannels?.whatsapp || !currentPref.userCanModify}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Frequency & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Delivery Frequency</Label>
                  <Select
                    value={currentPref.frequency}
                    onValueChange={(value) => handleFrequencyChange(selectedCategory, value)}
                  >
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How often to receive non-critical notifications
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority Filter</Label>
                  <Select
                    value={currentPref.priority}
                    onValueChange={(value) => handlePriorityChange(selectedCategory, value)}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Filter notifications by priority level
                  </p>
                </div>
              </div>

              <Separator />

              {/* Quiet Hours */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium">Quiet Hours</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pause non-critical notifications during specific hours
                    </p>
                  </div>
                  <Switch
                    checked={currentPref.quietHours?.enabled || false}
                    onCheckedChange={() => handleQuietHoursToggle(selectedCategory)}
                  />
                </div>

                {currentPref.quietHours?.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quiet-start">Start Time</Label>
                      <input
                        id="quiet-start"
                        type="time"
                        value={currentPref.quietHours.start}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          [selectedCategory]: {
                            ...prev[selectedCategory],
                            quietHours: {
                              ...prev[selectedCategory].quietHours!,
                              start: e.target.value
                            }
                          }
                        }))}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiet-end">End Time</Label>
                      <input
                        id="quiet-end"
                        type="time"
                        value={currentPref.quietHours.end}
                        onChange={(e) => setPreferences(prev => ({
                          ...prev,
                          [selectedCategory]: {
                            ...prev[selectedCategory],
                            quietHours: {
                              ...prev[selectedCategory].quietHours!,
                              end: e.target.value
                            }
                          }
                        }))}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSavePreferences}
                  disabled={savePreferences.isPending}
                  className="min-w-32"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savePreferences.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Global Settings Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Global Settings</CardTitle>
              <CardDescription>Settings that apply to all notification categories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Timezone</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All notification times will be displayed in this timezone
                  </p>
                </div>
                <Badge variant="secondary">Auckland, New Zealand</Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Language</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notification content language preference
                  </p>
                </div>
                <Badge variant="secondary">English</Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compliance Mode</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fortune 50 compliance with audit trails and SLA tracking
                  </p>
                </div>
                <Badge variant="default">
                  <Shield className="h-3 w-3 mr-1" />
                  Enabled
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}