import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Bell, 
  Clock, 
  Calendar, 
  Users, 
  Settings, 
  Plus,
  Edit,
  Trash2,
  Send,
  MessageSquare,
  Mail,
  Loader2
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ShiftNotification } from '@shared/schema';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Form schema for shift notifications
const shiftNotificationFormSchema = z.object({
  userId: z.number().optional(),
  shiftId: z.number().optional(),
  departmentId: z.number().optional(),
  scheduleType: z.enum(['daily', 'weekly', 'shift_based']),
  scheduledTime: z.string(),
  minutesBefore: z.number().min(0).max(1440),
  notificationChannels: z.array(z.string()).min(1, 'Select at least one channel'),
  message: z.string().optional(),
  enabled: z.boolean(),
  metadata: z.any().optional()
});

type ShiftNotificationForm = z.infer<typeof shiftNotificationFormSchema>;

export function ShiftReminderConfigurator() {
  const { toast } = useToast();
  const [selectedReminder, setSelectedReminder] = useState<ShiftNotification | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [preferencesDialogOpen, setPreferencesDialogOpen] = useState(false);
  
  // Form instance with Zod validation
  const form = useForm<ShiftNotificationForm>({
    resolver: zodResolver(shiftNotificationFormSchema),
    defaultValues: {
      name: '',
      scheduleType: 'daily',
      scheduledTime: '08:00',
      minutesBefore: 15,
      notificationChannels: ['email'],
      message: '',
      enabled: true
    }
  });

  // Fetch reminders
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['/api/time/reminders'],
  });

  // Fetch upcoming reminders
  const { data: upcomingReminders = [] } = useQuery({
    queryKey: ['/api/time/reminders/upcoming'],
  });

  // Fetch notification preferences
  const { data: preferences = [] } = useQuery({
    queryKey: ['/api/time/reminders/preferences'],
  });

  // Create reminder mutation
  const createMutation = useMutation({
    mutationFn: async (data: ShiftNotificationForm) => {
      return apiRequest('/api/time/reminders/schedule', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Reminder created',
        description: 'Shift reminder has been scheduled successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time/reminders'] });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create reminder',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Update reminder mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      return apiRequest(`/api/time/reminders/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data.updates),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Reminder updated',
        description: 'Changes have been saved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time/reminders'] });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update reminder',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Delete reminder mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/time/reminders/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Reminder deleted',
        description: 'The reminder has been removed',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/time/reminders'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete reminder',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Toggle reminder enabled state
  const toggleMutation = useMutation({
    mutationFn: async (data: { id: number; enabled: boolean }) => {
      return apiRequest(`/api/time/reminders/${data.id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enabled: data.enabled }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/time/reminders'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to toggle reminder',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Test reminder mutation
  const testMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/time/reminders/${id}/test`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Test sent',
        description: 'Test notifications have been sent to configured channels',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Test failed',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setReminderName('');
    setReminderType('clock_in');
    setMinutesBefore(15);
    setRecipientType('all');
    setNotificationChannels(['email', 'push']);
    setCustomMessage('');
    setReminderEnabled(true);
  };

  const handleCreateReminder = () => {
    if (!reminderName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please provide a name for the reminder',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate({
      name: reminderName,
      reminderType,
      minutesBefore,
      recipientType,
      notificationChannels,
      message: customMessage || getDefaultMessage(reminderType),
      enabled: reminderEnabled,
    });
  };

  const handleUpdateReminder = () => {
    if (!selectedReminder) return;

    updateMutation.mutate({
      id: selectedReminder.id,
      updates: {
        name: reminderName,
        reminderType,
        minutesBefore,
        recipientType,
        notificationChannels,
        message: customMessage,
        enabled: reminderEnabled,
      },
    });
  };

  const handleEditReminder = (reminder: ShiftReminder) => {
    setSelectedReminder(reminder);
    setReminderName(reminder.name);
    setReminderType(reminder.reminderType);
    setMinutesBefore(reminder.minutesBefore);
    setRecipientType(reminder.recipientType);
    setNotificationChannels(reminder.notificationChannels);
    setCustomMessage(reminder.message);
    setReminderEnabled(reminder.enabled);
    setEditDialogOpen(true);
  };

  const getDefaultMessage = (type: string): string => {
    switch (type) {
      case 'clock_in':
        return 'Your shift starts in {minutes} minutes. Please clock in on time.';
      case 'clock_out':
        return 'Your shift ends in {minutes} minutes. Remember to clock out.';
      case 'break_start':
        return 'Break time in {minutes} minutes.';
      case 'break_end':
        return 'Break ends in {minutes} minutes. Please return to work.';
      default:
        return 'Shift reminder: {minutes} minutes';
    }
  };

  const getReminderTypeIcon = (type: string) => {
    switch (type) {
      case 'clock_in':
        return <Clock className="h-4 w-4 text-green-600" />;
      case 'clock_out':
        return <Clock className="h-4 w-4 text-red-600" />;
      case 'break_start':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'break_end':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Shift Reminder Configuration</h2>
          <p className="text-muted-foreground">
            Set up automated reminders for employee shifts and breaks
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPreferencesDialogOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-reminder">
            <Plus className="h-4 w-4 mr-2" />
            Create Reminder
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reminders.filter((r: ShiftReminder) => r.enabled).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{preferences.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Today's Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {upcomingReminders.filter((r: any) => 
                new Date(r.nextTrigger).toDateString() === new Date().toDateString()
              ).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Channels Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Mail className="h-5 w-5 text-green-600" />
              <MessageSquare className="h-5 w-5 text-green-600" />
              <Bell className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reminders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Timing</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Next Trigger</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Loading reminders...
                  </TableCell>
                </TableRow>
              ) : reminders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No reminders configured
                  </TableCell>
                </TableRow>
              ) : (
                reminders.map((reminder: ShiftReminder) => (
                  <TableRow key={reminder.id}>
                    <TableCell>
                      <Switch
                        checked={reminder.enabled}
                        onCheckedChange={(enabled) => 
                          toggleMutation.mutate({ id: reminder.id, enabled })
                        }
                        data-testid={`switch-reminder-${reminder.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{reminder.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getReminderTypeIcon(reminder.reminderType)}
                        <span className="capitalize">
                          {reminder.reminderType.replace('_', ' ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{reminder.minutesBefore} min before</TableCell>
                    <TableCell>
                      <span className="capitalize">{reminder.recipientType}</span>
                      {reminder.departmentName && ` - ${reminder.departmentName}`}
                      {reminder.shiftName && ` - ${reminder.shiftName}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {reminder.notificationChannels.includes('email') && (
                          <Mail className="h-4 w-4" />
                        )}
                        {reminder.notificationChannels.includes('whatsapp') && (
                          <MessageSquare className="h-4 w-4" />
                        )}
                        {reminder.notificationChannels.includes('push') && (
                          <Bell className="h-4 w-4" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {reminder.nextTrigger ? (
                        <span className="text-sm">
                          {format(new Date(reminder.nextTrigger), 'MMM dd, HH:mm')}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => testMutation.mutate(reminder.id)}
                          data-testid={`button-test-${reminder.id}`}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditReminder(reminder)}
                          data-testid={`button-edit-${reminder.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(reminder.id)}
                          data-testid={`button-delete-${reminder.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upcoming Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {upcomingReminders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No reminders scheduled for the next 24 hours
              </p>
            ) : (
              upcomingReminders.slice(0, 5).map((upcoming: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{upcoming.reminderName}</p>
                      <p className="text-sm text-muted-foreground">
                        {upcoming.recipientCount} recipients
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(upcoming.scheduledTime), 'HH:mm')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(upcoming.scheduledTime), 'MMM dd')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Reminder Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Shift Reminder</DialogTitle>
            <DialogDescription>
              Configure automated reminders for shifts and breaks
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Reminder Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Morning Shift Start"
                  value={reminderName}
                  onChange={(e) => setReminderName(e.target.value)}
                  data-testid="input-reminder-name"
                />
              </div>
              <div>
                <Label htmlFor="type">Reminder Type</Label>
                <Select value={reminderType} onValueChange={setReminderType}>
                  <SelectTrigger id="type" data-testid="select-reminder-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clock_in">Clock In</SelectItem>
                    <SelectItem value="clock_out">Clock Out</SelectItem>
                    <SelectItem value="break_start">Break Start</SelectItem>
                    <SelectItem value="break_end">Break End</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timing">Minutes Before Event</Label>
                <Input
                  id="timing"
                  type="number"
                  min="5"
                  max="120"
                  value={minutesBefore}
                  onChange={(e) => setMinutesBefore(parseInt(e.target.value) || 15)}
                  data-testid="input-minutes-before"
                />
              </div>
              <div>
                <Label htmlFor="recipients">Recipient Group</Label>
                <Select value={recipientType} onValueChange={setRecipientType}>
                  <SelectTrigger id="recipients" data-testid="select-recipient-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="department">By Department</SelectItem>
                    <SelectItem value="shift">By Shift</SelectItem>
                    <SelectItem value="specific">Specific Employees</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notification Channels</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notificationChannels.includes('email')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNotificationChannels([...notificationChannels, 'email']);
                      } else {
                        setNotificationChannels(notificationChannels.filter(c => c !== 'email'));
                      }
                    }}
                  />
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notificationChannels.includes('whatsapp')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNotificationChannels([...notificationChannels, 'whatsapp']);
                      } else {
                        setNotificationChannels(notificationChannels.filter(c => c !== 'whatsapp'));
                      }
                    }}
                  />
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={notificationChannels.includes('push')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNotificationChannels([...notificationChannels, 'push']);
                      } else {
                        setNotificationChannels(notificationChannels.filter(c => c !== 'push'));
                      }
                    }}
                  />
                  <Bell className="h-4 w-4" />
                  Push
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="message">Custom Message (Optional)</Label>
              <Input
                id="message"
                placeholder={getDefaultMessage(reminderType)}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                data-testid="input-custom-message"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use {'{minutes}'} as a placeholder for the time before event
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={reminderEnabled}
                  onCheckedChange={setReminderEnabled}
                  data-testid="switch-reminder-enabled"
                />
                <Label>Enable immediately</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateReminder}
              disabled={createMutation.isPending}
              data-testid="button-save-reminder"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Reminder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Reminder Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Reminder</DialogTitle>
            <DialogDescription>
              Update reminder configuration
            </DialogDescription>
          </DialogHeader>
          
          {/* Same form fields as create dialog */}
          <div className="space-y-4">
            {/* Form fields identical to create dialog */}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateReminder}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Reminder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preferences Dialog */}
      <Dialog open={preferencesDialogOpen} onOpenChange={setPreferencesDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
            <DialogDescription>
              Manage employee notification preferences
            </DialogDescription>
          </DialogHeader>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Push</TableHead>
                <TableHead>In-App</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preferences.map((pref: NotificationPreference) => (
                <TableRow key={pref.userId}>
                  <TableCell>{pref.userName}</TableCell>
                  <TableCell>
                    <Switch checked={pref.email} disabled />
                  </TableCell>
                  <TableCell>
                    <Switch checked={pref.whatsapp} disabled />
                  </TableCell>
                  <TableCell>
                    <Switch checked={pref.push} disabled />
                  </TableCell>
                  <TableCell>
                    <Switch checked={pref.inApp} disabled />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <DialogFooter>
            <Button onClick={() => setPreferencesDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}