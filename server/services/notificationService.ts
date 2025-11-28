import { db } from '../db';
import {
  notifications,
  notificationDeliveries,
  notificationPreferences,
  notificationPolicies,
  notificationAuditLog,
  notificationTemplates,
  notificationEscalations,
  notificationAnalytics,
  users,
  roles,
  departments
} from '@shared/schema';
import { eq, and, or, gte, lte, isNull, inArray, sql, desc } from 'drizzle-orm';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { addMinutes } from 'date-fns';
import * as crypto from 'crypto';
import { ReplitGmailService } from './replitGmailService';
import WebSocketService from './webSocketService';
import WhatsAppService from './whatsappService';

export interface NotificationPayload {
  userId?: number;
  roleId?: number;
  departmentId?: number;
  type: string;
  category: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  subject: string;
  body: string;
  htmlBody?: string;
  jsonData?: any;
  channels?: string[];
  relatedEntityType?: string;
  relatedEntityId?: number;
  actionUrl?: string;
  acknowledgmentRequired?: boolean;
  expiresAt?: Date;
  createdBy?: number;
}

export interface NotificationChannel {
  name: string;
  send: (notification: any, recipient: any) => Promise<{ success: boolean; messageId?: string; error?: string }>;
  isAvailable: () => boolean;
}

class NotificationService {
  private channels: Map<string, NotificationChannel>;
  private static instance: NotificationService;
  private timezone = 'Pacific/Auckland';

  constructor() {
    this.channels = new Map();
    this.initializeChannels();
  }

  // Helper method for consistent Auckland timezone formatting
  private formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatInTimeZone(dateObj, this.timezone, 'dd/MM/yyyy HH:mm:ss zzz');
  }

  // Helper method for audit logging with hash chain persistence
  private async logAuditEvent(event: {
    eventType: string;
    entityType: string;
    entityId?: number;
    userId?: number;
    details: any;
  }) {
    try {
      // Get the previous hash for the chain
      const [previousEntry] = await db.select()
        .from(notificationAuditLog)
        .orderBy(desc(notificationAuditLog.createdAt))
        .limit(1);

      // Read the hash from the correct field - newValue contains the previous entry's hash
      const previousHash = previousEntry?.newValue?.hashChain || 'GENESIS';
      
      // Create hash chain entry
      const eventData = JSON.stringify({
        ...event,
        timestamp: this.formatDate(new Date()),
        timezone: this.timezone
      });
      
      const currentHash = crypto.createHash('sha256')
        .update(previousHash + eventData)
        .digest('hex');

      // Persist to audit log using correct schema fields
      await db.insert(notificationAuditLog).values({
        userId: event.userId || null,
        notificationId: event.entityType === 'notification' && event.entityId ? String(event.entityId) : null,
        action: event.eventType,
        previousValue: { hashChain: previousHash },
        newValue: { 
          ...event.details, 
          hashChain: currentHash,
          entityType: event.entityType,
          entityId: event.entityId
        },
        reason: `${event.eventType} - ${event.entityType}`,
        ipAddress: '127.0.0.1', // Server-side action
        userAgent: 'NotificationService',
        createdAt: new Date()
      });

      // Also log to console for monitoring
      console.log('[NOTIFICATION AUDIT]', {
        ...event,
        timestamp: this.formatDate(new Date()),
        timezone: this.timezone,
        hashChain: currentHash
      });
    } catch (error) {
      console.error('[NOTIFICATION AUDIT ERROR]', error);
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private initializeChannels() {
    // Email channel using ReplitGmailService
    this.channels.set('email', {
      name: 'email',
      isAvailable: () => ReplitGmailService.getInstance().isAuthenticated(),
      send: async (notification, recipient) => {
        try {
          const gmailService = ReplitGmailService.getInstance();
          const result = await gmailService.sendNotificationEmail(
            recipient.email,
            notification.subject,
            notification.htmlBody || notification.body,
            notification.jsonData
          );
          return { success: true, messageId: result.messageId };
        } catch (error) {
          console.error('Email send error:', error);
          return { success: false, error: error.message };
        }
      }
    });

    // In-app channel (WebSocket)
    this.channels.set('inApp', {
      name: 'inApp',
      isAvailable: () => true, // WebSocket is now available
      send: async (notification, recipient) => {
        try {
          const wsService = WebSocketService.getInstance();
          const sent = await wsService.sendNotificationToUser(recipient.id, {
            notificationId: notification.notificationId,
            type: notification.type,
            category: notification.category,
            priority: notification.priority,
            subject: notification.subject,
            body: notification.body,
            htmlBody: notification.htmlBody,
            jsonData: notification.jsonData,
            actionUrl: notification.actionUrl,
            acknowledgmentRequired: notification.acknowledgmentRequired,
            createdAt: notification.createdAt,
            isRead: false
          });
          
          if (sent) {
            return { success: true, messageId: `ws-${notification.notificationId}` };
          } else {
            return { success: false, error: 'User not connected via WebSocket' };
          }
        } catch (error) {
          console.error('WebSocket send error:', error);
          return { success: false, error: error.message };
        }
      }
    });

    // WhatsApp channel using Meta WhatsApp Business API
    this.channels.set('whatsapp', {
      name: 'whatsapp',
      isAvailable: () => WhatsAppService.getInstance().isAvailable(),
      send: async (notification, recipient) => {
        try {
          const whatsappService = WhatsAppService.getInstance();
          
          // Check if recipient has a phone number
          if (!recipient.phone) {
            return { success: false, error: 'Recipient has no phone number' };
          }
          
          const result = await whatsappService.sendNotification(
            recipient.phone,
            notification.category,
            notification.subject,
            notification.body,
            notification.jsonData
          );
          
          return result;
        } catch (error: any) {
          console.error('WhatsApp send error:', error);
          return { success: false, error: error.message };
        }
      }
    });
  }

  // Create and send notification with RBAC-aware routing
  async createNotification(payload: NotificationPayload): Promise<{ success: boolean; notificationId?: string; errors?: string[] }> {
    try {
      // Determine recipients based on RBAC
      const recipients = await this.getRecipients(payload);
      if (!recipients.length) {
        return { success: false, errors: ['No valid recipients found'] };
      }

      const errors: string[] = [];
      let createdNotificationId: string | undefined;

      // Create notification for each recipient
      for (const recipient of recipients) {
        // Get user preferences
        const preferences = await this.getUserPreferences(recipient.id);
        
        // Determine channels to use (with policy enforcement)
        const channelsToUse = await this.determineChannels(payload, preferences, recipient);
        if (!channelsToUse.length) {
          errors.push(`No available channels for user ${recipient.id}`);
          continue;
        }

        // Check quiet hours
        if (this.isInQuietHours(preferences)) {
          // Schedule for after quiet hours unless critical
          if (payload.priority !== 'critical') {
            const scheduledTime = this.getNextAvailableTime(preferences);
            console.log(`Notification scheduled for user ${recipient.id} at ${scheduledTime}`);
            // TODO: Implement scheduled notifications
            continue;
          }
        }

        // Create notification record
        const [notification] = await db.insert(notifications).values({
          userId: recipient.id,
          roleId: payload.roleId,
          departmentId: payload.departmentId,
          type: payload.type,
          category: payload.category,
          priority: payload.priority || 'normal',
          subject: payload.subject,
          body: payload.body,
          htmlBody: payload.htmlBody,
          jsonData: payload.jsonData,
          channels: channelsToUse,
          channelStatus: {},
          relatedEntityType: payload.relatedEntityType,
          relatedEntityId: payload.relatedEntityId,
          actionUrl: payload.actionUrl,
          acknowledgmentRequired: payload.acknowledgmentRequired || false,
          expiresAt: payload.expiresAt,
          createdBy: payload.createdBy,
        }).returning();

        createdNotificationId = notification.notificationId;

        // Log audit event for notification creation
        await this.logAuditEvent({
          eventType: 'NOTIFICATION_CREATED',
          entityType: 'notification',
          entityId: notification.id,
          userId: recipient.id,
          details: {
            type: payload.type,
            category: payload.category,
            priority: payload.priority,
            channels: channelsToUse,
            createdAt: this.formatDate(new Date())
          }
        });

        // Send through each channel
        const channelStatus: Record<string, string> = {};
        for (const channelName of channelsToUse) {
          const result = await this.sendThroughChannel(notification, recipient, channelName);
          channelStatus[channelName] = result.success ? 'sent' : 'failed';

          // Record delivery attempt
          await db.insert(notificationDeliveries).values({
            notificationId: notification.id,
            channel: channelName,
            status: result.success ? 'sent' : 'failed',
            attemptNumber: 1,
            sentAt: result.success ? new Date() : null,
            failedAt: result.success ? null : new Date(),
            recipientAddress: this.getRecipientAddress(recipient, channelName),
            messageId: result.messageId,
            errorCode: result.success ? null : 'SEND_FAILED',
            errorMessage: result.error,
            slaDeadline: this.calculateSLADeadline(payload.priority),
          });
        }

        // Update notification with channel status
        await db.update(notifications)
          .set({ channelStatus })
          .where(eq(notifications.id, notification.id));

        // Set up escalation if required
        if (payload.acknowledgmentRequired || payload.priority === 'critical') {
          await this.setupEscalation(notification);
        }
      }

      // Update analytics
      await this.updateAnalytics(payload);

      return { 
        success: errors.length === 0, 
        notificationId: createdNotificationId,
        errors: errors.length > 0 ? errors : undefined 
      };
    } catch (error) {
      console.error('Failed to create notification:', error);
      return { success: false, errors: [error.message] };
    }
  }

  // Get recipients based on RBAC rules
  private async getRecipients(payload: NotificationPayload): Promise<any[]> {
    const recipients = [];

    // Direct user notification
    if (payload.userId) {
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);
      if (user) recipients.push(user);
    }

    // Role-based notification
    if (payload.roleId) {
      const roleUsers = await db.select()
        .from(users)
        .where(eq(users.roleId, payload.roleId));
      recipients.push(...roleUsers);
    }

    // Department-based notification
    if (payload.departmentId) {
      const departmentUsers = await db.select()
        .from(users)
        .where(eq(users.departmentId, payload.departmentId));
      recipients.push(...departmentUsers);
    }

    // Remove duplicates
    const uniqueRecipients = Array.from(new Map(recipients.map(r => [r.id, r])).values());
    return uniqueRecipients;
  }

  // Get user notification preferences
  private async getUserPreferences(userId: number): Promise<any> {
    const [preferences] = await db.select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    // Return defaults if no preferences exist
    if (!preferences) {
      return {
        globalEnabled: true,
        emailEnabled: true,
        inAppEnabled: true,
        whatsappEnabled: false,
        quietHoursEnabled: false,
        timezone: this.timezone,
        typePreferences: {}
      };
    }

    return preferences;
  }

  // Determine which channels to use based on preferences AND role-based policies
  private async determineChannels(payload: NotificationPayload, preferences: any, recipient?: any): Promise<string[]> {
    const channels = new Set<string>();

    // First, get the role-based policy for this category and role
    let policy = null;
    if (recipient?.roleId && payload.category) {
      const [roleInfo] = await db.select()
        .from(roles)
        .where(eq(roles.id, recipient.roleId))
        .limit(1);
      
      if (roleInfo) {
        [policy] = await db.select()
          .from(notificationPolicies)
          .where(and(
            eq(notificationPolicies.role, roleInfo.name.toLowerCase()),
            eq(notificationPolicies.category, payload.category)
          ))
          .limit(1);
      }
    }

    // If there's a policy, enforce mandatory channels
    if (policy) {
      // Add all mandatory channels regardless of user preferences
      if (policy.mandatoryChannels?.email && this.channels.get('email')?.isAvailable()) {
        channels.add('email');
      }
      if (policy.mandatoryChannels?.inApp && this.channels.get('inApp')?.isAvailable()) {
        channels.add('inApp');
      }
      if (policy.mandatoryChannels?.whatsapp && this.channels.get('whatsapp')?.isAvailable()) {
        channels.add('whatsapp');
      }

      // Check if this priority level is mandatory
      const isMandatoryPriority = policy.mandatoryPriorityLevels?.includes(payload.priority || 'normal');
      
      // If it's a mandatory priority, ensure all mandatory channels are used
      if (isMandatoryPriority) {
        // Log audit event for mandatory notification
        await this.logAuditEvent({
          eventType: 'MANDATORY_NOTIFICATION_ENFORCED',
          entityType: 'notification',
          userId: recipient?.id,
          details: {
            role: roleInfo?.name,
            category: payload.category,
            priority: payload.priority,
            mandatoryChannels: policy.mandatoryChannels,
            reason: 'Priority level marked as mandatory'
          }
        });
      }
    }

    // Check category preferences (unless disabled by policy)
    const categoryKey = `${payload.category}Notifications`;
    if (!policy?.userCanModify && preferences[categoryKey] === false) {
      // User has disabled but policy doesn't allow modification - still use mandatory channels
      if (channels.size === 0) {
        return []; // No mandatory channels and user disabled
      }
    } else if (preferences[categoryKey] === false && policy?.userCanModify) {
      return []; // User has disabled this category and policy allows it
    }

    // Check priority preferences
    const priorityKey = `${payload.priority || 'normal'}Priority`;
    if (preferences[priorityKey] === false && policy?.userCanModify) {
      // Only skip if policy allows user modification
      if (channels.size === 0) {
        return []; // User has disabled this priority level
      }
    }

    // Add user-preferred channels (if not already mandatory)
    if (payload.channels) {
      // Use specified channels if provided, but respect user preferences
      for (const channel of payload.channels) {
        // Map channel names to preference keys
        let prefKey = '';
        if (channel === 'email') prefKey = 'emailEnabled';
        else if (channel === 'inApp') prefKey = 'inAppEnabled';
        else if (channel === 'whatsapp') prefKey = 'whatsappEnabled';
        
        const channelEnabled = preferences[prefKey] !== false;
        const channelAvailable = this.channels.get(channel)?.isAvailable() || false;
        
        if (channelEnabled && channelAvailable) {
          channels.add(channel);
        }
      }
    } else {
      // Use all enabled channels based on user preferences and policy defaults
      const defaultChannels = policy?.defaultChannels || {};
      
      if ((preferences.emailEnabled || defaultChannels.email) && this.channels.get('email')?.isAvailable()) {
        channels.add('email');
      }
      if ((preferences.inAppEnabled || defaultChannels.inApp) && this.channels.get('inApp')?.isAvailable()) {
        channels.add('inApp');
      }
      if ((preferences.whatsappEnabled || defaultChannels.whatsapp) && this.channels.get('whatsapp')?.isAvailable()) {
        channels.add('whatsapp');
      }
    }

    return Array.from(channels);
  }

  // Check if current time is in user's quiet hours
  private isInQuietHours(preferences: any): boolean {
    if (!preferences.quietHoursEnabled || !preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const userTime = toZonedTime(now, preferences.timezone || this.timezone);
    const currentTime = userTime.getHours() * 60 + userTime.getMinutes();
    
    const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // Get next available time after quiet hours
  private getNextAvailableTime(preferences: any): Date {
    if (!preferences.quietHoursEnd) {
      return new Date();
    }

    const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);
    const nextTime = new Date();
    nextTime.setHours(endHour, endMin, 0, 0);

    if (nextTime <= new Date()) {
      nextTime.setDate(nextTime.getDate() + 1);
    }

    return nextTime;
  }

  // Send notification through specific channel
  private async sendThroughChannel(notification: any, recipient: any, channelName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const channel = this.channels.get(channelName);
    if (!channel || !channel.isAvailable()) {
      return { success: false, error: `Channel ${channelName} not available` };
    }

    return await channel.send(notification, recipient);
  }

  // Get recipient address for channel
  private getRecipientAddress(recipient: any, channelName: string): string {
    switch (channelName) {
      case 'email':
        return recipient.email;
      case 'whatsapp':
        return recipient.phoneNumber || '';
      case 'inApp':
        return `user:${recipient.id}`;
      default:
        return '';
    }
  }

  // Calculate SLA deadline based on priority
  private calculateSLADeadline(priority?: string): Date {
    const now = new Date();
    switch (priority) {
      case 'critical':
        return addMinutes(now, 5); // 5 minutes
      case 'high':
        return addMinutes(now, 15); // 15 minutes
      case 'normal':
        return addMinutes(now, 60); // 1 hour
      case 'low':
        return addMinutes(now, 240); // 4 hours
      default:
        return addMinutes(now, 60); // Default 1 hour
    }
  }

  // Setup escalation for critical notifications
  private async setupEscalation(notification: any): Promise<void> {
    const escalationTime = this.calculateEscalationTime(notification.priority);
    
    await db.insert(notificationEscalations).values({
      notificationId: notification.id,
      escalationLevel: 0,
      nextEscalationAt: escalationTime,
      maxEscalationLevel: notification.priority === 'critical' ? 5 : 3,
    });
  }

  // Calculate when to escalate
  private calculateEscalationTime(priority: string): Date {
    const now = new Date();
    switch (priority) {
      case 'critical':
        return addMinutes(now, 10);
      case 'high':
        return addMinutes(now, 30);
      default:
        return addMinutes(now, 120);
    }
  }

  // Update analytics
  private async updateAnalytics(payload: NotificationPayload): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Update or insert analytics record
    await db.insert(notificationAnalytics).values({
      date: today,
      type: payload.type,
      channel: 'multi',
      priority: payload.priority,
      sentCount: 1,
      uniqueRecipients: 1,
    }).onConflictDoUpdate({
      target: [notificationAnalytics.date, notificationAnalytics.type, notificationAnalytics.channel],
      set: {
        sentCount: sql`${notificationAnalytics.sentCount} + 1`,
        uniqueRecipients: sql`${notificationAnalytics.uniqueRecipients} + 1`,
      }
    });
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: number): Promise<boolean> {
    try {
      const [notification] = await db.select()
        .from(notifications)
        .where(and(
          eq(notifications.notificationId, notificationId),
          eq(notifications.userId, userId)
        ))
        .limit(1);

      if (!notification || notification.isRead) {
        return false;
      }

      await db.update(notifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(eq(notifications.id, notification.id));

      // Update analytics
      await this.updateReadAnalytics(notification);

      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  // Mark notification as acknowledged
  async acknowledge(notificationId: string, userId: number): Promise<boolean> {
    try {
      const [notification] = await db.select()
        .from(notifications)
        .where(and(
          eq(notifications.notificationId, notificationId),
          eq(notifications.userId, userId)
        ))
        .limit(1);

      if (!notification || notification.isAcknowledged) {
        return false;
      }

      await db.update(notifications)
        .set({
          isAcknowledged: true,
          acknowledgedAt: new Date(),
          isRead: true,
          readAt: notification.readAt || new Date(),
        })
        .where(eq(notifications.id, notification.id));

      // Update escalation if exists
      await db.update(notificationEscalations)
        .set({
          respondedAt: new Date(),
          responseAction: 'acknowledged',
        })
        .where(eq(notificationEscalations.notificationId, notification.id));

      return true;
    } catch (error) {
      console.error('Failed to acknowledge notification:', error);
      return false;
    }
  }

  // Get notifications for user with RBAC filtering
  async getUserNotifications(userId: number, options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
    types?: string[];
  }): Promise<any[]> {
    try {
      const conditions = [eq(notifications.userId, userId)];
      
      if (options?.unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }
      
      if (options?.types?.length) {
        conditions.push(inArray(notifications.type, options.types));
      }
      
      // Filter out expired notifications
      conditions.push(or(
        isNull(notifications.expiresAt),
        gte(notifications.expiresAt, new Date())
      ));
      
      // Filter out archived
      conditions.push(isNull(notifications.archivedAt));

      const query = db.select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(sql`${notifications.createdAt} DESC`)
        .limit(options?.limit || 50);
      
      if (options?.offset) {
        query.offset(options.offset);
      }

      return await query;
    } catch (error) {
      console.error('Failed to get user notifications:', error);
      return [];
    }
  }

  // Get unread count for user
  async getUnreadCount(userId: number): Promise<number> {
    try {
      const [result] = await db.select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          or(
            isNull(notifications.expiresAt),
            gte(notifications.expiresAt, new Date())
          ),
          isNull(notifications.archivedAt)
        ));
      
      return result?.count || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  // Update read analytics
  private async updateReadAnalytics(notification: any): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await db.insert(notificationAnalytics).values({
      date: today,
      type: notification.type,
      channel: 'multi',
      priority: notification.priority,
      readCount: 1,
    }).onConflictDoUpdate({
      target: [notificationAnalytics.date, notificationAnalytics.type, notificationAnalytics.channel],
      set: {
        readCount: sql`${notificationAnalytics.readCount} + 1`,
      }
    });
  }

  // Process scheduled notifications
  async processScheduledNotifications(): Promise<void> {
    // This would be called by a cron job or scheduler
    // Implementation for scheduled notifications
  }

  // Process escalations
  async processEscalations(): Promise<void> {
    // Find notifications needing escalation
    const pendingEscalations = await db.select()
      .from(notificationEscalations)
      .where(and(
        lte(notificationEscalations.nextEscalationAt, new Date()),
        isNull(notificationEscalations.respondedAt)
      ));

    for (const escalation of pendingEscalations) {
      // Escalate to next level
      await this.escalateNotification(escalation);
    }
  }

  // Escalate notification to next level
  private async escalateNotification(escalation: any): Promise<void> {
    // Implementation for escalation logic
    // Would send to manager, then director, etc.
  }

  // Archive old notifications
  async archiveOldNotifications(): Promise<void> {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - 365); // Default 365 days

    await db.update(notifications)
      .set({ archivedAt: new Date() })
      .where(and(
        lte(notifications.createdAt, retentionDate),
        isNull(notifications.archivedAt)
      ));
  }

  // Fortune 50 Security: Dual Authorization Approval Notification
  async notifyDualAuthRequired(
    approverId: number,
    requestId: string,
    requestType: 'GPS_OVERRIDE' | 'BULK_CORRECTION',
    requesterName: string,
    targetUserId: number,
    reason: string
  ): Promise<void> {
    const requestTypeLabel = requestType === 'GPS_OVERRIDE' 
      ? 'GPS Override Authorization' 
      : 'Bulk Time Correction';
    
    const subject = `[ACTION REQUIRED] ${requestTypeLabel} Pending Your Approval`;
    const body = `A ${requestTypeLabel.toLowerCase()} request requires your approval.

Request Details:
- Request ID: ${requestId}
- Requested By: ${requesterName}
- Target User ID: ${targetUserId}
- Reason: ${reason}
- Expires In: 15 minutes

This request requires dual authorization under Fortune 50 security protocols.
Please review and approve or reject this request promptly.`;

    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #dc2626; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0;">⚠️ ${requestTypeLabel} - Approval Required</h2>
  </div>
  <div style="background-color: #fef2f2; padding: 20px; border: 1px solid #fecaca;">
    <p style="margin-top: 0;">A ${requestTypeLabel.toLowerCase()} request requires your immediate attention.</p>
    
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0;"><strong>Request ID:</strong></td><td>${requestId}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Requested By:</strong></td><td>${requesterName}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Target User:</strong></td><td>User #${targetUserId}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Reason:</strong></td><td>${reason}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Expiry:</strong></td><td style="color: #dc2626;">15 minutes from request</td></tr>
    </table>
    
    <div style="margin-top: 20px; padding: 12px; background-color: #fee2e2; border-radius: 4px;">
      <strong>🔐 Dual Authorization Required</strong><br>
      This request follows Fortune 50 security protocols and requires approval from an authorized manager.
    </div>
    
    <div style="margin-top: 20px; text-align: center;">
      <a href="/time/dual-auth/${requestId}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Review & Approve</a>
    </div>
  </div>
  <div style="background-color: #f9fafb; padding: 12px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px;">
    STEELIQ Enterprise Security - ${this.formatDate(new Date())}
  </div>
</div>`;

    try {
      await this.sendNotification({
        userId: approverId,
        type: 'dual_auth_required',
        category: 'security',
        priority: 'critical',
        subject,
        body,
        htmlBody,
        jsonData: {
          requestId,
          requestType,
          requesterName,
          targetUserId,
          reason,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        },
        channels: ['inApp', 'email'],
        relatedEntityType: 'dual_auth_request',
        relatedEntityId: parseInt(requestId.replace(/[^0-9]/g, '').substring(0, 10) || '0'),
        actionUrl: `/time/dual-auth/${requestId}`,
        acknowledgmentRequired: true,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      // Log audit event
      await this.logAuditEvent({
        eventType: 'DUAL_AUTH_NOTIFICATION_SENT',
        entityType: 'dual_auth_request',
        entityId: undefined,
        userId: approverId,
        details: {
          requestId,
          requestType,
          requesterName,
          targetUserId,
          reason,
          notifiedAt: this.formatDate(new Date())
        }
      });

    } catch (error) {
      console.error('Failed to send dual auth notification:', error);
      throw error;
    }
  }

  // Fortune 50 Security: Geofence Violation Alert
  async notifyGeofenceViolation(
    supervisorId: number,
    userId: number,
    userName: string,
    zoneName: string,
    distance: number,
    clockId: number
  ): Promise<void> {
    const subject = `[ALERT] Geofence Violation - ${userName}`;
    const body = `Geofence violation detected for employee ${userName}.

Details:
- Zone: ${zoneName}
- Distance from zone: ${distance.toFixed(0)} meters
- Time Clock ID: ${clockId}
- Detected At: ${this.formatDate(new Date())}

This clock-in/out occurred outside the allowed geofence zone.
Please review and take appropriate action.`;

    try {
      await this.sendNotification({
        userId: supervisorId,
        type: 'geofence_violation',
        category: 'compliance',
        priority: 'high',
        subject,
        body,
        jsonData: {
          userId,
          userName,
          zoneName,
          distance,
          clockId,
          detectedAt: new Date().toISOString()
        },
        channels: ['inApp', 'email'],
        relatedEntityType: 'time_clock',
        relatedEntityId: clockId,
        acknowledgmentRequired: true
      });
    } catch (error) {
      console.error('Failed to send geofence violation notification:', error);
    }
  }

  // Fortune 50 Security: Overtime Alert
  async notifyOvertimeAlert(
    supervisorId: number,
    userId: number,
    userName: string,
    hoursWorked: number,
    threshold: number
  ): Promise<void> {
    const subject = `[ALERT] Overtime Threshold Reached - ${userName}`;
    const body = `Overtime threshold alert for employee ${userName}.

Details:
- Hours Worked Today: ${hoursWorked.toFixed(1)} hours
- Threshold: ${threshold} hours
- Exceeded By: ${(hoursWorked - threshold).toFixed(1)} hours
- Alert Time: ${this.formatDate(new Date())}

Please review and approve or discuss with the employee.`;

    try {
      await this.sendNotification({
        userId: supervisorId,
        type: 'overtime_alert',
        category: 'time_management',
        priority: 'normal',
        subject,
        body,
        jsonData: {
          userId,
          userName,
          hoursWorked,
          threshold,
          exceededBy: hoursWorked - threshold,
          alertedAt: new Date().toISOString()
        },
        channels: ['inApp'],
        relatedEntityType: 'timesheet',
        acknowledgmentRequired: false
      });
    } catch (error) {
      console.error('Failed to send overtime notification:', error);
    }
  }

  // Fortune 50 Security: Missed Punch Alert
  async notifyMissedPunch(
    supervisorId: number,
    userId: number,
    userName: string,
    expectedTime: string,
    punchType: 'clock_in' | 'clock_out'
  ): Promise<void> {
    const punchTypeLabel = punchType === 'clock_in' ? 'Clock In' : 'Clock Out';
    const subject = `[ALERT] Missed ${punchTypeLabel} - ${userName}`;
    const body = `Missed punch detected for employee ${userName}.

Details:
- Punch Type: ${punchTypeLabel}
- Expected Time: ${expectedTime}
- Current Time: ${this.formatDate(new Date())}

Employee may need to submit a time correction request.`;

    try {
      await this.sendNotification({
        userId: supervisorId,
        type: 'missed_punch',
        category: 'time_management',
        priority: 'normal',
        subject,
        body,
        jsonData: {
          userId,
          userName,
          expectedTime,
          punchType,
          detectedAt: new Date().toISOString()
        },
        channels: ['inApp'],
        relatedEntityType: 'time_clock',
        acknowledgmentRequired: false
      });
    } catch (error) {
      console.error('Failed to send missed punch notification:', error);
    }
  }
}

export default NotificationService;