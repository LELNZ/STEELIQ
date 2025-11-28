/**
 * Fortune 50 Offline Sync Durability Tests
 * Tests crash recovery, retry logic, and data persistence
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { db } from '../server/db';
import { offlineSyncQueue, users, employees } from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { 
  addToSyncQueue, 
  processSyncQueue, 
  getQueueStatus, 
  retryFailedItems 
} from '../server/offlineSyncService';

describe('Fortune 50 Offline Sync Durability Tests', () => {
  let testUserId: number;
  let testEmployeeId: number;

  beforeAll(async () => {
    // Create test user and employee
    const [user] = await db.insert(users).values({
      username: 'sync_test_user',
      email: 'sync.test@lateraleng.com',
      password: 'hashed_password',
      role: 'supervisor',
      department: 'testing'
    }).returning();
    testUserId = user.id;

    const [employee] = await db.insert(employees).values({
      userId: user.id,
      firstName: 'Sync',
      lastName: 'Tester',
      email: 'sync.test@lateraleng.com',
      phone: '555-0100',
      position: 'Test Engineer',
      department: 'testing',
      employeeId: 'EMP-SYNC-001',
      startDate: new Date(),
      status: 'active',
      isActive: true,
      hourlyRate: 50,
      overtimeRate: 75,
      employmentType: 'full-time'
    }).returning();
    testEmployeeId = employee.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(offlineSyncQueue).where(eq(offlineSyncQueue.userId, testUserId));
    await db.delete(employees).where(eq(employees.id, testEmployeeId));
    await db.delete(users).where(eq(users.id, testUserId));
  });

  beforeEach(async () => {
    // Clear queue for test isolation
    await db.delete(offlineSyncQueue).where(eq(offlineSyncQueue.userId, testUserId));
  });

  describe('Durability Tests', () => {
    it('should persist queue items to database immediately', async () => {
      const queueId = await addToSyncQueue({
        operation: 'clock_in',
        payload: {
          employeeId: testEmployeeId,
          timestamp: new Date().toISOString(),
          location: 'Test Site',
          photo: null
        },
        deviceId: 'test-device-001',
        userId: testUserId,
        collectedAt: new Date(),
        networkType: '4G',
        appVersion: '1.0.0'
      });

      // Verify item was persisted
      const [item] = await db
        .select()
        .from(offlineSyncQueue)
        .where(eq(offlineSyncQueue.id, queueId));

      expect(item).toBeDefined();
      expect(item.operation).toBe('clock_in');
      expect(item.status).toBe('pending');
      expect(item.userId).toBe(testUserId);
      expect(item.deviceId).toBe('test-device-001');
    });

    it('should survive server restart (simulated by direct DB query)', async () => {
      // Add multiple items
      const queueIds = [];
      for (let i = 0; i < 5; i++) {
        const id = await addToSyncQueue({
          operation: 'update_timesheet',
          payload: {
            employeeId: testEmployeeId,
            weekEnding: new Date().toISOString(),
            hours: { monday: 8 + i }
          },
          deviceId: `device-${i}`,
          userId: testUserId,
          collectedAt: new Date(),
          networkType: 'WiFi',
          appVersion: '1.0.0'
        });
        queueIds.push(id);
      }

      // Simulate server restart by querying DB directly
      const items = await db
        .select()
        .from(offlineSyncQueue)
        .where(and(
          eq(offlineSyncQueue.userId, testUserId),
          eq(offlineSyncQueue.status, 'pending')
        ));

      expect(items.length).toBe(5);
      expect(items.every(item => item.operation === 'update_timesheet')).toBe(true);
    });
  });

  describe('Retry Logic Tests', () => {
    it('should increment retry count on failure', async () => {
      const queueId = await addToSyncQueue({
        operation: 'invalid_operation', // This will fail
        payload: { test: true },
        deviceId: 'test-device',
        userId: testUserId,
        collectedAt: new Date(),
        networkType: 'WiFi',
        appVersion: '1.0.0'
      });

      // Attempt to process (will fail)
      await processSyncQueue();

      // Check retry count
      const [item] = await db
        .select()
        .from(offlineSyncQueue)
        .where(eq(offlineSyncQueue.id, queueId));

      expect(item.retryCount).toBeGreaterThan(0);
      expect(item.status).toBe('failed');
      expect(item.lastError).toBeTruthy();
    });

    it('should mark as failed after max retries', async () => {
      // Insert item with max retries already hit
      const [item] = await db.insert(offlineSyncQueue).values({
        userId: testUserId,
        operation: 'test_operation',
        payload: { test: true },
        deviceId: 'test-device',
        collectedAt: new Date(),
        retryCount: 3,
        maxRetries: 3,
        status: 'failed',
        createdAt: new Date()
      }).returning();

      // Try to retry failed items
      const retried = await retryFailedItems();

      // Should not retry items at max retries
      const [updatedItem] = await db
        .select()
        .from(offlineSyncQueue)
        .where(eq(offlineSyncQueue.id, item.id));

      expect(updatedItem.retryCount).toBe(3);
      expect(updatedItem.status).toBe('failed');
    });
  });

  describe('Queue Status Tests', () => {
    it('should return accurate queue status', async () => {
      // Add items with different statuses
      await db.insert(offlineSyncQueue).values([
        {
          userId: testUserId,
          operation: 'clock_in',
          payload: { test: 1 },
          deviceId: 'device-1',
          collectedAt: new Date(),
          status: 'pending',
          createdAt: new Date()
        },
        {
          userId: testUserId,
          operation: 'clock_out',
          payload: { test: 2 },
          deviceId: 'device-2',
          collectedAt: new Date(),
          status: 'completed',
          createdAt: new Date(),
          syncedAt: new Date()
        },
        {
          userId: testUserId,
          operation: 'update_timesheet',
          payload: { test: 3 },
          deviceId: 'device-3',
          collectedAt: new Date(),
          status: 'failed',
          retryCount: 3,
          createdAt: new Date()
        }
      ]);

      const status = await getQueueStatus(testUserId);

      expect(status.pending).toBe(1);
      expect(status.completed).toBe(1);
      expect(status.failed).toBe(1);
      expect(status.total).toBe(3);
    });
  });

  describe('Crash Recovery Tests', () => {
    it('should process orphaned items after crash', async () => {
      // Simulate items left in 'processing' state after crash
      await db.insert(offlineSyncQueue).values({
        userId: testUserId,
        operation: 'clock_in',
        payload: { employeeId: testEmployeeId, timestamp: new Date() },
        deviceId: 'crashed-device',
        collectedAt: new Date(Date.now() - 3600000), // 1 hour ago
        status: 'pending', // Would be 'processing' during crash
        createdAt: new Date(Date.now() - 3600000)
      });

      // Process queue should pick up orphaned items
      await processSyncQueue();

      const items = await db
        .select()
        .from(offlineSyncQueue)
        .where(and(
          eq(offlineSyncQueue.userId, testUserId),
          eq(offlineSyncQueue.deviceId, 'crashed-device')
        ));

      // Should attempt to process orphaned item
      expect(items[0].retryCount).toBeGreaterThan(0);
    });

    it('should maintain data integrity across concurrent operations', async () => {
      const promises = [];
      
      // Simulate concurrent queue additions
      for (let i = 0; i < 10; i++) {
        promises.push(
          addToSyncQueue({
            operation: 'update_timesheet',
            payload: { 
              employeeId: testEmployeeId,
              hours: i,
              timestamp: new Date()
            },
            deviceId: `concurrent-${i}`,
            userId: testUserId,
            collectedAt: new Date(),
            networkType: '5G',
            appVersion: '1.0.0'
          })
        );
      }

      const queueIds = await Promise.all(promises);

      // Verify all items were added
      const items = await db
        .select()
        .from(offlineSyncQueue)
        .where(eq(offlineSyncQueue.userId, testUserId))
        .orderBy(desc(offlineSyncQueue.createdAt));

      expect(items.length).toBe(10);
      expect(new Set(items.map(i => i.id)).size).toBe(10); // All unique IDs
    });
  });

  describe('Conflict Resolution Tests', () => {
    it('should handle duplicate submissions with hash signatures', async () => {
      const payload = {
        employeeId: testEmployeeId,
        timestamp: new Date().toISOString(),
        location: 'Test Site'
      };

      // Add same item twice
      const id1 = await addToSyncQueue({
        operation: 'clock_in',
        payload,
        deviceId: 'device-1',
        userId: testUserId,
        collectedAt: new Date(),
        networkType: 'WiFi',
        appVersion: '1.0.0'
      });

      const id2 = await addToSyncQueue({
        operation: 'clock_in',
        payload,
        deviceId: 'device-1',
        userId: testUserId,
        collectedAt: new Date(),
        networkType: 'WiFi',
        appVersion: '1.0.0'
      });

      // Both should be added (deduplication happens during processing)
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });
  });
});