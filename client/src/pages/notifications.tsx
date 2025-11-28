import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock, 
  Filter, 
  Search,
  Mail,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Archive,
  Trash2,
  MoreVertical,
  ExternalLink,
  Calendar,
  MessageSquare,
  Smartphone
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Notification {
  notificationId: string;
  userId: number;
  type: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  subject: string;
  body: string;
  htmlBody?: string;
  jsonData?: any;
  isRead: boolean;
  readAt?: string;
  isArchived: boolean;
  archivedAt?: string;
  acknowledgmentRequired: boolean;
  acknowledgedAt?: string;
  actionUrl?: string;
  createdAt: string;
  expiresAt?: string;
  deliveryChannel?: string;
  deliveryStatus?: string;
}

const AUCKLAND_TZ = 'Pacific/Auckland';

export default function NotificationsPage() {
  const [selectedTab, setSelectedTab] = useState<'all' | 'unread' | 'archived'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());

  // Fetch notifications
  const { data: notificationData, isLoading, refetch } = useQuery<{ notifications: Notification[], hasMore: boolean }>({
    queryKey: ['/api/notifications', selectedTab, selectedCategory, selectedPriority],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTab === 'unread') params.append('unread', 'true');
      if (selectedTab === 'archived') params.append('archived', 'true');
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedPriority !== 'all') params.append('priority', selectedPriority);
      
      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    }
  });

  const notifications = notificationData?.notifications || [];

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'Notification marked as read',
        description: 'The notification has been marked as read.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read.',
        variant: 'destructive'
      });
    }
  });

  // Mark multiple as read
  const markMultipleAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      return apiRequest('/api/notifications/mark-read-bulk', {
        method: 'POST',
        body: JSON.stringify({ notificationIds })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setSelectedNotifications(new Set());
      toast({
        title: 'Notifications marked as read',
        description: 'Selected notifications have been marked as read.'
      });
    }
  });

  // Archive notification mutation
  const archiveMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest(`/api/notifications/${notificationId}/archive`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'Notification archived',
        description: 'The notification has been archived.'
      });
    }
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'Notification deleted',
        description: 'The notification has been permanently deleted.'
      });
    }
  });

  // Acknowledge notification mutation
  const acknowledgeMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest(`/api/notifications/${notificationId}/acknowledge`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'Notification acknowledged',
        description: 'The notification has been acknowledged.'
      });
    }
  });

  // Filter notifications based on search
  const filteredNotifications = notifications.filter(notification => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      notification.subject.toLowerCase().includes(searchLower) ||
      notification.body.toLowerCase().includes(searchLower) ||
      notification.type.toLowerCase().includes(searchLower) ||
      notification.category.toLowerCase().includes(searchLower)
    );
  });

  // Toggle selection
  const toggleSelection = (notificationId: string) => {
    const newSelection = new Set(selectedNotifications);
    if (newSelection.has(notificationId)) {
      newSelection.delete(notificationId);
    } else {
      newSelection.add(notificationId);
    }
    setSelectedNotifications(newSelection);
  };

  // Select all visible notifications
  const selectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.notificationId)));
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system': return <AlertCircle className="h-4 w-4" />;
      case 'job': return <CheckCircle className="h-4 w-4" />;
      case 'team': return <MessageSquare className="h-4 w-4" />;
      case 'financial': return <Info className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  // Get channel icon
  const getChannelIcon = (channel?: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-3 w-3" />;
      case 'inApp': return <Bell className="h-3 w-3" />;
      case 'whatsapp': return <Smartphone className="h-3 w-3" />;
      default: return null;
    }
  };

  const renderNotification = (notification: Notification) => {
    const isSelected = selectedNotifications.has(notification.notificationId);
    
    return (
      <div
        key={notification.notificationId}
        className={`p-4 border rounded-lg transition-all ${
          notification.isRead ? 'bg-background' : 'bg-blue-50 dark:bg-blue-950 border-blue-200'
        } ${isSelected ? 'ring-2 ring-primary' : ''}`}
        data-testid={`notification-${notification.notificationId}`}
      >
        <div className="flex items-start gap-3">
          {/* Selection checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelection(notification.notificationId)}
            className="mt-1"
            data-testid={`checkbox-notification-${notification.notificationId}`}
          />

          {/* Category icon */}
          <div className="flex-shrink-0 mt-1">
            {getCategoryIcon(notification.category)}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{notification.subject}</h4>
                  <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                    {notification.priority}
                  </Badge>
                  {notification.deliveryChannel && (
                    <span className="flex items-center gap-1">
                      {getChannelIcon(notification.deliveryChannel)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{notification.body}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatInTimeZone(new Date(notification.createdAt), AUCKLAND_TZ, 'dd/MM/yyyy HH:mm')}
                  </span>
                  {notification.isRead && notification.readAt && (
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Read {formatInTimeZone(new Date(notification.readAt), AUCKLAND_TZ, 'dd/MM HH:mm')}
                    </span>
                  )}
                  {notification.acknowledgedAt && (
                    <span className="flex items-center gap-1">
                      <CheckCheck className="h-3 w-3 text-green-600" />
                      Acknowledged
                    </span>
                  )}
                </div>
              </div>

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!notification.isRead && (
                    <DropdownMenuItem 
                      onClick={() => markAsReadMutation.mutate(notification.notificationId)}
                      data-testid={`button-mark-read-${notification.notificationId}`}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Mark as read
                    </DropdownMenuItem>
                  )}
                  {notification.acknowledgmentRequired && !notification.acknowledgedAt && (
                    <DropdownMenuItem 
                      onClick={() => acknowledgeMutation.mutate(notification.notificationId)}
                      data-testid={`button-acknowledge-${notification.notificationId}`}
                    >
                      <CheckCheck className="mr-2 h-4 w-4" />
                      Acknowledge
                    </DropdownMenuItem>
                  )}
                  {notification.actionUrl && (
                    <DropdownMenuItem 
                      onClick={() => window.location.href = notification.actionUrl}
                      data-testid={`button-action-${notification.notificationId}`}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View details
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {!notification.isArchived && (
                    <DropdownMenuItem 
                      onClick={() => archiveMutation.mutate(notification.notificationId)}
                      data-testid={`button-archive-${notification.notificationId}`}
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      Archive
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => deleteMutation.mutate(notification.notificationId)}
                    className="text-destructive"
                    data-testid={`button-delete-${notification.notificationId}`}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Action button if needed */}
            {notification.acknowledgmentRequired && !notification.acknowledgedAt && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => acknowledgeMutation.mutate(notification.notificationId)}
                data-testid={`button-acknowledge-inline-${notification.notificationId}`}
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                Acknowledge Required
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Notifications
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage all your notifications and alerts in one place
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            {/* Search and filters */}
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-notifications"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[140px]" data-testid="select-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="job">Job</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-[120px]" data-testid="select-priority">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk actions */}
            {selectedNotifications.size > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markMultipleAsReadMutation.mutate(Array.from(selectedNotifications))}
                  data-testid="button-mark-selected-read"
                >
                  <Check className="mr-1 h-4 w-4" />
                  Mark {selectedNotifications.size} as read
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedNotifications(new Set())}
                  data-testid="button-clear-selection"
                >
                  Clear selection
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="all" data-testid="tab-all">
                All
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {notifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread" data-testid="tab-unread">
                Unread
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <Badge variant="default" className="ml-2">
                    {notifications.filter(n => !n.isRead).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="archived" data-testid="tab-archived">
                Archived
                {notifications.filter(n => n.isArchived).length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {notifications.filter(n => n.isArchived).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Notification list */}
            <div className="mt-4">
              {/* Select all checkbox */}
              {filteredNotifications.length > 0 && (
                <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                  <Checkbox
                    checked={selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0}
                    onCheckedChange={selectAll}
                    data-testid="checkbox-select-all"
                  />
                  <span className="text-sm text-muted-foreground">
                    Select all ({filteredNotifications.length})
                  </span>
                </div>
              )}

              {/* Notifications */}
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading notifications...
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>No notifications found</p>
                    </div>
                  ) : (
                    filteredNotifications.map(renderNotification)
                  )}
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}