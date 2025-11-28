import { useState } from "react";
import { Calendar, Link, Unlink, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

type CalendarProvider = 'google' | 'outlook' | 'ical';

interface CalendarSyncConfig {
  id?: number;
  provider: CalendarProvider;
  connected: boolean;
  syncEnabled: boolean;
  syncDirection: 'one-way' | 'two-way';
  calendarName?: string;
  lastSync?: Date;
  syncFrequency: 'real-time' | 'hourly' | 'daily';
}

export function CalendarSyncSettings() {
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider>('google');
  const { toast } = useToast();

  // Query existing calendar sync configuration
  const { data: syncConfig, isLoading } = useQuery<CalendarSyncConfig>({
    queryKey: ['/api/time/calendar/config'],
    enabled: true
  });

  // Connect calendar mutation
  const connectCalendarMutation = useMutation({
    mutationFn: async (provider: CalendarProvider) => {
      // This would initiate OAuth flow for calendar connection
      const response = await apiRequest('/api/time/calendar/connect', 'POST', { provider });
      
      // In production, this would redirect to OAuth
      if (response.authUrl) {
        window.location.href = response.authUrl;
      }
      
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Calendar Connected",
        description: "Your calendar has been successfully connected."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time/calendar/config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect calendar.",
        variant: "destructive"
      });
    }
  });

  // Disconnect calendar mutation
  const disconnectCalendarMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/time/calendar/disconnect', 'POST', {});
    },
    onSuccess: () => {
      toast({
        title: "Calendar Disconnected",
        description: "Your calendar has been disconnected."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time/calendar/config'] });
    }
  });

  // Update sync settings mutation
  const updateSyncSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<CalendarSyncConfig>) => {
      return apiRequest('/api/time/calendar/settings', 'PUT', settings);
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Calendar sync settings have been updated."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time/calendar/config'] });
    }
  });

  // Manual sync mutation
  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/time/calendar/sync', 'POST', {});
    },
    onSuccess: (data) => {
      toast({
        title: "Sync Complete",
        description: `Synced ${data.eventsCreated || 0} events to calendar.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time/calendar/config'] });
    }
  });

  const handleConnect = () => {
    connectCalendarMutation.mutate(selectedProvider);
  };

  const handleDisconnect = () => {
    disconnectCalendarMutation.mutate();
  };

  const handleSyncToggle = (enabled: boolean) => {
    updateSyncSettingsMutation.mutate({ syncEnabled: enabled });
  };

  const handleSyncDirectionChange = (direction: 'one-way' | 'two-way') => {
    updateSyncSettingsMutation.mutate({ syncDirection: direction });
  };

  const handleSyncFrequencyChange = (frequency: 'real-time' | 'hourly' | 'daily') => {
    updateSyncSettingsMutation.mutate({ syncFrequency: frequency });
  };

  const handleManualSync = () => {
    manualSyncMutation.mutate();
  };

  if (isLoading) {
    return <div>Loading calendar settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Sync Settings
        </CardTitle>
        <CardDescription>
          Sync your work schedule with your personal calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!syncConfig?.connected ? (
          // Connect Calendar Section
          <div className="space-y-4">
            <div>
              <Label htmlFor="provider">Calendar Provider</Label>
              <Select
                value={selectedProvider}
                onValueChange={(value) => setSelectedProvider(value as CalendarProvider)}
              >
                <SelectTrigger id="provider" data-testid="select-calendar-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google" data-testid="option-google">
                    Google Calendar
                  </SelectItem>
                  <SelectItem value="outlook" data-testid="option-outlook">
                    Outlook Calendar
                  </SelectItem>
                  <SelectItem value="ical" data-testid="option-ical">
                    iCal (Apple Calendar)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleConnect}
              className="w-full"
              disabled={connectCalendarMutation.isPending}
              data-testid="button-connect-calendar"
            >
              <Link className="h-4 w-4 mr-2" />
              {connectCalendarMutation.isPending ? "Connecting..." : "Connect Calendar"}
            </Button>

            <div className="text-sm text-muted-foreground">
              <p>When connected, your shifts will automatically sync to your calendar:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Clock-in/out times appear as calendar events</li>
                <li>Approved time-off requests block your calendar</li>
                <li>Shift reminders sync with calendar notifications</li>
                <li>Manager changes update your calendar in real-time</li>
              </ul>
            </div>
          </div>
        ) : (
          // Connected Calendar Settings
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium">
                    Connected to {syncConfig.calendarName || syncConfig.provider}
                  </p>
                  {syncConfig.lastSync && (
                    <p className="text-sm text-muted-foreground">
                      Last synced: {new Date(syncConfig.lastSync).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnectCalendarMutation.isPending}
                data-testid="button-disconnect-calendar"
              >
                <Unlink className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            </div>

            {/* Sync Settings */}
            <div className="space-y-4">
              {/* Sync Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sync-enabled">Enable Automatic Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync shifts to your calendar
                  </p>
                </div>
                <Switch
                  id="sync-enabled"
                  checked={syncConfig.syncEnabled}
                  onCheckedChange={handleSyncToggle}
                  disabled={updateSyncSettingsMutation.isPending}
                  data-testid="switch-sync-enabled"
                />
              </div>

              {/* Sync Direction */}
              {syncConfig.syncEnabled && (
                <>
                  <div>
                    <Label htmlFor="sync-direction">Sync Direction</Label>
                    <Select
                      value={syncConfig.syncDirection}
                      onValueChange={handleSyncDirectionChange}
                      disabled={updateSyncSettingsMutation.isPending}
                    >
                      <SelectTrigger id="sync-direction" data-testid="select-sync-direction">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="one-way" data-testid="option-one-way">
                          One-way (STEELIQ → Calendar)
                        </SelectItem>
                        <SelectItem value="two-way" data-testid="option-two-way">
                          Two-way Sync
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-1">
                      {syncConfig.syncDirection === 'one-way' 
                        ? "Only sync shifts from STEELIQ to your calendar"
                        : "Sync changes in both directions"}
                    </p>
                  </div>

                  {/* Sync Frequency */}
                  <div>
                    <Label htmlFor="sync-frequency">Sync Frequency</Label>
                    <Select
                      value={syncConfig.syncFrequency}
                      onValueChange={handleSyncFrequencyChange}
                      disabled={updateSyncSettingsMutation.isPending}
                    >
                      <SelectTrigger id="sync-frequency" data-testid="select-sync-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="real-time" data-testid="option-real-time">
                          Real-time
                        </SelectItem>
                        <SelectItem value="hourly" data-testid="option-hourly">
                          Every Hour
                        </SelectItem>
                        <SelectItem value="daily" data-testid="option-daily">
                          Once Daily
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Manual Sync Button */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleManualSync}
                disabled={manualSyncMutation.isPending}
                data-testid="button-manual-sync"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${manualSyncMutation.isPending ? 'animate-spin' : ''}`} />
                {manualSyncMutation.isPending ? "Syncing..." : "Sync Now"}
              </Button>
            </div>

            {/* Sync Status */}
            {syncConfig.syncEnabled && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant={syncConfig.syncEnabled ? "default" : "secondary"}>
                  {syncConfig.syncFrequency === 'real-time' ? 'Real-time Sync Active' : 
                   syncConfig.syncFrequency === 'hourly' ? 'Syncing Hourly' : 'Daily Sync'}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}