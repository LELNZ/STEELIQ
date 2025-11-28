import { timeManagementStorage } from "../timeManagement";
import { ServiceContext } from "./utils/serviceAuthGuard";
import { startOfWeek, endOfWeek, format } from "date-fns";

/**
 * Refactored PayrollPeriodService that delegates all state management to TimeManagementStorage
 * This ensures all payroll period operations go through the Fortune 50 state machine
 */
export class PayrollPeriodServiceRefactored {
  
  /**
   * Get current payroll period - delegates to TimeManagementStorage
   */
  async getCurrentPeriod(context: ServiceContext, businessUnitId?: number) {
    // Permission check handled by ServiceAuthGuard
    return await timeManagementStorage.getCurrentPayrollPeriod(businessUnitId);
  }
  
  /**
   * Get period by ID - delegates to TimeManagementStorage
   */
  async getPeriodById(context: ServiceContext, periodId: number) {
    return await timeManagementStorage.getPayrollPeriodById(periodId);
  }
  
  /**
   * Create a new payroll period - delegates to TimeManagementStorage
   */
  async createPeriod(
    context: ServiceContext,
    startDate: Date,
    endDate: Date,
    payDate: Date,
    businessUnitId?: number
  ) {
    const userId = context.user.id;
    
    const data = {
      payPeriodStart: startDate,
      payPeriodEnd: endDate,
      payDate,
      businessUnitId,
      status: 'open',
      lockStatus: 'unlocked',
      adjustmentsAllowed: true
    };
    
    return await timeManagementStorage.createPayrollPeriod(data, userId);
  }
  
  /**
   * Validate a payroll period - delegates to TimeManagementStorage
   */
  async validatePeriod(context: ServiceContext, periodId: number) {
    return await timeManagementStorage.validatePayrollPeriod(periodId);
  }
  
  /**
   * Start processing a payroll period - uses state machine
   */
  async startProcessing(context: ServiceContext, periodId: number) {
    const userId = context.user.id;
    return await timeManagementStorage.transitionPayrollPeriod(
      periodId, 
      'startProcessing', 
      userId
    );
  }
  
  /**
   * Lock a payroll period - uses state machine
   */
  async lockPeriod(
    context: ServiceContext,
    periodId: number,
    lockLevel: 'manager' | 'admin' = 'manager',
    reason?: string
  ) {
    const userId = context.user.id;
    
    // Use the enhanced lock method that handles lock levels
    return await timeManagementStorage.lockPayrollPeriod(
      periodId, 
      userId,
      lockLevel
    );
  }
  
  /**
   * Unlock a payroll period - delegates to TimeManagementStorage
   */
  async unlockPeriod(
    context: ServiceContext,
    periodId: number,
    reason: string
  ) {
    const userId = context.user.id;
    return await timeManagementStorage.unlockPayrollPeriod(periodId, userId, reason);
  }
  
  /**
   * Process a payroll period (mark as ready for payment) - uses state machine
   */
  async processPeriod(context: ServiceContext, periodId: number) {
    const userId = context.user.id;
    return await timeManagementStorage.transitionPayrollPeriod(
      periodId,
      'process',
      userId
    );
  }
  
  /**
   * Export a payroll period - uses state machine
   */
  async exportPeriod(
    context: ServiceContext,
    periodId: number,
    providerId?: string
  ) {
    const userId = context.user.id;
    return await timeManagementStorage.exportPayrollPeriod(
      periodId,
      userId,
      providerId
    );
  }
  
  /**
   * Get payroll periods with filters - delegates to TimeManagementStorage
   */
  async getPayrollPeriods(
    context: ServiceContext,
    options?: {
      businessUnitId?: number;
      status?: string;
      includeExpired?: boolean;
    }
  ) {
    return await timeManagementStorage.getPayrollPeriods(options);
  }
  
  /**
   * Get periods in date range
   */
  async getPeriodsInRange(
    context: ServiceContext,
    startDate: Date,
    endDate: Date,
    businessUnitId?: number
  ) {
    const periods = await timeManagementStorage.getPayrollPeriods({
      businessUnitId,
      includeExpired: true
    });
    
    // Filter by date range
    return periods.filter(p => {
      const periodStart = new Date(p.payPeriodStart);
      const periodEnd = new Date(p.payPeriodEnd);
      return (
        (periodStart >= startDate && periodStart <= endDate) ||
        (periodEnd >= startDate && periodEnd <= endDate) ||
        (periodStart <= startDate && periodEnd >= endDate)
      );
    });
  }
  
  /**
   * Get period statistics (for dashboards)
   */
  async getPeriodStatistics(context: ServiceContext, periodId: number) {
    const period = await this.getPeriodById(context, periodId);
    if (!period) {
      return null;
    }
    
    // Get validation results which include statistics
    const validation = await timeManagementStorage.validatePayrollPeriod(periodId);
    
    return {
      period,
      validation,
      status: period.status,
      lockStatus: period.lockStatus,
      // Additional statistics can be added here
    };
  }
  
  /**
   * Transition period status (generic method for any transition)
   */
  async transitionStatus(
    context: ServiceContext,
    periodId: number,
    transition: string,
    metadata?: any
  ) {
    const userId = context.user.id;
    return await timeManagementStorage.transitionPayrollPeriod(
      periodId,
      transition,
      userId,
      metadata
    );
  }
}