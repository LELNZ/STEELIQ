import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { db } from '../db';
import { notifications, users, authSessions } from '@shared/schema';
import { eq, and, desc, isNull, gte, or, gt } from 'drizzle-orm';
import NotificationService from './notificationService';
import { AuthService } from '../auth';

interface AuthenticatedSocket extends WebSocket {
  userId?: number;
  sessionId?: string;
  isAlive?: boolean;
  lastActivity?: Date;
}

interface WebSocketMessage {
  type: 'auth' | 'ping' | 'pong' | 'notification' | 'mark_read' | 'acknowledge' | 'get_notifications' | 'get_unread_count';
  payload?: any;
  token?: string;
  notificationId?: string;
}

interface NotificationBroadcast {
  type: 'new_notification' | 'notification_update' | 'unread_count';
  notification?: any;
  count?: number;
}

class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<number, Set<AuthenticatedSocket>>; // userId -> Set of sockets
  private heartbeatInterval: NodeJS.Timeout;
  private static instance: WebSocketService;

  constructor() {
    this.clients = new Map();
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  // Initialize WebSocket server with manual upgrade handling
  // This prevents conflicts with Vite HMR WebSocket in development
  initialize(server: HTTPServer) {
    this.wss = new WebSocketServer({
      noServer: true, // Use noServer mode to manually handle upgrades
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024
      }
    });

    // Manually handle upgrade requests only for /ws path
    // Use prependListener to run BEFORE Vite's HMR handler
    // Mark socket as handled to prevent double-processing
    server.prependListener('upgrade', (request: any, socket: any, head: any) => {
      // Skip if socket is already destroyed or not writable
      if (socket.destroyed || !socket.writable) {
        return;
      }
      
      // Skip if already handled by us (marked with symbol)
      const handledSymbol = Symbol.for('ws-handled');
      if ((socket as any)[handledSymbol]) {
        return;
      }
      
      const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
      
      if (pathname === '/ws') {
        // Mark socket as handled to prevent Vite's HMR from processing it
        (socket as any)[handledSymbol] = true;
        
        // Also mark the request to help other handlers skip it
        (request as any)._wsHandled = true;
        
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      }
      // Other paths (like Vite HMR) are left for other handlers
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    
    console.log('WebSocket server initialized on /ws (noServer mode)');
  }

  // Setup WebSocket event handlers
  private setupEventHandlers() {
    this.wss.on('connection', (ws: AuthenticatedSocket, req) => {
      console.log('New WebSocket connection attempt');
      
      ws.isAlive = true;
      ws.lastActivity = new Date();
      
      // Set up ping/pong for connection health check
      ws.on('pong', () => {
        ws.isAlive = true;
        ws.lastActivity = new Date();
      });

      ws.on('message', async (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('WebSocket message error:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        this.removeClient(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeClient(ws);
      });

      // Send initial connection success
      this.sendMessage(ws, {
        type: 'connection',
        status: 'connected',
        message: 'WebSocket connection established. Please authenticate.'
      });
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }

  // Handle incoming WebSocket messages
  private async handleMessage(ws: AuthenticatedSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'auth':
        await this.handleAuth(ws, message.token);
        break;
      
      case 'ping':
        this.sendMessage(ws, { type: 'pong', timestamp: Date.now() });
        break;
      
      case 'get_notifications':
        await this.handleGetNotifications(ws, message.payload);
        break;
      
      case 'get_unread_count':
        await this.handleGetUnreadCount(ws);
        break;
      
      case 'mark_read':
        await this.handleMarkRead(ws, message.notificationId);
        break;
      
      case 'acknowledge':
        await this.handleAcknowledge(ws, message.notificationId);
        break;
      
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }

    ws.lastActivity = new Date();
  }

  // Handle authentication with Fortune 50 compliant session binding
  private async handleAuth(ws: AuthenticatedSocket, token?: string) {
    if (!token) {
      this.sendError(ws, 'Authentication token required');
      return;
    }

    try {
      // Verify JWT token using AuthService (consistent secret + purpose validation)
      const decoded = AuthService.verifyWebSocketToken(token);
      
      if (!decoded.userId) {
        throw new Error('Invalid token payload');
      }

      // Verify user exists and is active
      const [user] = await db.select()
        .from(users)
        .where(and(
          eq(users.id, decoded.userId),
          eq(users.isActive, true)
        ))
        .limit(1);

      if (!user) {
        throw new Error('User not found or inactive');
      }

      // Fortune 50: Validate session binding if sid claim exists
      // This ensures WebSocket tokens are invalidated when user logs out
      if (decoded.sid) {
        const [session] = await db.select()
          .from(authSessions)
          .where(and(
            eq(authSessions.token, decoded.sid),
            eq(authSessions.userId, decoded.userId),
            gt(authSessions.expiresAt, new Date())
          ))
          .limit(1);
        
        if (!session) {
          console.warn(`[WebSocket] Session ${decoded.sid} invalid/expired for user ${decoded.userId}`);
          throw new Error('Session expired or invalidated');
        }
      }

      // Store authenticated connection
      ws.userId = decoded.userId;
      ws.sessionId = decoded.sid || `ws-${Date.now()}`;
      
      this.addClient(decoded.userId, ws);

      // Send authentication success
      this.sendMessage(ws, {
        type: 'auth_success',
        userId: decoded.userId,
        sessionId: ws.sessionId
      });

      // Send initial unread count
      await this.handleGetUnreadCount(ws);
      
      // Send recent notifications
      await this.handleGetNotifications(ws, { limit: 10 });

      console.log(`User ${decoded.userId} authenticated via WebSocket (session: ${ws.sessionId})`);
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      this.sendError(ws, 'Authentication failed');
      ws.close(1008, 'Authentication failed');
    }
  }

  // Handle get notifications request
  private async handleGetNotifications(ws: AuthenticatedSocket, options?: any) {
    if (!ws.userId) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    try {
      const notificationService = NotificationService.getInstance();
      const userNotifications = await notificationService.getUserNotifications(ws.userId, {
        unreadOnly: options?.unreadOnly || false,
        limit: options?.limit || 50,
        offset: options?.offset || 0,
        types: options?.types
      });

      this.sendMessage(ws, {
        type: 'notifications',
        notifications: userNotifications,
        hasMore: userNotifications.length === (options?.limit || 50)
      });
    } catch (error) {
      console.error('Failed to get notifications:', error);
      this.sendError(ws, 'Failed to retrieve notifications');
    }
  }

  // Handle get unread count request
  private async handleGetUnreadCount(ws: AuthenticatedSocket) {
    if (!ws.userId) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    try {
      const notificationService = NotificationService.getInstance();
      const count = await notificationService.getUnreadCount(ws.userId);
      
      this.sendMessage(ws, {
        type: 'unread_count',
        count
      });
    } catch (error) {
      console.error('Failed to get unread count:', error);
      this.sendError(ws, 'Failed to get unread count');
    }
  }

  // Handle mark as read request
  private async handleMarkRead(ws: AuthenticatedSocket, notificationId?: string) {
    if (!ws.userId) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    if (!notificationId) {
      this.sendError(ws, 'Notification ID required');
      return;
    }

    try {
      const notificationService = NotificationService.getInstance();
      const success = await notificationService.markAsRead(notificationId, ws.userId);
      
      if (success) {
        this.sendMessage(ws, {
          type: 'notification_marked_read',
          notificationId
        });
        
        // Update unread count for all user's connections
        await this.broadcastToUser(ws.userId, async (socket) => {
          await this.handleGetUnreadCount(socket);
        });
      } else {
        this.sendError(ws, 'Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
      this.sendError(ws, 'Failed to mark notification as read');
    }
  }

  // Handle acknowledge request
  private async handleAcknowledge(ws: AuthenticatedSocket, notificationId?: string) {
    if (!ws.userId) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    if (!notificationId) {
      this.sendError(ws, 'Notification ID required');
      return;
    }

    try {
      const notificationService = NotificationService.getInstance();
      const success = await notificationService.acknowledge(notificationId, ws.userId);
      
      if (success) {
        this.sendMessage(ws, {
          type: 'notification_acknowledged',
          notificationId
        });
        
        // Update all user's connections
        await this.broadcastToUser(ws.userId, async (socket) => {
          await this.handleGetUnreadCount(socket);
        });
      } else {
        this.sendError(ws, 'Failed to acknowledge notification');
      }
    } catch (error) {
      console.error('Failed to acknowledge:', error);
      this.sendError(ws, 'Failed to acknowledge notification');
    }
  }

  // Add client to tracking
  private addClient(userId: number, ws: AuthenticatedSocket) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)?.add(ws);
  }

  // Remove client from tracking
  private removeClient(ws: AuthenticatedSocket) {
    if (ws.userId) {
      const userSockets = this.clients.get(ws.userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          this.clients.delete(ws.userId);
        }
      }
      console.log(`User ${ws.userId} WebSocket disconnected`);
    }
  }

  // Send message to WebSocket
  private sendMessage(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  // Send error message
  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      error,
      timestamp: Date.now()
    });
  }

  // Broadcast to specific user (all their connections)
  private async broadcastToUser(userId: number, callback?: (ws: AuthenticatedSocket) => Promise<void>) {
    const userSockets = this.clients.get(userId);
    if (userSockets) {
      for (const ws of userSockets) {
        if (callback) {
          await callback(ws);
        }
      }
    }
  }

  // Send notification to user (called from NotificationService)
  async sendNotificationToUser(userId: number, notification: any) {
    const userSockets = this.clients.get(userId);
    if (!userSockets || userSockets.size === 0) {
      console.log(`No WebSocket connections for user ${userId}`);
      return false;
    }

    let sent = false;
    for (const ws of userSockets) {
      this.sendMessage(ws, {
        type: 'new_notification',
        notification
      });
      sent = true;
    }

    // Update unread count
    await this.broadcastToUser(userId, async (socket) => {
      await this.handleGetUnreadCount(socket);
    });

    return sent;
  }

  // Heartbeat to detect disconnected clients
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws: AuthenticatedSocket) => {
        if (ws.isAlive === false) {
          console.log('Terminating inactive WebSocket connection');
          this.removeClient(ws);
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  // Cleanup on shutdown
  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Close all connections
    this.wss.clients.forEach((ws) => {
      ws.close(1001, 'Server shutting down');
    });
    
    this.wss.close();
    console.log('WebSocket server shut down');
  }

  // Get connection stats
  getStats() {
    const stats = {
      totalConnections: this.wss.clients.size,
      authenticatedUsers: this.clients.size,
      userConnections: {} as Record<number, number>
    };

    this.clients.forEach((sockets, userId) => {
      stats.userConnections[userId] = sockets.size;
    });

    return stats;
  }

  // Check if user is online
  isUserOnline(userId: number): boolean {
    return this.clients.has(userId) && (this.clients.get(userId)?.size || 0) > 0;
  }

  // Get online users
  getOnlineUsers(): number[] {
    return Array.from(this.clients.keys());
  }
}

export default WebSocketService;