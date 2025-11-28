import { db } from "../db";
import { payrollPeriods, timesheets, payrollSyncLog, timeClocks, users, auditLog } from "@shared/schema";
import { eq, and, lte, gte, or, isNull, desc, asc, sql } from "drizzle-orm";
import { startOfWeek, endOfWeek, addDays, format, isWithinInterval } from "date-fns";
import { ServiceAuthGuard, ServiceContext } from "./utils/serviceAuthGuard";
import { payrollPeriodPermissions } from "./permissions/payrollPeriodPermissions";
import { locationPayrollService } from "./locationPayrollService";

export interface PayrollPeriodInfo {
  id: number;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  payDate: Date | null;
  status: 'open' | 'processing' | 'locked' | 'processed' | 'exported';
  lockStatus: 'unlocked' | 'manager_locked' | 'admin_locked';
  lockedBy: number | null;
  lockedAt: Date | null;
  timesheetCount?: number;
  totalHours?: number;
  totalCost?: number;
}

export interface PeriodLockResult {
  success: boolean;
  message: string;
  period?: PayrollPeriodInfo;
  violations?: string[];
}

export interface PeriodValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  statistics: {
    totalTimesheets: number;
    approvedTimesheets: number;
    pendingTimesheets: number;
    totalHours: number;
    totalEmployees: number;
  };
}

// Fortune 50 State Machine for Payroll Periods
type PeriodStatus = 'open' | 'processing' | 'locked' | 'processed' | 'exported';
type LockStatus = 'unlocked' | 'manager_locked' | 'admin_locked';

interface StateTransition {
  from: PeriodStatus[];
  to: PeriodStatus;
  requiredPermission?: string;
  validateConditions?: (period: any, userId: number) => Promise<{ valid: boolean; reason?: string }>;
}

export class PayrollPeriodService {
  
  // State machine transitions for payroll periods
  private readonly statusTransitions: Map<string, StateTransition> = new Map([
    ['startProcessing', {
      from: ['open'],
      to: 'processing',
      requiredPermission: 'manage_periods',
      validateConditions: async (period) => {
        const validation = await this.validatePeriod(period.id);
        if (!validation.isValid) {
          return { 
            valid: false, 
            reason: `Period validation failed: ${validation.errors.join(', ')}` 
          };
        }
        return { valid: true };
      }
    }],
    ['lock', {
      from: ['processing'],
      to: 'locked',
      requiredPermission: 'lock_periods',
      validateConditions: async (period) => {
        // All timesheets must be approved
        const unapproved = await this.getUnapprovedTimesheets(period.id);
        if (unapproved.length > 0) {
          return { 
            valid: false, 
            reason: `${unapproved.length} timesheets are not approved` 
          };
        }
        return { valid: true };
      }
    }],
    ['process', {
      from: ['locked'],
      to: 'processed',
      requiredPermission: 'process_payroll',
      validateConditions: async (period) => {
        // Period must be admin locked
        if (period.lockStatus !== 'admin_locked') {
          return { 
            valid: false, 
            reason: 'Period must be admin-locked before processing' 
          };
        }
        return { valid: true };
      }
    }],
    ['export', {
      from: ['processed'],
      to: 'exported',
      requiredPermission: 'export_payroll'
    }]
  ]);
  
  /**
   * Get current payroll period
   */
  async getCurrentPeriod(context: ServiceContext, businessUnitId?: number): Promise<PayrollPeriodInfo | null> {
    // Note: Permission check handled by ServiceAuthGuard
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
    
    return period ? this.enrichPeriodInfo(period) : null;
  }
  
  /**
   * Create a new payroll period
   */
  async createPeriod(
    context: ServiceContext,
    startDate: Date,
    endDate: Date,
    payDate: Date,
    businessUnitId?: number
  ): Promise<PayrollPeriodInfo> {
    // Check for overlapping periods
    const existing = await this.checkOverlappingPeriods(startDate, endDate, businessUnitId);
    if (existing) {
      throw new Error(
        `Period overlaps with existing period: ${format(existing.payPeriodStart, 'MMM dd')} - ${format(existing.payPeriodEnd, 'MMM dd')}`
      );
    }
    
    const [period] = await db
      .insert(payrollPeriods)
      .values({
        payPeriodStart: startDate,
        payPeriodEnd: endDate,
        payDate,
        businessUnitId,
        status: 'open',
        lockStatus: 'unlocked',
        adjustmentsAllowed: true
      })
      .returning();
    
    // Audit log
    await this.auditLog(period.id, 'PERIOD_CREATED', null, {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      payDate: format(payDate, 'yyyy-MM-dd')
    });
    
    return this.enrichPeriodInfo(period);
  }
  
  /**
   * Lock a payroll period with different lock levels
   */
  async lockPeriod(
    context: ServiceContext,
    periodId: number,
    lockLevel: 'manager' | 'admin',
    reason?: string
  ): Promise<PeriodLockResult> {
    const userId = context.user.id;
    const period = await this.getPeriodById(periodId);
    if (!period) {
      return { success: false, message: 'Period not found' };
    }
    
    // Check current lock status
    if (period.lockStatus === 'admin_locked' && lockLevel === 'manager') {
      return { 
        success: false, 
        message: 'Cannot downgrade from admin lock to manager lock' 
      };
    }
    
    // Validate period before locking
    const validation = await this.validatePeriod(periodId);
    if (!validation.isValid && lockLevel === 'admin') {
      return {
        success: false,
        message: 'Period has validation errors',
        violations: validation.errors
      };
    }
    
    // Update lock status
    const lockStatus = lockLevel === 'admin' ? 'admin_locked' : 'manager_locked';
    
    await db
      .update(payrollPeriods)
      .set({
        lockStatus,
        lockedBy: userId,
        lockedAt: new Date(),
        lockReason: reason,
        adjustmentsAllowed: lockLevel !== 'admin',
        updatedAt: new Date()
      })
      .where(eq(payrollPeriods.id, periodId));
    
    // Lock all timesheets in the period
    await db
      .update(timesheets)
      .set({
        status: 'locked',
        lockedAt: new Date(),
        lockedBy: userId,
        updatedAt: new Date()
      })
      .where(
        and(
          gte(timesheets.weekStartDate, period.payPeriodStart),
          lte(timesheets.weekEndDate, period.payPeriodEnd)
        )
      );
    
    // Audit log
    await this.auditLog(periodId, 'PERIOD_LOCKED', userId, {
      lockLevel,
      reason
    });
    
    const updatedPeriod = await this.getPeriodById(periodId);
    return {
      success: true,
      message: `Period ${lockLevel}-locked successfully`,
      period: updatedPeriod!
    };
  }
  
  /**
   * Unlock a payroll period
   */
  async unlockPeriod(
    periodId: number,
    userId: number,
    reason: string
  ): Promise<PeriodLockResult> {
    const period = await this.getPeriodById(periodId);
    if (!period) {
      return { success: false, message: 'Period not found' };
    }
    
    if (period.status === 'exported') {
      return { 
        success: false, 
        message: 'Cannot unlock exported period' 
      };
    }
    
    // Update lock status
    await db
      .update(payrollPeriods)
      .set({
        lockStatus: 'unlocked',
        lockedBy: null,
        lockedAt: null,
        lockReason: null,
        adjustmentsAllowed: true,
        status: period.status === 'locked' ? 'processing' : period.status,
        updatedAt: new Date()
      })
      .where(eq(payrollPeriods.id, periodId));
    
    // Unlock timesheets
    await db
      .update(timesheets)
      .set({
        status: 'approved', // Revert to approved state
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date()
      })
      .where(
        and(
          gte(timesheets.weekStartDate, period.payPeriodStart),
          lte(timesheets.weekEndDate, period.payPeriodEnd),
          eq(timesheets.status, 'locked')
        )
      );
    
    // Audit log
    await this.auditLog(periodId, 'PERIOD_UNLOCKED', userId, { reason });
    
    const updatedPeriod = await this.getPeriodById(periodId);
    return {
      success: true,
      message: 'Period unlocked successfully',
      period: updatedPeriod!
    };
  }
  
  /**
   * Process payroll for a locked period
   */
  async processPeriod(
    periodId: number,
    userId: number
  ): Promise<{ success: boolean; message: string; summary?: any }> {
    const period = await this.getPeriodById(periodId);
    if (!period) {
      return { success: false, message: 'Period not found' };
    }
    
    if (period.lockStatus !== 'admin_locked') {
      return { 
        success: false, 
        message: 'Period must be admin-locked before processing' 
      };
    }
    
    // Calculate payroll summary
    const summary = await this.calculatePayrollSummary(periodId);
    
    // Apply location-based payroll adjustments (Fortune 50 requirement)
    try {
      console.log(`[PAYROLL PROCESSING] Applying location-based adjustments for period ${periodId}`);
      await locationPayrollService.applyLocationAdjustmentsToPayroll(periodId);
    } catch (error) {
      console.error('[PAYROLL PROCESSING] Error applying location adjustments:', error);
      // Continue processing even if location adjustments fail
    }
    
    // Update period status
    await db
      .update(payrollPeriods)
      .set({
        status: 'processed',
        processingCheckpoints: {
          processedAt: new Date(),
          processedBy: userId,
          summary
        },
        updatedAt: new Date()
      })
      .where(eq(payrollPeriods.id, periodId));
    
    // Mark all timesheets as processed
    await db
      .update(timesheets)
      .set({
        status: 'processing',
        processedAt: new Date(),
        updatedAt: new Date()
      })
      .where(
        and(
          gte(timesheets.weekStartDate, period.payPeriodStart),
          lte(timesheets.weekEndDate, period.payPeriodEnd)
        )
      );
    
    // Audit log
    await this.auditLog(periodId, 'PERIOD_PROCESSED', userId, { summary });
    
    return {
      success: true,
      message: 'Payroll processed successfully',
      summary
    };
  }
  
  /**
   * Validate a payroll period
   */
  async validatePeriod(periodId: number): Promise<PeriodValidationResult> {
    const period = await this.getPeriodById(periodId);
    if (!period) {
      return {
        isValid: false,
        errors: ['Period not found'],
        warnings: [],
        statistics: {
          totalTimesheets: 0,
          approvedTimesheets: 0,
          pendingTimesheets: 0,
          totalHours: 0,
          totalEmployees: 0
        }
      };
    }
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Get all timesheets for the period
    const timesheetStats = await db
      .select({
        totalCount: sql<number>`COUNT(*)`,
        approvedCount: sql<number>`COUNT(*) FILTER (WHERE status = 'approved')`,
        pendingCount: sql<number>`COUNT(*) FILTER (WHERE status IN ('draft', 'submitted'))`,
        totalHours: sql<number>`COALESCE(SUM(CAST(total_hours AS NUMERIC)), 0)`,
        uniqueEmployees: sql<number>`COUNT(DISTINCT user_id)`
      })
      .from(timesheets)
      .where(
        and(
          gte(timesheets.weekStartDate, period.payPeriodStart),
          lte(timesheets.weekEndDate, period.payPeriodEnd)
        )
      );
    
    const stats = timesheetStats[0] || {
      totalCount: 0,
      approvedCount: 0,
      pendingCount: 0,
      totalHours: 0,
      uniqueEmployees: 0
    };
    
    // Validation rules
    if (stats.totalCount === 0) {
      errors.push('No timesheets found for this period');
    }
    
    if (stats.pendingCount > 0) {
      errors.push(`${stats.pendingCount} timesheets are not approved`);
    }
    
    // Check for missing timesheets (employees who haven't submitted)
    const activeEmployees = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.isActive, true));
    
    const missingCount = activeEmployees.length - stats.uniqueEmployees;
    if (missingCount > 0) {
      warnings.push(`${missingCount} employees have not submitted timesheets`);
    }
    
    // Check for overtime violations
    const overtimeCheck = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(timesheets)
      .where(
        and(
          gte(timesheets.weekStartDate, period.payPeriodStart),
          lte(timesheets.weekEndDate, period.payPeriodEnd),
          sql`CAST(overtime_hours AS NUMERIC) > 20` // Flag excessive overtime
        )
      );
    
    if (overtimeCheck[0]?.count > 0) {
      warnings.push(`${overtimeCheck[0].count} timesheets have excessive overtime (>20 hours)`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      statistics: {
        totalTimesheets: stats.totalCount,
        approvedTimesheets: stats.approvedCount,
        pendingTimesheets: stats.pendingCount,
        totalHours: stats.totalHours,
        totalEmployees: stats.uniqueEmployees
      }
    };
  }
  
  /**
   * Get period by ID with enriched information
   */
  private async getPeriodById(periodId: number): Promise<PayrollPeriodInfo | null> {
    const [period] = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, periodId))
      .limit(1);
    
    return period ? this.enrichPeriodInfo(period) : null;
  }
  
  /**
   * Enrich period with additional information
   */
  private async enrichPeriodInfo(period: any): Promise<PayrollPeriodInfo> {
    // Get timesheet statistics
    const stats = await db
      .select({
        count: sql<number>`COUNT(*)`,
        totalHours: sql<number>`COALESCE(SUM(CAST(total_hours AS NUMERIC)), 0)`,
        totalCost: sql<number>`COALESCE(SUM(CAST(total_cost AS NUMERIC)), 0)`
      })
      .from(timesheets)
      .where(
        and(
          gte(timesheets.weekStartDate, period.payPeriodStart),
          lte(timesheets.weekEndDate, period.payPeriodEnd)
        )
      );
    
    return {
      ...period,
      timesheetCount: stats[0]?.count || 0,
      totalHours: stats[0]?.totalHours || 0,
      totalCost: stats[0]?.totalCost || 0
    };
  }
  
  /**
   * Check for overlapping periods
   */
  private async checkOverlappingPeriods(
    startDate: Date,
    endDate: Date,
    businessUnitId?: number
  ): Promise<any | null> {
    const conditions = [
      or(
        // New period starts within existing period
        and(
          lte(payrollPeriods.payPeriodStart, startDate),
          gte(payrollPeriods.payPeriodEnd, startDate)
        ),
        // New period ends within existing period
        and(
          lte(payrollPeriods.payPeriodStart, endDate),
          gte(payrollPeriods.payPeriodEnd, endDate)
        ),
        // New period completely contains existing period
        and(
          gte(payrollPeriods.payPeriodStart, startDate),
          lte(payrollPeriods.payPeriodEnd, endDate)
        )
      )
    ];
    
    if (businessUnitId) {
      conditions.push(eq(payrollPeriods.businessUnitId, businessUnitId));
    }
    
    const [existing] = await db
      .select()
      .from(payrollPeriods)
      .where(and(...conditions))
      .limit(1);
    
    return existing;
  }
  
  /**
   * Get unapproved timesheets for a period
   */
  private async getUnapprovedTimesheets(periodId: number): Promise<any[]> {
    const period = await this.getPeriodById(periodId);
    if (!period) return [];
    
    return db
      .select()
      .from(timesheets)
      .where(
        and(
          gte(timesheets.weekStartDate, period.payPeriodStart),
          lte(timesheets.weekEndDate, period.payPeriodEnd),
          sql`status != 'approved'`
        )
      );
  }
  
  /**
   * Calculate payroll summary for a period
   */
  private async calculatePayrollSummary(periodId: number): Promise<any> {
    const period = await this.getPeriodById(periodId);
    if (!period) return null;
    
    const summary = await db
      .select({
        totalEmployees: sql<number>`COUNT(DISTINCT user_id)`,
        totalHours: sql<number>`SUM(CAST(total_hours AS NUMERIC))`,
        regularHours: sql<number>`SUM(CAST(regular_hours AS NUMERIC))`,
        overtimeHours: sql<number>`SUM(CAST(overtime_hours AS NUMERIC))`,
        totalCost: sql<number>`SUM(CAST(total_cost AS NUMERIC))`
      })
      .from(timesheets)
      .where(
        and(
          gte(timesheets.weekStartDate, period.payPeriodStart),
          lte(timesheets.weekEndDate, period.payPeriodEnd)
        )
      );
    
    return summary[0];
  }
  
  /**
   * Create audit log entry
   */
  private async auditLog(
    periodId: number,
    action: string,
    userId: number | null,
    metadata?: any
  ): Promise<void> {
    await db.insert(auditLog).values({
      entityType: 'payroll_period',
      entityId: periodId,
      action,
      actionCategory: 'payroll',
      userId,
      metadata,
      success: true,
      createdAt: new Date()
    });
  }
}

// Export unguarded instance for internal/system use
export const payrollPeriodServiceInternal = new PayrollPeriodService();

// Export guarded instance for API routes
export const payrollPeriodService = ServiceAuthGuard.guard(
  payrollPeriodServiceInternal,
  payrollPeriodPermissions,
  'PayrollPeriodService'
);