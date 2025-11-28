import NotificationService from './notificationService';
import { db } from '../db';
import { 
  users, 
  timeClocks, 
  timesheets, 
  teamMembers, 
  departments,
  auditLog 
} from '@shared/schema';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { formatInTimeZone } from 'date-fns-tz';
import { differenceInMinutes, startOfDay, endOfDay, subHours } from 'date-fns';
import * as crypto from 'crypto';

const TIMEZONE = 'Pacific/Auckland';

export type TimeClockEventType = 
  | 'clock_in'
  | 'clock_out'
  | 'missed_punch'
  | 'overtime_warning'
  | 'overtime_exceeded'
  | 'break_violation'
  | 'geofence_violation'
  | 'late_arrival'
  | 'early_departure'
  | 'consecutive_hours_warning';

export interface TimeClockEvent {
  type: TimeClockEventType;
  userId: number;
  clockId?: number;
  metadata?: {
    hoursWorked?: number;
    overtimeMinutes?: number;
    scheduledStart?: string;
    actualStart?: string;
    location?: string;
    geofenceZone?: string;
    [key: string]: any;
  };
}

class TimeClockEventService {
  private static instance: TimeClockEventService;
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  static getInstance(): TimeClockEventService {
    if (!TimeClockEventService.instance) {
      TimeClockEventService.instance = new TimeClockEventService();
    }
    return TimeClockEventService.instance;
  }

  private formatDate(date: Date): string {
    return formatInTimeZone(date, TIMEZONE, 'dd/MM/yyyy HH:mm:ss');
  }

  async emitClockIn(userId: number, clockId: number, location?: string): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return;

      const manager = await this.getManagerForUser(userId);
      
      await this.notificationService.createNotification({
        userId: manager?.id,
        type: 'time_clock',
        category: 'time_management',
        priority: 'low',
        subject: 'Team Member Clocked In',
        body: `${user.firstName} ${user.lastName} has clocked in${location ? ` at ${location}` : ''} at ${this.formatDate(new Date())}`,
        jsonData: {
          eventType: 'clock_in',
          employeeId: userId,
          employeeName: `${user.firstName} ${user.lastName}`,
          clockId,
          location,
          timestamp: new Date().toISOString()
        },
        relatedEntityType: 'time_clock',
        relatedEntityId: clockId,
        channels: ['in_app', 'websocket']
      });

      await this.logEventAudit('clock_in', userId, clockId, { location });
    } catch (error) {
      console.error('[TimeClockEventService] Clock-in event error:', error);
    }
  }

  async emitClockOut(userId: number, clockId: number, hoursWorked: number): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return;

      const manager = await this.getManagerForUser(userId);
      
      const notifications: Promise<any>[] = [];
      
      notifications.push(this.notificationService.createNotification({
        userId: manager?.id,
        type: 'time_clock',
        category: 'time_management',
        priority: 'low',
        subject: 'Team Member Clocked Out',
        body: `${user.firstName} ${user.lastName} has clocked out. Total hours worked today: ${hoursWorked.toFixed(2)}`,
        jsonData: {
          eventType: 'clock_out',
          employeeId: userId,
          employeeName: `${user.firstName} ${user.lastName}`,
          clockId,
          hoursWorked,
          timestamp: new Date().toISOString()
        },
        relatedEntityType: 'time_clock',
        relatedEntityId: clockId,
        channels: ['in_app', 'websocket']
      }));

      if (hoursWorked > 10) {
        notifications.push(this.emitOvertimeWarning(userId, hoursWorked, clockId));
      }

      await Promise.all(notifications);
      await this.logEventAudit('clock_out', userId, clockId, { hoursWorked });
    } catch (error) {
      console.error('[TimeClockEventService] Clock-out event error:', error);
    }
  }

  async emitOvertimeWarning(userId: number, hoursWorked: number, clockId?: number): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return;

      const manager = await this.getManagerForUser(userId);
      const overtimeMinutes = Math.round((hoursWorked - 8) * 60);
      
      await this.notificationService.createNotification({
        userId: manager?.id,
        type: 'overtime_alert',
        category: 'time_management',
        priority: hoursWorked > 12 ? 'high' : 'normal',
        subject: `Overtime Alert: ${user.firstName} ${user.lastName}`,
        body: `${user.firstName} ${user.lastName} has worked ${hoursWorked.toFixed(2)} hours today (${overtimeMinutes} minutes overtime). Please review for compliance.`,
        jsonData: {
          eventType: 'overtime_warning',
          employeeId: userId,
          employeeName: `${user.firstName} ${user.lastName}`,
          hoursWorked,
          overtimeMinutes,
          timestamp: new Date().toISOString()
        },
        relatedEntityType: 'time_clock',
        relatedEntityId: clockId,
        acknowledgmentRequired: hoursWorked > 12,
        channels: ['in_app', 'email', 'websocket']
      });

      await this.logEventAudit('overtime_warning', userId, clockId || 0, { hoursWorked, overtimeMinutes });
    } catch (error) {
      console.error('[TimeClockEventService] Overtime warning error:', error);
    }
  }

  async emitMissedPunch(userId: number): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return;

      const manager = await this.getManagerForUser(userId);

      await this.notificationService.createNotification({
        userId,
        type: 'missed_punch',
        category: 'time_management',
        priority: 'high',
        subject: 'Missed Clock Punch Detected',
        body: `We detected a potential missed clock punch. Please review your time entries and correct if necessary.`,
        jsonData: {
          eventType: 'missed_punch',
          employeeId: userId,
          timestamp: new Date().toISOString()
        },
        actionUrl: '/time/entries',
        acknowledgmentRequired: true,
        channels: ['in_app', 'push', 'websocket']
      });

      if (manager) {
        await this.notificationService.createNotification({
          userId: manager.id,
          type: 'missed_punch_alert',
          category: 'time_management',
          priority: 'normal',
          subject: `Missed Punch: ${user.firstName} ${user.lastName}`,
          body: `${user.firstName} ${user.lastName} may have missed a clock punch today. Please review their time entries.`,
          jsonData: {
            eventType: 'missed_punch',
            employeeId: userId,
            employeeName: `${user.firstName} ${user.lastName}`,
            timestamp: new Date().toISOString()
          },
          actionUrl: `/time/team/${userId}`,
          channels: ['in_app', 'email', 'websocket']
        });
      }

      await this.logEventAudit('missed_punch', userId, 0, {});
    } catch (error) {
      console.error('[TimeClockEventService] Missed punch error:', error);
    }
  }

  async emitGeofenceViolation(
    userId: number, 
    clockId: number, 
    zoneName: string, 
    distance: number
  ): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return;

      const manager = await this.getManagerForUser(userId);

      await this.notificationService.createNotification({
        userId: manager?.id,
        type: 'geofence_violation',
        category: 'security',
        priority: 'high',
        subject: `Geofence Violation: ${user.firstName} ${user.lastName}`,
        body: `${user.firstName} ${user.lastName} attempted to clock in/out ${distance.toFixed(0)}m outside the authorized zone "${zoneName}".`,
        jsonData: {
          eventType: 'geofence_violation',
          employeeId: userId,
          employeeName: `${user.firstName} ${user.lastName}`,
          clockId,
          zoneName,
          distanceOutside: distance,
          timestamp: new Date().toISOString()
        },
        relatedEntityType: 'time_clock',
        relatedEntityId: clockId,
        acknowledgmentRequired: true,
        channels: ['in_app', 'email', 'push', 'websocket']
      });

      await this.logEventAudit('geofence_violation', userId, clockId, { zoneName, distance });
    } catch (error) {
      console.error('[TimeClockEventService] Geofence violation error:', error);
    }
  }

  async emitLateArrival(
    userId: number, 
    clockId: number, 
    scheduledStart: Date, 
    actualStart: Date
  ): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return;

      const manager = await this.getManagerForUser(userId);
      const minutesLate = differenceInMinutes(actualStart, scheduledStart);

      await this.notificationService.createNotification({
        userId: manager?.id,
        type: 'late_arrival',
        category: 'time_management',
        priority: minutesLate > 30 ? 'high' : 'normal',
        subject: `Late Arrival: ${user.firstName} ${user.lastName}`,
        body: `${user.firstName} ${user.lastName} arrived ${minutesLate} minutes late. Scheduled: ${this.formatDate(scheduledStart)}, Actual: ${this.formatDate(actualStart)}`,
        jsonData: {
          eventType: 'late_arrival',
          employeeId: userId,
          employeeName: `${user.firstName} ${user.lastName}`,
          clockId,
          scheduledStart: scheduledStart.toISOString(),
          actualStart: actualStart.toISOString(),
          minutesLate,
          timestamp: new Date().toISOString()
        },
        relatedEntityType: 'time_clock',
        relatedEntityId: clockId,
        channels: ['in_app', 'websocket']
      });

      await this.logEventAudit('late_arrival', userId, clockId, { 
        scheduledStart: scheduledStart.toISOString(), 
        actualStart: actualStart.toISOString(), 
        minutesLate 
      });
    } catch (error) {
      console.error('[TimeClockEventService] Late arrival error:', error);
    }
  }

  async emitBreakViolation(
    userId: number, 
    breakDuration: number, 
    requiredBreak: number
  ): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return;

      const manager = await this.getManagerForUser(userId);

      await this.notificationService.createNotification({
        userId: manager?.id,
        type: 'break_violation',
        category: 'compliance',
        priority: 'high',
        subject: `Break Compliance Issue: ${user.firstName} ${user.lastName}`,
        body: `${user.firstName} ${user.lastName} took only ${breakDuration} minutes break when ${requiredBreak} minutes is required. Please ensure compliance with labor regulations.`,
        jsonData: {
          eventType: 'break_violation',
          employeeId: userId,
          employeeName: `${user.firstName} ${user.lastName}`,
          breakDuration,
          requiredBreak,
          shortfall: requiredBreak - breakDuration,
          timestamp: new Date().toISOString()
        },
        acknowledgmentRequired: true,
        channels: ['in_app', 'email', 'websocket']
      });

      await this.logEventAudit('break_violation', userId, 0, { breakDuration, requiredBreak });
    } catch (error) {
      console.error('[TimeClockEventService] Break violation error:', error);
    }
  }

  async emitConsecutiveHoursWarning(userId: number, consecutiveHours: number): Promise<void> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return;

      const manager = await this.getManagerForUser(userId);

      await this.notificationService.createNotification({
        userId: manager?.id,
        type: 'consecutive_hours_warning',
        category: 'compliance',
        priority: 'critical',
        subject: `Consecutive Hours Alert: ${user.firstName} ${user.lastName}`,
        body: `${user.firstName} ${user.lastName} has worked ${consecutiveHours.toFixed(1)} consecutive hours. Immediate action may be required for labor law compliance.`,
        jsonData: {
          eventType: 'consecutive_hours_warning',
          employeeId: userId,
          employeeName: `${user.firstName} ${user.lastName}`,
          consecutiveHours,
          timestamp: new Date().toISOString()
        },
        acknowledgmentRequired: true,
        channels: ['in_app', 'email', 'push', 'sms', 'websocket']
      });

      await this.logEventAudit('consecutive_hours_warning', userId, 0, { consecutiveHours });
    } catch (error) {
      console.error('[TimeClockEventService] Consecutive hours warning error:', error);
    }
  }

  async checkAndEmitMissedPunches(): Promise<void> {
    try {
      const yesterday = subHours(new Date(), 24);
      const results = await db.execute(sql`
        SELECT tc.user_id, u.first_name, u.last_name
        FROM time_clock tc
        JOIN users u ON tc.user_id = u.id
        WHERE tc.clock_type = 'clock_in'
        AND tc.clock_time >= ${yesterday}
        AND NOT EXISTS (
          SELECT 1 FROM time_clock tc2 
          WHERE tc2.user_id = tc.user_id 
          AND tc2.clock_type = 'clock_out'
          AND tc2.clock_time > tc.clock_time
          AND tc2.clock_time <= NOW()
        )
        GROUP BY tc.user_id, u.first_name, u.last_name
      `);

      for (const row of (results as any).rows || []) {
        await this.emitMissedPunch(row.user_id);
      }
    } catch (error) {
      console.error('[TimeClockEventService] Missed punch check error:', error);
    }
  }

  private async getManagerForUser(userId: number): Promise<{ id: number; email?: string } | null> {
    try {
      const [teamMember] = await db.select()
        .from(teamMembers)
        .where(eq(teamMembers.userId, userId));
      
      if (!teamMember?.reportsTo) return null;

      const [manager] = await db.select()
        .from(users)
        .where(eq(users.id, teamMember.reportsTo));

      return manager ? { id: manager.id, email: manager.email } : null;
    } catch (error) {
      console.error('[TimeClockEventService] Get manager error:', error);
      return null;
    }
  }

  private async logEventAudit(
    eventType: TimeClockEventType, 
    userId: number, 
    clockId: number, 
    metadata: any
  ): Promise<void> {
    try {
      const [previousEntry] = await db.select()
        .from(auditLog)
        .orderBy(sql`created_at DESC`)
        .limit(1);

      const previousHash = previousEntry?.details?.hashChain || 'GENESIS';
      
      const eventData = JSON.stringify({
        eventType,
        userId,
        clockId,
        metadata,
        timestamp: new Date().toISOString()
      });

      const currentHash = crypto.createHash('sha256')
        .update(previousHash + eventData)
        .digest('hex');

      await db.insert(auditLog).values({
        userId,
        action: `time_clock_event_${eventType}`,
        entity: 'time_clock',
        entityId: String(clockId),
        resourceType: 'time_clock',
        resourceId: String(clockId),
        details: {
          ...metadata,
          eventType,
          hashChain: currentHash
        }
      });
    } catch (error) {
      console.error('[TimeClockEventService] Audit log error:', error);
    }
  }
}

export default TimeClockEventService.getInstance();
export { TimeClockEventService };
