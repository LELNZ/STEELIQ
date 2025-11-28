/**
 * End-to-End Time & Payroll Workflow Integration Tests
 * Tests the complete workflow from clock-in to payroll processing
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { createTestApp, mockAuth } from '../helpers/test-server';
import type { Express } from 'express';

describe('End-to-End Time & Payroll Workflow', () => {
  let app: Express;
  let timesheetId: number;
  let payrollPeriodId: number;

  beforeEach(async () => {
    // Create fresh test app for each test
    app = createTestApp();
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Clock Cycle with Approval', () => {
    test('Full workflow: Clock in → Break → Meal → Clock out → Approval', async () => {
      const employeeId = 100;
      const jobId = 50;
      const startTime = new Date('2024-11-14T08:00:00Z');
      
      // Setup employee permissions
      app.use(mockAuth('operator', { timeClockSelf: true }));
      
      // Step 1: Employee clocks in with GPS and photo
      const clockInResponse = await request(app)
        .post('/api/time/clock-in')
        .send({
          employeeId,
          jobId,
          timestamp: startTime.toISOString(),
          gps_latitude: 37.7749,
          gps_longitude: -122.4194,
          photo_url: 'https://example.com/clock-photos/emp100_20241114_080000.jpg',
          capture_method: 'mobile_app',
          device_info: 'iPhone 14 Pro'
        })
        .expect(200);

      expect(clockInResponse.body).toMatchObject({
        success: true,
        message: 'Successfully clocked in',
        data: {
          clock_type: 'clock_in',
          employee_id: employeeId,
          job_id: jobId
        }
      });

      // Step 2: Employee takes a break
      const breakStartTime = new Date('2024-11-14T10:00:00Z');
      const breakStartResponse = await request(app)
        .post('/api/time/break-start')
        .send({
          employeeId,
          timestamp: breakStartTime.toISOString()
        })
        .expect(200);

      expect(breakStartResponse.body.data.clock_type).toBe('break_start');

      // Step 3: Employee ends break
      const breakEndTime = new Date('2024-11-14T10:15:00Z');
      const breakEndResponse = await request(app)
        .post('/api/time/break-end')
        .send({
          employeeId,
          timestamp: breakEndTime.toISOString()
        })
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      expect(breakEndResponse.body.data.clock_type).toBe('break_end');
      
      // Step 4: Employee takes meal break
      const mealStartTime = new Date('2024-11-14T12:00:00Z');
      const mealStartResponse = await request(app)
        .post('/api/time/meal-start')
        .send({
          employeeId,
          timestamp: mealStartTime.toISOString()
        })
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      expect(mealStartResponse.body.data.clock_type).toBe('meal_start');

      // Step 5: Employee ends meal break
      const mealEndTime = new Date('2024-11-14T12:30:00Z');
      const mealEndResponse = await request(app)
        .post('/api/time/meal-end')
        .send({
          employeeId,
          timestamp: mealEndTime.toISOString()
        })
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      expect(mealEndResponse.body.data.clock_type).toBe('meal_end');

      // Step 6: Employee clocks out
      const clockOutTime = new Date('2024-11-14T17:00:00Z');
      const clockOutResponse = await request(app)
        .post('/api/time/clock-out')
        .send({
          employeeId,
          timestamp: clockOutTime.toISOString(),
          gps_latitude: 37.7749,
          gps_longitude: -122.4194
        })
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      expect(clockOutResponse.body.data.clock_type).toBe('clock_out');

      // Step 7: System generates timesheet
      const weekStart = startOfWeek(new Date('2024-11-14'));
      const weekEnd = endOfWeek(new Date('2024-11-14'));
      
      const generateTimesheetResponse = await request(app)
        .post('/api/time/timesheets/generate')
        .send({
          employeeId,
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd, 'yyyy-MM-dd')
        })
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      timesheetId = generateTimesheetResponse.body.data.id;
      
      expect(generateTimesheetResponse.body.data).toMatchObject({
        employee_id: employeeId,
        status: 'draft',
        regular_hours: 8.0,  // 8 hours regular time
        overtime_hours: 0.75, // 45 minutes overtime (excluding breaks)
        total_hours: 8.75,
        break_time: 0.25,    // 15 minutes break
        meal_time: 0.5       // 30 minutes meal
      });

      // Step 8: Employee submits timesheet
      const submitResponse = await request(app)
        .patch(`/api/time/timesheets/${timesheetId}/submit`)
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      expect(submitResponse.body.data.status).toBe('submitted');

      // Step 9: Manager approves timesheet
      const approveResponse = await request(app)
        .patch(`/api/time/timesheets/${timesheetId}/approve`)
        .send({
          comments: 'Approved - all hours verified'
        })
        .set('Cookie', `session=${managerSession}`)
        .expect(200);

      expect(approveResponse.body.data).toMatchObject({
        status: 'approved',
        approved_by: expect.any(Number),
        approved_at: expect.any(String)
      });

      // Step 10: Verify in payroll period
      const payrollCheckResponse = await request(app)
        .get(`/api/time/payroll-periods/current/timesheets`)
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      const approvedTimesheet = payrollCheckResponse.body.timesheets.find(
        (ts: any) => ts.id === timesheetId
      );

      expect(approvedTimesheet).toBeDefined();
      expect(approvedTimesheet.status).toBe('approved');
      expect(approvedTimesheet.includedInPayroll).toBe(true);
    });

    test('Overtime calculation follows FLSA compliance', async () => {
      const employeeId = 101;
      const longShiftStart = new Date('2024-11-14T06:00:00Z');
      const longShiftEnd = new Date('2024-11-14T18:30:00Z'); // 12.5 hours
      
      // Clock in early morning
      await request(app)
        .post('/api/time/clock-in')
        .send({
          employeeId,
          timestamp: longShiftStart.toISOString(),
          jobId: 51
        })
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      // Clock out late evening
      await request(app)
        .post('/api/time/clock-out')
        .send({
          employeeId,
          timestamp: longShiftEnd.toISOString()
        })
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      // Generate timesheet
      const timesheetResponse = await request(app)
        .post('/api/time/timesheets/generate')
        .send({
          employeeId,
          date: '2024-11-14'
        })
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      // Verify FLSA overtime calculation
      expect(timesheetResponse.body.data).toMatchObject({
        regular_hours: 8.0,    // First 8 hours
        overtime_hours: 4.5,    // Hours over 8 at 1.5x rate
        total_hours: 12.5,
        overtime_rate_multiplier: 1.5
      });
    });
  });

  describe('Multi-Job Cost Allocation', () => {
    test('Time correctly allocated across multiple jobs', async () => {
      const employeeId = 102;
      
      // Work on Job A
      await request(app)
        .post('/api/time/clock-in')
        .send({
          employeeId,
          jobId: 60,
          timestamp: '2024-11-14T08:00:00Z'
        })
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      // Switch to Job B
      await request(app)
        .post('/api/time/job-switch')
        .send({
          employeeId,
          fromJobId: 60,
          toJobId: 61,
          timestamp: '2024-11-14T12:00:00Z'
        })
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      // Clock out from Job B
      await request(app)
        .post('/api/time/clock-out')
        .send({
          employeeId,
          timestamp: '2024-11-14T17:00:00Z'
        })
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      // Verify job allocation
      const allocationResponse = await request(app)
        .get(`/api/time/job-allocation/${employeeId}?date=2024-11-14`)
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      expect(allocationResponse.body.allocations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            job_id: 60,
            hours: 4.0,
            cost: expect.any(Number)
          }),
          expect.objectContaining({
            job_id: 61,
            hours: 5.0,
            cost: expect.any(Number)
          })
        ])
      );

      expect(allocationResponse.body.total_hours).toBe(9.0);
    });
  });

  describe('Payroll Period Management', () => {
    test('Payroll period locks after processing', async () => {
      // Create payroll period
      const createPeriodResponse = await request(app)
        .post('/api/time/payroll-periods')
        .send({
          startDate: '2024-11-11',
          endDate: '2024-11-17',
          name: 'Week 46 - 2024'
        })
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      payrollPeriodId = createPeriodResponse.body.data.id;

      // Process payroll for period
      const processResponse = await request(app)
        .post(`/api/time/payroll-periods/${payrollPeriodId}/process`)
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      expect(processResponse.body.data.status).toBe('processing');

      // Complete processing
      const completeResponse = await request(app)
        .patch(`/api/time/payroll-periods/${payrollPeriodId}/complete`)
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      expect(completeResponse.body.data).toMatchObject({
        status: 'locked',
        locked_at: expect.any(String),
        locked_by: expect.any(Number)
      });

      // Attempt to modify locked period (should fail)
      const modifyResponse = await request(app)
        .patch(`/api/time/payroll-periods/${payrollPeriodId}`)
        .send({
          endDate: '2024-11-18'
        })
        .set('Cookie', `session=${adminSession}`)
        .expect(403);

      expect(modifyResponse.body.error).toContain('Period is locked');
    });
  });

  describe('Break Compliance Validation', () => {
    test('System alerts on missed meal breaks', async () => {
      const employeeId = 103;
      
      // Clock in for 6+ hour shift without meal break
      await request(app)
        .post('/api/time/clock-in')
        .send({
          employeeId,
          timestamp: '2024-11-14T08:00:00Z'
        })
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      // Clock out after 6 hours (no meal break taken)
      await request(app)
        .post('/api/time/clock-out')
        .send({
          employeeId,
          timestamp: '2024-11-14T14:30:00Z'
        })
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      // Check compliance alerts
      const complianceResponse = await request(app)
        .get(`/api/time/compliance/alerts?employeeId=${employeeId}&date=2024-11-14`)
        .set('Cookie', `session=${managerSession}`)
        .expect(200);

      expect(complianceResponse.body.alerts).toContainEqual(
        expect.objectContaining({
          type: 'MISSED_MEAL_BREAK',
          severity: 'HIGH',
          employee_id: employeeId,
          message: expect.stringContaining('No meal break taken for 6.5 hour shift')
        })
      );
    });

    test('Automatic break deduction for state compliance', async () => {
      const employeeId = 104;
      const stateCode = 'CA'; // California has strict break rules
      
      // Set employee state
      await request(app)
        .patch(`/api/employees/${employeeId}`)
        .send({ state: stateCode })
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      // Clock full day without breaks
      await request(app)
        .post('/api/time/clock-in')
        .send({
          employeeId,
          timestamp: '2024-11-14T08:00:00Z'
        })
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      await request(app)
        .post('/api/time/clock-out')
        .send({
          employeeId,
          timestamp: '2024-11-14T17:00:00Z'
        })
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      // Generate timesheet with auto-deduction
      const timesheetResponse = await request(app)
        .post('/api/time/timesheets/generate')
        .send({
          employeeId,
          date: '2024-11-14',
          applyStateRules: true
        })
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      // California requires 30min meal + 2x10min breaks for 8+ hour shift
      expect(timesheetResponse.body.data).toMatchObject({
        gross_hours: 9.0,
        meal_deduction: 0.5,    // 30 minutes
        break_deduction: 0.33,  // 20 minutes (2x10min)
        net_hours: 8.17,
        compliance_notes: expect.stringContaining('CA state rules applied')
      });
    });
  });

  describe('Offline Sync Recovery', () => {
    test('Queued offline punches sync correctly', async () => {
      const employeeId = 105;
      const offlinePunches = [
        {
          clock_type: 'clock_in',
          timestamp: '2024-11-14T08:00:00Z',
          offline_id: 'offline-001',
          jobId: 70
        },
        {
          clock_type: 'break_start',
          timestamp: '2024-11-14T10:00:00Z',
          offline_id: 'offline-002'
        },
        {
          clock_type: 'break_end',
          timestamp: '2024-11-14T10:15:00Z',
          offline_id: 'offline-003'
        },
        {
          clock_type: 'clock_out',
          timestamp: '2024-11-14T17:00:00Z',
          offline_id: 'offline-004'
        }
      ];

      // Sync offline punches
      const syncResponse = await request(app)
        .post('/api/time/sync-offline')
        .send({
          employeeId,
          punches: offlinePunches
        })
        .set('Cookie', `session=${employeeSession}`)
        .expect(200);

      expect(syncResponse.body).toMatchObject({
        success: true,
        synced: 4,
        failed: 0,
        results: expect.arrayContaining([
          expect.objectContaining({
            offline_id: 'offline-001',
            status: 'synced'
          })
        ])
      });

      // Verify punches in database
      const verifyResponse = await request(app)
        .get(`/api/time/events/${employeeId}?date=2024-11-14`)
        .set('Cookie', `session=${adminSession}`)
        .expect(200);

      expect(verifyResponse.body.events).toHaveLength(4);
      expect(verifyResponse.body.events[0].sync_source).toBe('offline');
    });
  });
});

export {};