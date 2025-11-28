import { storage } from '../../storage';
import { users, teamMembers, gpsOverrideApprovals, locationTracking, timeClocks, payrollAdjustments } from '@shared/schema';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

const db = (storage as any).db;

/**
 * Test Setup Helpers for GPS Override System Testing
 * Fortune 50 Compliant Test Infrastructure
 */

export interface TestUsers {
  supervisorId: number;
  employeeId: number;
  nonSupervisorId: number;
  secondSupervisorId: number;
  supervisorPinHash: string;
  supervisorPin: string;
}

/**
 * Setup test database - clear test data
 */
export async function setupTestDatabase(): Promise<void> {
  try {
    // Clear test data in reverse dependency order
    await db.delete(payrollAdjustments);
    await db.delete(gpsOverrideApprovals);
    await db.delete(timeClocks);
    await db.delete(locationTracking);
    await db.delete(teamMembers);
    
    // Don't delete all users - just test users
    await db.delete(users)
      .where(eq(users.email, 'supervisor1@test.com'));
    await db.delete(users)
      .where(eq(users.email, 'supervisor2@test.com'));
    await db.delete(users)
      .where(eq(users.email, 'employee1@test.com'));
    await db.delete(users)
      .where(eq(users.email, 'nonsupervisor1@test.com'));
    
    console.log('[Test Setup] Database cleared');
  } catch (error) {
    console.error('[Test Setup] Error clearing database:', error);
    // Continue anyway - tests may still work
  }
}

/**
 * Create test users for GPS override testing
 */
export async function createTestUsers(): Promise<TestUsers> {
  try {
    // Create supervisor 1
    const supervisorPin = '1234';
    const supervisorPinHash = await bcrypt.hash(supervisorPin, 10);
    
    const [supervisor] = await db.insert(users).values({
      username: 'supervisor1',
      email: 'supervisor1@test.com',
      passwordHash: await bcrypt.hash('password', 10),
      role: 'supervisor'
    }).returning();

    await db.insert(teamMembers).values({
      userId: supervisor.id,
      name: 'Test Supervisor',
      email: 'supervisor1@test.com',
      role: 'supervisor',
      supervisorPinHash: supervisorPinHash,
      supervisorPinSetAt: new Date(),
      supervisorPinFailedAttempts: 0
    });

    // Create supervisor 2
    const [supervisor2] = await db.insert(users).values({
      username: 'supervisor2',
      email: 'supervisor2@test.com',
      passwordHash: await bcrypt.hash('password', 10),
      role: 'supervisor'
    }).returning();

    await db.insert(teamMembers).values({
      userId: supervisor2.id,
      name: 'Test Supervisor 2',
      email: 'supervisor2@test.com',
      role: 'supervisor',
      supervisorPinHash: await bcrypt.hash('5678', 10),
      supervisorPinSetAt: new Date(),
      supervisorPinFailedAttempts: 0
    });

    // Create employee
    const [employee] = await db.insert(users).values({
      username: 'employee1',
      email: 'employee1@test.com',
      passwordHash: await bcrypt.hash('password', 10),
      role: 'employee'
    }).returning();

    await db.insert(teamMembers).values({
      userId: employee.id,
      name: 'Test Employee',
      email: 'employee1@test.com',
      role: 'employee'
    });

    // Create non-supervisor
    const [nonSupervisor] = await db.insert(users).values({
      username: 'nonsupervisor1',
      email: 'nonsupervisor1@test.com',
      passwordHash: await bcrypt.hash('password', 10),
      role: 'employee'
    }).returning();

    await db.insert(teamMembers).values({
      userId: nonSupervisor.id,
      name: 'Non-Supervisor',
      email: 'nonsupervisor1@test.com',
      role: 'employee'
    });

    console.log('[Test Setup] Test users created');

    return {
      supervisorId: supervisor.id,
      employeeId: employee.id,
      nonSupervisorId: nonSupervisor.id,
      secondSupervisorId: supervisor2.id,
      supervisorPinHash,
      supervisorPin
    };
  } catch (error) {
    console.error('[Test Setup] Error creating test users:', error);
    throw error;
  }
}

/**
 * Cleanup test database after tests
 */
export async function cleanupTestDatabase(): Promise<void> {
  try {
    // Clear test data
    await db.delete(payrollAdjustments);
    await db.delete(gpsOverrideApprovals);
    await db.delete(timeClocks);
    await db.delete(locationTracking);
    
    // Delete test team members
    const testEmails = ['supervisor1@test.com', 'supervisor2@test.com', 'employee1@test.com', 'nonsupervisor1@test.com'];
    for (const email of testEmails) {
      await db.delete(teamMembers)
        .where(eq(teamMembers.email, email));
      await db.delete(users)
        .where(eq(users.email, email));
    }
    
    console.log('[Test Setup] Database cleaned up');
  } catch (error) {
    console.error('[Test Setup] Error cleaning up database:', error);
  }
}

/**
 * Create a GPS override request for testing
 */
export async function createTestOverrideRequest(supervisorId: number, employeeId: number): Promise<string> {
  const [request] = await db.insert(gpsOverrideApprovals).values({
    requesterId: supervisorId,
    employeeId: employeeId,
    clockType: 'clock_in',
    reason: 'Test request',
    status: 'pending',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
  }).returning();
  
  return request.requestId;
}

/**
 * Calculate Haversine distance between two GPS coordinates
 */
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate audit hash for integrity verification
 */
export function calculateAuditHash(record: any): string {
  const crypto = require('crypto');
  const dataToHash = JSON.stringify({
    requestId: record.requestId,
    requesterId: record.requesterId,
    employeeId: record.employeeId,
    reason: record.reason,
    status: record.status,
    timestamp: record.createdAt
  });
  
  return crypto.createHash('sha256').update(dataToHash).digest('hex');
}

/**
 * Wait for a specific amount of time (for testing delays)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}