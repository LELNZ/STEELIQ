/**
 * Fortune 50 Security & Compliance Tests
 * Tests for data integrity, audit trails, and regulatory compliance
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import crypto from 'crypto';
import { createTestApp, mockAuth } from '../helpers/test-server';
import type { Express } from 'express';

describe('Security & Compliance Tests', () => {
  let app: Express;
  
  beforeEach(() => {
    // Create fresh test app for each test
    app = createTestApp();
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Encryption', () => {
    test('Payroll credentials are encrypted at rest', async () => {
      const sensitiveData = {
        provider: 'ADP',
        clientId: 'LATERAL-ENG-001',
        apiKey: 'sk_live_abcd1234efgh5678',
        apiSecret: 'secret_xyz789'
      };

      // Setup admin permissions
      app.use(mockAuth('owner', { 
        timeReportsProcess: true, 
        payrollPeriodManage: true 
      }));
      
      // Store payroll credentials
      const storeResponse = await request(app)
        .post('/api/time/payroll-config')
        .send(sensitiveData)
        .expect(200);

      // Direct database query to verify encryption
      const dbResponse = await request(app)
        .get('/api/admin/database-debug/payroll-config')
        .expect(200);

      // Verify data is encrypted in database
      expect(dbResponse.body.raw_data.apiKey).not.toBe(sensitiveData.apiKey);
      expect(dbResponse.body.raw_data.apiSecret).not.toBe(sensitiveData.apiSecret);
      expect(dbResponse.body.raw_data.apiKey).toMatch(/^encrypted:/);
      expect(dbResponse.body.raw_data.apiSecret).toMatch(/^encrypted:/);
      
      // Verify decryption works
      const retrieveResponse = await request(app)
        .get('/api/time/payroll-config')
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      expect(retrieveResponse.body).toMatchObject({
        provider: 'ADP',
        clientId: 'LATERAL-ENG-001',
        apiKey: '***************5678', // Masked in response
        apiSecret: '***********'       // Fully masked
      });
    });

    test('GPS coordinates are anonymized for privacy', async () => {
      const employeeId = 200;
      
      // Clock in with precise GPS
      await request(app)
        .post('/api/time/clock-in')
        .send({
          employeeId,
          gps_latitude: 37.774929,  // Precise to ~0.1m
          gps_longitude: -122.419418
        })
        .set('Cookie', 'session=employee-session')
        .expect(200);

      // Manager view shows rounded coordinates
      const managerResponse = await request(app)
        .get(`/api/time/location-check/${employeeId}`)
        .set('Cookie', 'session=manager-session')
        .expect(200);

      // Coordinates should be rounded for privacy (to ~100m)
      expect(managerResponse.body.location).toMatchObject({
        latitude: 37.775,  // Rounded to 3 decimal places
        longitude: -122.419,
        precision: 'approximate'
      });

      // Admin can see full precision
      const adminResponse = await request(app)
        .get(`/api/time/location-check/${employeeId}?full=true`)
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      expect(adminResponse.body.location).toMatchObject({
        latitude: 37.774929,
        longitude: -122.419418,
        precision: 'exact'
      });
    });
  });

  describe('Audit Trail Integrity', () => {
    test('All state changes create immutable audit records', async () => {
      const timesheetId = 301;
      const auditRecords: any[] = [];

      // Monitor audit events
      const auditSpy = jest.fn();
      
      // Submit timesheet
      await request(app)
        .patch(`/api/time/timesheets/${timesheetId}/submit`)
        .set('Cookie', 'session=employee-session')
        .expect(200);

      // Approve timesheet
      await request(app)
        .patch(`/api/time/timesheets/${timesheetId}/approve`)
        .set('Cookie', 'session=manager-session')
        .expect(200);

      // Lock for payroll
      await request(app)
        .patch(`/api/time/timesheets/${timesheetId}/lock`)
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      // Retrieve audit trail
      const auditResponse = await request(app)
        .get(`/api/time/audit-trail/timesheets/${timesheetId}`)
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      expect(auditResponse.body.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event_type: 'timesheet_submitted',
            actor_id: expect.any(Number),
            timestamp: expect.any(String),
            changes: expect.objectContaining({
              old_status: 'draft',
              new_status: 'submitted'
            })
          }),
          expect.objectContaining({
            event_type: 'timesheet_approved',
            actor_id: expect.any(Number),
            changes: expect.objectContaining({
              old_status: 'submitted',
              new_status: 'approved'
            })
          }),
          expect.objectContaining({
            event_type: 'timesheet_locked',
            actor_id: expect.any(Number),
            changes: expect.objectContaining({
              old_status: 'approved',
              new_status: 'locked'
            })
          })
        ])
      );

      // Verify audit records are immutable
      const modifyAuditResponse = await request(app)
        .patch(`/api/time/audit-trail/${auditResponse.body.events[0].id}`)
        .send({ event_type: 'modified' })
        .set('Cookie', `session=${adminSession}`)
        .expect(403);

      expect(modifyAuditResponse.body.error).toContain('Audit records are immutable');
    });

    test('Failed authentication attempts are logged', async () => {
      // Attempt login with wrong credentials
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'attacker@evil.com',
          password: 'wrongpassword'
        })
        .expect(401);

      // Multiple failed attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'adam.green@lateraleng.com',
            password: `attempt${i}`
          })
          .expect(401);
      }

      // Check security audit log
      const auditResponse = await request(app)
        .get('/api/security/audit-log?type=failed_login&limit=10')
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      expect(auditResponse.body.events).toContainEqual(
        expect.objectContaining({
          event_type: 'failed_login',
          email: 'attacker@evil.com',
          ip_address: expect.any(String),
          user_agent: expect.any(String)
        })
      );

      // Check for rate limiting after multiple failures
      const rateLimitedResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'adam.green@lateraleng.com',
          password: 'anotherAttempt'
        })
        .expect(429);

      expect(rateLimitedResponse.body.error).toContain('Too many failed attempts');
    });
  });

  describe('Regulatory Compliance', () => {
    test('FLSA overtime calculations are accurate', async () => {
      const testCases = [
        {
          hours: 35,
          expected: { regular: 35, overtime: 0 }
        },
        {
          hours: 40,
          expected: { regular: 40, overtime: 0 }
        },
        {
          hours: 45,
          expected: { regular: 40, overtime: 5 }
        },
        {
          hours: 60,
          expected: { regular: 40, overtime: 20 }
        }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/time/calculate-overtime')
          .send({
            totalHours: testCase.hours,
            employeeType: 'non-exempt'
          })
          .set('Cookie', `session=${adminSession}`)
          .expect(200);

        expect(response.body).toMatchObject({
          regular_hours: testCase.expected.regular,
          overtime_hours: testCase.expected.overtime,
          overtime_rate: 1.5
        });
      }
    });

    test('State-specific labor law compliance', async () => {
      const states = [
        { code: 'CA', maxShiftWithoutMeal: 5 },
        { code: 'NY', maxShiftWithoutMeal: 6 },
        { code: 'TX', maxShiftWithoutMeal: 0 } // No requirement
      ];

      for (const state of states) {
        const response = await request(app)
          .get(`/api/time/compliance-rules/${state.code}`)
          .set('Cookie', `session=${adminSession}`)
          .expect(200);

        if (state.maxShiftWithoutMeal > 0) {
          expect(response.body.rules).toContainEqual(
            expect.objectContaining({
              type: 'meal_break_required',
              after_hours: state.maxShiftWithoutMeal
            })
          );
        }
      }
    });

    test('Minor employee work restrictions enforced', async () => {
      const minorEmployeeId = 500;
      
      // Set employee as minor
      await request(app)
        .patch(`/api/employees/${minorEmployeeId}`)
        .send({
          birthDate: new Date(Date.now() - 16 * 365 * 24 * 60 * 60 * 1000) // 16 years old
        })
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      // Attempt to clock in during school hours
      const schoolHourResponse = await request(app)
        .post('/api/time/clock-in')
        .send({
          employeeId: minorEmployeeId,
          timestamp: '2024-11-14T10:00:00Z' // Thursday 10 AM
        })
        .set('Cookie', 'session=employee-session')
        .expect(403);

      expect(schoolHourResponse.body.error).toContain('Minor employees cannot work during school hours');

      // Attempt to work past curfew
      const curfewResponse = await request(app)
        .post('/api/time/clock-in')
        .send({
          employeeId: minorEmployeeId,
          timestamp: '2024-11-14T22:00:00Z' // 10 PM
        })
        .set('Cookie', 'session=employee-session')
        .expect(403);

      expect(curfewResponse.body.error).toContain('Minor employees cannot work past');
    });
  });

  describe('Data Integrity', () => {
    test('Timesheet modifications preserve original values', async () => {
      const timesheetId = 600;
      const originalHours = 8.0;
      
      // Create timesheet
      const createResponse = await request(app)
        .post('/api/time/timesheets')
        .send({
          employeeId: 601,
          date: '2024-11-14',
          regular_hours: originalHours
        })
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      // Manager adjusts hours
      const adjustResponse = await request(app)
        .patch(`/api/time/timesheets/${timesheetId}/adjust`)
        .send({
          regular_hours: 8.5,
          reason: 'Missed 30min clock-out, verified with security footage'
        })
        .set('Cookie', 'session=manager-session')
        .expect(200);

      // Verify both values are preserved
      const verifyResponse = await request(app)
        .get(`/api/time/timesheets/${timesheetId}`)
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      expect(verifyResponse.body).toMatchObject({
        regular_hours: 8.5,
        original_regular_hours: originalHours,
        adjustment_reason: 'Missed 30min clock-out, verified with security footage',
        adjusted_by: expect.any(Number),
        adjusted_at: expect.any(String)
      });
    });

    test('Payroll locks prevent retroactive changes', async () => {
      const periodId = 700;
      const timesheetId = 701;
      
      // Lock payroll period
      await request(app)
        .patch(`/api/time/payroll-periods/${periodId}/lock`)
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      // Attempt to modify timesheet in locked period
      const modifyResponse = await request(app)
        .patch(`/api/time/timesheets/${timesheetId}`)
        .send({
          regular_hours: 10
        })
        .set('Cookie', `session=${adminSession}`)
        .expect(403);

      expect(modifyResponse.body.error).toContain('Cannot modify timesheet in locked period');

      // Verify unlock requires special permission
      const unlockResponse = await request(app)
        .patch(`/api/time/payroll-periods/${periodId}/unlock`)
        .send({
          reason: 'Correction needed',
          override_code: 'INVALID'
        })
        .set('Cookie', 'session=manager-session')
        .expect(403);

      expect(unlockResponse.body.error).toContain('Insufficient permissions to unlock');
    });
  });

  describe('Session Security', () => {
    test('Sessions expire after inactivity', async () => {
      const sessionToken = 'test-session-123';
      
      // Create session
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@lateraleng.com',
          password: 'ValidPassword123!'
        })
        .expect(200);

      // Simulate 31 minutes of inactivity (session timeout is 30 min)
      const futureTime = new Date(Date.now() + 31 * 60 * 1000);
      jest.setSystemTime(futureTime);

      // Attempt to use expired session
      const expiredResponse = await request(app)
        .get('/api/time/clock-status')
        .set('Cookie', `session=${sessionToken}`)
        .expect(401);

      expect(expiredResponse.body.error).toContain('Session expired');

      jest.useRealTimers();
    });

    test('Concurrent session limits enforced', async () => {
      const email = 'adam.green@lateraleng.com';
      
      // First login
      const firstLogin = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'ValidPassword123!' })
        .expect(200);

      const firstSession = firstLogin.headers['set-cookie'][0];

      // Second login
      const secondLogin = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'ValidPassword123!' })
        .expect(200);

      const secondSession = secondLogin.headers['set-cookie'][0];

      // Third login (exceeds limit of 2)
      const thirdLogin = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'ValidPassword123!' })
        .expect(200);

      // First session should be invalidated
      const firstSessionTest = await request(app)
        .get('/api/time/clock-status')
        .set('Cookie', firstSession)
        .expect(401);

      expect(firstSessionTest.body.error).toContain('Session invalidated');

      // Second session should still work
      const secondSessionTest = await request(app)
        .get('/api/time/clock-status')
        .set('Cookie', secondSession)
        .expect(200);
    });
  });

  describe('XSS and Injection Prevention', () => {
    test('Input sanitization prevents XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '"><script>alert(1)</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/time/timesheets/note')
          .send({
            timesheetId: 800,
            note: payload
          })
          .set('Cookie', `session=${adminSession}`)
          .expect(200);

        // Verify payload is sanitized
        const verifyResponse = await request(app)
          .get('/api/time/timesheets/800/notes')
          .set('Cookie', `session=${adminSession}`)
          .expect(200);

        expect(verifyResponse.body.notes[0].content).not.toContain('<script>');
        expect(verifyResponse.body.notes[0].content).not.toContain('javascript:');
        expect(verifyResponse.body.notes[0].content).not.toContain('onerror=');
      }
    });

    test('SQL injection attempts are blocked', async () => {
      const sqlPayloads = [
        "1' OR '1'='1",
        "1; DROP TABLE timesheets; --",
        "1' UNION SELECT * FROM users --"
      ];

      for (const payload of sqlPayloads) {
        const response = await request(app)
          .get(`/api/time/timesheets/${payload}`)
          .set('Cookie', `session=${adminSession}`)
          .expect(400);

        expect(response.body.error).toContain('Invalid timesheet ID');
      }
    });
  });

  describe('Rate Limiting', () => {
    test('API rate limits prevent abuse', async () => {
      const endpoint = '/api/time/clock-status';
      const requests = [];

      // Send 100 requests rapidly
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app)
            .get(endpoint)
            .set('Cookie', `session=${adminSession}`)
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      // Should hit rate limit after certain threshold
      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0].body).toMatchObject({
        error: 'Too many requests',
        retryAfter: expect.any(Number)
      });
    });
  });
});

export {};