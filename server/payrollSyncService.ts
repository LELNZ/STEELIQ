import { db } from './db';
import { 
  timesheets, 
  payrollPeriods, 
  teamMembers,
  payrollSyncLog,
  payrollProviderConfig,
  auditEvents
} from '@shared/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { encryptionService } from './encryptionService';

export interface PayrollProvider {
  id: string;
  name: string;
  apiUrl: string;
  authType: 'apiKey' | 'oauth' | 'basic';
  credentials: Record<string, any>;
}

export interface PayrollSyncConfig {
  providerId: string;
  mappings: {
    employeeIdField: string;
    hoursField: string;
    rateField?: string;
    departmentField?: string;
    jobCodeField?: string;
    overtimeField?: string;
  };
  transformations?: Record<string, (value: any) => any>;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  errors: Array<{
    employeeId: string;
    error: string;
  }>;
  syncId: string;
  duration: number;
}

// Transform timesheet data to provider format
function transformTimesheetData(
  timesheetData: any[],
  config: PayrollSyncConfig
): any[] {
  return timesheetData.map(ts => {
    const transformed: Record<string, any> = {};
    
    // Map basic fields
    transformed[config.mappings.employeeIdField] = ts.employeeId;
    transformed[config.mappings.hoursField] = ts.regularHours;
    
    if (config.mappings.overtimeField) {
      transformed[config.mappings.overtimeField] = ts.overtimeHours || 0;
    }
    
    if (config.mappings.departmentField) {
      transformed[config.mappings.departmentField] = ts.department;
    }
    
    if (config.mappings.jobCodeField) {
      transformed[config.mappings.jobCodeField] = ts.jobCode;
    }
    
    if (config.mappings.rateField && ts.hourlyRate) {
      transformed[config.mappings.rateField] = ts.hourlyRate;
    }
    
    // Apply custom transformations
    if (config.transformations) {
      for (const [field, transform] of Object.entries(config.transformations)) {
        if (transformed[field] !== undefined) {
          transformed[field] = transform(transformed[field]);
        }
      }
    }
    
    return transformed;
  });
}

// Calculate overtime hours based on configured rules
function calculateOvertimeHours(
  totalHours: number,
  dailyHours: number,
  weeklyThreshold: number = 40,
  dailyThreshold: number = 8
): { regular: number; overtime: number } {
  let overtime = 0;
  let regular = totalHours;
  
  // Daily overtime (hours over 8 in a day)
  if (dailyHours > dailyThreshold) {
    overtime += dailyHours - dailyThreshold;
    regular -= overtime;
  }
  
  // Weekly overtime (hours over 40 in a week)
  if (totalHours > weeklyThreshold) {
    const weeklyOT = totalHours - weeklyThreshold;
    if (weeklyOT > overtime) {
      overtime = weeklyOT;
      regular = weeklyThreshold;
    }
  }
  
  return { regular, overtime };
}

// Sync timesheet data for a payroll period
export async function syncPayrollPeriod(
  periodId: number,
  providerId: string,
  userId: number
): Promise<SyncResult> {
  const startTime = Date.now();
  const syncId = `SYNC_${periodId}_${Date.now()}`;
  
  try {
    // Get payroll period
    const period = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, periodId))
      .limit(1);
    
    if (!period[0]) {
      throw new Error('Payroll period not found');
    }
    
    if (period[0].status !== 'locked') {
      throw new Error('Payroll period must be locked before syncing');
    }
    
    // Run compliance checks before sync
    const { checkCompliance } = await import('./complianceRulesService');
    const complianceResult = await checkCompliance(periodId);
    
    // If there are critical compliance violations, block the sync
    const criticalViolations = complianceResult.violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      // Log the attempt
      await db.insert(auditEvents).values({
        userId,
        action: 'PAYROLL_SYNC_BLOCKED_COMPLIANCE',
        resourceType: 'payroll_period',
        resourceId: periodId.toString(),
        organizationId: period[0].organizationId,
        details: {
          criticalViolations: criticalViolations.length,
          totalViolations: complianceResult.violations.length,
          message: 'Sync blocked due to critical compliance violations'
        }
      });
      
      throw new Error(`Cannot sync payroll: ${criticalViolations.length} critical compliance violations found. Please resolve violations before syncing.`);
    }
    
    // Log warnings but allow sync
    if (complianceResult.warnings.length > 0) {
      await db.insert(auditEvents).values({
        userId,
        action: 'PAYROLL_SYNC_WITH_WARNINGS',
        resourceType: 'payroll_period',
        resourceId: periodId.toString(),
        organizationId: period[0].organizationId,
        details: {
          warnings: complianceResult.warnings.length,
          message: 'Sync proceeding with compliance warnings'
        }
      });
    }
    
    // Get provider configuration
    const providerConfig = await db
      .select()
      .from(payrollProviderConfig)
      .where(eq(payrollProviderConfig.providerId, providerId))
      .limit(1);
    
    if (!providerConfig[0]) {
      throw new Error('Payroll provider configuration not found');
    }
    
    // Decrypt credentials for use
    const decryptedCredentials = typeof providerConfig[0].credentials === 'string' 
      ? encryptionService.decryptObject(providerConfig[0].credentials)
      : providerConfig[0].credentials;
    
    // Get all approved timesheets for the period
    const timesheetData = await db
      .select({
        id: timesheets.id,
        employeeId: teamMembers.employeeId,
        employeeName: teamMembers.name,
        department: teamMembers.department,
        date: timesheets.date,
        regularHours: timesheets.hoursWorked,
        overtimeHours: timesheets.overtimeHours,
        hourlyRate: teamMembers.hourlyRate,
        jobCode: timesheets.jobId
      })
      .from(timesheets)
      .innerJoin(teamMembers, eq(timesheets.userId, teamMembers.userId))
      .where(
        and(
          gte(timesheets.date, period[0].payPeriodStart),
          lte(timesheets.date, period[0].payPeriodEnd),
          eq(timesheets.status, 'approved')
        )
      );
    
    // Transform data for provider
    const config: PayrollSyncConfig = {
      providerId,
      mappings: providerConfig[0].fieldMappings as any,
      transformations: providerConfig[0].transformations as any
    };
    
    const transformedData = transformTimesheetData(timesheetData, config);
    
    // Log sync attempt
    await db.insert(payrollSyncLog).values({
      periodId,
      providerId,
      status: 'processing',
      startedAt: new Date(),
      startedBy: userId,
      recordCount: transformedData.length,
      metadata: {
        syncId,
        periodStart: period[0].payPeriodStart,
        periodEnd: period[0].payPeriodEnd
      }
    });
    
    // Send to provider (mock implementation - replace with actual API call)
    const syncResults = await sendToPayrollProvider(
      providerId,
      transformedData,
      providerConfig[0]
    );
    
    // Update sync log with results
    await db
      .update(payrollSyncLog)
      .set({
        status: syncResults.success ? 'completed' : 'failed',
        completedAt: new Date(),
        successCount: syncResults.recordsProcessed,
        errorCount: syncResults.recordsFailed,
        errors: syncResults.errors
      })
      .where(
        and(
          eq(payrollSyncLog.periodId, periodId),
          eq(payrollSyncLog.providerId, providerId)
        )
      );
    
    // Update payroll period sync status (but keep period status as 'locked')
    if (syncResults.success) {
      await db
        .update(payrollPeriods)
        .set({
          lastSyncedAt: new Date(),
          syncStatus: 'synced',
          syncProviderId: providerId
        })
        .where(eq(payrollPeriods.id, periodId));
    }
    
    // Create audit log
    await db.insert(auditEvents).values({
      userId,
      action: 'PAYROLL_SYNC',
      resourceType: 'payroll_period',
      resourceId: periodId.toString(),
      organizationId: period[0].organizationId,
      details: {
        providerId,
        syncId,
        recordsProcessed: syncResults.recordsProcessed,
        recordsFailed: syncResults.recordsFailed,
        success: syncResults.success
      }
    });
    
    return {
      ...syncResults,
      syncId,
      duration: Date.now() - startTime
    };
  } catch (error) {
    // Log error
    await db.insert(payrollSyncLog).values({
      periodId,
      providerId,
      status: 'failed',
      startedAt: new Date(),
      startedBy: userId,
      completedAt: new Date(),
      errors: [{
        employeeId: 'N/A',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]
    });
    
    throw error;
  }
}

// Mock provider API call - replace with actual implementation
async function sendToPayrollProvider(
  providerId: string,
  data: any[],
  config: any
): Promise<SyncResult> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock successful sync
  return {
    success: true,
    recordsProcessed: data.length,
    recordsFailed: 0,
    errors: [],
    syncId: `PROVIDER_${Date.now()}`,
    duration: 1000
  };
}

// Get sync history for a payroll period
export async function getSyncHistory(
  periodId: number,
  limit: number = 10
) {
  return await db
    .select({
      id: payrollSyncLog.id,
      providerId: payrollSyncLog.providerId,
      status: payrollSyncLog.status,
      startedAt: payrollSyncLog.startedAt,
      completedAt: payrollSyncLog.completedAt,
      recordCount: payrollSyncLog.recordCount,
      successCount: payrollSyncLog.successCount,
      errorCount: payrollSyncLog.errorCount,
      errors: payrollSyncLog.errors,
      startedBy: payrollSyncLog.startedBy,
      userName: teamMembers.name
    })
    .from(payrollSyncLog)
    .leftJoin(teamMembers, eq(payrollSyncLog.startedBy, teamMembers.userId))
    .where(eq(payrollSyncLog.periodId, periodId))
    .orderBy(payrollSyncLog.startedAt)
    .limit(limit);
}

// Validate payroll data before sync
export async function validatePayrollData(
  periodId: number
): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Get period data
  const period = await db
    .select()
    .from(payrollPeriods)
    .where(eq(payrollPeriods.id, periodId))
    .limit(1);
  
  if (!period[0]) {
    errors.push('Payroll period not found');
    return { isValid: false, errors, warnings };
  }
  
  // Check if period is locked
  if (period[0].status !== 'locked') {
    errors.push('Payroll period must be locked before validation');
  }
  
  // Get unapproved timesheets
  const unapprovedCount = await db
    .select({ count: timesheets.id })
    .from(timesheets)
    .where(
      and(
        gte(timesheets.date, period[0].startDate),
        lte(timesheets.date, period[0].endDate),
        eq(timesheets.status, 'pending')
      )
    );
  
  if (unapprovedCount[0]?.count) {
    warnings.push(`${unapprovedCount[0].count} timesheets are still pending approval`);
  }
  
  // Check for missing employee IDs
  const missingEmployeeIds = await db
    .select({
      userId: teamMembers.userId,
      name: teamMembers.name
    })
    .from(teamMembers)
    .where(eq(teamMembers.employeeId, null as any));
  
  if (missingEmployeeIds.length > 0) {
    errors.push(`${missingEmployeeIds.length} employees are missing employee IDs`);
  }
  
  // Check for duplicate entries
  const duplicateCheck = await db.execute<any>(`
    SELECT 
      user_id,
      date,
      COUNT(*) as entry_count
    FROM timesheets
    WHERE date >= $1 AND date <= $2
    GROUP BY user_id, date
    HAVING COUNT(*) > 1
  `, [period[0].startDate, period[0].endDate]);
  
  if (duplicateCheck.rows.length > 0) {
    errors.push(`Found ${duplicateCheck.rows.length} duplicate timesheet entries`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Retry failed sync
export async function retrySyncFailed(
  syncLogId: number,
  userId: number
): Promise<SyncResult> {
  const failedSync = await db
    .select()
    .from(payrollSyncLog)
    .where(eq(payrollSyncLog.id, syncLogId))
    .limit(1);
  
  if (!failedSync[0]) {
    throw new Error('Sync log not found');
  }
  
  if (failedSync[0].status !== 'failed') {
    throw new Error('Can only retry failed syncs');
  }
  
  return syncPayrollPeriod(
    failedSync[0].periodId,
    failedSync[0].providerId,
    userId
  );
}

// Configure payroll provider
export async function configurePayrollProvider(
  providerId: string,
  config: {
    name: string;
    apiUrl?: string;
    authType: 'apiKey' | 'oauth' | 'basic';
    credentials: Record<string, any>;
    fieldMappings: Record<string, string>;
    organizationId: number;
  },
  userId: number
) {
  // Encrypt sensitive credentials before storage
  const encryptedCredentials = encryptionService.encryptObject(config.credentials);
  
  // Check if config exists
  const existing = await db
    .select()
    .from(payrollProviderConfig)
    .where(eq(payrollProviderConfig.providerId, providerId))
    .limit(1);
  
  if (existing[0]) {
    // Update existing
    await db
      .update(payrollProviderConfig)
      .set({
        name: config.name,
        apiUrl: config.apiUrl,
        authType: config.authType,
        credentials: encryptedCredentials, // Store encrypted
        fieldMappings: config.fieldMappings,
        updatedAt: new Date()
      })
      .where(eq(payrollProviderConfig.providerId, providerId));
  } else {
    // Create new
    await db.insert(payrollProviderConfig).values({
      providerId,
      name: config.name,
      apiUrl: config.apiUrl,
      authType: config.authType,
      credentials: encryptedCredentials, // Store encrypted
      fieldMappings: config.fieldMappings,
      organizationId: config.organizationId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  // Audit log (don't log sensitive credentials)
  await db.insert(auditEvents).values({
    userId,
    action: existing[0] ? 'UPDATE_PAYROLL_PROVIDER' : 'CREATE_PAYROLL_PROVIDER',
    resourceType: 'payroll_provider',
    resourceId: providerId,
    organizationId: config.organizationId,
    details: {
      name: config.name,
      authType: config.authType,
      credentialsEncrypted: true // Note that credentials are encrypted
    }
  });
}