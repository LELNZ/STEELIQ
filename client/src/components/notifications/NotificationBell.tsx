import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, AlertCircle, Info, Calendar, DollarSign, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';

interface Notification {
  id: string;
  notificationId: string;
  type: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  subject: string;
  body: string;
  isRead: boolean;
  isAcknowledged: boolean;
  acknowledgmentRequired: boolean;
  createdAt: string;
  actionUrl?: string;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    acknowledge, 
    loadMore, 
    hasMore,
    isLoading 
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Get icon based on notification type/category
  const getNotificationIcon = (notification: Notification) => {
    switch (notification.category) {
      case 'time-payroll':
        return <Clock className="h-4 w-4" />;
      case 'safety':
        return <AlertCircle className="h-4 w-4" />;
      case 'compliance':
        return <CheckCheck className="h-4 w-4" />;
      case 'system':
        return <Info className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high':
        return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'normal':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'low':
        return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20';
      default:
        return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.notificationId);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  // Handle acknowledge
  const handleAcknowledge = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    await acknowledge(notification.notificationId);
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead);
    for (const notification of unreadNotifications) {
      await markAsRead(notification.notificationId);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon with Badge */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-notification-bell"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white border-0"
            data-testid="badge-unread-count"
          >
            <span className="text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </Badge>
        )}
      </Button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
          data-testid="dropdown-notifications"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs"
                data-testid="button-mark-all-read"
              >
                Mark all as read
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-gray-500">Loading notifications...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8">
                <Bell className="h-12 w-12 text-gray-300 mb-2" />
                <div className="text-gray-500">No notifications</div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-colors",
                      !notification.isRead && "bg-blue-50/50 dark:bg-blue-900/10"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-item-${notification.id}`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={cn("p-2 rounded-full", getPriorityColor(notification.priority))}>
                        {getNotificationIcon(notification)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className={cn(
                              "font-medium text-sm",
                              !notification.isRead && "font-semibold"
                            )}>
                              {notification.subject}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {notification.body}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            {notification.acknowledgmentRequired && !notification.isAcknowledged && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleAcknowledge(e, notification)}
                                className="h-8 px-2"
                                data-testid={`button-acknowledge-${notification.id}`}
                              >
                                <Check className="h-3 w-3" />
                                <span className="ml-1 text-xs">Ack</span>
                              </Button>
                            )}
                            {notification.isAcknowledged && (
                              <CheckCheck className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </div>

                        {/* Priority Badge */}
                        {notification.priority !== 'normal' && (
                          <Badge 
                            variant={notification.priority === 'critical' ? 'destructive' : 'secondary'}
                            className="mt-2 text-xs"
                          >
                            {notification.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {hasMore && !isLoading && (
              <div className="p-4 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  className="text-xs"
                  data-testid="button-load-more"
                >
                  Load more notifications
                </Button>
              </div>
            )}
          </ScrollArea>

          <Separator />

          {/* Footer */}
          <div className="p-3 text-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs w-full"
              onClick={() => window.location.href = '/notifications'}
              data-testid="button-view-all"
            >
              View all notifications
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}