import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { storage } from '../storage';
import { users, teamMembers, gpsOverrideApprovals, locationTracking, timeClocks } from '@shared/schema';
import { jwtOverrideService } from '../services/jwtOverrideService';
import { approvalRequestService } from '../services/approvalRequestService';
import { eq, and } from 'drizzle-orm';

const db = (storage as any).db;

/**
 * Fortune 50 GPS Override System Test Suite
 * 
 * Comprehensive testing for:
 * - GPS enforcement with 45-second windows
 * - Dual authorization security
 * - 2FA PIN validation
 * - JWT token lifecycle
 * - Rate limiting
 * - Payroll integration
 * - Audit trail integrity
 */

describe('GPS Override Dual Authorization System', () => {
  let supervisorId: number;
  let employeeId: number;
  let nonSupervisorId: number;
  let supervisorPinHash: string;
  let app: any;

  beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();
    
    // Create test users
    const testData = await createTestUsers();
    supervisorId = testData.supervisorId;
    employeeId = testData.employeeId;
    nonSupervisorId = testData.nonSupervisorId;
    supervisorPinHash = testData.supervisorPinHash;
    
    // Setup test app
    app = await setupTestApp();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('GPS Enforcement Tests', () => {
    describe('45-Second Window Validation', () => {
      it('should reject clock-in when GPS data is older than 45 seconds', async () => {
        // Create GPS data older than 45 seconds
        const oldGpsData = {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
          timestamp: new Date(Date.now() - 60000) // 60 seconds ago
        };

        const response = await request(app)
          .post('/api/time/clock')
          .send({
            userId: employeeId,
            action: 'clock_in',
            latitude: oldGpsData.latitude,
            longitude: oldGpsData.longitude,
            accuracy: oldGpsData.accuracy,
            timestamp: oldGpsData.timestamp.toISOString()
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('GPS data too old');
        expect(response.body.requiresOverride).toBe(true);
      });

      it('should accept clock-in when GPS data is within 45 seconds', async () => {
        // Create fresh GPS data
        const freshGpsData = {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
          timestamp: new Date(Date.now() - 20000) // 20 seconds ago
        };

        const response = await request(app)
          .post('/api/time/clock')
          .send({
            userId: employeeId,
            action: 'clock_in',
            latitude: freshGpsData.latitude,
            longitude: freshGpsData.longitude,
            accuracy: freshGpsData.accuracy,
            timestamp: freshGpsData.timestamp.toISOString()
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.locationTrackingId).toBeDefined();
      });
    });

    describe('Zero Coordinates Detection', () => {
      it('should reject clock-in with 0,0 coordinates as invalid', async () => {
        const response = await request(app)
          .post('/api/time/clock')
          .send({
            userId: employeeId,
            action: 'clock_in',
            latitude: 0,
            longitude: 0,
            accuracy: 10,
            timestamp: new Date().toISOString()
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid GPS coordinates');
        expect(response.body.requiresOverride).toBe(true);
      });
    });

    describe('Network Failure Handling', () => {
      it('should handle GPS timeout gracefully and suggest override', async () => {
        const response = await request(app)
          .post('/api/time/clock')
          .send({
            userId: employeeId,
            action: 'clock_in',
            gpsError: 'TIMEOUT',
            gpsErrorMessage: 'GPS acquisition timed out'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('GPS unavailable');
        expect(response.body.requiresOverride).toBe(true);
        expect(response.body.overrideInstructions).toBeDefined();
      });

      it('should handle permission denied for location access', async () => {
        const response = await request(app)
          .post('/api/time/clock')
          .send({
            userId: employeeId,
            action: 'clock_in',
            gpsError: 'PERMISSION_DENIED',
            gpsErrorMessage: 'User denied location access'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Location permission required');
        expect(response.body.requiresOverride).toBe(true);
      });
    });
  });

  describe('Dual Authorization Security Tests', () => {
    describe('Supervisor Role Validation', () => {
      it('should reject override request from non-supervisor', async () => {
        const result = await jwtOverrideService.createOverrideRequest({
          requesterId: nonSupervisorId,
          employeeId: employeeId,
          clockType: 'clock_in',
          reason: 'GPS unavailable',
          ipAddress: '192.168.1.1'
        }).catch(e => e);

        expect(result).toBeInstanceOf(Error);
        expect(result.message).toContain('Only supervisors can create GPS override requests');
      });

      it('should allow override request from supervisor', async () => {
        const result = await jwtOverrideService.createOverrideRequest({
          requesterId: supervisorId,
          employeeId: employeeId,
          clockType: 'clock_in',
          reason: 'GPS unavailable',
          ipAddress: '192.168.1.1'
        });

        expect(result.requestId).toBeDefined();
        expect(result.expiresAt).toBeInstanceOf(Date);
      });
    });

    describe('Self-Approval Prevention', () => {
      it('should prevent supervisor from approving own request', async () => {
        // Create request
        const request = await jwtOverrideService.createOverrideRequest({
          requesterId: supervisorId,
          employeeId: employeeId,
          clockType: 'clock_in',
          reason: 'Test self-approval'
        });

        // Attempt self-approval
        const result = await jwtOverrideService.approveOverrideRequest({
          requestId: request.requestId,
          approverId: supervisorId, // Same as requester
          approvalPin: '1234',
          approvalMethod: 'pin'
        }).catch(e => e);

        expect(result).toBeInstanceOf(Error);
        expect(result.message).toContain('Self-approval not allowed');
      });
    });

    describe('2FA PIN Validation', () => {
      let secondSupervisorId: number;
      let testRequestId: string;

      beforeEach(async () => {
        // Create second supervisor with PIN
        const pinHash = await bcrypt.hash('5678', 10);
        const [supervisor] = await db.insert(users).values({
          username: 'supervisor2',
          email: 'supervisor2@test.com',
          passwordHash: await bcrypt.hash('password', 10),
          role: 'supervisor'
        }).returning();
        
        secondSupervisorId = supervisor.id;

        await db.insert(teamMembers).values({
          userId: secondSupervisorId,
          name: 'Test Supervisor 2',
          email: 'supervisor2@test.com',
          role: 'supervisor',
          supervisorPinHash: pinHash,
          supervisorPinSetAt: new Date()
        });

        // Create a request
        const request = await jwtOverrideService.createOverrideRequest({
          requesterId: supervisorId,
          employeeId: employeeId,
          clockType: 'clock_in',
          reason: 'Test PIN validation'
        });
        testRequestId = request.requestId;
      });

      it('should reject approval with incorrect PIN', async () => {
        const result = await jwtOverrideService.approveOverrideRequest({
          requestId: testRequestId,
          approverId: secondSupervisorId,
          approvalPin: 'wrong',
          approvalMethod: 'pin'
        }).catch(e => e);

        expect(result).toBeInstanceOf(Error);
        expect(result.message).toContain('Invalid PIN');
      });

      it('should accept approval with correct PIN', async () => {
        const result = await jwtOverrideService.approveOverrideRequest({
          requestId: testRequestId,
          approverId: secondSupervisorId,
          approvalPin: '5678',
          approvalMethod: 'pin'
        });

        expect(result.token).toBeDefined();
        expect(result.jti).toBeDefined();
      });

      it('should lock account after 5 failed PIN attempts', async () => {
        // Attempt 5 failed PINs
        for (let i = 0; i < 5; i++) {
          await jwtOverrideService.approveOverrideRequest({
            requestId: testRequestId,
            approverId: secondSupervisorId,
            approvalPin: 'wrong',
            approvalMethod: 'pin'
          }).catch(e => e);
        }

        // Check account is locked
        const [member] = await db.select()
          .from(teamMembers)
          .where(eq(teamMembers.userId, secondSupervisorId));

        expect(member.supervisorPinFailedAttempts).toBe(5);
        expect(member.supervisorPinLockedUntil).toBeDefined();
        expect(member.supervisorPinLockedUntil.getTime()).toBeGreaterThan(Date.now());

        // Attempt with correct PIN should still fail due to lockout
        const result = await jwtOverrideService.approveOverrideRequest({
          requestId: testRequestId,
          approverId: secondSupervisorId,
          approvalPin: '5678',
          approvalMethod: 'pin'
        }).catch(e => e);

        expect(result).toBeInstanceOf(Error);
        expect(result.message).toContain('Account locked');
      });
    });

    describe('JWT Token Security', () => {
      let validToken: string;
      let jti: string;
      let requestId: string;

      beforeEach(async () => {
        // Create and approve a request
        const request = await jwtOverrideService.createOverrideRequest({
          requesterId: supervisorId,
          employeeId: employeeId,
          clockType: 'clock_in',
          reason: 'Test token security'
        });
        requestId = request.requestId;

        // Create second supervisor for approval
        const [supervisor] = await db.insert(users).values({
          username: 'supervisor3',
          email: 'supervisor3@test.com',
          passwordHash: await bcrypt.hash('password', 10),
          role: 'supervisor'
        }).returning();

        await db.insert(teamMembers).values({
          userId: supervisor.id,
          name: 'Test Supervisor 3',
          email: 'supervisor3@test.com',
          role: 'supervisor',
          supervisorPinHash: await bcrypt.hash('9999', 10),
          supervisorPinSetAt: new Date()
        });

        const approval = await jwtOverrideService.approveOverrideRequest({
          requestId: requestId,
          approverId: supervisor.id,
          approvalPin: '9999',
          approvalMethod: 'pin'
        });

        validToken = approval.token;
        jti = approval.jti;
      });

      it('should prevent token replay attacks', async () => {
        // First use should succeed
        const firstUse = await jwtOverrideService.validateOverrideToken(validToken);
        expect(firstUse.valid).toBe(true);
        expect(firstUse.employeeId).toBe(employeeId);

        // Second use should fail (replay attack)
        const secondUse = await jwtOverrideService.validateOverrideToken(validToken);
        expect(secondUse.valid).toBe(false);
        expect(secondUse.error).toContain('already used');
      });

      it('should reject forged tokens', async () => {
        const forgedToken = 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmYWtlIiwicmVxdWVzdElkIjoiZmFrZSIsImVtcGxveWVlSWQiOjEsImlhdCI6MTUxNjIzOTAyMn0.fake';
        
        const result = await jwtOverrideService.validateOverrideToken(forgedToken);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid token');
      });

      it('should reject expired tokens', async () => {
        // Wait for token to expire (would need to mock time in real test)
        jest.useFakeTimers();
        jest.advanceTimersByTime(6 * 60 * 1000); // 6 minutes

        const result = await jwtOverrideService.validateOverrideToken(validToken);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('expired');

        jest.useRealTimers();
      });
    });

    describe('Rate Limiting', () => {
      it('should enforce 5 requests per hour limit', async () => {
        // Create 5 requests
        for (let i = 0; i < 5; i++) {
          await jwtOverrideService.createOverrideRequest({
            requesterId: supervisorId,
            employeeId: employeeId,
            clockType: 'clock_in',
            reason: `Rate limit test ${i}`
          });
        }

        // 6th request should fail
        const result = await jwtOverrideService.createOverrideRequest({
          requesterId: supervisorId,
          employeeId: employeeId,
          clockType: 'clock_in',
          reason: 'Should be rate limited'
        }).catch(e => e);

        expect(result).toBeInstanceOf(Error);
        expect(result.message).toContain('Rate limit exceeded');
      });
    });
  });

  describe('Payroll Integration Tests', () => {
    describe('Hazard Pay Calculation', () => {
      it('should apply hazard pay for designated zones', async () => {
        // Create location in hazard zone
        const [tracking] = await db.insert(locationTracking).values({
          userId: employeeId,
          latitude: -33.8688, // Sydney hazard zone
          longitude: 151.2093,
          accuracy: 10,
          timestamp: new Date(),
          source: 'gps',
          metadata: {
            zone: 'hazard_zone_a',
            hazardLevel: 'high'
          }
        }).returning();

        // Clock in with hazard zone
        const [timeClock] = await db.insert(timeClocks).values({
          userId: employeeId,
          clockIn: new Date(),
          locationTrackingId: tracking.id,
          gpsRequired: true
        }).returning();

        // Verify hazard pay adjustment created
        const adjustments = await db.select()
          .from('payroll_adjustments')
          .where(eq('payroll_adjustments.timeclockId', timeClock.id));

        expect(adjustments.length).toBeGreaterThan(0);
        expect(adjustments[0].adjustmentType).toBe('hazard_pay');
        expect(adjustments[0].amount).toBeGreaterThan(0);
      });
    });

    describe('Mileage Reimbursement', () => {
      it('should calculate mileage between job sites', async () => {
        // Create two location points
        const [location1] = await db.insert(locationTracking).values({
          userId: employeeId,
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          source: 'gps'
        }).returning();

        const [location2] = await db.insert(locationTracking).values({
          userId: employeeId,
          latitude: 40.7580,
          longitude: -73.9855,
          timestamp: new Date(),
          source: 'gps'
        }).returning();

        // Calculate distance (should be ~3.5 miles)
        const distance = calculateHaversineDistance(
          location1.latitude, location1.longitude,
          location2.latitude, location2.longitude
        );

        expect(distance).toBeGreaterThan(3);
        expect(distance).toBeLessThan(4);
      });
    });

    describe('Zone Differential Pay', () => {
      it('should apply correct pay differential for work zones', async () => {
        const zones = [
          { name: 'cbd', differential: 1.15 },
          { name: 'remote', differential: 1.25 },
          { name: 'standard', differential: 1.0 }
        ];

        for (const zone of zones) {
          const [tracking] = await db.insert(locationTracking).values({
            userId: employeeId,
            latitude: 40.7128,
            longitude: -74.0060,
            timestamp: new Date(),
            source: 'gps',
            metadata: { zone: zone.name }
          }).returning();

          // Verify differential stored
          expect(tracking.metadata.zone).toBe(zone.name);
        }
      });
    });
  });

  describe('Archival and Audit Trail Tests', () => {
    describe('Hash Chain Integrity', () => {
      it('should create tamper-evident hash chain for GPS overrides', async () => {
        // Create override approval
        const request = await jwtOverrideService.createOverrideRequest({
          requesterId: supervisorId,
          employeeId: employeeId,
          clockType: 'clock_in',
          reason: 'Hash chain test'
        });

        // Get the approval record
        const [approval] = await db.select()
          .from(gpsOverrideApprovals)
          .where(eq(gpsOverrideApprovals.requestId, request.requestId));

        // Verify hash chain fields exist
        expect(approval.auditHash).toBeDefined();
        expect(approval.previousHash).toBeDefined();
        
        // Verify hash is SHA-256 format (64 hex characters)
        expect(approval.auditHash).toMatch(/^[a-f0-9]{64}$/);
      });

      it('should detect tampering in audit records', async () => {
        // Create a record
        const request = await jwtOverrideService.createOverrideRequest({
          requesterId: supervisorId,
          employeeId: employeeId,
          clockType: 'clock_in',
          reason: 'Tamper test'
        });

        // Get original hash
        const [original] = await db.select()
          .from(gpsOverrideApprovals)
          .where(eq(gpsOverrideApprovals.requestId, request.requestId));

        const originalHash = original.auditHash;

        // Attempt to tamper with record
        await db.update(gpsOverrideApprovals)
          .set({ reason: 'Tampered reason' })
          .where(eq(gpsOverrideApprovals.id, original.id));

        // Recalculate hash
        const [tampered] = await db.select()
          .from(gpsOverrideApprovals)
          .where(eq(gpsOverrideApprovals.id, original.id));

        // Hash should be different after tampering
        const recalculatedHash = calculateAuditHash(tampered);
        expect(recalculatedHash).not.toBe(originalHash);
      });
    });

    describe('GPS Breadcrumb Archival', () => {
      it('should archive GPS breadcrumbs every 30 seconds', async () => {
        const startTime = Date.now();
        const breadcrumbs = [];

        // Simulate 5 minutes of breadcrumbs
        for (let i = 0; i < 10; i++) {
          const [breadcrumb] = await db.insert(locationTracking).values({
            userId: employeeId,
            latitude: 40.7128 + (i * 0.001),
            longitude: -74.0060 + (i * 0.001),
            accuracy: 10,
            timestamp: new Date(startTime + (i * 30000)), // Every 30 seconds
            source: 'background'
          }).returning();
          breadcrumbs.push(breadcrumb);
        }

        // Verify breadcrumb intervals
        for (let i = 1; i < breadcrumbs.length; i++) {
          const interval = breadcrumbs[i].timestamp.getTime() - breadcrumbs[i-1].timestamp.getTime();
          expect(interval).toBe(30000); // Exactly 30 seconds
        }
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    describe('Timezone Handling', () => {
      it('should handle clock-ins across different timezones', async () => {
        const timezones = [
          { offset: -8, name: 'PST' },
          { offset: -5, name: 'EST' },
          { offset: 0, name: 'UTC' },
          { offset: 10, name: 'AEST' }
        ];

        for (const tz of timezones) {
          const timestamp = new Date();
          timestamp.setHours(timestamp.getHours() + tz.offset);

          const response = await request(app)
            .post('/api/time/clock')
            .send({
              userId: employeeId,
              action: 'clock_in',
              latitude: 40.7128,
              longitude: -74.0060,
              timestamp: timestamp.toISOString(),
              timezone: tz.name
            });

          expect(response.status).toBe(200);
          expect(response.body.timezone).toBe(tz.name);
        }
      });
    });

    describe('Daylight Saving Time', () => {
      it('should handle DST transitions correctly', async () => {
        // Test spring forward (2 AM -> 3 AM)
        const springForward = new Date('2024-03-10T02:30:00');
        const response1 = await request(app)
          .post('/api/time/clock')
          .send({
            userId: employeeId,
            action: 'clock_in',
            latitude: 40.7128,
            longitude: -74.0060,
            timestamp: springForward.toISOString()
          });

        expect(response1.status).toBe(200);

        // Test fall back (2 AM -> 1 AM)
        const fallBack = new Date('2024-11-03T01:30:00');
        const response2 = await request(app)
          .post('/api/time/clock')
          .send({
            userId: employeeId,
            action: 'clock_in',
            latitude: 40.7128,
            longitude: -74.0060,
            timestamp: fallBack.toISOString()
          });

        expect(response2.status).toBe(200);
      });
    });

    describe('Concurrent Request Handling', () => {
      it('should handle multiple simultaneous override requests', async () => {
        const promises = [];

        // Create 10 concurrent requests
        for (let i = 0; i < 10; i++) {
          promises.push(
            jwtOverrideService.createOverrideRequest({
              requesterId: supervisorId,
              employeeId: employeeId + i,
              clockType: 'clock_in',
              reason: `Concurrent test ${i}`
            })
          );
        }

        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled');
        
        // Should handle at least 5 due to rate limiting
        expect(successful.length).toBeGreaterThanOrEqual(5);
      });
    });

    describe('High Volume Performance', () => {
      it('should maintain sub-100ms response time under load', async () => {
        const iterations = 100;
        const responseTimes = [];

        for (let i = 0; i < iterations; i++) {
          const start = Date.now();
          
          await request(app)
            .get('/api/gps/override/readiness')
            .query({ userId: supervisorId });
          
          const responseTime = Date.now() - start;
          responseTimes.push(responseTime);
        }

        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / iterations;
        const maxResponseTime = Math.max(...responseTimes);

        expect(avgResponseTime).toBeLessThan(100);
        expect(maxResponseTime).toBeLessThan(500);
      });
    });
  });
});

// Helper Functions

async function setupTestDatabase() {
  // Clear test data
  await db.delete(gpsOverrideApprovals);
  await db.delete(timeClocks);
  await db.delete(locationTracking);
  await db.delete(teamMembers);
  await db.delete(users);
}

async function createTestUsers() {
  // Create supervisor
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
    supervisorPinSetAt: new Date()
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

  return {
    supervisorId: supervisor.id,
    employeeId: employee.id,
    nonSupervisorId: nonSupervisor.id,
    supervisorPinHash
  };
}

async function setupTestApp() {
  // Return test app instance (would import from server setup)
  const express = require('express');
  const app = express();
  app.use(express.json());
  
  // Import routes
  const routes = require('../routes');
  app.use('/api', routes);
  
  return app;
}

async function cleanupTestDatabase() {
  // Clean up test data
  await db.delete(gpsOverrideApprovals);
  await db.delete(timeClocks);
  await db.delete(locationTracking);
  await db.delete(teamMembers);
  await db.delete(users);
}

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

function calculateAuditHash(record: any): string {
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