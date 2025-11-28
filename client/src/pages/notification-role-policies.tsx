import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Settings, 
  Shield, 
  Bell, 
  Lock, 
  Unlock,
  Users,
  AlertTriangle,
  ChevronRight,
  Save,
  RefreshCw
} from "lucide-react";

interface NotificationPolicy {
  id?: number;
  role: string;
  category: string;
  mandatoryChannels: {
    email: boolean;
    inApp: boolean;
    whatsapp: boolean;
  };
  defaultChannels: {
    email: boolean;
    inApp: boolean;
    whatsapp: boolean;
  };
  mandatoryPriorityLevels: string[];
  userCanModify: boolean;
  escalationEnabled: boolean;
  escalationDelayMinutes: number;
  escalationToRole?: string;
}

const ROLES = [
  { id: 'owner', name: 'Business Owner', color: 'bg-purple-100 text-purple-800' },
  { id: 'admin', name: 'Administrator', color: 'bg-blue-100 text-blue-800' },
  { id: 'manager', name: 'Manager', color: 'bg-green-100 text-green-800' },
  { id: 'employee', name: 'Employee', color: 'bg-gray-100 text-gray-800' },
  { id: 'viewer', name: 'Viewer', color: 'bg-yellow-100 text-yellow-800' }
];

const CATEGORIES = [
  { id: 'time_clock', name: 'Time & Attendance', icon: '🕐' },
  { id: 'payroll', name: 'Payroll', icon: '💰' },
  { id: 'approvals', name: 'Approvals', icon: '✓' },
  { id: 'compliance', name: 'Compliance', icon: '🛡️' }
];

const PRIORITY_LEVELS = [
  { id: 'critical', name: 'Critical', color: 'text-red-600' },
  { id: 'high', name: 'High', color: 'text-orange-600' },
  { id: 'normal', name: 'Normal', color: 'text-blue-600' },
  { id: 'low', name: 'Low', color: 'text-gray-600' }
];

// Helper to convert array or object channel data to boolean object format
const normalizeChannels = (channels: any): { email: boolean; inApp: boolean; whatsapp: boolean } => {
  const result = { email: false, inApp: false, whatsapp: false };
  
  if (!channels) return result;
  
  // If it's already an object with boolean values
  if (typeof channels === 'object' && !Array.isArray(channels)) {
    result.email = !!channels.email;
    result.inApp = !!channels.inApp;
    result.whatsapp = !!channels.whatsapp;
    return result;
  }
  
  // If it's an array of channel names
  if (Array.isArray(channels)) {
    channels.forEach((channel: string) => {
      if (channel === 'email') result.email = true;
      if (channel === 'inApp') result.inApp = true;
      if (channel === 'whatsapp') result.whatsapp = true;
    });
    return result;
  }
  
  return result;
};

export default function NotificationRolePolicies() {
  const { toast } = useToast();
  const [selectedPolicy, setSelectedPolicy] = useState<{ role: string; category: string } | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<NotificationPolicy | null>(null);

  // Fetch policies - this is the single source of truth
  const { data: policiesData, isLoading } = useQuery({
    queryKey: ['/api/notifications/policies'],
    enabled: true,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true
  });

  // Derive policies directly from query data using useMemo
  // This ensures the matrix always reflects the latest data
  const policies = useMemo(() => {
    const policyMap: Record<string, NotificationPolicy> = {};
    
    if (policiesData?.policies) {
      policiesData.policies.forEach((policy: any) => {
        const key = `${policy.role}-${policy.category}`;
        policyMap[key] = {
          ...policy,
          mandatoryChannels: normalizeChannels(policy.mandatoryChannels),
          defaultChannels: normalizeChannels(policy.defaultChannels)
        };
      });
    }
    
    console.log('[Policy Matrix] Policies updated:', Object.keys(policyMap).length, 'policies loaded');
    return policyMap;
  }, [policiesData]);

  // Save policy mutation
  const savePolicyMutation = useMutation({
    mutationFn: (policy: NotificationPolicy) => {
      // Convert channel objects to arrays for backend compatibility
      const channelsToArray = (channels: Record<string, boolean>) => {
        const result = Object.entries(channels)
          .filter(([_, enabled]) => enabled)
          .map(([channel, _]) => channel);
        console.log('[Policy Save] Converting channels:', channels, '-> Array:', result);
        return result;
      };

      const payload = {
        role: policy.role,
        category: policy.category,
        mandatoryChannels: channelsToArray(policy.mandatoryChannels),
        defaultChannels: channelsToArray(policy.defaultChannels),
        mandatoryPriorityLevels: policy.mandatoryPriorityLevels,
        userCanModify: policy.userCanModify,
        escalationEnabled: policy.escalationEnabled,
        escalationDelayMinutes: policy.escalationDelayMinutes || 30,
        escalationToRole: policy.escalationToRole || null
      };

      console.log('[Policy Save] Full payload:', JSON.stringify(payload, null, 2));

      // apiRequest expects: (url, method, data) - three separate arguments
      return apiRequest('/api/notifications/policies', 'POST', payload);
    },
    onSuccess: async () => {
      toast({
        title: "Policy Updated",
        description: "Notification policy has been saved and synced to all affected users",
      });
      
      // Force refetch by invalidating AND refetching (needed due to global staleTime: Infinity)
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/notifications/policies'],
        refetchType: 'all' // Force immediate refetch despite staleTime
      });
      
      // Also explicitly refetch to ensure fresh data
      await queryClient.refetchQueries({ 
        queryKey: ['/api/notifications/policies'] 
      });
      
      // CRITICAL: Also invalidate and refetch preferences since they are now synced
      // When admin updates a policy, the backend cascades changes to all affected user preferences
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/notifications/preferences'],
        refetchType: 'all'
      });
      
      await queryClient.refetchQueries({ 
        queryKey: ['/api/notifications/preferences'] 
      });
      
      console.log('[Policy Save] Cache invalidated for both policies and preferences, sync complete');
      
      setSelectedPolicy(null);
      setEditingPolicy(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.error || error?.message || "Failed to update notification policy";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  // Get policy for a role/category combination
  const getPolicy = (role: string, category: string): NotificationPolicy => {
    const key = `${role}-${category}`;
    return policies[key] || {
      role,
      category,
      mandatoryChannels: { email: false, inApp: false, whatsapp: false },
      defaultChannels: { email: true, inApp: true, whatsapp: false },
      mandatoryPriorityLevels: ['critical'],
      userCanModify: true,
      escalationEnabled: false,
      escalationDelayMinutes: 30
    };
  };

  // Get status indicator for a policy
  const getPolicyStatus = (policy: NotificationPolicy) => {
    const hasMandatory = policy.mandatoryChannels.email || policy.mandatoryChannels.inApp || policy.mandatoryChannels.whatsapp;
    
    if (!policy.userCanModify && hasMandatory) {
      return { color: 'bg-red-500', tooltip: 'Strictly enforced' };
    } else if (hasMandatory) {
      return { color: 'bg-orange-500', tooltip: 'Partially enforced' };
    } else if (!policy.userCanModify) {
      return { color: 'bg-yellow-500', tooltip: 'Locked defaults' };
    }
    return { color: 'bg-green-500', tooltip: 'User controlled' };
  };

  const handleEditPolicy = (role: string, category: string) => {
    const policy = getPolicy(role, category);
    setEditingPolicy({ ...policy });
    setSelectedPolicy({ role, category });
  };

  const handleSavePolicy = () => {
    if (editingPolicy) {
      savePolicyMutation.mutate(editingPolicy);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Notification Policy Management</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure mandatory notification channels and settings for each role. These policies override user preferences for critical communications.
        </p>
      </div>

      {/* Important Note */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Settings className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-medium text-blue-900">Understanding This Dashboard</p>
                <a 
                  href="/notifications/preferences-report"
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
                  data-testid="link-preferences-report"
                >
                  <Users className="h-4 w-4" />
                  View User Preferences Report
                </a>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                This matrix shows <strong>organizational policies</strong> that you define for each role. 
                These policies control what notification channels are mandatory or available to users. 
                When you update a policy here, it automatically syncs to all users with that role.
              </p>
              <p className="text-sm text-blue-600 mt-2">
                Individual users can adjust their preferences within the bounds you set here, but their personal choices won't change this policy view. 
                <strong> Need to see what individual users have selected?</strong> Click the "View User Preferences Report" button above.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Policy Status Legend</CardTitle>
          <CardDescription className="text-xs">
            How each policy constrains user preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Colors */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Enforcement Level (Colored Dots)</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span>Strictly Enforced - All channels locked, users cannot modify</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
                <span>Partially Enforced - Some mandatory channels, others optional</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span>Locked Defaults - Defaults set, users cannot modify</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span>User Controlled - Users have full flexibility to choose</span>
              </div>
            </div>
          </div>
          
          {/* Channel Badges */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Channel Indicators (E=Email, A=In-App, W=WhatsApp)</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge className="text-xs px-1 py-0 bg-red-600 text-white">E</Badge>
                <span>Mandatory - Users cannot disable this channel</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs px-1 py-0 border-blue-400 text-blue-600">E</Badge>
                <span>Default - Pre-selected for users, but they can change it</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policy Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Role × Category Policy Matrix</CardTitle>
          <CardDescription>
            Click any cell to configure notification policies for that role and category combination
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-3 border-b font-medium">Role</th>
                  {CATEGORIES.map(category => (
                    <th key={category.id} className="text-center p-3 border-b border-l font-medium">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-lg">{category.icon}</span>
                        <span className="text-xs">{category.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES.map(role => (
                  <tr key={role.id} className="hover:bg-accent/50">
                    <td className="p-3 border-b">
                      <Badge className={role.color}>{role.name}</Badge>
                    </td>
                    {CATEGORIES.map(category => {
                      const policy = getPolicy(role.id, category.id);
                      const status = getPolicyStatus(policy);
                      
                      return (
                        <td key={category.id} className="p-3 border-b border-l">
                          <button
                            onClick={() => handleEditPolicy(role.id, category.id)}
                            className="w-full h-full flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors"
                          >
                            <div 
                              className={`w-4 h-4 rounded-full ${status.color}`}
                              title={status.tooltip}
                            />
                            {/* Channel Badges - Two rows: Mandatory (solid) and Default (outlined) */}
                            <div className="flex flex-col gap-1">
                              {/* Mandatory Channels - Solid badges */}
                              <div className="flex gap-0.5 justify-center">
                                {policy.mandatoryChannels.email && (
                                  <Badge className="text-xs px-1 py-0 bg-red-600 text-white" title="Email - Mandatory">E</Badge>
                                )}
                                {policy.mandatoryChannels.inApp && (
                                  <Badge className="text-xs px-1 py-0 bg-red-600 text-white" title="In-App - Mandatory">A</Badge>
                                )}
                                {policy.mandatoryChannels.whatsapp && (
                                  <Badge className="text-xs px-1 py-0 bg-red-600 text-white" title="WhatsApp - Mandatory">W</Badge>
                                )}
                              </div>
                              {/* Default Channels - Outlined badges (only show if not already mandatory) */}
                              <div className="flex gap-0.5 justify-center">
                                {policy.defaultChannels.email && !policy.mandatoryChannels.email && (
                                  <Badge variant="outline" className="text-xs px-1 py-0 border-blue-400 text-blue-600" title="Email - Default">E</Badge>
                                )}
                                {policy.defaultChannels.inApp && !policy.mandatoryChannels.inApp && (
                                  <Badge variant="outline" className="text-xs px-1 py-0 border-blue-400 text-blue-600" title="In-App - Default">A</Badge>
                                )}
                                {policy.defaultChannels.whatsapp && !policy.mandatoryChannels.whatsapp && (
                                  <Badge variant="outline" className="text-xs px-1 py-0 border-blue-400 text-blue-600" title="WhatsApp - Default">W</Badge>
                                )}
                              </div>
                            </div>
                            {policy.escalationEnabled && (
                              <AlertTriangle className="h-3 w-3 text-orange-500" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Policy Editor Sheet */}
      <Sheet open={selectedPolicy !== null} onOpenChange={(open) => !open && setSelectedPolicy(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {editingPolicy && (
            <>
              <SheetHeader>
                <SheetTitle>
                  Configure Policy: {ROLES.find(r => r.id === editingPolicy.role)?.name} - {CATEGORIES.find(c => c.id === editingPolicy.category)?.name}
                </SheetTitle>
                <SheetDescription>
                  Define mandatory channels and settings that override user preferences
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* User Modification Control */}
                <div className="space-y-2">
                  <Label>User Control</Label>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {editingPolicy.userCanModify ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      <div>
                        <p className="font-medium">Allow User Modifications</p>
                        <p className="text-xs text-muted-foreground">
                          Users can adjust non-mandatory settings
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={editingPolicy.userCanModify}
                      onCheckedChange={(checked) => 
                        setEditingPolicy({ ...editingPolicy, userCanModify: checked })
                      }
                    />
                  </div>
                </div>

                <Separator />

                {/* Mandatory Channels */}
                <div className="space-y-2">
                  <Label>Mandatory Channels</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Users cannot disable these channels for this category
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="mandatory-email">Email (Required)</Label>
                      <Switch
                        id="mandatory-email"
                        checked={editingPolicy.mandatoryChannels.email}
                        onCheckedChange={(checked) =>
                          setEditingPolicy({
                            ...editingPolicy,
                            mandatoryChannels: { ...editingPolicy.mandatoryChannels, email: checked }
                          })
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="mandatory-inapp">In-App (Required)</Label>
                      <Switch
                        id="mandatory-inapp"
                        checked={editingPolicy.mandatoryChannels.inApp}
                        onCheckedChange={(checked) =>
                          setEditingPolicy({
                            ...editingPolicy,
                            mandatoryChannels: { ...editingPolicy.mandatoryChannels, inApp: checked }
                          })
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="mandatory-whatsapp">WhatsApp (Required)</Label>
                      <Switch
                        id="mandatory-whatsapp"
                        checked={editingPolicy.mandatoryChannels.whatsapp}
                        onCheckedChange={(checked) =>
                          setEditingPolicy({
                            ...editingPolicy,
                            mandatoryChannels: { ...editingPolicy.mandatoryChannels, whatsapp: checked }
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Default Channels */}
                <div className="space-y-2">
                  <Label>Default Channels</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Applied when users haven't set preferences
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="default-email">Email</Label>
                      <Switch
                        id="default-email"
                        checked={editingPolicy.defaultChannels.email}
                        onCheckedChange={(checked) =>
                          setEditingPolicy({
                            ...editingPolicy,
                            defaultChannels: { ...editingPolicy.defaultChannels, email: checked }
                          })
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="default-inapp">In-App</Label>
                      <Switch
                        id="default-inapp"
                        checked={editingPolicy.defaultChannels.inApp}
                        onCheckedChange={(checked) =>
                          setEditingPolicy({
                            ...editingPolicy,
                            defaultChannels: { ...editingPolicy.defaultChannels, inApp: checked }
                          })
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="default-whatsapp">WhatsApp</Label>
                      <Switch
                        id="default-whatsapp"
                        checked={editingPolicy.defaultChannels.whatsapp}
                        onCheckedChange={(checked) =>
                          setEditingPolicy({
                            ...editingPolicy,
                            defaultChannels: { ...editingPolicy.defaultChannels, whatsapp: checked }
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Mandatory Priority Levels */}
                <div className="space-y-2">
                  <Label>Mandatory Priority Levels</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Notifications at these priority levels are always mandatory
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {PRIORITY_LEVELS.map(level => (
                      <Button
                        key={level.id}
                        variant={editingPolicy.mandatoryPriorityLevels.includes(level.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const levels = editingPolicy.mandatoryPriorityLevels;
                          if (levels.includes(level.id)) {
                            setEditingPolicy({
                              ...editingPolicy,
                              mandatoryPriorityLevels: levels.filter(l => l !== level.id)
                            });
                          } else {
                            setEditingPolicy({
                              ...editingPolicy,
                              mandatoryPriorityLevels: [...levels, level.id]
                            });
                          }
                        }}
                      >
                        <span className={level.color}>{level.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Escalation Settings */}
                <div className="space-y-2">
                  <Label>Escalation Settings</Label>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Enable Escalation</p>
                      <p className="text-xs text-muted-foreground">
                        Escalate unacknowledged critical notifications
                      </p>
                    </div>
                    <Switch
                      checked={editingPolicy.escalationEnabled}
                      onCheckedChange={(checked) =>
                        setEditingPolicy({ ...editingPolicy, escalationEnabled: checked })
                      }
                    />
                  </div>
                  
                  {editingPolicy.escalationEnabled && (
                    <div className="space-y-3 mt-3">
                      <div>
                        <Label htmlFor="escalation-delay">Escalation Delay (minutes)</Label>
                        <input
                          id="escalation-delay"
                          type="number"
                          className="w-full mt-1 px-3 py-2 border rounded-md"
                          value={editingPolicy.escalationDelayMinutes}
                          onChange={(e) =>
                            setEditingPolicy({
                              ...editingPolicy,
                              escalationDelayMinutes: parseInt(e.target.value) || 30
                            })
                          }
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="escalation-role">Escalate To Role</Label>
                        <Select
                          value={editingPolicy.escalationToRole || ''}
                          onValueChange={(value) =>
                            setEditingPolicy({ ...editingPolicy, escalationToRole: value })
                          }
                        >
                          <SelectTrigger id="escalation-role" className="mt-1">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.filter(r => r.id !== editingPolicy.role).map(role => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={handleSavePolicy}
                    disabled={savePolicyMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Policy
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedPolicy(null);
                      setEditingPolicy(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}