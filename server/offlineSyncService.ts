import { db } from './db';
import { timeClocks, timesheets, offlineSyncQueue, auditLog, hashChainBlocks } from '../shared/schema';
import { eq, and, or, desc, lt, isNull } from 'drizzle-orm';
import { createHash } from 'crypto';
import { hashChain, dualAuthManager, type AuditContext } from '../shared/security';

// Offline sync queue interface (matches DB schema)
interface SyncQueueItem {
  id: number;
  userId: number;
  operation: 'clock_in' | 'clock_out' | 'update_timesheet' | 'submit_timesheet';
  payload: any;
  deviceId: string;
  collectedAt: Date;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  lastError?: string;
  conflictResolution?: string;
  hashSignature?: string;
  serverVersion?: number;
  networkType?: string;
  appVersion?: string;
}

// Conflict resolution strategies
enum ConflictResolution {
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins', 
  MERGE = 'merge',
  MANUAL = 'manual'
}

// Add item to sync queue (now database-backed for durability)
export async function addToSyncQueue(item: {
  userId: number;
  operation: 'clock_in' | 'clock_out' | 'update_timesheet' | 'submit_timesheet';
  payload: any;
  deviceId: string;
  collectedAt: Date;
  networkType?: string;
  appVersion?: string;
}) {
  try {
    // Generate hash signature for integrity verification
    const hashSignature = createHash('sha256')
      .update(JSON.stringify({
        userId: item.userId,
        operation: item.operation,
        payload: item.payload,
        collectedAt: item.collectedAt
      }))
      .digest('hex');
    
    // Insert into database for durable storage with audit trail
    const [inserted] = await db.insert(offlineSyncQueue).values({
      userId: item.userId,
      operation: item.operation,
      payload: item.payload,
      deviceId: item.deviceId,
      collectedAt: item.collectedAt,
      hashSignature,
      networkType: item.networkType,
      appVersion: item.appVersion,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3
    }).returning();
    
    // Fortune 50 Compliance: Add to hash chain for immutable audit trail
    // Get the last hash block to maintain chain integrity
    const [lastBlock] = await db.select()
      .from(hashChainBlocks)
      .where(eq(hashChainBlocks.chainId, 'TIME_PAYROLL_CHAIN'))
      .orderBy(desc(hashChainBlocks.blockIndex))
      .limit(1);

    const previousHash = lastBlock ? lastBlock.blockHash : '0000000000000000000000000000000000000000000000000000000000000000';
    const blockIndex = lastBlock ? Number(lastBlock.blockIndex) + 1 : 1;
    const blockData = {
      action: 'OFFLINE_SYNC_QUEUED',
      userId: item.userId,
      operation: item.operation,
      deviceId: item.deviceId,
      hashSignature,
      queueId: inserted.id,
      timestamp: new Date().toISOString()
    };
    const blockHash = createHash('sha256')
      .update(previousHash + JSON.stringify(blockData))
      .digest('hex');

    // Persist hash block to database
    const [auditBlock] = await db.insert(hashChainBlocks).values({
      chainId: 'TIME_PAYROLL_CHAIN',
      blockIndex: BigInt(blockIndex),
      previousHash,
      blockHash,
      blockType: 'OFFLINE_SYNC_QUEUED',
      payload: blockData
    }).returning();
    
    // Record in audit log with hash chain linkage
    await db.insert(auditLog).values({
      userId: item.userId,
      action: 'offline_sync_queued',
      resourceType: 'sync_queue',
      resourceId: String(inserted.id),
      changes: {
        operation: item.operation,
        deviceId: item.deviceId,
        hashSignature
      },
      hashChainId: 'TIME_PAYROLL_CHAIN',
      chainBlockIndex: auditBlock.blockIndex,
      entity: 'offline_sync',
      entityId: String(inserted.id),
      details: `Queued ${item.operation} operation for offline sync`
    });
    
    console.log(`[Fortune 50 Sync] Item ${inserted.id} added to durable queue with audit trail for user ${item.userId}`);
    
    // Try to process immediately if online
    if (isOnline()) {
      // Process asynchronously to avoid blocking
      setImmediate(() => processSyncQueue());
    }
    
    return inserted.id;
  } catch (error: any) {
    console.error('[Fortune 50 Sync] Failed to add item to sync queue:', error);
    throw new Error(`Failed to queue sync operation: ${error.message}`);
  }
}

// Check if server is reachable
function isOnline(): boolean {
  // In production, this would check actual network connectivity
  // For now, always return true in server environment
  return true;
}

// Process pending items in sync queue (database-backed with crash recovery)
export async function processSyncQueue() {
  try {
    // Fetch pending items from database, ordered by collection time
    const pendingItems = await db.select()
      .from(offlineSyncQueue)
      .where(
        and(
          eq(offlineSyncQueue.status, 'pending'),
          lt(offlineSyncQueue.retryCount, offlineSyncQueue.maxRetries)
        )
      )
      .orderBy(offlineSyncQueue.collectedAt)
      .limit(100); // Process in batches to avoid memory issues
    
    console.log(`[Fortune 50 Sync] Processing ${pendingItems.length} pending items from durable queue`);
    
    for (const item of pendingItems) {
      try {
        // Mark as processing with optimistic locking
        const [updated] = await db.update(offlineSyncQueue)
          .set({ 
            status: 'processing',
            serverVersion: (item.serverVersion || 0) + 1
          })
          .where(
            and(
              eq(offlineSyncQueue.id, item.id),
              eq(offlineSyncQueue.status, 'pending'),
              or(
                isNull(offlineSyncQueue.serverVersion),
                eq(offlineSyncQueue.serverVersion, item.serverVersion || 0)
              )
            )
          )
          .returning();
        
        if (!updated) {
          console.log(`[Fortune 50 Sync] Item ${item.id} already being processed by another worker`);
          continue;
        }
        
        // Process the sync item
        await processSyncItem(item as any);
        
        // Mark as completed with sync timestamp
        await db.update(offlineSyncQueue)
          .set({ 
            status: 'completed',
            syncedAt: new Date(),
            processedBy: item.userId, // Track who processed it
            serverVersion: (updated.serverVersion || 0) + 1
          })
          .where(eq(offlineSyncQueue.id, item.id));
        
        // Fortune 50 Compliance: Record successful sync in hash chain
        // Get the last hash block to maintain chain integrity
        const [lastSyncBlock] = await db.select()
          .from(hashChainBlocks)
          .where(eq(hashChainBlocks.chainId, 'TIME_PAYROLL_CHAIN'))
          .orderBy(desc(hashChainBlocks.blockIndex))
          .limit(1);

        const syncPreviousHash = lastSyncBlock ? lastSyncBlock.blockHash : '0000000000000000000000000000000000000000000000000000000000000000';
        const syncBlockIndex = lastSyncBlock ? Number(lastSyncBlock.blockIndex) + 1 : 1;
        const syncBlockData = {
          action: 'OFFLINE_SYNC_COMPLETED',
          queueId: item.id,
          userId: item.userId,
          operation: item.operation,
          syncedAt: new Date().toISOString()
        };
        const syncBlockHash = createHash('sha256')
          .update(syncPreviousHash + JSON.stringify(syncBlockData))
          .digest('hex');

        // Persist sync hash block to database
        const [syncBlock] = await db.insert(hashChainBlocks).values({
          chainId: 'TIME_PAYROLL_CHAIN',
          blockIndex: BigInt(syncBlockIndex),
          previousHash: syncPreviousHash,
          blockHash: syncBlockHash,
          blockType: 'OFFLINE_SYNC_COMPLETED',
          payload: syncBlockData
        }).returning();
        
        // Update audit log
        await db.insert(auditLog).values({
          userId: item.userId,
          action: 'offline_sync_completed',
          resourceType: 'sync_queue',
          resourceId: String(item.id),
          changes: {
            status: 'completed',
            syncedAt: new Date()
          },
          hashChainId: 'TIME_PAYROLL_CHAIN',
          chainBlockIndex: syncBlock.blockIndex,
          entity: 'offline_sync',
          entityId: String(item.id),
          details: `Successfully synced ${item.operation} operation`
        });
        
        console.log(`[Fortune 50 Sync] Item ${item.id} successfully synced with audit trail`);
        
        // Schedule cleanup of completed items after 7 days
        scheduleCleanup(item.id, 7 * 24 * 60 * 60 * 1000);
        
      } catch (error: any) {
        console.error(`[Fortune 50 Sync] Error processing item ${item.id}:`, error);
        
        // Update retry count and error message
        const newRetryCount = item.retryCount + 1;
        
        await db.update(offlineSyncQueue)
          .set({
            status: newRetryCount >= item.maxRetries ? 'failed' : 'pending',
            retryCount: newRetryCount,
            lastError: error.message,
            serverVersion: (item.serverVersion || 0) + 1
          })
          .where(eq(offlineSyncQueue.id, item.id));
        
        if (newRetryCount < item.maxRetries) {
          // Schedule retry with exponential backoff
          const backoffMs = Math.pow(2, newRetryCount) * 1000;
          console.log(`[Fortune 50 Sync] Scheduling retry for item ${item.id} in ${backoffMs}ms`);
          setTimeout(() => processSyncQueue(), backoffMs);
        } else {
          console.error(`[Fortune 50 Sync] Item ${item.id} failed permanently after ${item.maxRetries} retries`);
        }
      }
    }
    
    // Check for stale processing items (stuck for more than 5 minutes)
    await recoverStaleItems();
    
  } catch (error: any) {
    console.error('[Fortune 50 Sync] Fatal error in sync queue processor:', error);
  }
}

// Recover stale items that got stuck in processing state
async function recoverStaleItems() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  const staleItems = await db.update(offlineSyncQueue)
    .set({
      status: 'pending',
      lastError: 'Recovered from stale processing state'
    })
    .where(
      and(
        eq(offlineSyncQueue.status, 'processing'),
        lt(offlineSyncQueue.createdAt, fiveMinutesAgo)
      )
    )
    .returning();
  
  if (staleItems.length > 0) {
    console.log(`[Fortune 50 Sync] Recovered ${staleItems.length} stale items`);
  }
}

// Schedule cleanup of old completed/failed items
function scheduleCleanup(itemId: number, delayMs: number) {
  setTimeout(async () => {
    try {
      await db.delete(offlineSyncQueue)
        .where(
          and(
            eq(offlineSyncQueue.id, itemId),
            or(
              eq(offlineSyncQueue.status, 'completed'),
              eq(offlineSyncQueue.status, 'failed')
            )
          )
        );
    } catch (error) {
      console.error(`[Fortune 50 Sync] Failed to cleanup item ${itemId}:`, error);
    }
  }, delayMs);
}

// Process individual sync item
async function processSyncItem(item: SyncQueueItem) {
  // Verify hash signature for data integrity
  const expectedHash = createHash('sha256')
    .update(JSON.stringify({
      userId: item.userId,
      operation: item.operation,
      payload: item.payload,
      collectedAt: item.collectedAt
    }))
    .digest('hex');
  
  if (item.hashSignature && item.hashSignature !== expectedHash) {
    throw new Error('Hash signature mismatch - data integrity compromised');
  }
  
  switch (item.operation) {
    case 'clock_in':
      await processClockIn(item);
      break;
    case 'clock_out':
      await processClockOut(item);
      break;
    case 'update_timesheet':
      await processTimesheetUpdate(item);
      break;
    case 'submit_timesheet':
      await processTimesheetSubmit(item);
      break;
    default:
      throw new Error(`Unknown sync operation: ${item.operation}`);
  }
}

// Process clock in with conflict resolution
async function processClockIn(item: SyncQueueItem) {
  const { employeeId, timestamp, location, photo, deviceInfo } = item.payload;
  
  // Check for existing clock in at similar time (within 5 minutes)
  const existingEvents = await db.select()
    .from(timeClocks)
    .where(
      and(
        eq(timeClocks.userId, employeeId),
        eq(timeClocks.clockType, 'clock_in')
      )
    )
    .orderBy(desc(timeClocks.timestamp));
  
  const conflict = existingEvents.find(event => {
    const timeDiff = Math.abs(new Date(event.timestamp).getTime() - new Date(timestamp).getTime());
    return timeDiff < 5 * 60 * 1000; // 5 minutes
  });
  
  if (conflict) {
    // Conflict resolution: Keep the one with more verification data
    const existingGeo = conflict.geolocation as any;
    const existingScore = (existingGeo?.lat ? 1 : 0) + (conflict.photoUrl ? 1 : 0);
    const newScore = (location?.latitude ? 1 : 0) + (photo ? 1 : 0);
    
    if (newScore > existingScore) {
      // Update with better data
      await db.update(timeClocks)
        .set({
          geolocation: location ? {
            lat: location.latitude,
            lng: location.longitude,
            accuracy: location.accuracy
          } : conflict.geolocation,
          photoUrl: photo || conflict.photoUrl,
          deviceInfo: deviceInfo || conflict.deviceInfo,
          timestamp: new Date()
        })
        .where(eq(timeClocks.id, conflict.id));
    }
    // Otherwise keep existing
    return;
  }
  
  // No conflict, insert new event
  await db.insert(timeClocks).values({
    userId: employeeId,
    clockType: 'clock_in',
    timestamp: new Date(timestamp),
    geolocation: location ? {
      lat: location.latitude,
      lng: location.longitude,
      accuracy: location.accuracy
    } : null,
    photoUrl: photo,
    deviceInfo: deviceInfo,
    createdAt: new Date()
  });
}

// Process clock out with conflict resolution
async function processClockOut(item: SyncQueueItem) {
  const { employeeId, timestamp, location, photo, deviceInfo } = item.payload;
  
  // Find the most recent clock in without a clock out
  const lastClockIn = await db.select()
    .from(timeClocks)
    .where(
      and(
        eq(timeClocks.userId, employeeId),
        eq(timeClocks.clockType, 'clock_in')
      )
    )
    .orderBy(desc(timeClocks.timestamp))
    .limit(1);
  
  if (!lastClockIn.length) {
    throw new Error('No clock in found for clock out');
  }
  
  // Check for existing clock out
  const existingClockOut = await db.select()
    .from(timeClocks)
    .where(
      and(
        eq(timeClocks.userId, employeeId),
        eq(timeClocks.clockType, 'clock_out')
      )
    )
    .orderBy(desc(timeClocks.timestamp))
    .limit(1);
  
  if (existingClockOut.length) {
    const lastOut = existingClockOut[0];
    const lastIn = lastClockIn[0];
    
    // If clock out is after the last clock in, we have a conflict
    if (new Date(lastOut.timestamp) > new Date(lastIn.timestamp)) {
      // Conflict: Already clocked out, decide based on timestamp proximity
      const timeDiff = Math.abs(new Date(lastOut.timestamp).getTime() - new Date(timestamp).getTime());
      
      if (timeDiff < 5 * 60 * 1000) { // Within 5 minutes, merge data
        const existingGeo = lastOut.geolocation as any;
        await db.update(timeClocks)
          .set({
            geolocation: location ? {
              lat: location.latitude,
              lng: location.longitude,
              accuracy: location.accuracy
            } : lastOut.geolocation,
            photoUrl: photo || lastOut.photoUrl,
            deviceInfo: deviceInfo || lastOut.deviceInfo,
            timestamp: new Date()
          })
          .where(eq(timeClocks.id, lastOut.id));
        return;
      }
    }
  }
  
  // Insert new clock out
  await db.insert(timeClocks).values({
    userId: employeeId,
    clockType: 'clock_out',
    timestamp: new Date(timestamp),
    geolocation: location ? {
      lat: location.latitude,
      lng: location.longitude,
      accuracy: location.accuracy
    } : null,
    photoUrl: photo,
    deviceInfo: deviceInfo,
    createdAt: new Date()
  });
}

// Process timesheet update with conflict resolution
async function processTimesheetUpdate(item: SyncQueueItem) {
  const { timesheetId, updates, lastModified } = item.payload;
  
  // Get current timesheet
  const [currentTimesheet] = await db.select()
    .from(timesheets)
    .where(eq(timesheets.id, timesheetId));
  
  if (!currentTimesheet) {
    throw new Error(`Timesheet ${timesheetId} not found`);
  }
  
  // Check for conflicts based on last modified time
  const serverModified = currentTimesheet.updated_at || currentTimesheet.created_at;
  const clientModified = new Date(lastModified);
  
  let resolvedUpdates = updates;
  
  if (serverModified && serverModified > clientModified) {
    // Server has newer changes - merge non-conflicting fields
    resolvedUpdates = {};
    
    for (const [key, value] of Object.entries(updates)) {
      // For critical fields, use conflict resolution strategy
      if (['hours_worked', 'overtime_hours', 'status'].includes(key)) {
        // For now, server wins for critical fields
        console.log(`Conflict on field ${key}: server wins`);
      } else {
        // Non-critical fields can be updated
        resolvedUpdates[key] = value;
      }
    }
  }
  
  // Apply resolved updates
  if (Object.keys(resolvedUpdates).length > 0) {
    await db.update(timesheets)
      .set({
        ...resolvedUpdates,
        updated_at: new Date()
      })
      .where(eq(timesheets.id, timesheetId));
  }
}

// Process timesheet submission
async function processTimesheetSubmit(item: SyncQueueItem) {
  const { timesheetId, submittedBy, submittedAt } = item.payload;
  
  // Get current timesheet
  const [currentTimesheet] = await db.select()
    .from(timesheets)
    .where(eq(timesheets.id, timesheetId));
  
  if (!currentTimesheet) {
    throw new Error(`Timesheet ${timesheetId} not found`);
  }
  
  // Only submit if not already submitted
  if (currentTimesheet.status === 'draft') {
    await db.update(timesheets)
      .set({
        status: 'submitted',
        submitted_at: new Date(submittedAt),
        updated_at: new Date()
      })
      .where(eq(timesheets.id, timesheetId));
  }
}

// Get sync queue status
export async function getSyncQueueStatus() {
  try {
    const items = await db.select()
      .from(offlineSyncQueue)
      .orderBy(desc(offlineSyncQueue.collectedAt));
    
    return {
      total: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      processing: items.filter(i => i.status === 'processing').length,
      completed: items.filter(i => i.status === 'completed').length,
      failed: items.filter(i => i.status === 'failed').length,
      items: items.map(item => ({
        id: item.id,
        type: item.operation,
        status: item.status,
        timestamp: item.collectedAt,
        retryCount: item.retryCount,
        error: item.lastError
      }))
    };
  } catch (error) {
    console.error('[Fortune 50 Sync] Failed to get queue status:', error);
    return {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      items: []
    };
  }
}

// Retry failed items
export async function retryFailedItems() {
  try {
    const failedItems = await db.select()
      .from(offlineSyncQueue)
      .where(eq(offlineSyncQueue.status, 'failed'));
    
    for (const item of failedItems) {
      await db.update(offlineSyncQueue)
        .set({
          status: 'pending',
          retryCount: 0,
          lastError: null
        })
        .where(eq(offlineSyncQueue.id, item.id));
    }
    
    await processSyncQueue();
    
    return failedItems.length;
  } catch (error) {
    console.error('[Fortune 50 Sync] Failed to retry items:', error);
    return 0;
  }
}

// Clear completed items from queue
export async function clearCompletedItems() {
  try {
    const completedItems = await db.select()
      .from(offlineSyncQueue)
      .where(eq(offlineSyncQueue.status, 'completed'));
    
    for (const item of completedItems) {
      await db.delete(offlineSyncQueue)
        .where(eq(offlineSyncQueue.id, item.id));
    }
    
    return completedItems.length;
  } catch (error) {
    console.error('[Fortune 50 Sync] Failed to clear completed items:', error);
    return 0;
  }
}

// Initialize sync service with periodic processing
export function initializeSyncService() {
  // Process queue every 30 seconds
  setInterval(async () => {
    if (isOnline()) {
      await processSyncQueue();
    }
  }, 30000);
  
  // Clear old completed items every hour
  setInterval(() => {
    clearCompletedItems();
  }, 60 * 60 * 1000);
  
  console.log('Offline sync service initialized');
}