/**
 * Fortune 50 Compliance: Dual Authorization Bootstrap Service
 * Rehydrates pending dual authorization requests from database on server startup
 * Ensures approval workflows survive server restarts
 */

import { db } from '../db';
import { dualAuthRequests, auditLog } from '@shared/schema';
import { dualAuthManager, type DualAuthRequest } from '@shared/security';
import { eq, and, gt, sql } from 'drizzle-orm';

/**
 * Rehydrates the DualAuthorizationManager with pending requests from the database
 * Should be called during server initialization before routes are registered
 */
export async function rehydrateDualAuthManager(): Promise<{
  success: boolean;
  hydratedCount: number;
  expiredCount: number;
  error?: string;
}> {
  console.log('[DualAuthBootstrap] Starting dual authorization rehydration...');
  
  try {
    const now = new Date();
    
    // Fetch all pending requests that haven't expired
    const pendingDbRequests = await db
      .select()
      .from(dualAuthRequests)
      .where(
        and(
          eq(dualAuthRequests.status, 'pending'),
          gt(dualAuthRequests.expiresAt, now)
        )
      );
    
    console.log(`[DualAuthBootstrap] Found ${pendingDbRequests.length} pending requests in database`);
    
    // Also mark any expired requests as expired in the database
    const expiredResult = await db
      .update(dualAuthRequests)
      .set({ 
        status: 'expired',
        resolvedAt: now
      })
      .where(
        and(
          eq(dualAuthRequests.status, 'pending'),
          sql`${dualAuthRequests.expiresAt} <= ${now}`
        )
      )
      .returning({ id: dualAuthRequests.id });
    
    const expiredCount = expiredResult.length;
    if (expiredCount > 0) {
      console.log(`[DualAuthBootstrap] Marked ${expiredCount} expired requests as expired in database`);
    }
    
    // Convert database records to DualAuthRequest format
    // Note: Pending requests don't have approval data - that's stored in dualAuthEvents
    const requestsToHydrate: DualAuthRequest[] = pendingDbRequests.map(dbReq => ({
      requestId: dbReq.requestId,
      requestType: dbReq.requestType as DualAuthRequest['requestType'],
      requesterId: dbReq.requesterId,
      requesterName: dbReq.requesterName,
      resourceType: dbReq.resourceType,
      resourceId: dbReq.resourceId,
      action: dbReq.action,
      reason: dbReq.reason,
      metadata: (dbReq.metadata || {}) as Record<string, any>,
      status: 'PENDING' as const,
      createdAt: dbReq.createdAt.toISOString(),
      expiresAt: dbReq.expiresAt.toISOString()
    }));
    
    // Hydrate the manager
    dualAuthManager.hydratePendingRequests(requestsToHydrate);
    
    // Verify hydration
    const status = dualAuthManager.getHydrationStatus();
    
    // Log successful rehydration to audit trail
    await db.insert(auditLog).values({
      userId: 0, // System action
      action: 'dual_auth_rehydration',
      entity: 'system',
      entityId: 'startup',
      details: JSON.stringify({
        hydratedCount: status.pendingCount,
        expiredCount,
        timestamp: now.toISOString()
      })
    });
    
    console.log(`[DualAuthBootstrap] Rehydration complete. Status: ${JSON.stringify(status)}`);
    
    return {
      success: true,
      hydratedCount: status.pendingCount,
      expiredCount
    };
    
  } catch (error: any) {
    console.error('[DualAuthBootstrap] Rehydration failed:', error);
    
    // Log failure to audit trail if possible
    try {
      await db.insert(auditLog).values({
        userId: 0,
        action: 'dual_auth_rehydration_failed',
        entity: 'system',
        entityId: 'startup',
        details: JSON.stringify({
          error: error.message,
          timestamp: new Date().toISOString()
        })
      });
    } catch (auditError) {
      console.error('[DualAuthBootstrap] Failed to log rehydration failure:', auditError);
    }
    
    return {
      success: false,
      hydratedCount: 0,
      expiredCount: 0,
      error: error.message
    };
  }
}

/**
 * Cleanup expired requests from both in-memory manager and database
 * Fortune 50 Compliance: Creates audit trail for all expired requests
 * Can be called periodically via cron job
 */
export async function cleanupExpiredDualAuthRequests(): Promise<{
  success: boolean;
  cleanedCount: number;
}> {
  try {
    const now = new Date();
    
    // Cleanup in-memory
    dualAuthManager.cleanupExpired();
    
    // First, get the requests that will be expired (for audit logging)
    const expiredRequests = await db
      .select({
        id: dualAuthRequests.id,
        requestId: dualAuthRequests.requestId,
        requesterId: dualAuthRequests.requesterId,
        requestType: dualAuthRequests.requestType,
        resourceType: dualAuthRequests.resourceType,
        resourceId: dualAuthRequests.resourceId,
        expiresAt: dualAuthRequests.expiresAt
      })
      .from(dualAuthRequests)
      .where(
        and(
          eq(dualAuthRequests.status, 'pending'),
          sql`${dualAuthRequests.expiresAt} <= ${now}`
        )
      );
    
    if (expiredRequests.length === 0) {
      return { success: true, cleanedCount: 0 };
    }
    
    console.log(`[DualAuthBootstrap] Found ${expiredRequests.length} expired requests to cleanup`);
    
    // Update status to expired
    await db
      .update(dualAuthRequests)
      .set({ 
        status: 'expired',
        resolvedAt: now
      })
      .where(
        and(
          eq(dualAuthRequests.status, 'pending'),
          sql`${dualAuthRequests.expiresAt} <= ${now}`
        )
      );
    
    // Fortune 50 Compliance: Create audit log entries for each expired request
    const auditEntries = expiredRequests.map(req => ({
      userId: 0, // System action
      action: 'dual_auth_expired',
      entity: 'dual_auth',
      entityId: req.requestId,
      resourceType: req.resourceType,
      resourceId: req.resourceId,
      details: JSON.stringify({
        requestId: req.requestId,
        requesterId: req.requesterId,
        requestType: req.requestType,
        expiresAt: req.expiresAt?.toISOString(),
        expiredAt: now.toISOString(),
        reason: 'Automatic expiration - 15 minute timeout exceeded'
      })
    }));
    
    // Insert audit entries in batches if there are many
    if (auditEntries.length > 0) {
      await db.insert(auditLog).values(auditEntries);
    }
    
    console.log(`[DualAuthBootstrap] Cleaned up ${expiredRequests.length} expired requests with audit trail`);
    
    return {
      success: true,
      cleanedCount: expiredRequests.length
    };
    
  } catch (error: any) {
    console.error('[DualAuthBootstrap] Cleanup failed:', error);
    
    // Log cleanup failure
    try {
      await db.insert(auditLog).values({
        userId: 0,
        action: 'dual_auth_cleanup_failed',
        entity: 'system',
        entityId: 'cleanup',
        details: JSON.stringify({
          error: error.message,
          timestamp: new Date().toISOString()
        })
      });
    } catch (auditError) {
      console.error('[DualAuthBootstrap] Failed to log cleanup failure:', auditError);
    }
    
    return {
      success: false,
      cleanedCount: 0
    };
  }
}

/**
 * Get current hydration status for health checks
 */
export function getDualAuthHydrationStatus(): {
  isHydrated: boolean;
  pendingCount: number;
} {
  return dualAuthManager.getHydrationStatus();
}
