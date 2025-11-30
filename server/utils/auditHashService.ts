/**
 * SOX/ITGC Compliant Audit Hash Service
 * 
 * Provides deterministic SHA-256 hash computation for time & payroll records
 * to create tamper-evident audit trails per Fortune 50 compliance requirements.
 * 
 * SEQUENCE STRATEGIES:
 * - time_entries: Per-user chain (user_id + chronological order by clock_in)
 * - timesheets: Per-user chain (user_id + chronological order by date)
 * - payroll_periods: Global chain (chronological order by pay_period_start)
 * 
 * HASH COMPUTATION:
 * 1. Select only SOX-critical fields (business data, not metadata)
 * 2. Sort keys alphabetically for deterministic ordering
 * 3. Stringify with deterministic JSON (sorted keys)
 * 4. Compute SHA-256 hash
 */

import { createHash } from 'crypto';

/**
 * Computes a deterministic SHA-256 hash of the given data object.
 * Keys are sorted alphabetically to ensure consistent hashing.
 */
function computeSHA256(data: Record<string, unknown>): string {
  const sortedData = sortObjectKeys(data);
  const jsonString = JSON.stringify(sortedData);
  return createHash('sha256').update(jsonString, 'utf8').digest('hex');
}

/**
 * Recursively sorts object keys alphabetically for deterministic JSON output.
 */
function sortObjectKeys(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  
  return obj;
}

/**
 * GENESIS constant - used as previous_audit_hash for the first record in a chain.
 */
export const GENESIS_HASH = 'GENESIS';

/**
 * Computes an audit hash for a time_entries record.
 * 
 * Covered fields (SOX-critical business data):
 * - id, user_id, timesheet_id, job_id
 * - clock_in, clock_out
 * - break_duration, total_hours
 * - hourly_rate, total_cost
 * - status
 * - gps_lat, gps_lng (if present)
 * 
 * @param record The time_entries record
 * @param previousAuditHash The hash of the previous record in the chain (or GENESIS)
 * @returns SHA-256 hash string (64 hex chars)
 */
export function computeTimeEntryAuditHash(
  record: {
    id: number;
    userId: number;
    timesheetId?: number | null;
    jobId?: number | null;
    clockIn: Date | string;
    clockOut?: Date | string | null;
    breakDuration?: number | null;
    totalHours?: string | null;
    hourlyRate?: string | null;
    totalCost?: string | null;
    status?: string | null;
    gpsLat?: string | null;
    gpsLng?: string | null;
  },
  previousAuditHash: string
): string {
  const hashInput: Record<string, unknown> = {
    id: record.id,
    userId: record.userId,
    timesheetId: record.timesheetId ?? null,
    jobId: record.jobId ?? null,
    clockIn: record.clockIn instanceof Date ? record.clockIn.toISOString() : record.clockIn,
    clockOut: record.clockOut instanceof Date ? record.clockOut.toISOString() : (record.clockOut ?? null),
    breakDuration: record.breakDuration ?? 0,
    totalHours: record.totalHours ?? null,
    hourlyRate: record.hourlyRate ?? null,
    totalCost: record.totalCost ?? null,
    status: record.status ?? 'active',
    gpsLat: record.gpsLat ?? null,
    gpsLng: record.gpsLng ?? null,
    previousAuditHash,
  };

  return computeSHA256(hashInput);
}

/**
 * Computes an audit hash for a timesheets record.
 * 
 * Covered fields (SOX-critical business data):
 * - id, user_id, job_id, task_id
 * - date, start_time, end_time
 * - hours_worked, break_hours, overtime_hours
 * - status
 * - supervisor_id, approved_by, approved_at
 * - submitted_at
 * 
 * @param record The timesheets record
 * @param previousAuditHash The hash of the previous record in the chain (or GENESIS)
 * @returns SHA-256 hash string (64 hex chars)
 */
export function computeTimesheetAuditHash(
  record: {
    id: number;
    userId: number;
    date: string;
    jobId?: number | null;
    taskId?: number | null;
    startTime?: Date | string | null;
    endTime?: Date | string | null;
    hoursWorked?: string | null;
    breakHours?: string | null;
    overtimeHours?: string | null;
    status?: string | null;
    supervisorId?: number | null;
    approvedBy?: number | null;
    approvedAt?: Date | string | null;
    submittedAt?: Date | string | null;
  },
  previousAuditHash: string
): string {
  const hashInput: Record<string, unknown> = {
    id: record.id,
    userId: record.userId,
    date: record.date,
    jobId: record.jobId ?? null,
    taskId: record.taskId ?? null,
    startTime: record.startTime instanceof Date ? record.startTime.toISOString() : (record.startTime ?? null),
    endTime: record.endTime instanceof Date ? record.endTime.toISOString() : (record.endTime ?? null),
    hoursWorked: record.hoursWorked ?? null,
    breakHours: record.breakHours ?? null,
    overtimeHours: record.overtimeHours ?? null,
    status: record.status ?? 'draft',
    supervisorId: record.supervisorId ?? null,
    approvedBy: record.approvedBy ?? null,
    approvedAt: record.approvedAt instanceof Date ? record.approvedAt.toISOString() : (record.approvedAt ?? null),
    submittedAt: record.submittedAt instanceof Date ? record.submittedAt.toISOString() : (record.submittedAt ?? null),
    previousAuditHash,
  };

  return computeSHA256(hashInput);
}

/**
 * Computes an audit hash for a payroll_periods record.
 * 
 * Covered fields (SOX-critical business data):
 * - id, business_unit_id
 * - period_type
 * - pay_period_start, pay_period_end, pay_date
 * - status
 * - locked_by, locked_at
 * - employee_count, total_hours, total_amount
 * 
 * @param record The payroll_periods record
 * @param previousAuditHash The hash of the previous record in the chain (or GENESIS)
 * @returns SHA-256 hash string (64 hex chars)
 */
export function computePayrollPeriodAuditHash(
  record: {
    id: number;
    businessUnitId?: number | null;
    periodType: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    payDate: string;
    status: string;
    lockedBy?: number | null;
    lockedAt?: Date | string | null;
    employeeCount?: number | null;
    totalHours?: string | null;
    totalAmount?: string | null;
  },
  previousAuditHash: string
): string {
  const hashInput: Record<string, unknown> = {
    id: record.id,
    businessUnitId: record.businessUnitId ?? null,
    periodType: record.periodType,
    payPeriodStart: record.payPeriodStart,
    payPeriodEnd: record.payPeriodEnd,
    payDate: record.payDate,
    status: record.status,
    lockedBy: record.lockedBy ?? null,
    lockedAt: record.lockedAt instanceof Date ? record.lockedAt.toISOString() : (record.lockedAt ?? null),
    employeeCount: record.employeeCount ?? null,
    totalHours: record.totalHours ?? null,
    totalAmount: record.totalAmount ?? null,
    previousAuditHash,
  };

  return computeSHA256(hashInput);
}

/**
 * Verifies that a record's audit_hash matches the expected computed value.
 * Used for integrity checks during audits.
 * 
 * @param storedHash The hash stored in the database
 * @param computedHash The hash computed from current record data
 * @returns true if hashes match, false if tampered
 */
export function verifyAuditHash(storedHash: string, computedHash: string): boolean {
  return storedHash === computedHash;
}

/**
 * Validates a hash chain by checking that each record's previous_audit_hash
 * matches the audit_hash of the preceding record.
 * 
 * @param records Array of records with audit_hash and previous_audit_hash fields
 * @returns Object with isValid flag and any broken links
 */
export function validateHashChain(
  records: Array<{ id: number; auditHash: string | null; previousAuditHash: string | null }>
): { isValid: boolean; brokenLinks: number[] } {
  const brokenLinks: number[] = [];
  
  for (let i = 1; i < records.length; i++) {
    const current = records[i];
    const previous = records[i - 1];
    
    if (current.previousAuditHash !== previous.auditHash) {
      brokenLinks.push(current.id);
    }
  }
  
  return {
    isValid: brokenLinks.length === 0,
    brokenLinks,
  };
}
