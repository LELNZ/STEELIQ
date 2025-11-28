/**
 * Fortune 50 Compliant Audit Logging Service
 * Provides persistent, tamper-evident audit logging for permission checks and changes
 */

import crypto from "crypto";
import { db } from "./db";
import { permissionAuditLogs } from "@shared/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

/**
 * Audit event types for categorization
 */
export enum AuditEventType {
  PERMISSION_CHECK = "permission_check",
  PERMISSION_CHANGE = "permission_change",
  ROLE_ASSIGNMENT = "role_assignment",
  LOGIN = "login",
  LOGOUT = "logout",
  ACCESS_DENIED = "access_denied",
  CONFIGURATION_CHANGE = "configuration_change",
  DATA_ACCESS = "data_access",
  DATA_MODIFICATION = "data_modification"
}

/**
 * Audit action types
 */
export enum AuditAction {
  GRANTED = "granted",
  DENIED = "denied",
  CHECKED = "checked",
  ADDED = "added",
  REMOVED = "removed",
  MODIFIED = "modified",
  VIEWED = "viewed",
  FAILED = "failed"
}

/**
 * Data classification levels
 */
export enum DataClassification {
  PUBLIC = "public",
  INTERNAL = "internal",
  CONFIDENTIAL = "confidential",
  RESTRICTED = "restricted"
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  eventType: AuditEventType;
  userId?: number;
  username: string;
  userIp?: string;
  userAgent?: string;
  sessionId?: string;
  roleId?: number;
  roleName?: string;
  permission?: string;
  permissionCategory?: string;
  permissionSource?: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  requestMethod?: string;
  requestPath?: string;
  success: boolean;
  errorMessage?: string;
  details?: any;
  complianceTag?: string;
  dataClassification?: DataClassification;
}

/**
 * Calculate hash for audit record (for tamper detection)
 * Only includes immutable fields to ensure verification consistency
 */
function calculateRecordHash(record: any): string {
  // Exclude volatile fields that are set by database or can change
  const { 
    id,
    currentHash, 
    previousHash,
    createdAt,
    eventTimestamp,
    ...immutableData 
  } = record;
  
  // Create a deterministic string representation of immutable data only
  const recordString = JSON.stringify(immutableData, Object.keys(immutableData).sort());
  
  // Generate SHA-256 hash
  return crypto.createHash('sha256').update(recordString).digest('hex');
}

/**
 * Get the hash of the most recent audit log entry with row locking
 * Uses FOR UPDATE to prevent concurrent writers from using the same previousHash
 */
async function getLastRecordHashWithLock(trx: any): Promise<string | null> {
  // Use raw SQL for FOR UPDATE lock
  const result = await trx.execute(
    `SELECT current_hash FROM permission_audit_logs 
     ORDER BY id DESC 
     LIMIT 1 
     FOR UPDATE`
  );
    
  return result.rows.length > 0 ? result.rows[0].current_hash : null;
}

/**
 * Verify the integrity of the audit chain
 */
export async function verifyAuditChain(startDate?: Date, endDate?: Date): Promise<{
  valid: boolean;
  brokenAt?: number;
  totalRecords: number;
  errors: string[];
}> {
  const conditions = [];
  if (startDate) conditions.push(gte(permissionAuditLogs.eventTimestamp, startDate));
  if (endDate) conditions.push(lte(permissionAuditLogs.eventTimestamp, endDate));
  
  const records = await db
    .select()
    .from(permissionAuditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(permissionAuditLogs.id);
    
  const errors: string[] = [];
  let previousHash: string | null = null;
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    
    // Verify previous hash link
    if (i > 0 && record.previousHash !== previousHash) {
      errors.push(`Chain broken at record ${record.id}: Previous hash mismatch`);
      return {
        valid: false,
        brokenAt: record.id,
        totalRecords: records.length,
        errors
      };
    }
    
    // Verify current hash
    const calculatedHash = calculateRecordHash(record);
    if (calculatedHash !== record.currentHash) {
      errors.push(`Record ${record.id} has been tampered with: Hash mismatch`);
      return {
        valid: false,
        brokenAt: record.id,
        totalRecords: records.length,
        errors
      };
    }
    
    previousHash = record.currentHash;
  }
  
  return {
    valid: true,
    totalRecords: records.length,
    errors
  };
}

/**
 * Main audit logging function - uses transactions for atomic chain updates
 * Critical operations should await this function, non-critical can fire-and-forget
 */
export async function logAudit(entry: AuditLogEntry, critical: boolean = false): Promise<void> {
  const maxRetries = critical ? 3 : 1;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use a transaction to ensure atomic chain updates
      await db.transaction(async (trx) => {
        // Generate unique event ID
        const eventId = uuidv4();
        
        // Get the hash of the previous record with lock to prevent concurrent issues
        const previousHash = await getLastRecordHashWithLock(trx);
        
        // Calculate retention date (7 years for Fortune 50 compliance)
        const retentionDate = new Date();
        retentionDate.setFullYear(retentionDate.getFullYear() + 7);
        
        // Prepare the record
        const auditRecord: any = {
          eventType: entry.eventType,
          eventId,
          userId: entry.userId || null,
          username: entry.username,
          userIp: entry.userIp || null,
          userAgent: entry.userAgent || null,
          sessionId: entry.sessionId || null,
          roleId: entry.roleId || null,
          roleName: entry.roleName || null,
          permission: entry.permission || null,
          permissionCategory: entry.permissionCategory || null,
          permissionSource: entry.permissionSource || null,
          action: entry.action,
          resource: entry.resource || null,
          resourceId: entry.resourceId || null,
          requestMethod: entry.requestMethod || null,
          requestPath: entry.requestPath || null,
          success: entry.success,
          errorMessage: entry.errorMessage || null,
          details: entry.details ? JSON.stringify(entry.details) : null,
          retentionDate,
          complianceTag: entry.complianceTag || null,
          dataClassification: entry.dataClassification || DataClassification.INTERNAL,
          previousHash: previousHash || null
        };
        
        // Calculate the hash for this record
        const currentHash = calculateRecordHash(auditRecord);
        auditRecord.currentHash = currentHash;
        
        // Insert into database within the transaction
        await trx.insert(permissionAuditLogs).values(auditRecord);
      });
      
      // Success - exit retry loop
      return;
      
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }
  
  // All retries failed
  console.error(`Failed to write audit log after ${maxRetries} attempts:`, lastError);
  
  // For critical operations, throw the error to block the operation
  if (critical) {
    throw new Error(`Audit logging failed: ${lastError?.message}`);
  }
  
  // For non-critical, log to console as fallback
  console.log("AUDIT_FALLBACK:", JSON.stringify(entry));
}

/**
 * Log permission check event
 * Uses critical flag for access denied events and certain sensitive permissions
 */
export async function logPermissionCheck(
  user: any,
  permission: string,
  granted: boolean,
  source: string,
  details?: any,
  request?: { ip?: string; userAgent?: string; method?: string; path?: string }
): Promise<void> {
  // Mark as critical if access was denied or involves sensitive permissions
  const sensitivePermissions = ['manageUsers', 'systemSettings', 'manageFinancials', 'deleteJobs'];
  const isCritical = !granted || sensitivePermissions.includes(permission);
  
  await logAudit({
    eventType: granted ? AuditEventType.PERMISSION_CHECK : AuditEventType.ACCESS_DENIED,
    userId: user?.id,
    username: user?.username || 'anonymous',
    roleId: user?.roleId,
    roleName: user?.roleName,
    permission,
    permissionSource: source,
    action: granted ? AuditAction.GRANTED : AuditAction.DENIED,
    success: granted,
    userIp: request?.ip,
    userAgent: request?.userAgent,
    requestMethod: request?.method,
    requestPath: request?.path,
    details
  }, isCritical);
}

/**
 * Log login event - always critical for security
 */
export async function logLogin(
  userId: number,
  username: string,
  success: boolean,
  roleId?: number,
  roleName?: string,
  request?: { ip?: string; userAgent?: string },
  errorMessage?: string
): Promise<void> {
  // Login events are always critical for security auditing
  await logAudit({
    eventType: AuditEventType.LOGIN,
    userId: success ? userId : undefined,
    username,
    roleId: success ? roleId : undefined,
    roleName: success ? roleName : undefined,
    action: success ? AuditAction.GRANTED : AuditAction.FAILED,
    success,
    userIp: request?.ip,
    userAgent: request?.userAgent,
    errorMessage,
    dataClassification: DataClassification.CONFIDENTIAL
  }, true); // Always critical
}

/**
 * Log role assignment
 */
export async function logRoleAssignment(
  targetUserId: number,
  targetUsername: string,
  newRoleId: number,
  newRoleName: string,
  assignedBy: { id: number; username: string },
  request?: { ip?: string; userAgent?: string }
): Promise<void> {
  await logAudit({
    eventType: AuditEventType.ROLE_ASSIGNMENT,
    userId: assignedBy.id,
    username: assignedBy.username,
    action: AuditAction.MODIFIED,
    success: true,
    resource: 'user_role',
    resourceId: targetUserId.toString(),
    userIp: request?.ip,
    userAgent: request?.userAgent,
    details: {
      targetUserId,
      targetUsername,
      newRoleId,
      newRoleName
    },
    dataClassification: DataClassification.CONFIDENTIAL
  });
}

/**
 * Query audit logs with filtering
 */
export async function queryAuditLogs(filters: {
  userId?: number;
  eventType?: AuditEventType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<any[]> {
  const conditions = [];
  
  if (filters.userId) {
    conditions.push(eq(permissionAuditLogs.userId, filters.userId));
  }
  
  if (filters.eventType) {
    conditions.push(eq(permissionAuditLogs.eventType, filters.eventType));
  }
  
  if (filters.startDate) {
    conditions.push(gte(permissionAuditLogs.eventTimestamp, filters.startDate));
  }
  
  if (filters.endDate) {
    conditions.push(lte(permissionAuditLogs.eventTimestamp, filters.endDate));
  }
  
  const query = db
    .select()
    .from(permissionAuditLogs)
    .orderBy(desc(permissionAuditLogs.eventTimestamp));
    
  if (conditions.length > 0) {
    query.where(and(...conditions));
  }
  
  if (filters.limit) {
    query.limit(filters.limit);
  }
  
  return await query;
}

/**
 * Get audit statistics
 */
export async function getAuditStats(startDate?: Date, endDate?: Date): Promise<{
  totalEvents: number;
  eventsByType: Record<string, number>;
  failedAttempts: number;
  uniqueUsers: number;
}> {
  const conditions = [];
  if (startDate) conditions.push(gte(permissionAuditLogs.eventTimestamp, startDate));
  if (endDate) conditions.push(lte(permissionAuditLogs.eventTimestamp, endDate));
  
  const records = await db
    .select()
    .from(permissionAuditLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
    
  const stats = {
    totalEvents: records.length,
    eventsByType: {} as Record<string, number>,
    failedAttempts: 0,
    uniqueUsers: new Set<number>()
  };
  
  for (const record of records) {
    // Count by event type
    stats.eventsByType[record.eventType] = (stats.eventsByType[record.eventType] || 0) + 1;
    
    // Count failed attempts
    if (!record.success) {
      stats.failedAttempts++;
    }
    
    // Track unique users
    if (record.userId) {
      stats.uniqueUsers.add(record.userId);
    }
  }
  
  return {
    ...stats,
    uniqueUsers: stats.uniqueUsers.size
  };
}

/**
 * Export audit logs for compliance reporting
 */
export async function exportAuditLogs(
  startDate: Date,
  endDate: Date,
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  const records = await queryAuditLogs({ startDate, endDate });
  
  if (format === 'json') {
    return JSON.stringify(records, null, 2);
  }
  
  // CSV format
  if (records.length === 0) return '';
  
  const headers = Object.keys(records[0]);
  const csvRows = [headers.join(',')];
  
  for (const record of records) {
    const values = headers.map(header => {
      const value = (record as any)[header];
      return typeof value === 'string' && value.includes(',')
        ? `"${value.replace(/"/g, '""')}"` 
        : value?.toString() || '';
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}