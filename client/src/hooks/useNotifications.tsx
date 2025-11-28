import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  notificationId: string;
  type: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  subject: string;
  body: string;
  htmlBody?: string;
  jsonData?: any;
  isRead: boolean;
  isAcknowledged: boolean;
  acknowledgmentRequired: boolean;
  createdAt: string;
  actionUrl?: string;
}

interface WebSocketMessage {
  type: string;
  payload?: any;
  error?: string;
  notifications?: Notification[];
  notification?: Notification;
  count?: number;
  hasMore?: boolean;
  notificationId?: string;
  timestamp?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  hasMore: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  acknowledge: (notificationId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Fetch WebSocket auth token from API
  const fetchAuthToken = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/ws-token', {
        credentials: 'include' // Include cookies for session auth
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('User not authenticated - WebSocket connection not available');
          return null;
        }
        throw new Error(`Failed to fetch WebSocket token: ${response.status}`);
      }
      
      const data = await response.json();
      tokenRef.current = data.token;
      return data.token;
    } catch (error) {
      console.error('Error fetching WebSocket token:', error);
      return null;
    }
  };

  // Connect to WebSocket
  const connect = useCallback(async () => {
    // Fetch fresh token from API
    const token = await fetchAuthToken();
    if (!token) {
      console.warn('No auth token available for WebSocket connection');
      return;
    }

    // Construct WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Send authentication
      ws.send(JSON.stringify({
        type: 'auth',
        token
      }));
      
      // Start ping interval
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // 30 seconds
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to notification service',
        variant: 'destructive'
      });
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      wsRef.current = null;
      
      // Clear ping interval
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      // Attempt to reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('Attempting to reconnect...');
        connect();
      }, 5000);
    };
  }, [toast]);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'auth_success':
        console.log('WebSocket authenticated');
        break;
      
      case 'notifications':
        if (message.notifications) {
          if (offset === 0) {
            setNotifications(message.notifications);
          } else {
            setNotifications(prev => [...prev, ...message.notifications]);
          }
          setHasMore(message.hasMore || false);
          setIsLoading(false);
        }
        break;
      
      case 'new_notification':
        if (message.notification) {
          setNotifications(prev => [message.notification!, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast for high priority notifications
          if (message.notification.priority === 'high' || message.notification.priority === 'critical') {
            toast({
              title: message.notification.subject,
              description: message.notification.body,
              variant: message.notification.priority === 'critical' ? 'destructive' : 'default'
            });
          }
        }
        break;
      
      case 'unread_count':
        if (message.count !== undefined) {
          setUnreadCount(message.count);
        }
        break;
      
      case 'notification_marked_read':
        if (message.notificationId) {
          setNotifications(prev => 
            prev.map(n => 
              n.notificationId === message.notificationId 
                ? { ...n, isRead: true } 
                : n
            )
          );
        }
        break;
      
      case 'notification_acknowledged':
        if (message.notificationId) {
          setNotifications(prev => 
            prev.map(n => 
              n.notificationId === message.notificationId 
                ? { ...n, isAcknowledged: true, isRead: true } 
                : n
            )
          );
        }
        break;
      
      case 'error':
        console.error('WebSocket error:', message.error);
        if (message.error === 'Authentication failed') {
          // Handle auth failure - maybe refresh token
        }
        break;
      
      case 'pong':
        // Server responded to ping
        break;
        
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }, [offset, toast]);

  // Send message to WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    const success = sendMessage({
      type: 'mark_read',
      notificationId
    });
    
    if (!success) {
      // Fallback to HTTP API if WebSocket not connected
      try {
        const response = await fetch(`/api/notifications/${notificationId}/read`, {
          method: 'POST',
          credentials: 'include'
        });
        
        if (response.ok) {
          setNotifications(prev => 
            prev.map(n => 
              n.notificationId === notificationId 
                ? { ...n, isRead: true } 
                : n
            )
          );
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }
  }, [sendMessage]);

  // Acknowledge notification
  const acknowledge = useCallback(async (notificationId: string) => {
    const success = sendMessage({
      type: 'acknowledge',
      notificationId
    });
    
    if (!success) {
      // Fallback to HTTP API if WebSocket not connected
      try {
        const response = await fetch(`/api/notifications/${notificationId}/acknowledge`, {
          method: 'POST',
          credentials: 'include'
        });
        
        if (response.ok) {
          setNotifications(prev => 
            prev.map(n => 
              n.notificationId === notificationId 
                ? { ...n, isAcknowledged: true, isRead: true } 
                : n
            )
          );
        }
      } catch (error) {
        console.error('Failed to acknowledge notification:', error);
      }
    }
  }, [sendMessage]);

  // Load more notifications
  const loadMore = useCallback(async () => {
    setIsLoading(true);
    const newOffset = offset + 50;
    setOffset(newOffset);
    
    const success = sendMessage({
      type: 'get_notifications',
      payload: {
        limit: 50,
        offset: newOffset
      }
    });
    
    if (!success) {
      // Fallback to HTTP API
      try {
        const response = await fetch(`/api/notifications?limit=50&offset=${newOffset}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setNotifications(prev => [...prev, ...data.notifications]);
          setHasMore(data.hasMore || false);
        }
      } catch (error) {
        console.error('Failed to load more notifications:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [offset, sendMessage]);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    setOffset(0);
    setIsLoading(true);
    
    const success = sendMessage({
      type: 'get_notifications',
      payload: {
        limit: 50,
        offset: 0
      }
    });
    
    if (!success) {
      // Fallback to HTTP API
      try {
        const response = await fetch('/api/notifications?limit=50&offset=0', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications);
          setHasMore(data.hasMore || false);
        }
      } catch (error) {
        console.error('Failed to refresh notifications:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [sendMessage]);

  // Initialize WebSocket connection
  useEffect(() => {
    connect();
    
    return () => {
      // Cleanup on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [connect]);

  // Expose notification state and methods
  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    isLoading,
    hasMore,
    markAsRead,
    acknowledge,
    loadMore,
    refreshNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Hook to use notifications
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}