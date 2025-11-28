import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import app from '../index';
import { db } from '../db';
import { timeClocks, timeCorrections, timeCorrectionItems, users, deviceSessions, shiftNotifications } from '@/shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

describe('Wave 1.5 - Time & Payroll Enhancements', () => {
  let authCookie: string;
  let manager1Cookie: string;
  let manager2Cookie: string;
  let testUserId: number;
  let manager1Id: number;
  let manager2Id: number;
  let testTimeClockId: number;

  beforeAll(async () => {
    // Create test users
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Create employee
    const [employee] = await db.insert(users).values({
      email: 'wave15-employee@test.com',
      password: hashedPassword,
      name: 'Test Employee',
      role: 'employee'
    }).returning();
    testUserId = employee.id;

    // Create manager 1
    const [manager1] = await db.insert(users).values({
      email: 'wave15-manager1@test.com',
      password: hashedPassword,
      name: 'Manager One',
      role: 'manager',
      permissions: ['manage_time_entries', 'manage_kiosk']
    }).returning();
    manager1Id = manager1.id;

    // Create manager 2
    const [manager2] = await db.insert(users).values({
      email: 'wave15-manager2@test.com',
      password: hashedPassword,
      name: 'Manager Two',
      role: 'manager',
      permissions: ['manage_time_entries', 'manage_kiosk']
    }).returning();
    manager2Id = manager2.id;

    // Login as employee
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wave15-employee@test.com', password: 'test123' });
    authCookie = loginRes.headers['set-cookie'];

    // Login as manager 1
    const manager1Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wave15-manager1@test.com', password: 'test123' });
    manager1Cookie = manager1Res.headers['set-cookie'];

    // Login as manager 2
    const manager2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wave15-manager2@test.com', password: 'test123' });
    manager2Cookie = manager2Res.headers['set-cookie'];

    // Create a test time clock entry
    const [timeClock] = await db.insert(timeClocks).values({
      userId: testUserId,
      clockType: 'clock_in',
      timestamp: new Date('2024-01-15T09:00:00Z'),
      location: 'Test Site',
      geolocation: { latitude: 40.7128, longitude: -74.0060 }
    }).returning();
    testTimeClockId = timeClock.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(timeCorrectionItems).where(eq(timeCorrectionItems.timeClockId, testTimeClockId));
    await db.delete(timeCorrections).where(eq(timeCorrections.managerId, manager1Id));
    await db.delete(timeClocks).where(eq(timeClocks.userId, testUserId));
    await db.delete(shiftNotifications).where(eq(shiftNotifications.userId, testUserId));
    await db.delete(deviceSessions).where(eq(deviceSessions.createdBy, manager1Id));
    await db.delete(users).where(eq(users.id, testUserId));
    await db.delete(users).where(eq(users.id, manager1Id));
    await db.delete(users).where(eq(users.id, manager2Id));
  });

  describe('Bulk Time Corrections with Dual Approval', () => {
    it('should preview bulk time corrections', async () => {
      const response = await request(app)
        .post('/api/time/entries/bulk-preview')
        .set('Cookie', manager1Cookie)
        .send({
          entries: [{
            timeClockId: testTimeClockId,
            newTimestamp: new Date('2024-01-15T08:30:00Z'), // 30 min adjustment
            notes: 'Employee arrived early'
          }],
          reason: 'Correcting early arrival time'
        });

      expect(response.status).toBe(200);
      expect(response.body.corrections).toHaveLength(1);
      expect(response.body.corrections[0].adjustmentMinutes).toBe(-30);
      expect(response.body.totalAdjustmentMinutes).toBe(-30);
      expect(response.body.managerId).toBe(manager1Id);
    });

    it('should apply small corrections without dual approval', async () => {
      const corrections = [{
        timeClockId: testTimeClockId,
        originalTimestamp: new Date('2024-01-15T09:00:00Z'),
        originalClockType: 'clock_in',
        newTimestamp: new Date('2024-01-15T08:30:00Z'),
        adjustmentMinutes: -30,
        notes: 'Early arrival'
      }];

      const response = await request(app)
        .post('/api/time/entries/bulk-apply')
        .set('Cookie', manager1Cookie)
        .send({
          corrections,
          reason: 'Correcting early arrival (under 120 min)'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('applied');
      expect(response.body.message).toContain('applied successfully');

      // Verify time clock was actually updated
      const [updatedClock] = await db.select()
        .from(timeClocks)
        .where(eq(timeClocks.id, testTimeClockId))
        .limit(1);
      
      expect(new Date(updatedClock.timestamp).toISOString())
        .toBe(new Date('2024-01-15T08:30:00Z').toISOString());
    });

    it('should require dual approval for large corrections (>120 minutes)', async () => {
      // Reset time clock to original
      await db.update(timeClocks)
        .set({ timestamp: new Date('2024-01-15T09:00:00Z') })
        .where(eq(timeClocks.id, testTimeClockId));

      const corrections = [{
        timeClockId: testTimeClockId,
        originalTimestamp: new Date('2024-01-15T09:00:00Z'),
        originalClockType: 'clock_in',
        newTimestamp: new Date('2024-01-15T06:00:00Z'), // 180 min adjustment
        adjustmentMinutes: -180,
        notes: 'Major correction'
      }];

      const response = await request(app)
        .post('/api/time/entries/bulk-apply')
        .set('Cookie', manager1Cookie)
        .send({
          corrections,
          reason: 'Major time adjustment requiring dual approval'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('dual approval');
      expect(response.body.dualApprovalRequired).toBe(true);
      expect(response.body.totalAdjustmentMinutes).toBe(-180);

      // Verify time clock was NOT updated yet
      const [unchangedClock] = await db.select()
        .from(timeClocks)
        .where(eq(timeClocks.id, testTimeClockId))
        .limit(1);
      
      expect(new Date(unchangedClock.timestamp).toISOString())
        .toBe(new Date('2024-01-15T09:00:00Z').toISOString());
    });

    it('should stage large corrections and apply after second approval', async () => {
      // First approval - create staged correction via API
      const corrections = [{
        timeClockId: testTimeClockId,
        originalTimestamp: new Date('2024-01-15T09:00:00Z'),
        originalClockType: 'clock_in',
        newTimestamp: new Date('2024-01-15T06:00:00Z'),
        adjustmentMinutes: -180,
        notes: 'Major correction'
      }];

      // Manager 1 initiates - should create staged correction
      const firstResponse = await request(app)
        .post('/api/time/entries/bulk-apply')
        .set('Cookie', manager1Cookie)
        .send({
          corrections,
          reason: 'Major adjustment with dual approval test'
        });

      // Now expecting success with staged correction
      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.success).toBe(true);
      expect(firstResponse.body.dualApprovalRequired).toBe(true);
      expect(firstResponse.body.status).toBe('pending');
      expect(firstResponse.body.message).toContain('staged for dual approval');
      expect(firstResponse.body.correctionId).toBeTruthy();

      const correctionId = firstResponse.body.correctionId;

      // Verify time clock still unchanged (not modified yet)
      const [stillUnchanged] = await db.select()
        .from(timeClocks)
        .where(eq(timeClocks.id, testTimeClockId))
        .limit(1);
      
      expect(new Date(stillUnchanged.timestamp).toISOString())
        .toBe(new Date('2024-01-15T09:00:00Z').toISOString());

      // Manager 2 provides second approval via API
      const secondResponse = await request(app)
        .post('/api/time/entries/bulk-second-approve')
        .set('Cookie', manager2Cookie)
        .send({
          correctionId: correctionId
        });

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.success).toBe(true);
      expect(secondResponse.body.message).toContain('Dual approval complete');
      expect(secondResponse.body.secondApproverId).toBe(manager2Id);

      // Verify time clock was NOW updated after second approval
      const [nowUpdated] = await db.select()
        .from(timeClocks)
        .where(eq(timeClocks.id, testTimeClockId))
        .limit(1);
      
      expect(new Date(nowUpdated.timestamp).toISOString())
        .toBe(new Date('2024-01-15T06:00:00Z').toISOString());

      // Verify correction status is now applied
      const [approvedCorrection] = await db.select()
        .from(timeCorrections)
        .where(eq(timeCorrections.id, correctionId))
        .limit(1);
      
      expect(approvedCorrection.status).toBe('applied');
      expect(approvedCorrection.secondApproverId).toBe(manager2Id);
      expect(approvedCorrection.secondApprovedAt).toBeTruthy();
      expect(approvedCorrection.managerId).toBe(manager1Id); // First approver
    });

    it('should reject second approval from same manager', async () => {
      // Create another staged correction via API
      const corrections = [{
        timeClockId: testTimeClockId,
        originalTimestamp: new Date('2024-01-15T09:00:00Z'),
        originalClockType: 'clock_in',
        newTimestamp: new Date('2024-01-15T06:30:00Z'),
        adjustmentMinutes: -150,
        notes: 'Test same manager rejection'
      }];

      // Manager 1 creates staged correction
      const createResponse = await request(app)
        .post('/api/time/entries/bulk-apply')
        .set('Cookie', manager1Cookie)
        .send({
          corrections,
          reason: 'Test same manager rejection'
        });

      expect(createResponse.status).toBe(200);
      expect(createResponse.body.dualApprovalRequired).toBe(true);
      
      const correctionId = createResponse.body.correctionId;

      // Manager 1 tries to approve their own correction
      const response = await request(app)
        .post('/api/time/entries/bulk-second-approve')
        .set('Cookie', manager1Cookie)
        .send({
          correctionId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('different from the initiating manager');
    });
  });

  describe('Kiosk Mode', () => {
    let sessionToken: string;
    let sessionId: string;

    it('should create kiosk session with security features', async () => {
      const response = await request(app)
        .post('/api/time/kiosk/session')
        .set('Cookie', manager1Cookie)
        .send({
          deviceId: 'KIOSK-001',
          locationId: 1,
          locationName: 'Main Office',
          requiresPhoto: true,
          requiresPin: false,
          expiresInHours: 12
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sessionToken).toBeTruthy();
      expect(response.body.refreshToken).toBeTruthy();
      expect(response.body.kioskSettings.requiresPhoto).toBe(true);
      
      sessionToken = response.body.sessionToken;
      sessionId = response.body.sessionId;

      // Verify token is hashed in database
      const [session] = await db.select()
        .from(deviceSessions)
        .where(eq(deviceSessions.sessionId, sessionId))
        .limit(1);

      const expectedHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
      expect(session.sessionToken).toBe(expectedHash);
      expect(session.sessionToken).not.toBe(sessionToken); // Confirm it's hashed
    });

    it('should process kiosk clock operations', async () => {
      const response = await request(app)
        .post('/api/time/kiosk/clock')
        .send({
          sessionToken,
          employeeId: testUserId,
          clockType: 'clock_in',
          photo: null // Photo would be base64 in real scenario
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.clockType).toBe('clock_in');
      expect(response.body.message).toContain('Successfully clocked in');
    });

    it('should reject invalid session token', async () => {
      const response = await request(app)
        .post('/api/time/kiosk/clock')
        .send({
          sessionToken: 'invalid-token',
          employeeId: testUserId,
          clockType: 'clock_out'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid or expired kiosk session');
    });

    it('should terminate kiosk session', async () => {
      const response = await request(app)
        .post('/api/time/kiosk/logout')
        .send({ sessionToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('terminated');

      // Verify session is terminated
      const [session] = await db.select()
        .from(deviceSessions)
        .where(eq(deviceSessions.sessionId, sessionId))
        .limit(1);

      expect(session.terminatedAt).toBeTruthy();
    });
  });

  describe('Shift Reminders', () => {
    it('should configure shift reminder', async () => {
      const response = await request(app)
        .post('/api/time/shift-reminders/configure')
        .set('Cookie', authCookie)
        .send({
          reminderType: 'start_shift',
          minutesBefore: 15,
          notificationMethods: ['email', 'push'],
          weekdaysOnly: true,
          enabled: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.reminderId).toBeTruthy();
    });

    it('should fetch user shift reminders', async () => {
      const response = await request(app)
        .get('/api/time/shift-reminders')
        .set('Cookie', authCookie);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].reminderType).toBe('start_shift');
    });
  });

  describe('GPS Battery Optimization', () => {
    it('should optimize GPS frequency for low battery', async () => {
      const response = await request(app)
        .post('/api/time/gps/battery-optimize')
        .set('Cookie', authCookie)
        .send({
          batteryLevel: 15,
          isCharging: false,
          currentFrequencySeconds: 30
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.optimalFrequencySeconds).toBe(120); // 2 minutes for 10-20% battery
      expect(response.body.mode).toBe('power_saving');
    });

    it('should maintain 30-second frequency when battery is good', async () => {
      const response = await request(app)
        .post('/api/time/gps/battery-optimize')
        .set('Cookie', authCookie)
        .send({
          batteryLevel: 75,
          isCharging: false,
          currentFrequencySeconds: 30
        });

      expect(response.status).toBe(200);
      expect(response.body.optimalFrequencySeconds).toBe(30); // Fortune 50 requirement
      expect(response.body.mode).toBe('normal');
    });

    it('should use maximum frequency when charging', async () => {
      const response = await request(app)
        .post('/api/time/gps/battery-optimize')
        .set('Cookie', authCookie)
        .send({
          batteryLevel: 25,
          isCharging: true,
          currentFrequencySeconds: 60
        });

      expect(response.status).toBe(200);
      expect(response.body.optimalFrequencySeconds).toBe(30); // Max frequency when charging
      expect(response.body.batteryLevel).toBe(25);
    });
  });

  describe('Correction History', () => {
    it('should fetch correction history with dual approval details', async () => {
      const response = await request(app)
        .get('/api/time/entries/correction-history')
        .set('Cookie', manager1Cookie)
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      
      // Find a correction with dual approval
      const dualApprovalCorrection = response.body.find((c: any) => c.dualApprovalRequired);
      if (dualApprovalCorrection) {
        expect(dualApprovalCorrection.secondApproverId).toBeTruthy();
        expect(dualApprovalCorrection.secondApprovedAt).toBeTruthy();
      }
    });
  });
});

export {};