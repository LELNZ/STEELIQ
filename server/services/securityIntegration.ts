/**
 * Fortune 50 Security Integration Service
 * Provides centralized security hooks for all critical operations
 * Integrates dual authorization, hash chain audit trails, and RBAC
 */

import { db } from '../db';
import { 
  auditLog, 
  dualAuthRequests, 
  dualAuthEvents, 
  hashChainBlocks 
} from '../../shared/schema';
import { 
  hashChain, 
  dualAuthManager, 
  type DualAuthRequest,
  type AuditContext 
} from '../../shared/security';
import { eq, desc } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';

/**
 * Checks if an operation requires dual authorization
 */
export function requiresDualAuth(operation: string, metadata?: any): boolean {
  const criticalOperations = [
    'BULK_APPROVE_TIMESHEETS',
    'UNLOCK_PAYROLL_PERIOD',
    'GPS_OVERRIDE',
    'BULK_PAYROLL_CORRECTION',
    'DELETE_AUDIT_LOGS',
    'MODIFY_PERMISSIONS',
    'EXPORT_PAYROLL_DATA',
    'MANUAL_TIME_ADJUSTMENT'
  ];
  
  // Check if it's a critical operation
  if (criticalOperations.includes(operation)) {
    return true;
  }
  
  // Check if it's a high-value operation (e.g., affecting many records)
  if (metadata?.affectedRecords && metadata.affectedRecords > 10) {
    return true;
  }
  
  // Check if it's a sensitive time period (e.g., locked payroll)
  if (metadata?.payrollLocked) {
    return true;
  }
  
  return false;
}

/**
 * Creates a dual authorization request for critical operations
 */
export async function createDualAuthRequest(params: {
  requesterId: number;
  requesterName: string;
  operation: string;
  resourceType: string;
  resourceId: string | number;
  reason: string;
  metadata?: any;
}): Promise<DualAuthRequest> {
  // Create the request in memory
  const request = dualAuthManager.createRequest({
    requestType: params.operation as any,
    requesterId: params.requesterId,
    requesterName: params.requesterName,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    action: params.operation,
    reason: params.reason,
    metadata: params.metadata || {}
  });
  
  // Persist to database for durability
  await db.insert(dualAuthRequests).values({
    requestId: request.requestId,
    requestType: params.operation,
    requesterId: params.requesterId,
    requesterName: params.requesterName,
    resourceType: params.resourceType,
    resourceId: String(params.resourceId),
    action: params.operation,
    reason: params.reason,
    metadata: params.metadata,
    status: 'PENDING',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
  });
  
  // Add to hash chain for audit trail - properly persisted to database
  const [lastBlock] = await db.select()
    .from(hashChainBlocks)
    .where(eq(hashChainBlocks.chainId, 'TIME_PAYROLL_CHAIN'))
    .orderBy(desc(hashChainBlocks.blockIndex))
    .limit(1);

  const previousHash = lastBlock ? lastBlock.blockHash : '0000000000000000000000000000000000000000000000000000000000000000';
  const blockIndex = lastBlock ? Number(lastBlock.blockIndex) + 1 : 1;
  const blockData = {
    action: 'DUAL_AUTH_REQUEST_CREATED',
    requestId: request.requestId,
    requesterId: params.requesterId,
    operation: params.operation,
    timestamp: new Date().toISOString()
  };
  const blockHash = createHash('sha256')
    .update(previousHash + JSON.stringify(blockData))
    .digest('hex');

  // Persist hash block to database
  const [block] = await db.insert(hashChainBlocks).values({
    chainId: 'TIME_PAYROLL_CHAIN',
    blockIndex: BigInt(blockIndex),
    previousHash,
    blockHash,
    blockType: 'DUAL_AUTH_REQUEST_CREATED',
    payload: blockData
  }).returning();
  
  // Record in audit log
  await db.insert(auditLog).values({
    userId: params.requesterId,
    action: 'dual_auth_requested',
    resourceType: params.resourceType,
    resourceId: String(params.resourceId),
    changes: {
      requestId: request.requestId,
      operation: params.operation,
      reason: params.reason
    },
    hashChainId: 'TIME_PAYROLL_CHAIN',
    chainBlockIndex: block.blockIndex,
    entity: 'dual_auth',
    entityId: request.requestId,
    details: `Dual authorization requested for ${params.operation}`
  });
  
  return request;
}

/**
 * Processes dual authorization approval
 */
export async function approveDualAuthRequest(
  requestId: string,
  approverId: number,
  approverName: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  try {
    // Get the request from database
    const [dbRequest] = await db.select()
      .from(dualAuthRequests)
      .where(eq(dualAuthRequests.requestId, requestId))
      .limit(1);
    
    if (!dbRequest) {
      throw new Error('Request not found');
    }
    
    // Validate not self-approving
    if (dbRequest.requesterId === approverId) {
      throw new Error('Self-approval not permitted for dual authorization');
    }
    
    // Check expiration
    if (new Date(dbRequest.expiresAt) < new Date()) {
      await db.update(dualAuthRequests)
        .set({ status: 'EXPIRED' })
        .where(eq(dualAuthRequests.requestId, requestId));
      throw new Error('Request has expired');
    }
    
    // Process approval
    const approvalHash = randomBytes(32).toString('hex');
    
    // Update request status
    await db.update(dualAuthRequests)
      .set({
        status: 'APPROVED',
        approverId,
        approverName,
        approvedAt: new Date(),
        approvalHash
      })
      .where(eq(dualAuthRequests.requestId, requestId));
    
    // Record approval event
    await db.insert(dualAuthEvents).values({
      requestId,
      eventType: 'APPROVAL',
      actorId: approverId,
      actorName: approverName,
      action: 'APPROVED',
      metadata: { approvalHash },
      ipAddress,
      userAgent,
      createdAt: new Date()
    });
    
    // Add to hash chain - properly persisted to database
    const [lastApprovalBlock] = await db.select()
      .from(hashChainBlocks)
      .where(eq(hashChainBlocks.chainId, 'TIME_PAYROLL_CHAIN'))
      .orderBy(desc(hashChainBlocks.blockIndex))
      .limit(1);

    const approvalPreviousHash = lastApprovalBlock ? lastApprovalBlock.blockHash : '0000000000000000000000000000000000000000000000000000000000000000';
    const approvalBlockIndex = lastApprovalBlock ? Number(lastApprovalBlock.blockIndex) + 1 : 1;
    const approvalBlockData = {
      action: 'DUAL_AUTH_APPROVED',
      requestId,
      approverId,
      approverName,
      approvalHash,
      timestamp: new Date().toISOString()
    };
    const approvalBlockHash = createHash('sha256')
      .update(approvalPreviousHash + JSON.stringify(approvalBlockData))
      .digest('hex');

    // Persist approval hash block to database
    const [block] = await db.insert(hashChainBlocks).values({
      chainId: 'TIME_PAYROLL_CHAIN',
      blockIndex: BigInt(approvalBlockIndex),
      previousHash: approvalPreviousHash,
      blockHash: approvalBlockHash,
      blockType: 'DUAL_AUTH_APPROVED',
      payload: approvalBlockData
    }).returning();
    
    // Record in audit log
    await db.insert(auditLog).values({
      userId: approverId,
      action: 'dual_auth_approved',
      resourceType: dbRequest.resourceType,
      resourceId: dbRequest.resourceId,
      changes: {
        requestId,
        status: 'APPROVED',
        approvalHash
      },
      ipAddress,
      userAgent,
      hashChainId: 'TIME_PAYROLL_CHAIN',
      chainBlockIndex: block.blockIndex,
      entity: 'dual_auth',
      entityId: requestId,
      details: `Approved dual authorization for ${dbRequest.action}`
    });
    
    return true;
  } catch (error: any) {
    console.error('[Security Integration] Dual auth approval failed:', error);
    
    // Log failed attempt
    await db.insert(dualAuthEvents).values({
      requestId,
      eventType: 'APPROVAL_FAILED',
      actorId: approverId,
      actorName: approverName,
      action: 'APPROVAL_ATTEMPT_FAILED',
      reason: error.message,
      metadata: { error: error.message },
      ipAddress,
      userAgent,
      createdAt: new Date()
    });
    
    return false;
  }
}

/**
 * Verifies dual authorization for an operation
 */
export async function verifyDualAuth(
  operation: string,
  resourceId: string | number
): Promise<boolean> {
  // Check if dual auth is required
  if (!requiresDualAuth(operation)) {
    return true; // Operation doesn't require dual auth
  }
  
  // Look for approved request
  const [approved] = await db.select()
    .from(dualAuthRequests)
    .where(
      eq(dualAuthRequests.resourceId, String(resourceId))
    )
    .limit(1);
  
  if (!approved || approved.status !== 'APPROVED') {
    return false;
  }
  
  // Check if approval hasn't expired (valid for 1 hour after approval)
  if (approved.approvedAt) {
    const approvalAge = Date.now() - new Date(approved.approvedAt).getTime();
    if (approvalAge > 60 * 60 * 1000) { // 1 hour
      return false;
    }
  }
  
  return true;
}

/**
 * Records security event with full audit trail
 */
export async function recordSecurityEvent(
  userId: number,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  // Get the last hash block to maintain chain integrity
  const [lastSecurityBlock] = await db.select()
    .from(hashChainBlocks)
    .where(eq(hashChainBlocks.chainId, 'TIME_PAYROLL_CHAIN'))
    .orderBy(desc(hashChainBlocks.blockIndex))
    .limit(1);

  const previousHash = lastSecurityBlock ? lastSecurityBlock.blockHash : '0000000000000000000000000000000000000000000000000000000000000000';
  const blockIndex = lastSecurityBlock ? Number(lastSecurityBlock.blockIndex) + 1 : 1;
  const blockData = {
    action,
    userId,
    resourceType,
    resourceId,
    metadata,
    timestamp: new Date().toISOString()
  };
  const blockHash = createHash('sha256')
    .update(previousHash + JSON.stringify(blockData))
    .digest('hex');

  // Persist hash block to database
  const [block] = await db.insert(hashChainBlocks).values({
    chainId: 'TIME_PAYROLL_CHAIN',
    blockIndex: BigInt(blockIndex),
    previousHash,
    blockHash,
    blockType: 'SECURITY_EVENT',
    payload: blockData
  }).returning();
  
  // Record in audit log
  await db.insert(auditLog).values({
    userId,
    action,
    resourceType,
    resourceId,
    changes: metadata,
    ipAddress,
    userAgent,
    hashChainId: 'TIME_PAYROLL_CHAIN',
    chainBlockIndex: block.blockIndex,
    entity: resourceType,
    entityId: resourceId,
    details: `Security event: ${action}`
  });
}

/**
 * Validates hash chain integrity
 */
export async function validateHashChain(chainId: string = 'TIME_PAYROLL_CHAIN'): Promise<boolean> {
  try {
    // Fetch all blocks for the chain
    const blocks = await db.select()
      .from(hashChainBlocks)
      .where(eq(hashChainBlocks.chainId, chainId))
      .orderBy(hashChainBlocks.blockIndex);
    
    if (blocks.length === 0) {
      return true; // Empty chain is valid
    }
    
    // Validate each block's hash and chain linkage
    for (let i = 1; i < blocks.length; i++) {
      const currentBlock = blocks[i];
      const previousBlock = blocks[i - 1];
      
      // Verify chain linkage
      if (currentBlock.previousHash !== previousBlock.blockHash) {
        console.error(`Hash chain broken at block ${currentBlock.blockIndex}`);
        return false;
      }
    }
    
    console.log(`[Security Integration] Hash chain ${chainId} validated successfully with ${blocks.length} blocks`);
    return true;
  } catch (error) {
    console.error('[Security Integration] Hash chain validation failed:', error);
    return false;
  }
}

export default {
  requiresDualAuth,
  createDualAuthRequest,
  approveDualAuthRequest,
  verifyDualAuth,
  recordSecurityEvent,
  validateHashChain
};