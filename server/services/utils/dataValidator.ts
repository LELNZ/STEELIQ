import { z } from 'zod';
import { ServiceError, ErrorCode, ErrorSeverity } from './errorHandler';
import { db } from '../../db';
import { users, jobs, payrollPeriods, timesheets } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

/**
 * Comprehensive data validation layer for Time & Payroll system
 * Ensures data integrity and business rule compliance
 */

export interface ValidationRule {
  field: string;
  rule: (value: any) => boolean;
  message: string;
  severity?: ErrorSeverity;
}

export interface ValidationContext {
  userId?: number;
  entityType?: string;
  entityId?: number;
  operation?: string;
}

/**
 * Core validation service for all Time & Payroll data
 */
export class DataValidator {
  /**
   * Validate time entry data
   */
  static async validateTimeEntry(data: any, context: ValidationContext): Promise<void> {
    const schema = z.object({
      userId: z.number().positive('User ID must be positive'),
      clockIn: z.string().datetime('Clock in must be a valid datetime'),
      clockOut: z.string().datetime('Clock out must be a valid datetime').optional(),
      jobId: z.number().positive('Job ID must be positive').optional(),
      departmentId: z.number().positive('Department ID must be positive').optional(),
      taskId: z.number().positive('Task ID must be positive').optional(),
      gpsLocation: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().positive().optional()
      }).optional(),
      captureMethod: z.enum(['manual', 'gps', 'photo', 'nfc', 'qr']).optional()
    });
    
    try {
      const validated = schema.parse(data);
      
      // Business rule validations
      if (validated.clockOut) {
        const clockIn = new Date(validated.clockIn);
        const clockOut = new Date(validated.clockOut);
        
        if (clockOut <= clockIn) {
          throw new ServiceError(
            'Clock out time must be after clock in time',
            ErrorCode.VALIDATION_FAILED,
            ErrorSeverity.WARNING,
            context
          );
        }
        
        // Check for excessive duration (>24 hours)
        const durationHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        if (durationHours > 24) {
          throw new ServiceError(
            'Time entry exceeds 24 hours - please verify',
            ErrorCode.VALIDATION_FAILED,
            ErrorSeverity.WARNING,
            context
          );
        }
      }
      
      // Verify user exists
      const user = await db.select()
        .from(users)
        .where(eq(users.id, validated.userId))
        .limit(1);
      
      if (!user.length) {
        throw new ServiceError(
          'User does not exist',
          ErrorCode.NOT_FOUND,
          ErrorSeverity.ERROR,
          context
        );
      }
      
      // Verify job exists if specified
      if (validated.jobId) {
        const job = await db.select()
          .from(jobs)
          .where(eq(jobs.id, validated.jobId))
          .limit(1);
        
        if (!job.length) {
          throw new ServiceError(
            'Job does not exist',
            ErrorCode.NOT_FOUND,
            ErrorSeverity.ERROR,
            context
          );
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ServiceError(
          `Validation failed: ${messages}`,
          ErrorCode.VALIDATION_FAILED,
          ErrorSeverity.WARNING,
          context
        );
      }
      throw error;
    }
  }
  
  /**
   * Validate timesheet data
   */
  static async validateTimesheet(data: any, context: ValidationContext): Promise<void> {
    const schema = z.object({
      userId: z.number().positive('User ID must be positive'),
      payrollPeriodId: z.number().positive('Payroll period ID must be positive'),
      status: z.enum(['draft', 'submitted', 'approved', 'rejected', 'exported']),
      regularHours: z.number().min(0, 'Regular hours cannot be negative').max(168, 'Regular hours exceed weekly maximum'),
      overtimeHours: z.number().min(0, 'Overtime hours cannot be negative').max(100, 'Overtime hours exceed reasonable limit'),
      totalHours: z.number().min(0, 'Total hours cannot be negative'),
      totalAmount: z.number().min(0, 'Total amount cannot be negative').optional()
    });
    
    try {
      const validated = schema.parse(data);
      
      // Business rule: total hours must equal regular + overtime
      if (validated.totalHours !== validated.regularHours + validated.overtimeHours) {
        throw new ServiceError(
          'Total hours must equal regular hours plus overtime hours',
          ErrorCode.VALIDATION_FAILED,
          ErrorSeverity.WARNING,
          context
        );
      }
      
      // Verify payroll period exists and is open
      const period = await db.select()
        .from(payrollPeriods)
        .where(eq(payrollPeriods.id, validated.payrollPeriodId))
        .limit(1);
      
      if (!period.length) {
        throw new ServiceError(
          'Payroll period does not exist',
          ErrorCode.NOT_FOUND,
          ErrorSeverity.ERROR,
          context
        );
      }
      
      // Check if period is locked
      if (period[0].status === 'locked' || period[0].status === 'exported') {
        throw new ServiceError(
          'Cannot modify timesheet for locked payroll period',
          ErrorCode.PERIOD_LOCKED,
          ErrorSeverity.ERROR,
          context
        );
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ServiceError(
          `Validation failed: ${messages}`,
          ErrorCode.VALIDATION_FAILED,
          ErrorSeverity.WARNING,
          context
        );
      }
      throw error;
    }
  }
  
  /**
   * Validate payroll period data
   */
  static async validatePayrollPeriod(data: any, context: ValidationContext): Promise<void> {
    const schema = z.object({
      name: z.string().min(1, 'Period name is required').max(100, 'Period name too long'),
      startDate: z.string().datetime('Start date must be valid datetime'),
      endDate: z.string().datetime('End date must be valid datetime'),
      status: z.enum(['open', 'processing', 'locked', 'exported']),
      periodType: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']).optional()
    });
    
    try {
      const validated = schema.parse(data);
      
      const startDate = new Date(validated.startDate);
      const endDate = new Date(validated.endDate);
      
      // Business rule: end date must be after start date
      if (endDate <= startDate) {
        throw new ServiceError(
          'End date must be after start date',
          ErrorCode.VALIDATION_FAILED,
          ErrorSeverity.WARNING,
          context
        );
      }
      
      // Business rule: period duration based on type
      if (validated.periodType) {
        const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        
        switch (validated.periodType) {
          case 'weekly':
            if (daysDiff < 6 || daysDiff > 7) {
              throw new ServiceError(
                'Weekly period must be 7 days',
                ErrorCode.VALIDATION_FAILED,
                ErrorSeverity.WARNING,
                context
              );
            }
            break;
          case 'biweekly':
            if (daysDiff < 13 || daysDiff > 14) {
              throw new ServiceError(
                'Biweekly period must be 14 days',
                ErrorCode.VALIDATION_FAILED,
                ErrorSeverity.WARNING,
                context
              );
            }
            break;
          case 'monthly':
            if (daysDiff < 28 || daysDiff > 31) {
              throw new ServiceError(
                'Monthly period must be 28-31 days',
                ErrorCode.VALIDATION_FAILED,
                ErrorSeverity.WARNING,
                context
              );
            }
            break;
        }
      }
      
      // Check for overlapping periods
      const overlapping = await db.select()
        .from(payrollPeriods)
        .where(
          and(
            lte(payrollPeriods.startDate, endDate),
            gte(payrollPeriods.endDate, startDate)
          )
        )
        .limit(1);
      
      if (overlapping.length > 0 && (!context.entityId || overlapping[0].id !== context.entityId)) {
        throw new ServiceError(
          'Period overlaps with existing payroll period',
          ErrorCode.DUPLICATE_ENTRY,
          ErrorSeverity.ERROR,
          context
        );
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ServiceError(
          `Validation failed: ${messages}`,
          ErrorCode.VALIDATION_FAILED,
          ErrorSeverity.WARNING,
          context
        );
      }
      throw error;
    }
  }
  
  /**
   * Validate compliance data
   */
  static async validateComplianceData(data: any, context: ValidationContext): Promise<void> {
    const schema = z.object({
      userId: z.number().positive('User ID must be positive'),
      violationType: z.enum(['missed_break', 'late_meal', 'excessive_hours', 'unauthorized_overtime']),
      date: z.string().datetime('Date must be valid datetime'),
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      resolved: z.boolean().optional()
    });
    
    try {
      const validated = schema.parse(data);
      
      // Verify user exists
      const user = await db.select()
        .from(users)
        .where(eq(users.id, validated.userId))
        .limit(1);
      
      if (!user.length) {
        throw new ServiceError(
          'User does not exist',
          ErrorCode.NOT_FOUND,
          ErrorSeverity.ERROR,
          context
        );
      }
      
      // Business rule: critical violations require immediate attention
      if (validated.severity === 'critical' && !validated.resolved) {
        console.warn('Critical compliance violation detected - immediate attention required');
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new ServiceError(
          `Validation failed: ${messages}`,
          ErrorCode.VALIDATION_FAILED,
          ErrorSeverity.WARNING,
          context
        );
      }
      throw error;
    }
  }
  
  /**
   * Generic validation for any data object
   */
  static async validate(
    data: any,
    rules: ValidationRule[],
    context: ValidationContext
  ): Promise<void> {
    const errors: string[] = [];
    
    for (const rule of rules) {
      const value = data[rule.field];
      
      if (!rule.rule(value)) {
        errors.push(`${rule.field}: ${rule.message}`);
      }
    }
    
    if (errors.length > 0) {
      throw new ServiceError(
        `Validation failed: ${errors.join(', ')}`,
        ErrorCode.VALIDATION_FAILED,
        rule.severity || ErrorSeverity.WARNING,
        context
      );
    }
  }
  
  /**
   * Validate state transition
   */
  static validateStateTransition(
    currentState: string,
    newState: string,
    allowedTransitions: Map<string, string[]>,
    context: ValidationContext
  ): void {
    const allowed = allowedTransitions.get(currentState);
    
    if (!allowed || !allowed.includes(newState)) {
      throw new ServiceError(
        `Invalid state transition from ${currentState} to ${newState}`,
        ErrorCode.INVALID_STATE_TRANSITION,
        ErrorSeverity.ERROR,
        context
      );
    }
  }
  
  /**
   * Sanitize input data to prevent injection attacks
   */
  static sanitizeInput<T>(data: T): T {
    if (typeof data === 'string') {
      // Remove potential SQL injection attempts
      return data.replace(/[;'"\\]/g, '') as T;
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};
      
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      
      return sanitized as T;
    }
    
    return data;
  }
}

/**
 * Custom validation rules for business logic
 */
export class BusinessRules {
  // Maximum hours per day
  static readonly MAX_HOURS_PER_DAY = 16;
  
  // Maximum hours per week
  static readonly MAX_HOURS_PER_WEEK = 60;
  
  // Minimum break duration (minutes)
  static readonly MIN_BREAK_DURATION = 30;
  
  // Maximum continuous work hours without break
  static readonly MAX_CONTINUOUS_HOURS = 5;
  
  /**
   * Validate work hours compliance
   */
  static validateWorkHours(hours: number, period: 'day' | 'week'): boolean {
    if (period === 'day') {
      return hours <= this.MAX_HOURS_PER_DAY;
    }
    return hours <= this.MAX_HOURS_PER_WEEK;
  }
  
  /**
   * Validate break compliance
   */
  static validateBreakCompliance(
    workHours: number,
    breakMinutes: number
  ): boolean {
    if (workHours <= this.MAX_CONTINUOUS_HOURS) {
      return true; // No break required
    }
    return breakMinutes >= this.MIN_BREAK_DURATION;
  }
}

export default DataValidator;