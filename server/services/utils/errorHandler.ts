import { db } from "../../db";
import { auditLog } from "@shared/schema";

/**
 * Centralized error handling and recovery system for Time & Payroll services
 * Implements Fortune 50-grade error management with audit trails
 */

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum ErrorCode {
  // Permission errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // Time & Payroll specific errors
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  COMPLIANCE_CHECK_FAILED = 'COMPLIANCE_CHECK_FAILED',
  PERIOD_LOCKED = 'PERIOD_LOCKED',
  PERIOD_NOT_OPEN = 'PERIOD_NOT_OPEN',
  TIMESHEET_INCOMPLETE = 'TIMESHEET_INCOMPLETE',
  TIMESHEET_ALREADY_SUBMITTED = 'TIMESHEET_ALREADY_SUBMITTED',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  OVERTIME_CALCULATION_ERROR = 'OVERTIME_CALCULATION_ERROR',
  
  // Integration errors
  PAYROLL_PROVIDER_ERROR = 'PAYROLL_PROVIDER_ERROR',
  EXPORT_FAILED = 'EXPORT_FAILED',
  REPORT_GENERATION_ERROR = 'REPORT_GENERATION_ERROR',
  
  // System errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_CONSTRAINT_VIOLATION = 'DATABASE_CONSTRAINT_VIOLATION',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Data errors
  NOT_FOUND = 'NOT_FOUND',
  DATA_INTEGRITY = 'DATA_INTEGRITY',
  CONCURRENCY_CONFLICT = 'CONCURRENCY_CONFLICT',
  INVALID_DATA_FORMAT = 'INVALID_DATA_FORMAT'
}

export interface ErrorContext {
  userId?: number;
  entityType?: string;
  entityId?: number;
  operation?: string;
  metadata?: Record<string, any>;
}

export class ServiceError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly recoverable: boolean;
  
  constructor(
    message: string,
    code: ErrorCode,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    context: ErrorContext = {},
    recoverable: boolean = false
  ) {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.recoverable = recoverable;
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      recoverable: this.recoverable,
      stack: this.stack
    };
  }
}

export class ErrorHandler {
  /**
   * Log error to audit trail using existing audit patterns
   */
  static async auditError(
    error: ServiceError,
    userId: number
  ): Promise<void> {
    // Only audit ERROR and CRITICAL severity
    if (error.severity !== ErrorSeverity.ERROR && 
        error.severity !== ErrorSeverity.CRITICAL) {
      return;
    }
    
    try {
      // Use real userId, never synthetic values
      if (userId && userId > 0) {
        await db.insert(auditLog).values({
          userId,
          action: `error_${error.code.toLowerCase()}`,
          entity: error.context.entityType || 'system',
          entityId: error.context.entityId || null,
          details: JSON.stringify({
            message: error.message,
            severity: error.severity,
            code: error.code,
            context: error.context,
            timestamp: error.timestamp
          })
        });
      }
    } catch (logError) {
      console.error('Failed to audit error:', logError);
    }
  }
  
  /**
   * Convert errors to ServiceError with proper context
   */
  static wrapError(
    error: Error | ServiceError,
    code?: ErrorCode,
    context: ErrorContext = {}
  ): ServiceError {
    // Already a ServiceError, just add context
    if (error instanceof ServiceError) {
      return new ServiceError(
        error.message,
        error.code,
        error.severity,
        { ...error.context, ...context },
        error.recoverable
      );
    }
    
    // Detect specific error patterns
    let errorCode = code || ErrorCode.SERVICE_UNAVAILABLE;
    let severity = ErrorSeverity.ERROR;
    let recoverable = false;
    
    // Parse database errors
    if ('code' in error) {
      const dbError = error as any;
      switch (dbError.code) {
        case '23505': // Unique violation
          errorCode = ErrorCode.DUPLICATE_ENTRY;
          severity = ErrorSeverity.WARNING;
          break;
        case '23503': // Foreign key violation
          errorCode = ErrorCode.DATA_INTEGRITY;
          break;
        case '23502': // Not null violation
          errorCode = ErrorCode.VALIDATION_FAILED;
          severity = ErrorSeverity.WARNING;
          break;
        case 'ECONNREFUSED':
          errorCode = ErrorCode.DATABASE_CONNECTION_ERROR;
          recoverable = true;
          break;
      }
    }
    
    return new ServiceError(
      error.message,
      errorCode,
      severity,
      context,
      recoverable
    );
  }
  
  /**
   * Retry logic for recoverable errors
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000,
    context: ErrorContext = {}
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Check if error is recoverable
        if (error instanceof ServiceError && !error.recoverable) {
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Log retry attempt
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delayMs}ms delay`);
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
    
    // All retries failed
    throw new ServiceError(
      `Operation failed after ${maxRetries} attempts: ${lastError?.message}`,
      ErrorCode.SERVICE_UNAVAILABLE,
      ErrorSeverity.ERROR,
      context,
      false
    );
  }
  
  /**
   * Transaction wrapper with automatic rollback on error
   */
  static async withTransaction<T>(
    operation: (tx: any) => Promise<T>,
    context: ErrorContext = {}
  ): Promise<T> {
    const tx = db.transaction(async (trx: any) => {
      try {
        return await operation(trx);
      } catch (error: any) {
        // Log transaction rollback
        await db.insert(auditLog).values({
          userId: context.userId || 0,
          action: 'transaction_rollback',
          entity: context.entityType || 'system',
          entityId: context.entityId || 0,
          details: JSON.stringify({
            error: error.message,
            context
          })
        });
        
        throw error;
      }
    });
    
    return tx;
  }
  
  /**
   * Validate required fields with detailed error messages
   */
  static validateRequired(
    data: Record<string, any>,
    requiredFields: string[],
    context: ErrorContext = {}
  ): void {
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      throw new ServiceError(
        `Missing required fields: ${missingFields.join(', ')}`,
        ErrorCode.VALIDATION_FAILED,
        ErrorSeverity.WARNING,
        { ...context, missingFields },
        false
      );
    }
  }
  
  /**
   * Handle database constraint violations
   */
  static handleDatabaseError(error: any, context: ErrorContext = {}): never {
    // PostgreSQL error codes
    if (error.code === '23505') {
      // Unique violation
      throw new ServiceError(
        'Duplicate entry already exists',
        ErrorCode.DUPLICATE_ENTRY,
        ErrorSeverity.WARNING,
        context,
        false
      );
    } else if (error.code === '23503') {
      // Foreign key violation
      throw new ServiceError(
        'Referenced entity does not exist',
        ErrorCode.DATA_INTEGRITY,
        ErrorSeverity.ERROR,
        context,
        false
      );
    } else if (error.code === '23502') {
      // Not null violation
      throw new ServiceError(
        'Required field cannot be null',
        ErrorCode.VALIDATION_FAILED,
        ErrorSeverity.ERROR,
        context,
        false
      );
    }
    
    // Generic database error
    throw new ServiceError(
      `Database error: ${error.message}`,
      ErrorCode.DATABASE_ERROR,
      ErrorSeverity.ERROR,
      context,
      true // May be recoverable
    );
  }
}

/**
 * Recovery strategies for different error types
 */
export class RecoveryStrategy {
  /**
   * Attempt to recover from permission errors
   */
  static async recoverFromPermissionError(
    error: ServiceError,
    userId: number
  ): Promise<boolean> {
    // Log permission denial
    await db.insert(auditLog).values({
      userId,
      action: 'permission_denied',
      entity: error.context.entityType || 'unknown',
      entityId: error.context.entityId || 0,
      details: JSON.stringify({
        operation: error.context.operation,
        error: error.message
      })
    });
    
    // Could implement permission request workflow here
    return false;
  }
  
  /**
   * Attempt to recover from compliance violations
   */
  static async recoverFromComplianceViolation(
    error: ServiceError,
    context: ErrorContext
  ): Promise<boolean> {
    // Log compliance violation for review
    await db.insert(auditLog).values({
      userId: context.userId || 0,
      action: 'compliance_violation_recovery',
      entity: context.entityType || 'unknown',
      entityId: context.entityId || 0,
      details: JSON.stringify({
        violation: error.message,
        context
      })
    });
    
    // Could trigger compliance review workflow
    return false;
  }
  
  /**
   * Attempt to recover from integration errors
   */
  static async recoverFromIntegrationError(
    error: ServiceError,
    retryAfterMs: number = 5000
  ): Promise<boolean> {
    // Log integration failure
    console.warn('Integration error, will retry after', retryAfterMs, 'ms');
    
    // Schedule retry
    await new Promise(resolve => setTimeout(resolve, retryAfterMs));
    
    return true;
  }
}

/**
 * Circuit breaker pattern for external service calls
 */
export class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: Date | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000 // 1 minute
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit should be reset
    if (this.state === 'open' && this.shouldAttemptReset()) {
      this.state = 'half-open';
    }
    
    // Block if circuit is open
    if (this.state === 'open') {
      throw new ServiceError(
        'Service temporarily unavailable',
        ErrorCode.SERVICE_UNAVAILABLE,
        ErrorSeverity.WARNING,
        {},
        true
      );
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      console.error(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }
  
  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime.getTime() > this.timeout
    );
  }
}

export default ErrorHandler;