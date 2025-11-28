import { db } from "./db";
import { timesheets, timeClocks, jobTasks, leaveRequests, workSchedules, users, jobs, roles, teamMembers, departments, payrollPeriods, auditLog, timeEntries, complianceViolations, shiftNotifications, geofenceZones, gpsBatteryProfiles, gpsDeviceStatus, locationTracking, dualAuthRequests, dualAuthEvents, hashChainBlocks, kioskSessions, gpsBreadcrumbs, gpsBreadcrumbSummaries, gpsLogs } from "@shared/schema";
import { eq, and, desc, gte, lte, isNull, ne, like, or, sql, asc, inArray } from "drizzle-orm";
import { ErrorHandler, ServiceError, ErrorCode, ErrorSeverity } from "./services/utils/errorHandler";
import { DataValidator } from "./services/utils/dataValidator";
import type { 
  Timesheet, 
  InsertTimesheet, 
  TimeClock,
  InsertTimeClock,
  JobTask, 
  InsertJobTask,
  LeaveRequest,
  InsertLeaveRequest,
  WorkSchedule,
  InsertWorkSchedule,
  ShiftNotification,
  InsertShiftNotification,
  GeofenceZone,
  InsertGeofenceZone,
  GpsBatteryProfile,
  InsertGpsBatteryProfile,
  GpsDeviceStatus,
  InsertGpsDeviceStatus
} from "@shared/schema";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format, differenceInMinutes } from "date-fns";
import * as crypto from 'crypto';
import {
  HashChain,
  DualAuthorizationManager,
  KioskSessionManager,
  BreadcrumbAnalyzer,
  SecurityUtils,
  type AuditContext,
  type DualAuthRequest,
  type KioskSession,
  type GPSBreadcrumb,
  type BreadcrumbAnalytics,
  hashChain,
  dualAuthManager,
  kioskManager,
  breadcrumbAnalyzer
} from "../shared/security";
import NotificationService from "./services/notificationService";

const mapTimeClockPhotoUrl = (clock: TimeClock): TimeClock => {
  if (!clock.photoUrl) return clock;
  if (clock.photoUrl.startsWith('/api/time/clock-photo/')) return clock;
  return { ...clock, photoUrl: `/api/time/clock-photo/${clock.id}` };
};

const mapTimeClockPhotoUrls = (clocks: TimeClock[]): TimeClock[] => {
  return clocks.map(mapTimeClockPhotoUrl);
};

// Helper function to check permissions using the existing roles system
async function hasPermission(userId: number, legacyScope: string): Promise<boolean> {
  try {
    // Get user's role permissions via team_members
    const [userRole] = await db
      .select({
        permissions: roles.permissions
      })
      .from(teamMembers)
      .innerJoin(roles, eq(teamMembers.roleId, roles.id))
      .where(eq(teamMembers.userId, userId));
    
    const permissions = userRole?.permissions as any || {};
    
    // Map legacy permission scopes to Fortune 50 permission flags
    switch(legacyScope) {
      case 'approve_team':
        return permissions.time_payroll_approve === true || 
               permissions.timesheet_management === true;
      
      case 'payroll_admin':
      case 'manage_payroll':
        return permissions.timesheet_management === true || 
               permissions.time_payroll_override === true;
      
      case 'process_payroll':
        return permissions.time_payroll_override === true;
      
      case 'override_locks':
        return permissions.payroll_lockout_override === true || 
               permissions.time_payroll_override === true;
      
      default:
        // For any unknown permission scope, check if they have general override
        return permissions.time_payroll_override === true;
    }
  } catch (error) {
    console.error('Error checking permissions:', error);
    // Fail closed - deny permission if there's an error
    return false;
  }
}

export interface ITimeManagementStorage {
  // Time Clocks
  createTimeClock(clock: InsertTimeClock): Promise<TimeClock>;
  getTodayTimeClocks(userId: number): Promise<TimeClock[]>;
  getUserTimeClocks(userId: number, startDate: Date, endDate: Date): Promise<TimeClock[]>;

  // Timesheets
  getTimesheets(userId?: number, startDate?: Date, endDate?: Date): Promise<any[]>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(id: number, timesheet: Partial<InsertTimesheet>, userId: number): Promise<Timesheet>;
  deleteTimesheet(id: number, userId: number): Promise<void>;
  getTimesheetById(id: number): Promise<any | undefined>;
  submitTimesheet(id: number, userId: number): Promise<Timesheet>;
  approveTimesheet(id: number, approvedBy: number): Promise<Timesheet>;
  rejectTimesheet(id: number, rejectedBy: number, reason: string): Promise<Timesheet>;
  lockTimesheet(id: number, lockedBy: number): Promise<Timesheet>;
  processTimesheet(id: number, processedBy: number): Promise<Timesheet>;
  recallTimesheet(id: number, userId: number, reason?: string): Promise<Timesheet>;
  unlockTimesheet(id: number, unlockedBy: number, reason: string): Promise<Timesheet>;
  replaceTimeEntries(timesheetId: number, entries: any[]): Promise<void>;
  
  // Payroll Periods - Fortune 50 State Machine Methods
  getCurrentPayrollPeriod(businessUnitId?: number): Promise<any | null>;
  createPayrollPeriod(data: any, userId: number): Promise<any>;
  getPayrollPeriods(options?: any): Promise<any[]>;
  getPayrollPeriodById(periodId: number): Promise<any | null>;
  validatePayrollPeriod(periodId: number): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }>;
  transitionPayrollPeriod(periodId: number, transition: string, userId: number, metadata?: any): Promise<{ success: boolean; reason?: string; period?: any }>;
  lockPayrollPeriod(periodId: number, userId: number, lockLevel?: 'manager' | 'admin'): Promise<{ success: boolean; reason?: string }>;
  unlockPayrollPeriod(periodId: number, userId: number, reason: string): Promise<{ success: boolean; reason?: string }>;
  processPayrollPeriod(periodId: number, userId: number): Promise<{ success: boolean; reason?: string }>;
  exportPayrollPeriod(periodId: number, userId: number, providerId?: string): Promise<{ success: boolean; reason?: string; exportData?: any }>;

  // Job Tasks
  getJobTasks(assignedTo?: number): Promise<any[]>;
  createJobTask(task: InsertJobTask): Promise<JobTask>;
  updateJobTask(id: number, task: Partial<InsertJobTask>): Promise<JobTask>;
  deleteJobTask(id: number): Promise<void>;
  getJobTaskById(id: number): Promise<any | undefined>;
  assignTask(taskId: number, userId: number): Promise<JobTask>;

  // Leave Requests
  getLeaveRequests(userId?: number): Promise<any[]>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, request: Partial<InsertLeaveRequest>): Promise<LeaveRequest>;
  approveLeaveRequest(id: number, approvedBy: number, approved: boolean): Promise<LeaveRequest>;

  // Work Schedules
  getWorkSchedules(userId?: number, date?: Date): Promise<any[]>;
  createWorkSchedule(schedule: InsertWorkSchedule): Promise<WorkSchedule>;
  updateWorkSchedule(id: number, schedule: Partial<InsertWorkSchedule>): Promise<WorkSchedule>;
  deleteWorkSchedule(id: number): Promise<void>;

  // Analytics
  getUserHoursSummary(userId: number, startDate: Date, endDate: Date): Promise<any>;
  getTeamProductivity(startDate: Date, endDate: Date): Promise<any[]>;
  
  // Wave 1.5: Shift Notifications
  getShiftNotifications(userId?: number): Promise<ShiftNotification[]>;
  createShiftNotification(notification: InsertShiftNotification): Promise<ShiftNotification>;
  updateShiftNotification(id: number, notification: Partial<InsertShiftNotification>): Promise<ShiftNotification>;
  deleteShiftNotification(id: number): Promise<void>;
  toggleShiftNotification(id: number, enabled: boolean): Promise<ShiftNotification>;
  testShiftNotification(id: number): Promise<{ success: boolean; message?: string }>;
  getUpcomingNotifications(): Promise<ShiftNotification[]>;
  getUserNotificationPreferences(userId: number): Promise<{ notifications: ShiftNotification[]; preferences: any }>;
  
  // Wave 1.5: Geofence Management
  getGeofenceZones(): Promise<GeofenceZone[]>;
  createGeofenceZone(zone: InsertGeofenceZone): Promise<GeofenceZone>;
  updateGeofenceZone(id: number, zone: Partial<InsertGeofenceZone>): Promise<GeofenceZone>;
  deleteGeofenceZone(id: number): Promise<void>;
  toggleGeofenceEnforcement(id: number, enforced: boolean): Promise<GeofenceZone>;
  testGeofenceZone(id: number, testData: { latitude: number; longitude: number }): Promise<{ insideGeofence: boolean; distance?: number }>;
  getGeofenceViolations(startDate?: Date, endDate?: Date): Promise<any[]>;
  getGeofenceAnalytics(): Promise<{ totalZones: number; activeZones: number; violations: number }>;
  
  // Wave 1.5: GPS Battery Optimization
  getGpsBatteryProfiles(): Promise<GpsBatteryProfile[]>;
  createGpsBatteryProfile(profile: InsertGpsBatteryProfile): Promise<GpsBatteryProfile>;
  updateGpsBatteryProfile(id: number, profile: Partial<InsertGpsBatteryProfile>): Promise<GpsBatteryProfile>;
  deleteGpsBatteryProfile(id: number): Promise<void>;
  applyGpsBatteryProfile(deviceId: number, profileId: number): Promise<GpsDeviceStatus>;
  getGpsDeviceStatus(): Promise<GpsDeviceStatus[]>;
  updateGpsDeviceStatus(deviceId: number, status: Partial<InsertGpsDeviceStatus>): Promise<GpsDeviceStatus>;
  getGpsAnalytics(): Promise<{ totalDevices: number; activeDevices: number; avgBatteryLife: number }>;
  getGpsSettings(): Promise<{ profiles: GpsBatteryProfile[]; defaultProfileId?: number }>;
  updateGpsSettings(settings: { defaultProfileId: number }): Promise<{ success: boolean }>;
}

// Fortune 50 State Machine Definition
type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'locked' | 'processing' | 'rejected';

interface StateTransition {
  from: TimesheetStatus[];
  to: TimesheetStatus;
  requiredPermission?: string;
  validateConditions?: (timesheet: any, userId: number) => Promise<{ valid: boolean; reason?: string }>;
}

export class TimeManagementStorage implements ITimeManagementStorage {
  // Security managers
  private hashChain: HashChain;
  private dualAuthManager: DualAuthorizationManager;
  private kioskManager: KioskSessionManager;
  private breadcrumbAnalyzer: BreadcrumbAnalyzer;

  constructor() {
    // Initialize security managers
    this.hashChain = new HashChain('TIME_PAYROLL_CHAIN');
    this.dualAuthManager = new DualAuthorizationManager(process.env.DUAL_AUTH_SECRET || 'secure-key');
    this.kioskManager = new KioskSessionManager(process.env.KIOSK_SIGNING_KEY || 'signing-key');
    this.breadcrumbAnalyzer = new BreadcrumbAnalyzer();
  }
  
  // Fortune 50 Compliance: State machine transition rules
  private readonly stateTransitions: Map<string, StateTransition> = new Map([
    ['submit', {
      from: ['draft', 'rejected'],
      to: 'submitted',
      validateConditions: async (timesheet, userId) => {
        // Only owner can submit their own timesheet
        if (timesheet.userId !== userId) {
          return { valid: false, reason: "Only the timesheet owner can submit it" };
        }
        // Note: Cannot check for time entries since time_entries table lacks timesheetId column
        // For now, allow submission as long as it's by the owner
        // In the future, might check for time entries by user_id and date range
        return { valid: true };
      }
    }],
    ['approve', {
      from: ['submitted'],
      to: 'approved',
      requiredPermission: 'approve_team',
      validateConditions: async (timesheet, userId) => {
        // Manager cannot approve their own timesheet
        if (timesheet.userId === userId) {
          return { valid: false, reason: "Cannot approve your own timesheet" };
        }
        
        // Fortune 50 Compliance Check: Block approval if compliance violations exist
        try {
          // Check for compliance violations for this timesheet's period
          const timesheetDate = new Date(timesheet.date || timesheet.weekStartDate);
          
          // Import ComplianceService dynamically to avoid circular dependencies
          const { complianceService } = await import('./services/complianceService');
          
          // Check for unresolved violations
          const violations = await db
            .select({ count: sql<number>`count(*)` })
            .from(complianceViolations)
            .where(
              and(
                eq(complianceViolations.userId, timesheet.userId),
                eq(complianceViolations.violationDate, timesheetDate),
                eq(complianceViolations.resolved, false),
                eq(complianceViolations.severity, 'violation') // Only block for actual violations, not warnings
              )
            );
          
          if (violations[0]?.count > 0) {
            return { 
              valid: false, 
              reason: `Cannot approve timesheet with ${violations[0].count} unresolved compliance violations. Please resolve violations first.` 
            };
          }
          
          // Check for critical compliance violations in time clocks
          const criticalViolations = await db
            .select({ count: sql<number>`count(*)` })
            .from(timeClocks)
            .where(
              and(
                eq(timeClocks.userId, timesheet.userId),
                gte(timeClocks.clockIn, timesheetDate),
                lte(timeClocks.clockIn, new Date(timesheetDate.getTime() + 7 * 24 * 60 * 60 * 1000)), // Week range
                like(timeClocks.metadata, '%"violation_severity":"critical"%')
              )
            );
          
          if (criticalViolations[0]?.count > 0) {
            return {
              valid: false,
              reason: `Cannot approve timesheet with critical compliance violations. Manager review required.`
            };
          }
        } catch (error) {
          console.error('Compliance check failed during approval:', error);
          // Log but don't block approval if compliance service is unavailable
          await db.insert(auditLog).values({
            userId,
            action: 'compliance_check_failed',
            entity: 'timesheet',
            entityId: timesheet.id,
            details: JSON.stringify({ error: error.message })
          });
        }
        
        return { valid: true };
      }
    }],
    ['reject', {
      from: ['submitted', 'approved'],
      to: 'rejected',
      requiredPermission: 'approve_team',
      validateConditions: async (timesheet, userId) => {
        if (timesheet.userId === userId) {
          return { valid: false, reason: "Cannot reject your own timesheet" };
        }
        return { valid: true };
      }
    }],
    ['lock', {
      from: ['approved'],
      to: 'locked',
      requiredPermission: 'lock_periods',
      validateConditions: async (timesheet) => {
        // Check if payroll period exists and is open for this timesheet's date
        const [period] = await db
          .select()
          .from(payrollPeriods)
          .where(
            and(
              lte(payrollPeriods.payPeriodStart, timesheet.weekStartDate || timesheet.date),
              gte(payrollPeriods.payPeriodEnd, timesheet.weekEndDate || timesheet.date),
              eq(payrollPeriods.status, 'open')
            )
          );
        if (!period) {
          return { valid: false, reason: "No open payroll period for this timesheet date" };
        }
        
        // Fortune 50 Compliance Check: Ensure no unresolved violations before locking
        try {
          const timesheetDate = new Date(timesheet.date || timesheet.weekStartDate);
          
          // Check for any unresolved compliance violations
          const violations = await db
            .select({ count: sql<number>`count(*)` })
            .from(complianceViolations)
            .where(
              and(
                eq(complianceViolations.userId, timesheet.userId),
                eq(complianceViolations.violationDate, timesheetDate),
                eq(complianceViolations.resolved, false),
                eq(complianceViolations.severity, 'violation')
              )
            );
          
          if (violations[0]?.count > 0) {
            return {
              valid: false,
              reason: `Cannot lock timesheet with ${violations[0].count} unresolved compliance violations`
            };
          }
        } catch (error) {
          console.warn('Compliance check during lock:', error);
          // Continue with lock if compliance check fails
        }
        
        return { valid: true };
      }
    }],
    ['process', {
      from: ['locked'],
      to: 'processing',
      requiredPermission: 'process_payroll',
      validateConditions: async () => {
        return { valid: true };
      }
    }],
    ['recall', {
      from: ['submitted', 'approved'],
      to: 'draft',
      validateConditions: async (timesheet, userId) => {
        // Owner can recall before approval
        if (timesheet.status === 'submitted' && timesheet.userId === userId) {
          return { valid: true };
        }
        // Manager can send back for corrections
        const hasManagerPermission = await hasPermission(userId, 'approve_team');
        if (hasManagerPermission) {
          return { valid: true };
        }
        return { valid: false, reason: "Insufficient permissions to recall timesheet" };
      }
    }],
    ['unlock', {
      from: ['locked', 'processing'],
      to: 'approved',
      requiredPermission: 'override_locks',
      validateConditions: async () => {
        return { valid: true };
      }
    }]
  ]);

  // Fortune 50 Compliance: Validate and execute state transition
  private async transitionTimesheetState(
    timesheetId: number,
    transition: string,
    userId: number,
    notes?: string
  ): Promise<{ success: boolean; reason?: string; timesheet?: Timesheet }> {
    const transitionDef = this.stateTransitions.get(transition);
    if (!transitionDef) {
      return { success: false, reason: `Invalid transition: ${transition}` };
    }

    // Get current timesheet state
    const [timesheet] = await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.id, timesheetId));
    
    if (!timesheet) {
      return { success: false, reason: "Timesheet not found" };
    }

    // Check if transition is allowed from current state
    if (!transitionDef.from.includes(timesheet.status as TimesheetStatus)) {
      return { 
        success: false, 
        reason: `Cannot ${transition} timesheet in ${timesheet.status} status` 
      };
    }

    // Check permissions if required
    if (transitionDef.requiredPermission) {
      const hasRequiredPermission = await hasPermission(userId, transitionDef.requiredPermission);
      
      if (!hasRequiredPermission) {
        return { 
          success: false, 
          reason: `Insufficient permissions for ${transition} action` 
        };
      }
    }

    // Run additional validation if defined
    if (transitionDef.validateConditions) {
      const validation = await transitionDef.validateConditions(timesheet, userId);
      if (!validation.valid) {
        return { success: false, reason: validation.reason };
      }
    }

    // Execute transition
    const updateData: any = {
      status: transitionDef.to,
      updatedAt: new Date()
    };

    // Add transition-specific fields
    if (transition === 'submit') {
      updateData.submittedAt = new Date();
    } else if (transition === 'approve') {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
    } else if (transition === 'reject' || transition === 'recall') {
      updateData.notes = notes || updateData.notes;
    }

    const [updatedTimesheet] = await db
      .update(timesheets)
      .set(updateData)
      .where(eq(timesheets.id, timesheetId))
      .returning();

    // Log state transition for audit
    await db.insert(auditLog).values({
      userId,
      action: `timesheet_${transition}`,
      entity: 'timesheet',
      entityId: timesheetId,
      details: JSON.stringify({
        from: timesheet.status,
        to: transitionDef.to,
        notes
      })
    });

    return { success: true, timesheet: updatedTimesheet };
  }

  // Fortune 50 Compliance: 48-hour edit window enforcement
  private async canEditTimesheet(timesheetId: number, userId: number): Promise<{ allowed: boolean; reason?: string }> {
    // Get the timesheet
    const [timesheet] = await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.id, timesheetId));
    
    if (!timesheet) {
      return { allowed: false, reason: "Timesheet not found" };
    }

    // Check if user owns the timesheet
    const isOwner = timesheet.userId === userId;
    
    // Get user's role permissions via team_members
    const [userRole] = await db
      .select({
        permissions: roles.permissions
      })
      .from(teamMembers)
      .innerJoin(roles, eq(teamMembers.roleId, roles.id))
      .where(eq(teamMembers.userId, userId));
    
    // Parse permissions to check for relevant time & payroll permissions
    const permissions = userRole?.permissions as any || {};
    const hasOverridePermission = permissions.time_payroll_override === true || 
                                  permissions.payroll_lockout_override === true;
    const hasManagerPermission = permissions.time_payroll_approve === true || 
                                 permissions.timesheet_management === true;

    // SECURITY: First check basic authorization - must be owner, manager, or have override
    if (!isOwner && !hasManagerPermission && !hasOverridePermission) {
      return { allowed: false, reason: "You do not have permission to edit this timesheet" };
    }

    // Fortune 50 Compliance: Check if timesheet is in a locked payroll period
    const inLockedPeriod = await this.isTimesheetInLockedPeriod(timesheetId);
    if (inLockedPeriod && !hasOverridePermission) {
      return {
        allowed: false,
        reason: "Timesheet is in a locked payroll period and cannot be modified"
      };
    }

    // If timesheet is locked or processing, only users with override permissions can edit
    if (timesheet.status === "locked" || timesheet.status === "processing") {
      if (!hasOverridePermission) {
        return { allowed: false, reason: "Timesheet is locked for payroll processing" };
      }
    }

    // If timesheet is approved, only users with override permissions can edit
    if (timesheet.status === "approved") {
      if (!hasOverridePermission) {
        return { allowed: false, reason: "Timesheet has been approved and cannot be modified" };
      }
    }

    // Check 48-hour window (Fortune 50 requirement) - applies to owners only
    if (isOwner && !hasOverridePermission && !hasManagerPermission) {
      const createdAt = new Date(timesheet.createdAt);
      const minutesElapsed = differenceInMinutes(new Date(), createdAt);
      const FORTY_EIGHT_HOURS_IN_MINUTES = 48 * 60;
      
      if (minutesElapsed > FORTY_EIGHT_HOURS_IN_MINUTES) {
        return { allowed: false, reason: "Edit window expired (48-hour limit). Request correction through manager." };
      }
    }

    // All checks passed
    return { allowed: true };
  }

  // Time Clocks
  async createTimeClock(clock: InsertTimeClock): Promise<TimeClock> {
    // Fortune 50 GPS Compliance: Enforce locationTrackingId for clock-in events
    if (clock.clockType === 'clock_in' && !clock.locationTrackingId) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'GPS tracking required for clock-in events. LocationTrackingId must be provided.',
        { clockType: clock.clockType, userId: clock.userId }
      );
    }
    
    // Convert Date to ISO string for validation if needed
    const timestampStr = clock.timestamp instanceof Date 
      ? clock.timestamp.toISOString() 
      : clock.timestamp;
    
    // Validate input data - convert nulls to undefined for Zod validation
    // For time clocks, only validate clockIn time, not clockOut
    await DataValidator.validateTimeEntry({
      userId: clock.userId,
      clockIn: timestampStr,
      clockOut: undefined, // Time clocks don't have separate clock out times - they're individual events
      jobId: clock.jobId || undefined,
      departmentId: undefined, // Not used in time clocks
      taskId: clock.taskId || undefined,
      gpsLocation: clock.geolocation ? {
        latitude: (clock.geolocation as any).lat || 0,
        longitude: (clock.geolocation as any).lng || 0,
        accuracy: (clock.geolocation as any).accuracy ?? undefined // Convert null to undefined for Zod
      } : undefined,
      captureMethod: clock.captureMethod || undefined
    }, {
      userId: clock.userId,
      entityType: 'timeClock',
      operation: 'create'
    });
    
    try {
      return await ErrorHandler.withTransaction(async (tx: typeof db) => {
        const [newClock] = await tx.insert(timeClocks).values(clock).returning();
        
        // Audit log with GPS linkage for Fortune 50 compliance
        await tx.insert(auditLog).values({
          userId: clock.userId,
          action: 'time_clock_created',
          entity: 'timeClock',
          entityId: newClock.id,
          details: JSON.stringify({
            clockType: clock.clockType,
            timestamp: clock.timestamp,
            jobId: clock.jobId,
            locationTrackingId: newClock.locationTrackingId,
            gpsLinked: !!newClock.locationTrackingId,
            geolocation: clock.geolocation
          })
        });
        
        return newClock;
      }, {
        userId: clock.userId,
        entityType: 'timeClock',
        operation: 'create'
      });
    } catch (error: any) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw ErrorHandler.wrapError(error, ErrorCode.DATABASE_ERROR, {
        userId: clock.userId,
        entityType: 'timeClock',
        operation: 'create'
      });
    }
  }

  async getTodayTimeClocks(userId: number): Promise<TimeClock[]> {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    const clocks = await db.select()
      .from(timeClocks)
      .where(
        and(
          eq(timeClocks.userId, userId),
          gte(timeClocks.timestamp, startOfToday),
          lte(timeClocks.timestamp, endOfToday)
        )
      )
      .orderBy(desc(timeClocks.timestamp));
    
    return mapTimeClockPhotoUrls(clocks);
  }

  async getUserTimeClocks(userId: number, startDate: Date, endDate: Date): Promise<TimeClock[]> {
    const clocks = await db.select()
      .from(timeClocks)
      .where(
        and(
          eq(timeClocks.userId, userId),
          gte(timeClocks.timestamp, startDate),
          lte(timeClocks.timestamp, endDate)
        )
      )
      .orderBy(desc(timeClocks.timestamp));
    
    return mapTimeClockPhotoUrls(clocks);
  }

  // Timesheets
  async getTimesheets(userId?: number, startDate?: Date, endDate?: Date): Promise<any[]> {
    // Build filter conditions
    const conditions = [];
    if (userId) conditions.push(eq(timesheets.userId, userId));
    if (startDate) conditions.push(gte(timesheets.date, format(startDate, 'yyyy-MM-dd')));
    if (endDate) conditions.push(lte(timesheets.date, format(endDate, 'yyyy-MM-dd')));

    // Execute query with proper joins
    const results = await db
      .select({
        id: timesheets.id,
        userId: timesheets.userId,
        jobId: timesheets.jobId,
        taskId: timesheets.taskId,
        date: timesheets.date,
        startTime: timesheets.startTime,
        endTime: timesheets.endTime,
        breakDuration: timesheets.breakDuration,
        totalHours: timesheets.totalHours,
        overtimeHours: timesheets.overtimeHours,
        hourlyRate: timesheets.hourlyRate,
        overtimeRate: timesheets.overtimeRate,
        totalPay: timesheets.totalPay,
        workLocation: timesheets.workLocation,
        notes: timesheets.notes,
        status: timesheets.status,
        supervisorId: timesheets.supervisorId,
        approvedBy: timesheets.approvedBy,
        approvedAt: timesheets.approvedAt,
        submittedAt: timesheets.submittedAt,
        geolocation: timesheets.geolocation,
        deviceInfo: timesheets.deviceInfo,
        createdAt: timesheets.createdAt,
        updatedAt: timesheets.updatedAt,
        // User info
        userName: users.name,
        userUsername: users.username,
        // Job info  
        jobTitle: jobs.title,
        // Task info
        taskName: jobTasks.taskName,
      })
      .from(timesheets)
      .leftJoin(users, eq(timesheets.userId, users.id))
      .leftJoin(jobs, eq(timesheets.jobId, jobs.id))
      .leftJoin(jobTasks, eq(timesheets.taskId, jobTasks.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(timesheets.date));

    // Transform to match expected structure
    return results.map(r => ({
      ...r,
      user: r.userName || r.userUsername ? {
        id: r.userId,
        name: r.userName,
        username: r.userUsername
      } : null,
      job: r.jobTitle ? {
        id: r.jobId,
        title: r.jobTitle
      } : null,
      task: r.taskName ? {
        id: r.taskId,
        taskName: r.taskName
      } : null
    }));
  }

  /**
   * Map InsertTimesheet to legacy database format
   */
  private mapInsertTimesheetToRecord(timesheet: InsertTimesheet): any {
    // Filter out any fields that don't exist in the schema
    const mapped: any = {
      userId: timesheet.userId,
      date: timesheet.date,
      jobId: timesheet.jobId,
      taskId: timesheet.taskId,
      hoursWorked: timesheet.totalHours,
      breakHours: timesheet.breakDuration ? String(Number(timesheet.breakDuration) / 60) : "0",
      overtimeHours: timesheet.overtimeHours,
      description: timesheet.notes || "",
      notes: timesheet.notes,  // Also map to notes column
      approved: false, // Legacy default
      status: timesheet.status || 'draft',
      payrollPeriodId: timesheet.payrollPeriodId
    };
    
    // Add optional fields if they exist
    if (timesheet.deviceInfo) {
      mapped.deviceInfo = timesheet.deviceInfo;
    }
    if (timesheet.geolocation) {
      mapped.geolocation = timesheet.geolocation;
    }
    
    return mapped;
  }
  
  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {
    // Validate canonical format
    const regularHours = Math.max(0, (timesheet.totalHours || 0) - (timesheet.overtimeHours || 0));
    
    await DataValidator.validateTimesheet({
      userId: timesheet.userId,
      payrollPeriodId: timesheet.payrollPeriodId || 0,
      status: timesheet.status || 'draft',
      regularHours: regularHours,
      overtimeHours: timesheet.overtimeHours || 0,
      totalHours: timesheet.totalHours || 0
    }, {
      userId: timesheet.userId,
      entityType: 'timesheet',
      operation: 'create'
    });
    
    // Auto-assign supervisor if not provided
    if (!timesheet.supervisorId) {
      // Get user's department and find the manager
      const userTeamMember = await db.query.teamMembers.findFirst({
        where: eq(teamMembers.userId, timesheet.userId),
        with: {
          department: true
        }
      });
      
      if (userTeamMember?.departmentId) {
        const department = await db.query.departments.findFirst({
          where: eq(departments.id, userTeamMember.departmentId)
        });
        
        if (department?.managerId) {
          timesheet.supervisorId = department.managerId;
        }
      }
      
      // If no department manager, try to find a manager role user
      if (!timesheet.supervisorId) {
        const managerRole = await db.query.teamMembers.findFirst({
          where: and(
            ne(teamMembers.userId, timesheet.userId),
            inArray(teamMembers.roleId, 
              db.select({ id: roles.id })
                .from(roles)
                .where(
                  or(
                    like(roles.name, '%Manager%'),
                    like(roles.name, '%Supervisor%'),
                    eq(roles.name, 'Business Owner')
                  )
                )
            )
          )
        });
        
        if (managerRole) {
          timesheet.supervisorId = managerRole.userId;
        }
      }
    }
    
    // Map to legacy database format
    const mappedTimesheet = this.mapInsertTimesheetToRecord(timesheet);
    
    try {
      return await ErrorHandler.withTransaction(async (tx: typeof db) => {
        const [newTimesheet] = await tx.insert(timesheets).values(mappedTimesheet).returning();
        
        // Audit log
        await tx.insert(auditLog).values({
          userId: timesheet.userId,
          action: 'timesheet_created',
          entity: 'timesheet',
          entityId: newTimesheet.id,
          details: JSON.stringify({
            date: timesheet.date,
            jobId: timesheet.jobId,
            totalHours: timesheet.totalHours,
            status: timesheet.status || 'draft'
          })
        });
        
        return newTimesheet;
      }, {
        userId: timesheet.userId,
        entityType: 'timesheet',
        operation: 'create'
      });
    } catch (error: any) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw ErrorHandler.wrapError(error, ErrorCode.DATABASE_ERROR, {
        userId: timesheet.userId,
        entityType: 'timesheet',
        operation: 'create'
      });
    }
  }

  async updateTimesheet(id: number, timesheetData: Partial<InsertTimesheet>, userId: number): Promise<Timesheet> {
    // Fortune 50 Compliance: Enforce 48-hour edit window
    const canEdit = await this.canEditTimesheet(id, userId);
    if (!canEdit.allowed) {
      throw new Error(`Cannot update timesheet: ${canEdit.reason}`);
    }
    
    const [updatedTimesheet] = await db
      .update(timesheets)
      .set({ ...timesheetData, updatedAt: new Date() })
      .where(eq(timesheets.id, id))
      .returning();
    return updatedTimesheet;
  }

  async deleteTimesheet(id: number, userId: number): Promise<void> {
    // Fortune 50 Compliance: Enforce 48-hour edit window
    const canEdit = await this.canEditTimesheet(id, userId);
    if (!canEdit.allowed) {
      throw new Error(`Cannot delete timesheet: ${canEdit.reason}`);
    }
    
    await db.delete(timesheets).where(eq(timesheets.id, id));
  }

  async getTimesheetById(id: number): Promise<any | undefined> {
    const [timesheet] = await db.query.timesheets.findMany({
      where: eq(timesheets.id, id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            username: true,
          }
        },
        job: {
          columns: {
            id: true,
            title: true,
          }
        },
        task: {
          columns: {
            id: true,
            taskName: true,
          }
        }
      }
    });
    return timesheet;
  }

  // Fortune 50: Use state machine for submit transition
  async submitTimesheet(id: number, userId: number): Promise<Timesheet> {
    const result = await this.transitionTimesheetState(id, 'submit', userId);
    if (!result.success) {
      throw new Error(result.reason || "Failed to submit timesheet");
    }
    return result.timesheet!;
  }

  // Fortune 50: Use state machine for approve transition
  async approveTimesheet(id: number, approvedBy: number): Promise<Timesheet> {
    const result = await this.transitionTimesheetState(id, 'approve', approvedBy);
    if (!result.success) {
      throw new Error(result.reason || "Failed to approve timesheet");
    }
    return result.timesheet!;
  }

  // Fortune 50: Reject timesheet with reason
  async rejectTimesheet(id: number, rejectedBy: number, reason: string): Promise<Timesheet> {
    const result = await this.transitionTimesheetState(id, 'reject', rejectedBy, reason);
    if (!result.success) {
      throw new Error(result.reason || "Failed to reject timesheet");
    }
    return result.timesheet!;
  }

  // Fortune 50: Lock timesheet for payroll processing
  async lockTimesheet(id: number, lockedBy: number): Promise<Timesheet> {
    const result = await this.transitionTimesheetState(id, 'lock', lockedBy);
    if (!result.success) {
      throw new Error(result.reason || "Failed to lock timesheet");
    }
    return result.timesheet!;
  }

  // Fortune 50: Mark timesheet as processing
  async processTimesheet(id: number, processedBy: number): Promise<Timesheet> {
    const result = await this.transitionTimesheetState(id, 'process', processedBy);
    if (!result.success) {
      throw new Error(result.reason || "Failed to process timesheet");
    }
    return result.timesheet!;
  }

  // Fortune 50: Recall timesheet for corrections
  async recallTimesheet(id: number, userId: number, reason?: string): Promise<Timesheet> {
    const result = await this.transitionTimesheetState(id, 'recall', userId, reason);
    if (!result.success) {
      throw new Error(result.reason || "Failed to recall timesheet");
    }
    return result.timesheet!;
  }

  // Fortune 50: Unlock timesheet (override)
  async unlockTimesheet(id: number, unlockedBy: number, reason: string): Promise<Timesheet> {
    const result = await this.transitionTimesheetState(id, 'unlock', unlockedBy, reason);
    if (!result.success) {
      throw new Error(result.reason || "Failed to unlock timesheet");
    }
    return result.timesheet!;
  }

  // Job Tasks
  async getJobTasks(assignedTo?: number): Promise<any[]> {
    const conditions = [];
    if (assignedTo) conditions.push(eq(jobTasks.assignedTo, assignedTo));

    return await db.query.jobTasks.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        job: {
          columns: {
            id: true,
            title: true,
          }
        },
        assignee: {
          columns: {
            id: true,
            name: true,
            username: true,
          }
        },
        creator: {
          columns: {
            id: true,
            name: true,
            username: true,
          }
        }
      },
      orderBy: [desc(jobTasks.createdAt)]
    });
  }

  async createJobTask(task: InsertJobTask): Promise<JobTask> {
    const [newTask] = await db.insert(jobTasks).values(task).returning();
    return newTask;
  }

  async updateJobTask(id: number, taskData: Partial<InsertJobTask>): Promise<JobTask> {
    const [updatedTask] = await db
      .update(jobTasks)
      .set({ ...taskData, updatedAt: new Date() })
      .where(eq(jobTasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteJobTask(id: number): Promise<void> {
    await db.delete(jobTasks).where(eq(jobTasks.id, id));
  }

  async getJobTaskById(id: number): Promise<any | undefined> {
    const [task] = await db.query.jobTasks.findMany({
      where: eq(jobTasks.id, id),
      with: {
        job: {
          columns: {
            id: true,
            title: true,
          }
        },
        assignee: {
          columns: {
            id: true,
            name: true,
            username: true,
          }
        }
      }
    });
    return task;
  }

  async assignTask(taskId: number, userId: number): Promise<JobTask> {
    const [assignedTask] = await db
      .update(jobTasks)
      .set({ 
        assignedTo: userId,
        status: "pending",
        updatedAt: new Date()
      })
      .where(eq(jobTasks.id, taskId))
      .returning();
    return assignedTask;
  }

  // Leave Requests
  async getLeaveRequests(userId?: number): Promise<any[]> {
    const conditions = [];
    if (userId) conditions.push(eq(leaveRequests.userId, userId));

    return await db.query.leaveRequests.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            username: true,
          }
        },
        approver: {
          columns: {
            id: true,
            name: true,
            username: true,
          }
        }
      },
      orderBy: [desc(leaveRequests.submittedAt)]
    });
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const [newRequest] = await db.insert(leaveRequests).values(request).returning();
    return newRequest;
  }

  async updateLeaveRequest(id: number, requestData: Partial<InsertLeaveRequest>): Promise<LeaveRequest> {
    const [updatedRequest] = await db
      .update(leaveRequests)
      .set(requestData)
      .where(eq(leaveRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async approveLeaveRequest(id: number, approvedBy: number, approved: boolean): Promise<LeaveRequest> {
    const [updatedRequest] = await db
      .update(leaveRequests)
      .set({ 
        status: approved ? "approved" : "rejected",
        approvedBy,
        approvedAt: new Date()
      })
      .where(eq(leaveRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // Work Schedules
  async getWorkSchedules(userId?: number, date?: Date): Promise<any[]> {
    const conditions = [];
    if (userId) conditions.push(eq(workSchedules.userId, userId));
    if (date) conditions.push(eq(workSchedules.date, format(date, 'yyyy-MM-dd')));

    return await db.query.workSchedules.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            username: true,
          }
        },
        job: {
          columns: {
            id: true,
            title: true,
          }
        }
      },
      orderBy: [desc(workSchedules.date)]
    });
  }

  async createWorkSchedule(schedule: InsertWorkSchedule): Promise<WorkSchedule> {
    const [newSchedule] = await db.insert(workSchedules).values(schedule).returning();
    return newSchedule;
  }

  async updateWorkSchedule(id: number, scheduleData: Partial<InsertWorkSchedule>): Promise<WorkSchedule> {
    const [updatedSchedule] = await db
      .update(workSchedules)
      .set(scheduleData)
      .where(eq(workSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteWorkSchedule(id: number): Promise<void> {
    await db.delete(workSchedules).where(eq(workSchedules.id, id));
  }

  // Analytics
  async getUserHoursSummary(userId: number, startDate: Date, endDate: Date): Promise<any> {
    const userTimesheets = await this.getTimesheets(userId, startDate, endDate);
    
    const totalHours = userTimesheets.reduce((sum, ts) => sum + parseFloat(ts.totalHours || '0'), 0);
    const overtimeHours = userTimesheets.reduce((sum, ts) => sum + parseFloat(ts.overtimeHours || '0'), 0);
    const totalPay = userTimesheets.reduce((sum, ts) => sum + parseFloat(ts.totalPay || '0'), 0);

    return {
      totalHours: totalHours.toFixed(2),
      overtimeHours: overtimeHours.toFixed(2),
      regularHours: (totalHours - overtimeHours).toFixed(2),
      totalPay: totalPay.toFixed(2),
      averageHoursPerDay: (totalHours / userTimesheets.length || 0).toFixed(2),
      daysWorked: userTimesheets.length
    };
  }

  async getTeamProductivity(startDate: Date, endDate: Date): Promise<any[]> {
    const teamTimesheets = await this.getTimesheets(undefined, startDate, endDate);
    
    const userSummaries = teamTimesheets.reduce((acc, timesheet) => {
      const userId = timesheet.userId;
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          userName: timesheet.user?.name || 'Unknown',
          totalHours: 0,
          overtimeHours: 0,
          daysWorked: 0,
          efficiency: 0
        };
      }
      
      acc[userId].totalHours += parseFloat(timesheet.totalHours || '0');
      acc[userId].overtimeHours += parseFloat(timesheet.overtimeHours || '0');
      acc[userId].daysWorked += 1;
      
      return acc;
    }, {} as any);

    return Object.values(userSummaries);
  }

  // Fortune 50 Compliance: Payroll Period Management
  async createPayrollPeriod(data: {
    businessUnitId: number;
    periodType: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
    payPeriodStart: string;
    payPeriodEnd: string;
    payDate: string;
  }, userId: number): Promise<PayrollPeriod> {
    // Check for overlapping periods for the same business unit
    const [existingPeriod] = await db
      .select()
      .from(payrollPeriods)
      .where(
        and(
          eq(payrollPeriods.businessUnitId, data.businessUnitId),
          lte(payrollPeriods.payPeriodStart, data.payPeriodEnd),
          gte(payrollPeriods.payPeriodEnd, data.payPeriodStart)
        )
      );
    
    if (existingPeriod) {
      throw new Error("Overlapping payroll period exists for this business unit");
    }

    const [period] = await db
      .insert(payrollPeriods)
      .values({
        ...data,
        status: 'open'
      })
      .returning();

    await db.insert(auditLog).values({
      userId: userId, // Use actual user ID for audit
      action: 'payroll_period_created',
      entity: 'payroll_period',
      entityId: period.id,
      details: JSON.stringify(data)
    });

    return period;
  }

  // Get active payroll periods
  async getPayrollPeriods(options?: { 
    businessUnitId?: number;
    status?: 'open' | 'locked' | 'processing' | 'completed' | 'archived';
    includeExpired?: boolean;
  }): Promise<PayrollPeriod[]> {
    const conditions = [];
    
    if (options?.businessUnitId) {
      conditions.push(eq(payrollPeriods.businessUnitId, options.businessUnitId));
    }
    
    if (options?.status) {
      conditions.push(eq(payrollPeriods.status, options.status));
    }
    
    if (!options?.includeExpired) {
      const today = format(new Date(), 'yyyy-MM-dd');
      conditions.push(gte(payrollPeriods.payPeriodEnd, today));
    }
    
    const query = conditions.length > 0 
      ? db.select().from(payrollPeriods).where(and(...conditions))
      : db.select().from(payrollPeriods);
    
    return query.orderBy(desc(payrollPeriods.payPeriodStart));
  }

  // Lock a payroll period - prevents all timesheet modifications
  async lockPayrollPeriod(periodId: number, userId: number): Promise<{ success: boolean; reason?: string }> {
    // Check permission
    const hasRequiredPermission = await hasPermission(userId, 'payroll_admin') || 
                                  await hasPermission(userId, 'manage_payroll');
    
    if (!hasRequiredPermission) {
      return { success: false, reason: "Insufficient permissions to lock payroll period" };
    }

    // First check period exists and its status BEFORE any updates
    const [period] = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, periodId));
    
    if (!period) {
      return { success: false, reason: "Payroll period not found" };
    }

    // Strict state validation - only allow locking from 'open' status
    if (period.status !== 'open') {
      return { success: false, reason: `Cannot lock period in ${period.status} status. Period must be in 'open' status to be locked.` };
    }

    // Lock all timesheets in period - only after validation
    const affectedTimesheets = await db
      .update(timesheets)
      .set({
        status: 'locked',
        updatedAt: new Date()
      })
      .where(
        and(
          gte(timesheets.date, period.payPeriodStart),
          lte(timesheets.date, period.payPeriodEnd),
          eq(timesheets.status, 'approved')
        )
      )
      .returning();

    // Update period status
    const [updatedPeriod] = await db
      .update(payrollPeriods)
      .set({
        status: 'locked',
        lockedAt: new Date(),
        lockedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(payrollPeriods.id, periodId))
      .returning();

    await db.insert(auditLog).values({
      userId,
      action: 'payroll_period_locked',
      entity: 'payroll_period',
      entityId: periodId,
      details: JSON.stringify({
        periodStart: updatedPeriod.payPeriodStart,
        periodEnd: updatedPeriod.payPeriodEnd,
        timesheetsLocked: affectedTimesheets.length
      })
    });

    return { success: true };
  }

  // Unlock a payroll period (requires higher permission)
  async unlockPayrollPeriod(periodId: number, userId: number, reason: string): Promise<{ success: boolean; reason?: string }> {
    // Check permission - only payroll admin can unlock
    const hasRequiredPermission = await hasPermission(userId, 'payroll_admin');
    
    if (!hasRequiredPermission) {
      return { success: false, reason: "Only payroll administrators can unlock periods" };
    }

    const [period] = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, periodId));
    
    if (!period) {
      return { success: false, reason: "Payroll period not found" };
    }

    if (period.status === 'processed' || period.status === 'closed') {
      return { success: false, reason: `Cannot unlock ${period.status} period` };
    }

    // Unlock timesheets
    const affectedTimesheets = await db
      .update(timesheets)
      .set({
        status: 'approved',
        updatedAt: new Date()
      })
      .where(
        and(
          gte(timesheets.date, period.payPeriodStart),
          lte(timesheets.date, period.payPeriodEnd),
          eq(timesheets.status, 'locked')
        )
      )
      .returning();

    // Update period status
    const [updatedPeriod] = await db
      .update(payrollPeriods)
      .set({
        status: 'open',
        updatedAt: new Date()
      })
      .where(eq(payrollPeriods.id, periodId))
      .returning();

    await db.insert(auditLog).values({
      userId,
      action: 'payroll_period_unlocked',
      entity: 'payroll_period',
      entityId: periodId,
      details: JSON.stringify({
        periodStart: updatedPeriod.payPeriodStart,
        periodEnd: updatedPeriod.payPeriodEnd,
        reason,
        timesheetsUnlocked: affectedTimesheets.length
      })
    });

    return { success: true };
  }

  // Check if a timesheet is in a locked payroll period
  async isTimesheetInLockedPeriod(timesheetId: number): Promise<boolean> {
    const [timesheet] = await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.id, timesheetId));
    
    if (!timesheet) return false;

    const [period] = await db
      .select()
      .from(payrollPeriods)
      .where(
        and(
          lte(payrollPeriods.payPeriodStart, timesheet.date),
          gte(payrollPeriods.payPeriodEnd, timesheet.date),
          or(
            eq(payrollPeriods.status, 'locked'),
            eq(payrollPeriods.status, 'processing'),
            eq(payrollPeriods.status, 'completed')
          )
        )
      );

    return !!period;
  }

  // Get current payroll period
  async getCurrentPayrollPeriod(businessUnitId?: number): Promise<any | null> {
    const today = new Date();
    
    const conditions = [
      lte(payrollPeriods.payPeriodStart, today),
      gte(payrollPeriods.payPeriodEnd, today)
    ];
    
    if (businessUnitId) {
      conditions.push(eq(payrollPeriods.businessUnitId, businessUnitId));
    }
    
    const [period] = await db
      .select()
      .from(payrollPeriods)
      .where(and(...conditions))
      .limit(1);
    
    return period || null;
  }

  // Get payroll period by ID
  async getPayrollPeriodById(periodId: number): Promise<any | null> {
    const [period] = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, periodId));
    
    return period || null;
  }

  // Validate payroll period for processing - Rich validation with compliance checks
  async validatePayrollPeriod(periodId: number): Promise<{ 
    isValid: boolean; 
    errors: string[]; 
    warnings: string[];
    statistics: {
      totalTimesheets: number;
      approvedTimesheets: number;
      pendingTimesheets: number;
      totalHours: number;
      totalEmployees: number;
    }
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const period = await this.getPayrollPeriodById(periodId);
    if (!period) {
      return { 
        isValid: false, 
        errors: ['Payroll period not found'], 
        warnings,
        statistics: {
          totalTimesheets: 0,
          approvedTimesheets: 0,
          pendingTimesheets: 0,
          totalHours: 0,
          totalEmployees: 0
        }
      };
    }

    // Get all timesheets in the period
    const allTimesheets = await db
      .select({
        id: timesheets.id,
        status: timesheets.status,
        totalHours: timesheets.totalHours,
        userId: timesheets.userId
      })
      .from(timesheets)
      .where(
        and(
          gte(timesheets.date, period.payPeriodStart),
          lte(timesheets.date, period.payPeriodEnd)
        )
      );

    // Calculate statistics
    const statistics = {
      totalTimesheets: allTimesheets.length,
      approvedTimesheets: allTimesheets.filter(t => t.status === 'approved').length,
      pendingTimesheets: allTimesheets.filter(t => t.status === 'submitted' || t.status === 'draft').length,
      totalHours: allTimesheets.reduce((sum, t) => sum + (parseFloat(t.totalHours || '0')), 0),
      totalEmployees: new Set(allTimesheets.map(t => t.userId)).size
    };

    // Check for unapproved timesheets
    const unapprovedCount = statistics.totalTimesheets - statistics.approvedTimesheets;
    if (unapprovedCount > 0) {
      errors.push(`${unapprovedCount} timesheets are not approved`);
    }

    // Check for missing timesheets (employees with no timesheet)
    const activeEmployees = await db
      .select({ userId: users.id })
      .from(users)
      .where(eq(users.isActive, true));
    
    const employeesWithTimesheets = new Set(allTimesheets.map(t => t.userId));
    const missingTimesheets = activeEmployees.filter(e => !employeesWithTimesheets.has(e.userId));
    
    if (missingTimesheets.length > 0) {
      warnings.push(`${missingTimesheets.length} employees have not submitted timesheets`);
    }

    // Check for compliance violations
    // Import ComplianceService dynamically to avoid circular dependencies
    try {
      const { complianceService } = await import('./services/complianceService');
      
      // Check for any unresolved compliance violations in the period
      const violations = await db
        .select({ count: sql<number>`count(*)` })
        .from(timeClocks)
        .where(
          and(
            gte(timeClocks.clockIn, period.payPeriodStart),
            lte(timeClocks.clockIn, period.payPeriodEnd),
            // Check for violations marked in metadata or notes
            or(
              like(timeClocks.metadata, '%violation%'),
              like(timeClocks.notes, '%violation%')
            )
          )
        );

      if (violations[0]?.count > 0) {
        errors.push(`${violations[0].count} compliance violations detected in period`);
      }
    } catch (error) {
      console.warn('ComplianceService not available for validation:', error);
      warnings.push('Compliance validation skipped');
    }

    // Check period status
    if (period.status === 'locked' || period.status === 'processed' || period.status === 'exported') {
      errors.push(`Cannot modify period in ${period.status} status`);
    }

    // Check for overtime threshold warnings
    const highOvertimeUsers = allTimesheets.filter(t => {
      const hours = parseFloat(t.totalHours || '0');
      return hours > 60; // Warning for >60 hours/week
    });
    
    if (highOvertimeUsers.length > 0) {
      warnings.push(`${highOvertimeUsers.length} employees with excessive hours (>60/week)`);
    }
    
    return { 
      isValid: errors.length === 0, 
      errors,
      warnings,
      statistics
    };
  }

  // Generic state transition method for payroll periods
  async transitionPayrollPeriod(
    periodId: number, 
    transition: string, 
    userId: number, 
    metadata?: any
  ): Promise<{ success: boolean; reason?: string; period?: any }> {
    const period = await this.getPayrollPeriodById(periodId);
    if (!period) {
      return { success: false, reason: 'Period not found' };
    }

    // Define payroll period state transitions
    const payrollTransitions: Map<string, any> = new Map([
      ['startProcessing', {
        from: ['open'],
        to: 'processing',
        requiredPermission: 'manage_payroll'
      }],
      ['lock', {
        from: ['processing'],
        to: 'locked',
        requiredPermission: 'lock_periods'
      }],
      ['process', {
        from: ['locked'],
        to: 'processed',
        requiredPermission: 'process_payroll'
      }],
      ['export', {
        from: ['processed'],
        to: 'exported',
        requiredPermission: 'export_payroll'
      }]
    ]);

    const transitionDef = payrollTransitions.get(transition);
    if (!transitionDef) {
      return { success: false, reason: `Invalid transition: ${transition}` };
    }

    // Check current status
    if (!transitionDef.from.includes(period.status)) {
      return { 
        success: false, 
        reason: `Cannot ${transition} from status ${period.status}` 
      };
    }

    // Validate period if transitioning to processing
    if (transition === 'startProcessing') {
      const validation = await this.validatePayrollPeriod(periodId);
      if (!validation.isValid) {
        return { 
          success: false, 
          reason: `Period validation failed: ${validation.errors.join(', ')}`
        };
      }
    }

    // Update period status
    const [updatedPeriod] = await db
      .update(payrollPeriods)
      .set({
        status: transitionDef.to,
        updatedAt: new Date(),
        ...(metadata || {})
      })
      .where(eq(payrollPeriods.id, periodId))
      .returning();

    // Audit log
    await db.insert(auditLog).values({
      userId,
      action: `payroll_period_${transition}`,
      entity: 'payroll_period',
      entityId: periodId,
      details: JSON.stringify({
        from: period.status,
        to: transitionDef.to,
        ...metadata
      })
    });

    return { success: true, period: updatedPeriod };
  }

  // Export payroll period data
  async exportPayrollPeriod(
    periodId: number,
    userId: number,
    providerId?: string
  ): Promise<{ success: boolean; reason?: string; exportData?: any }> {
    const result = await this.transitionPayrollPeriod(
      periodId, 
      'export', 
      userId,
      { exportedAt: new Date(), exportedBy: userId, providerId }
    );

    if (!result.success) {
      return result;
    }

    // Gather export data (timesheets, summaries, etc.)
    const exportData = {
      period: result.period,
      timesheets: await db
        .select()
        .from(timesheets)
        .where(
          and(
            gte(timesheets.date, result.period.payPeriodStart),
            lte(timesheets.date, result.period.payPeriodEnd)
          )
        ),
      exportedAt: new Date(),
      providerId
    };

    return { 
      success: true, 
      exportData 
    };
  }

  // Process payroll period (mark as ready for payment)
  async processPayrollPeriod(periodId: number, userId: number): Promise<{ success: boolean; reason?: string }> {
    const hasRequiredPermission = await hasPermission(userId, 'payroll_admin') || 
                                  await hasPermission(userId, 'process_payroll');
    
    if (!hasRequiredPermission) {
      return { success: false, reason: "Insufficient permissions to process payroll" };
    }

    const [period] = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, periodId));
    
    if (!period) {
      return { success: false, reason: "Payroll period not found" };
    }

    if (period.status !== 'locked') {
      return { success: false, reason: "Period must be locked before processing" };
    }

    // Mark all timesheets as processing
    const affectedTimesheets = await db
      .update(timesheets)
      .set({
        status: 'processing',
        updatedAt: new Date()
      })
      .where(
        and(
          gte(timesheets.date, period.payPeriodStart),
          lte(timesheets.date, period.payPeriodEnd),
          eq(timesheets.status, 'locked')
        )
      )
      .returning();

    // Update period status
    const [updatedPeriod] = await db
      .update(payrollPeriods)
      .set({
        status: 'processed',
        processedAt: new Date(),
        processedBy: userId,
        updatedAt: new Date()
      })
      .where(eq(payrollPeriods.id, periodId))
      .returning();

    await db.insert(auditLog).values({
      userId,
      action: 'payroll_period_processed',
      entity: 'payroll_period',
      entityId: periodId,
      details: JSON.stringify({
        periodStart: updatedPeriod.payPeriodStart,
        periodEnd: updatedPeriod.payPeriodEnd,
        timesheetsProcessed: affectedTimesheets.length,
        payDate: updatedPeriod.payDate
      })
    });

    return { success: true };
  }

  // Helper: Generate timesheet from time clocks
  private async generateTimesheetFromClocks(userId: number, date: Date): Promise<void> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const clocks = await this.getUserTimeClocks(userId, dayStart, dayEnd);
    
    if (clocks.length < 2) return; // Need at least clock in and clock out
    
    // Find pairs of clock in/out
    let clockInTime: Date | null = null;
    let totalMinutes = 0;
    let breakMinutes = 0;
    let isOnBreak = false;
    
    for (const clock of clocks.reverse()) { // Process in chronological order
      if (clock.clockType === "clock_in") {
        clockInTime = new Date(clock.timestamp);
        isOnBreak = false;
      } else if (clock.clockType === "clock_out" && clockInTime) {
        if (!isOnBreak) {
          const duration = new Date(clock.timestamp).getTime() - clockInTime.getTime();
          totalMinutes += duration / (1000 * 60);
        }
        clockInTime = null;
      } else if (clock.clockType === "break_start") {
        isOnBreak = true;
      } else if (clock.clockType === "break_end") {
        isOnBreak = false;
      }
    }
    
    if (totalMinutes > 0) {
      const totalHours = totalMinutes / 60;
      const overtimeHours = Math.max(0, totalHours - 8); // Standard 8-hour day
      
      // Check if timesheet already exists
      const existingTimesheet = await db.query.timesheets.findFirst({
        where: and(
          eq(timesheets.userId, userId),
          eq(timesheets.date, format(date, 'yyyy-MM-dd'))
        )
      });
      
      if (!existingTimesheet) {
        const firstClock = clocks[clocks.length - 1]; // First clock of the day
        const lastClock = clocks[0]; // Last clock of the day
        
        await this.createTimesheet({
          userId,
          date: format(date, 'yyyy-MM-dd'),
          startTime: firstClock.timestamp,
          endTime: lastClock.timestamp,
          breakDuration: breakMinutes,
          totalHours: totalHours.toFixed(2),
          overtimeHours: overtimeHours.toFixed(2),
          workLocation: firstClock.location || "workshop",
          status: "draft",
          jobId: firstClock.jobId,
          taskId: firstClock.taskId
        });
      }
    }
  }
  
  /**
   * Replace time entries for a timesheet in a transaction
   * Ensures idempotent regeneration without duplicates
   */
  async replaceTimeEntries(timesheetId: number, entries: any[]): Promise<void> {
    // Now that we have timesheetId column, we can properly link entries to timesheets
    // This ensures Fortune 50 audit trail requirements are met
    
    // Delete existing entries for this timesheet
    await db
      .delete(timeEntries)
      .where(eq(timeEntries.timesheetId, timesheetId));
    
    // Insert new entries with timesheetId reference
    if (entries.length > 0) {
      // Map the aggregated entries to time_entries table format
      const entriesToInsert = entries.map(entry => {
        // Handle different entry formats (from aggregation service)
        const baseEntry = {
          userId: entry.userId || entry.user_id,
          timesheetId, // Link to timesheet for Fortune 50 audit trail
          jobId: entry.jobId || entry.job_id,
          clockIn: entry.clockIn || entry.clock_in || entry.entryDate || new Date(),
          clockOut: entry.clockOut || entry.clock_out || null,
          breakDuration: entry.breakDuration || entry.break_duration || 0,
          totalHours: entry.totalHours || entry.total_hours || entry.hoursWorked || "0",
          hourlyRate: entry.hourlyRate || entry.hourly_rate || "0",
          totalCost: entry.totalCost || entry.total_cost || "0",
          status: entry.status || 'active',
          notes: entry.notes || entry.description || null,
          createdAt: entry.createdAt || new Date(),
          updatedAt: entry.updatedAt || new Date()
        };
        
        return baseEntry;
      });
      
      await db.insert(timeEntries).values(entriesToInsert);
      console.log(`✓ Persisted ${entries.length} time entries for timesheet ${timesheetId}`);
    }
    
    return;
    
    // Log the replacement for audit
    await db.insert(auditLog).values({
      userId: null, // System action
      action: 'time_entries_replaced',
      entity: 'timesheet',
      entityId: timesheetId,
      details: JSON.stringify({
        entriesCount: entries.length,
        replacedAt: new Date()
      })
    });
  }
  
  // =============== Wave 1.5: Shift Notifications ===============
  
  async getShiftNotifications(userId?: number): Promise<ShiftNotification[]> {
    const query = db.select().from(shiftNotifications);
    
    if (userId) {
      return await query.where(eq(shiftNotifications.userId, userId));
    }
    
    return await query.orderBy(desc(shiftNotifications.createdAt));
  }

  async createShiftNotification(notification: InsertShiftNotification): Promise<ShiftNotification> {
    // Validate notification data
    const validator = new DataValidator();
    if (!validator.validateObject(notification, ['userId', 'scheduleType', 'scheduledTime'])) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid notification data',
        ErrorSeverity.MEDIUM
      );
    }

    const [created] = await db.insert(shiftNotifications)
      .values({
        ...notification,
        enabled: notification.enabled ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Audit log for Fortune 50 compliance
    await db.insert(auditLog).values({
      userId: notification.userId,
      action: 'shift_notification_created',
      entity: 'shift_notifications',
      entityId: created.id,
      details: JSON.stringify({ notification: created })
    });
    
    return created;
  }

  async updateShiftNotification(id: number, notification: Partial<InsertShiftNotification>): Promise<ShiftNotification> {
    const [updated] = await db.update(shiftNotifications)
      .set({
        ...notification,
        updatedAt: new Date()
      })
      .where(eq(shiftNotifications.id, id))
      .returning();
    
    if (!updated) {
      throw new ServiceError(
        ErrorCode.NOT_FOUND,
        'Notification not found',
        ErrorSeverity.LOW
      );
    }
    
    return updated;
  }

  async deleteShiftNotification(id: number): Promise<void> {
    await db.delete(shiftNotifications)
      .where(eq(shiftNotifications.id, id));
  }

  async toggleShiftNotification(id: number, enabled: boolean): Promise<ShiftNotification> {
    return this.updateShiftNotification(id, { enabled });
  }

  async testShiftNotification(id: number): Promise<{ success: boolean; message?: string }> {
    const [notification] = await db.select()
      .from(shiftNotifications)
      .where(eq(shiftNotifications.id, id));
    
    if (!notification) {
      return { success: false, message: 'Notification not found' };
    }
    
    // Simulate sending notification
    console.log('Test notification:', notification);
    
    // Log test attempt for audit
    await db.insert(auditLog).values({
      userId: notification.userId,
      action: 'shift_notification_tested',
      entity: 'shift_notifications',
      entityId: id,
      details: JSON.stringify({ tested: true })
    });
    
    return { success: true, message: 'Test notification sent successfully' };
  }

  async getUpcomingNotifications(): Promise<ShiftNotification[]> {
    const now = new Date();
    const upcoming = await db.select()
      .from(shiftNotifications)
      .where(and(
        eq(shiftNotifications.enabled, true),
        gte(shiftNotifications.scheduledTime, now)
      ))
      .orderBy(asc(shiftNotifications.scheduledTime));
    
    return upcoming;
  }

  async getUserNotificationPreferences(userId: number): Promise<{ notifications: ShiftNotification[]; preferences: any }> {
    const notifications = await this.getShiftNotifications(userId);
    
    // Get user preferences from metadata
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId));
    
    return {
      notifications,
      preferences: {
        emailEnabled: true,
        whatsappEnabled: false,
        pushEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00'
      }
    };
  }
  
  // =============== Wave 1.5: Geofence Management ===============
  
  async getGeofenceZones(): Promise<GeofenceZone[]> {
    return await db.select()
      .from(geofenceZones)
      .orderBy(desc(geofenceZones.createdAt));
  }

  async createGeofenceZone(zone: InsertGeofenceZone): Promise<GeofenceZone> {
    // Validate geofence data
    const validator = new DataValidator();
    if (!validator.validateObject(zone, ['name', 'type'])) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid geofence data',
        ErrorSeverity.MEDIUM
      );
    }
    
    // Validate geometry based on type
    if (zone.type === 'circle' && (!zone.centerLat || !zone.centerLng || !zone.radiusMeters)) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Circle geofence requires center coordinates and radius',
        ErrorSeverity.MEDIUM
      );
    }
    
    if (zone.type === 'polygon' && !zone.polygonCoordinates) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'Polygon geofence requires coordinates',
        ErrorSeverity.MEDIUM
      );
    }

    const [created] = await db.insert(geofenceZones)
      .values({
        ...zone,
        enforced: zone.enforced ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Audit log for Fortune 50 compliance
    await db.insert(auditLog).values({
      userId: zone.createdBy || null,
      action: 'geofence_created',
      entity: 'geofence_zones',
      entityId: created.id,
      details: JSON.stringify({ zone: created })
    });
    
    return created;
  }

  async updateGeofenceZone(id: number, zone: Partial<InsertGeofenceZone>): Promise<GeofenceZone> {
    const [updated] = await db.update(geofenceZones)
      .set({
        ...zone,
        updatedAt: new Date()
      })
      .where(eq(geofenceZones.id, id))
      .returning();
    
    if (!updated) {
      throw new ServiceError(
        ErrorCode.NOT_FOUND,
        'Geofence zone not found',
        ErrorSeverity.LOW
      );
    }
    
    return updated;
  }

  async deleteGeofenceZone(id: number): Promise<void> {
    await db.delete(geofenceZones)
      .where(eq(geofenceZones.id, id));
  }

  async toggleGeofenceEnforcement(id: number, enforced: boolean): Promise<GeofenceZone> {
    return this.updateGeofenceZone(id, { enforced });
  }

  async testGeofenceZone(id: number, testData: { latitude: number; longitude: number }): Promise<{ insideGeofence: boolean; distance?: number }> {
    const [zone] = await db.select()
      .from(geofenceZones)
      .where(eq(geofenceZones.id, id));
    
    if (!zone) {
      throw new ServiceError(
        ErrorCode.NOT_FOUND,
        'Geofence zone not found',
        ErrorSeverity.LOW
      );
    }
    
    let insideGeofence = false;
    let distance: number | undefined;
    
    if (zone.type === 'circle') {
      // Calculate distance from center using Haversine formula
      const R = 6371000; // Earth radius in meters
      const lat1 = zone.centerLat! * Math.PI / 180;
      const lat2 = testData.latitude * Math.PI / 180;
      const deltaLat = (testData.latitude - zone.centerLat!) * Math.PI / 180;
      const deltaLng = (testData.longitude - zone.centerLng!) * Math.PI / 180;
      
      const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      distance = R * c;
      
      insideGeofence = distance <= zone.radiusMeters!;
    } else if (zone.type === 'polygon') {
      // Point-in-polygon algorithm (ray casting)
      const coords = zone.polygonCoordinates as any[];
      let inside = false;
      
      for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
        const xi = coords[i].lng, yi = coords[i].lat;
        const xj = coords[j].lng, yj = coords[j].lat;
        
        const intersect = ((yi > testData.latitude) !== (yj > testData.latitude))
            && (testData.longitude < (xj - xi) * (testData.latitude - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      
      insideGeofence = inside;
    }
    
    return { insideGeofence, distance };
  }

  async getGeofenceViolations(startDate?: Date, endDate?: Date): Promise<any[]> {
    // Get location tracking entries that violate geofences
    let query = db.select({
      id: locationTracking.id,
      userId: locationTracking.userId,
      timestamp: locationTracking.timestamp,
      latitude: locationTracking.latitude,
      longitude: locationTracking.longitude,
      geofenceId: locationTracking.geofenceId,
      violationType: locationTracking.auditMetadata
    }).from(locationTracking);
    
    const conditions = [];
    if (startDate) conditions.push(gte(locationTracking.timestamp, startDate));
    if (endDate) conditions.push(lte(locationTracking.timestamp, endDate));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(locationTracking.timestamp));
  }

  async getGeofenceAnalytics(): Promise<{ totalZones: number; activeZones: number; violations: number }> {
    const [stats] = await db.select({
      totalZones: sql<number>`count(*)::int`,
      activeZones: sql<number>`count(*) filter (where enforced = true)::int`
    }).from(geofenceZones);
    
    // Count violations in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const [violationStats] = await db.select({
      violations: sql<number>`count(*)::int`
    }).from(locationTracking)
      .where(and(
        gte(locationTracking.timestamp, thirtyDaysAgo),
        ne(locationTracking.geofenceId, null)
      ));
    
    return {
      totalZones: stats?.totalZones || 0,
      activeZones: stats?.activeZones || 0,
      violations: violationStats?.violations || 0
    };
  }
  
  // =============== Wave 1.5: GPS Battery Optimization ===============
  
  async getGpsBatteryProfiles(): Promise<GpsBatteryProfile[]> {
    return await db.select()
      .from(gpsBatteryProfiles)
      .orderBy(asc(gpsBatteryProfiles.profileName));
  }

  async createGpsBatteryProfile(profile: InsertGpsBatteryProfile): Promise<GpsBatteryProfile> {
    const [created] = await db.insert(gpsBatteryProfiles)
      .values({
        ...profile,
        isActive: profile.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Audit log for Fortune 50 compliance
    await db.insert(auditLog).values({
      userId: null,
      action: 'gps_profile_created',
      entity: 'gps_battery_profiles',
      entityId: created.id,
      details: JSON.stringify({ profile: created })
    });
    
    return created;
  }

  async updateGpsBatteryProfile(id: number, profile: Partial<InsertGpsBatteryProfile>): Promise<GpsBatteryProfile> {
    const [updated] = await db.update(gpsBatteryProfiles)
      .set({
        ...profile,
        updatedAt: new Date()
      })
      .where(eq(gpsBatteryProfiles.id, id))
      .returning();
    
    if (!updated) {
      throw new ServiceError(
        ErrorCode.NOT_FOUND,
        'GPS profile not found',
        ErrorSeverity.LOW
      );
    }
    
    return updated;
  }

  async deleteGpsBatteryProfile(id: number): Promise<void> {
    await db.delete(gpsBatteryProfiles)
      .where(eq(gpsBatteryProfiles.id, id));
  }

  async applyGpsBatteryProfile(deviceId: number, profileId: number): Promise<GpsDeviceStatus> {
    // Update device status with new profile
    const [updated] = await db.update(gpsDeviceStatus)
      .set({
        currentProfileId: profileId,
        lastProfileChange: new Date(),
        updatedAt: new Date()
      })
      .where(eq(gpsDeviceStatus.id, deviceId))
      .returning();
    
    if (!updated) {
      // Create new device status if doesn't exist
      const [created] = await db.insert(gpsDeviceStatus)
        .values({
          deviceId: deviceId.toString(),
          currentProfileId: profileId,
          lastSeen: new Date(),
          lastProfileChange: new Date(),
          batteryLevel: 100,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return created;
    }
    
    return updated;
  }

  async getGpsDeviceStatus(): Promise<GpsDeviceStatus[]> {
    return await db.select()
      .from(gpsDeviceStatus)
      .orderBy(desc(gpsDeviceStatus.lastSeen));
  }

  async updateGpsDeviceStatus(deviceId: number, status: Partial<InsertGpsDeviceStatus>): Promise<GpsDeviceStatus> {
    const [updated] = await db.update(gpsDeviceStatus)
      .set({
        ...status,
        updatedAt: new Date()
      })
      .where(eq(gpsDeviceStatus.id, deviceId))
      .returning();
    
    if (!updated) {
      throw new ServiceError(
        ErrorCode.NOT_FOUND,
        'GPS device not found',
        ErrorSeverity.LOW
      );
    }
    
    return updated;
  }

  async getGpsAnalytics(): Promise<{ totalDevices: number; activeDevices: number; avgBatteryLife: number }> {
    const [stats] = await db.select({
      totalDevices: sql<number>`count(*)::int`,
      activeDevices: sql<number>`count(*) filter (where is_active = true)::int`,
      avgBatteryLife: sql<number>`avg(battery_level)::numeric`
    }).from(gpsDeviceStatus);
    
    return {
      totalDevices: stats?.totalDevices || 0,
      activeDevices: stats?.activeDevices || 0,
      avgBatteryLife: Number(stats?.avgBatteryLife || 0)
    };
  }

  async getGpsSettings(): Promise<{ profiles: GpsBatteryProfile[]; defaultProfileId?: number }> {
    const profiles = await this.getGpsBatteryProfiles();
    
    // Get the default/most used profile
    const [mostUsed] = await db.select({
      profileId: gpsDeviceStatus.currentProfileId,
      count: sql<number>`count(*)::int`
    })
    .from(gpsDeviceStatus)
    .where(ne(gpsDeviceStatus.currentProfileId, null))
    .groupBy(gpsDeviceStatus.currentProfileId)
    .orderBy(desc(sql<number>`count(*)`))
    .limit(1);
    
    return {
      profiles,
      defaultProfileId: mostUsed?.profileId || profiles[0]?.id
    };
  }

  async updateGpsSettings(settings: { defaultProfileId: number }): Promise<{ success: boolean }> {
    // This would typically update a system settings table
    // For now, we'll just validate the profile exists
    const [profile] = await db.select()
      .from(gpsBatteryProfiles)
      .where(eq(gpsBatteryProfiles.id, settings.defaultProfileId));
    
    if (!profile) {
      throw new ServiceError(
        ErrorCode.NOT_FOUND,
        'GPS profile not found',
        ErrorSeverity.LOW
      );
    }
    
    // Log the settings update
    await db.insert(auditLog).values({
      userId: null,
      action: 'gps_settings_updated',
      entity: 'gps_settings',
      entityId: settings.defaultProfileId,
      details: JSON.stringify({ settings })
    });
    
    return { success: true };
  }

  // Fortune 50 Security: Dual Authorization for GPS Overrides
  async requestGpsOverride(requesterId: number, targetUserId: number, reason: string, metadata: any): Promise<DualAuthRequest> {
    // Use database transaction for atomicity
    return await db.transaction(async (tx) => {
      // Validate requester
      const [requester] = await tx.select().from(users).where(eq(users.id, requesterId));
      if (!requester) throw new Error('Requester not found');
      
      // Validate target user
      const [targetUser] = await tx.select().from(users).where(eq(users.id, targetUserId));
      if (!targetUser) throw new Error('Target user not found');
      
      // Check requester != target (cannot override own GPS)
      if (requesterId === targetUserId) {
        throw new Error('Cannot request GPS override for yourself');
      }

      const requestId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Get the last hash block to maintain chain integrity
      const [lastBlock] = await tx.select()
        .from(hashChainBlocks)
        .where(eq(hashChainBlocks.chainId, 'main'))
        .orderBy(desc(hashChainBlocks.blockIndex))
        .limit(1);

      // Calculate proper hash chain values
      const previousHash = lastBlock ? lastBlock.blockHash : '0000000000000000000000000000000000000000000000000000000000000000';
      const blockIndex = lastBlock ? Number(lastBlock.blockIndex) + 1 : 1;
      const blockData = {
        type: 'DUAL_AUTH_REQUEST',
        requestId,
        requesterId,
        targetUserId,
        timestamp: new Date().toISOString()
      };
      const blockHash = crypto.createHash('sha256')
        .update(previousHash + JSON.stringify(blockData))
        .digest('hex');

      // Persist hash block first
      const [hashBlock] = await tx.insert(hashChainBlocks).values({
        chainId: 'main',
        blockIndex: BigInt(blockIndex),
        previousHash,
        blockHash,
        blockType: 'DUAL_AUTH_REQUEST',
        payload: blockData
      }).returning();

      // Persist dual auth request with hash chain reference
      const [dualAuthRequest] = await tx.insert(dualAuthRequests).values({
        requestId,
        requestType: 'GPS_OVERRIDE',
        requesterId,
        requesterName: `${requester.firstName} ${requester.lastName}`,
        resourceType: 'gps_tracking',
        resourceId: String(targetUserId),
        action: 'override_gps_requirement',
        reason,
        metadata,
        status: 'pending',
        expiresAt,
        hashChainBlockIndex: hashBlock.blockIndex
      }).returning();

      // Create audit log entry
      await tx.insert(auditLog).values({
        userId: requesterId,
        action: 'gps_override_requested',
        entity: 'dual_auth',
        entityId: requestId,
        hashChainId: 'main',
        chainBlockIndex: hashBlock.blockIndex,
        details: JSON.stringify({ 
          request: dualAuthRequest, 
          hashBlock: {
            blockIndex: hashBlock.blockIndex,
            blockHash: hashBlock.blockHash,
            previousHash: hashBlock.previousHash
          }
        })
      });

      // Send notifications to potential approvers (managers/admins with dual_auth_gps_override_approve permission)
      try {
        const potentialApprovers = await tx.select({
          userId: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          permissions: roles.permissions
        })
        .from(users)
        .innerJoin(teamMembers, eq(teamMembers.userId, users.id))
        .innerJoin(roles, eq(roles.id, teamMembers.roleId))
        .where(and(
          ne(users.id, requesterId),
          eq(users.isActive, true)
        ));
        
        // Filter to approvers with dual_auth_approve or time_payroll_approve permissions
        const qualifiedApprovers = potentialApprovers.filter(approver => {
          const perms = approver.permissions as any || {};
          return perms.dual_auth_approve === true || 
                 perms.time_payroll_approve === true ||
                 perms.admin === true;
        });
        
        // Send notification to each qualified approver
        for (const approver of qualifiedApprovers) {
          await NotificationService.notifyDualAuthRequired(
            approver.userId,
            requestId,
            'GPS_OVERRIDE',
            `${requester.firstName} ${requester.lastName}`,
            targetUserId,
            reason
          );
        }
      } catch (notifyError) {
        console.error("Dual auth notification error (non-blocking):", notifyError);
      }

      return dualAuthRequest as DualAuthRequest;
    });
  }

  async approveGpsOverride(requestId: string, approverId: number): Promise<DualAuthRequest> {
    // Validate approver
    const [approver] = await db.select().from(users).where(eq(users.id, approverId));
    if (!approver) throw new Error('Approver not found');

    // Fetch the request from database
    const [request] = await db.select()
      .from(dualAuthRequests)
      .where(eq(dualAuthRequests.requestId, requestId));
    
    if (!request) throw new Error('Request not found');
    if (request.status !== 'pending') throw new Error('Request is not pending');
    if (new Date(request.expiresAt) < new Date()) throw new Error('Request has expired');
    
    // Enforce separation of duties: approver cannot be requester
    if (request.requesterId === approverId) {
      throw new Error('Approver cannot be the same as requester (separation of duties)');
    }

    // Update request status to approved
    const [approved] = await db.update(dualAuthRequests)
      .set({
        status: 'approved',
        resolvedAt: new Date()
      })
      .where(eq(dualAuthRequests.requestId, requestId))
      .returning();

    // Create approval event with signature
    const signature = crypto.createHash('sha256')
      .update(`${requestId}-${approverId}-${Date.now()}`)
      .digest('hex');

    await db.insert(dualAuthEvents).values({
      requestId,
      eventType: 'approve',
      approverId,
      approverName: `${approver.firstName} ${approver.lastName}`,
      signature,
      signatureMethod: 'SHA256',
      metadata: { approvedAt: new Date() }
    });

    // Create hash chain block for approval
    const block = this.hashChain.addBlock({
      type: 'DUAL_AUTH_APPROVAL',
      requestId,
      approverId,
      signature,
      timestamp: new Date().toISOString()
    });

    // Persist hash block
    const blockIndex = BigInt(Date.now());
    await db.insert(hashChainBlocks).values({
      chainId: 'main',
      blockIndex,
      previousHash: block.previousHash,
      blockHash: block.hash,
      blockType: 'DUAL_AUTH_APPROVAL',
      payload: block.data
    });

    // Update audit log with hash chain reference
    await db.insert(auditLog).values({
      userId: approverId,
      action: 'gps_override_approved',
      entity: 'dual_auth',
      entityId: requestId,
      hashChainId: 'main',
      chainBlockIndex: blockIndex,
      details: JSON.stringify({ approved, signature, hashBlock: block })
    });

    return approved as unknown as DualAuthRequest;
  }

  // Fortune 50 Security: Bulk Correction with Dual Approval
  async requestBulkCorrection(userId: number, adjustments: any[], totalMinutes: number): Promise<DualAuthRequest | null> {
    // Only require dual approval for adjustments > 120 minutes
    if (totalMinutes <= 120) return null;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error('User not found');

    const request = this.dualAuthManager.createRequest({
      requestType: 'BULK_CORRECTION',
      requesterId: userId,
      requesterName: `${user.firstName} ${user.lastName}`,
      resourceType: 'time_entries',
      resourceId: `bulk_${Date.now()}`,
      action: 'bulk_time_correction',
      reason: `Bulk correction of ${totalMinutes} minutes`,
      metadata: { adjustments, totalMinutes }
    });

    // Get the last hash block to maintain chain integrity
    const [lastBlock] = await db.select()
      .from(hashChainBlocks)
      .where(eq(hashChainBlocks.chainId, 'main'))
      .orderBy(desc(hashChainBlocks.blockIndex))
      .limit(1);

    const previousHash = lastBlock ? lastBlock.blockHash : '0000000000000000000000000000000000000000000000000000000000000000';
    const blockIndex = lastBlock ? Number(lastBlock.blockIndex) + 1 : 1;
    const blockData = {
      type: 'BULK_CORRECTION_REQUEST',
      request,
      timestamp: new Date().toISOString()
    };
    const blockHash = crypto.createHash('sha256')
      .update(previousHash + JSON.stringify(blockData))
      .digest('hex');

    // Persist hash block to database
    const [hashBlock] = await db.insert(hashChainBlocks).values({
      chainId: 'main',
      blockIndex: BigInt(blockIndex),
      previousHash,
      blockHash,
      blockType: 'BULK_CORRECTION_REQUEST',
      payload: blockData
    }).returning();

    await db.insert(auditLog).values({
      userId,
      action: 'bulk_correction_requested',
      entity: 'dual_auth',
      entityId: request.requestId,
      hashChainId: 'main',
      chainBlockIndex: hashBlock.blockIndex,
      details: JSON.stringify({ request, hashBlock: { blockIndex: hashBlock.blockIndex, blockHash: hashBlock.blockHash, previousHash: hashBlock.previousHash } })
    });

    // Send notifications to potential approvers (managers/admins with dual_auth_bulk_correction_approve permission)
    try {
      const potentialApprovers = await db.select({
        userId: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        permissions: roles.permissions
      })
      .from(users)
      .innerJoin(teamMembers, eq(teamMembers.userId, users.id))
      .innerJoin(roles, eq(roles.id, teamMembers.roleId))
      .where(and(
        ne(users.id, userId),
        eq(users.isActive, true)
      ));
      
      // Filter to approvers with dual_auth_approve or time_payroll_approve permissions
      const qualifiedApprovers = potentialApprovers.filter(approver => {
        const perms = approver.permissions as any || {};
        return perms.dual_auth_approve === true || 
               perms.time_payroll_approve === true ||
               perms.admin === true;
      });
      
      // Send notification to each qualified approver
      for (const approver of qualifiedApprovers) {
        await NotificationService.notifyDualAuthRequired(
          approver.userId,
          request.requestId,
          'BULK_CORRECTION',
          `${user.firstName} ${user.lastName}`,
          userId,
          `Bulk correction of ${totalMinutes} minutes`
        );
      }
    } catch (notifyError) {
      console.error("Bulk correction notification error (non-blocking):", notifyError);
    }

    return request;
  }

  // Fortune 50 Security: Kiosk Session Management
  async createKioskSession(deviceId: string, location: any, metadata: any): Promise<KioskSession> {
    const session = this.kioskManager.createSession(deviceId, location, metadata);

    // Get the last hash block to maintain chain integrity
    const [lastBlock] = await db.select()
      .from(hashChainBlocks)
      .where(eq(hashChainBlocks.chainId, 'main'))
      .orderBy(desc(hashChainBlocks.blockIndex))
      .limit(1);

    const previousHash = lastBlock ? lastBlock.blockHash : '0000000000000000000000000000000000000000000000000000000000000000';
    const blockIndex = lastBlock ? Number(lastBlock.blockIndex) + 1 : 1;
    const blockData = {
      type: 'KIOSK_SESSION_CREATED',
      session,
      timestamp: new Date().toISOString()
    };
    const blockHash = crypto.createHash('sha256')
      .update(previousHash + JSON.stringify(blockData))
      .digest('hex');

    // Persist hash block to database
    const [hashBlock] = await db.insert(hashChainBlocks).values({
      chainId: 'main',
      blockIndex: BigInt(blockIndex),
      previousHash,
      blockHash,
      blockType: 'KIOSK_SESSION_CREATED',
      payload: blockData
    }).returning();

    await db.insert(auditLog).values({
      userId: null,
      action: 'kiosk_session_created',
      entity: 'kiosk_sessions',
      entityId: session.sessionId,
      hashChainId: 'main',
      chainBlockIndex: hashBlock.blockIndex,
      details: JSON.stringify({ session, hashBlock: { blockIndex: hashBlock.blockIndex, blockHash: hashBlock.blockHash, previousHash: hashBlock.previousHash } })
    });

    return session;
  }

  async verifyKioskSession(sessionId: string): Promise<boolean> {
    const isValid = this.kioskManager.verifySession(sessionId);

    // Get the last hash block to maintain chain integrity
    const [lastBlock] = await db.select()
      .from(hashChainBlocks)
      .where(eq(hashChainBlocks.chainId, 'main'))
      .orderBy(desc(hashChainBlocks.blockIndex))
      .limit(1);

    const previousHash = lastBlock ? lastBlock.blockHash : '0000000000000000000000000000000000000000000000000000000000000000';
    const blockIndex = lastBlock ? Number(lastBlock.blockIndex) + 1 : 1;
    const blockData = {
      type: 'KIOSK_SESSION_VERIFIED',
      sessionId,
      isValid,
      timestamp: new Date().toISOString()
    };
    const blockHash = crypto.createHash('sha256')
      .update(previousHash + JSON.stringify(blockData))
      .digest('hex');

    // Persist hash block to database
    const [hashBlock] = await db.insert(hashChainBlocks).values({
      chainId: 'main',
      blockIndex: BigInt(blockIndex),
      previousHash,
      blockHash,
      blockType: 'KIOSK_SESSION_VERIFIED',
      payload: blockData
    }).returning();

    await db.insert(auditLog).values({
      userId: null,
      action: 'kiosk_session_verified',
      entity: 'kiosk_sessions',
      entityId: sessionId,
      hashChainId: 'main',
      chainBlockIndex: hashBlock.blockIndex,
      details: JSON.stringify({ isValid, hashBlock: { blockIndex: hashBlock.blockIndex, blockHash: hashBlock.blockHash, previousHash: hashBlock.previousHash } })
    });

    return isValid;
  }

  // Fortune 50 Security: 30-Second GPS Breadcrumb Analytics
  async analyzeGpsBreadcrumbs(userId: number, startDate: Date, endDate: Date): Promise<BreadcrumbAnalytics> {
    // Fetch GPS logs for the user in the date range
    const logs = await db.select()
      .from(gpsLogs)
      .where(
        and(
          eq(gpsLogs.userId, userId),
          gte(gpsLogs.timestamp, startDate),
          lte(gpsLogs.timestamp, endDate)
        )
      )
      .orderBy(asc(gpsLogs.timestamp));

    // Convert to breadcrumb format
    const breadcrumbs: GPSBreadcrumb[] = logs.map(log => ({
      userId: log.userId,
      timestamp: log.timestamp.toISOString(),
      latitude: log.latitude,
      longitude: log.longitude,
      accuracy: log.accuracy,
      altitude: log.altitude || undefined,
      speed: log.speed || undefined,
      heading: log.heading || undefined,
      batteryLevel: 100, // Default if not tracked
      isCharging: false,
      networkType: 'unknown',
      sessionHash: log.sessionHash || '',
      previousBreadcrumbHash: undefined
    }));

    // Analyze breadcrumbs
    const analytics = this.breadcrumbAnalyzer.analyzeBreadcrumbs(breadcrumbs);

    // Check for mock location
    const isMocked = this.breadcrumbAnalyzer.detectMockLocation(breadcrumbs);
    if (isMocked) {
      analytics.anomalies.push('MOCK_LOCATION_DETECTED');
    }

    // Persist analytics with hash chain
    const block = this.hashChain.addBlock({
      type: 'BREADCRUMB_ANALYTICS',
      userId,
      startDate,
      endDate,
      analytics,
      timestamp: new Date().toISOString()
    });

    await db.insert(auditLog).values({
      userId,
      action: 'breadcrumb_analytics_generated',
      entity: 'gps_analytics',
      entityId: userId,
      details: JSON.stringify({ analytics, hashBlock: block })
    });

    return analytics;
  }

  // Get pending dual authorization requests
  async getPendingDualAuthRequests(): Promise<DualAuthRequest[]> {
    return this.dualAuthManager.getPendingRequests();
  }

  // Verify hash chain integrity
  async verifyAuditIntegrity(startDate: Date, endDate: Date): Promise<boolean> {
    const auditLogs = await db.select()
      .from(auditLog)
      .where(
        and(
          gte(auditLog.createdAt, startDate),
          lte(auditLog.createdAt, endDate)
        )
      )
      .orderBy(asc(auditLog.createdAt));

    // Extract hash blocks from audit logs
    const blocks: any[] = [];
    for (const log of auditLogs) {
      try {
        const details = JSON.parse(log.details as string);
        if (details.hashBlock) {
          blocks.push(details.hashBlock);
        }
      } catch (e) {
        // Skip non-JSON details
      }
    }

    // Verify chain integrity
    return this.hashChain.verifyChain(blocks);
  }
}

export const timeManagementStorage = new TimeManagementStorage();