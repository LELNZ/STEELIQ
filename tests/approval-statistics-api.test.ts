/**
 * Fortune 50 Approval Statistics API Tests
 * Tests RBAC, aggregations, trends, and department breakdowns
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../server/index';
import { db } from '../server/db';
import { users, employees, timesheets, departments } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

describe('Fortune 50 Approval Statistics API Tests', () => {
  let managerUserId: number;
  let supervisorUserId: number;
  let employeeUserId: number;
  let testDepartmentId: number;
  let managerCookie: string;
  let supervisorCookie: string;
  let employeeCookie: string;

  beforeAll(async () => {
    // Create test department
    const [dept] = await db.insert(departments).values({
      name: 'Test Department',
      code: 'TEST-DEPT',
      description: 'Test department for approval stats',
      managerId: null,
      status: 'active',
      createdAt: new Date()
    }).returning();
    testDepartmentId = dept.id;

    // Create test users with different roles
    const hashedPassword = await bcrypt.hash('test123', 10);

    const [manager] = await db.insert(users).values({
      username: 'test_manager',
      email: 'manager.test@lateraleng.com',
      password: hashedPassword,
      role: 'manager',
      department: 'Test Department'
    }).returning();
    managerUserId = manager.id;

    const [supervisor] = await db.insert(users).values({
      username: 'test_supervisor',
      email: 'supervisor.test@lateraleng.com',
      password: hashedPassword,
      role: 'supervisor',
      department: 'Test Department'
    }).returning();
    supervisorUserId = supervisor.id;

    const [employee] = await db.insert(users).values({
      username: 'test_employee',
      email: 'employee.test@lateraleng.com',
      password: hashedPassword,
      role: 'employee',
      department: 'Test Department'
    }).returning();
    employeeUserId = employee.id;

    // Create test employees
    for (const userId of [managerUserId, supervisorUserId, employeeUserId]) {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      await db.insert(employees).values({
        userId,
        firstName: user[0].username,
        lastName: 'Test',
        email: user[0].email,
        phone: '555-0100',
        position: user[0].role,
        department: 'Test Department',
        departmentId: testDepartmentId,
        employeeId: `EMP-${userId}`,
        startDate: new Date(),
        status: 'active',
        isActive: true,
        hourlyRate: 50,
        overtimeRate: 75,
        employmentType: 'full-time'
      });
    }

    // Create test timesheets with various statuses
    const now = new Date();
    const statuses: Array<'draft' | 'submitted' | 'approved' | 'rejected'> = 
      ['draft', 'submitted', 'approved', 'rejected'];
    
    for (let week = 0; week < 12; week++) {
      for (let emp = 0; emp < 3; emp++) {
        const weekEnding = new Date(now);
        weekEnding.setDate(weekEnding.getDate() - (week * 7));
        
        const empUser = [employeeUserId, supervisorUserId, managerUserId][emp];
        const [employee] = await db.select().from(employees)
          .where(eq(employees.userId, empUser)).limit(1);

        await db.insert(timesheets).values({
          employeeId: employee.id,
          weekEnding,
          totalHours: 40 + Math.random() * 10,
          regularHours: 40,
          overtimeHours: Math.random() * 10,
          status: statuses[week % 4],
          submittedAt: statuses[week % 4] !== 'draft' ? new Date() : null,
          approvedBy: statuses[week % 4] === 'approved' ? managerUserId : null,
          approvedAt: statuses[week % 4] === 'approved' ? new Date() : null,
          comments: `Test timesheet week ${week}`,
          createdAt: weekEnding,
          updatedAt: new Date(),
          signature: statuses[week % 4] !== 'draft' ? 'test-signature' : null
        });
      }
    }

    // Login and get session cookies
    const managerLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test_manager', password: 'test123' });
    managerCookie = managerLogin.headers['set-cookie'][0];

    const supervisorLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test_supervisor', password: 'test123' });
    supervisorCookie = supervisorLogin.headers['set-cookie'][0];

    const employeeLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test_employee', password: 'test123' });
    employeeCookie = employeeLogin.headers['set-cookie'][0];
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(timesheets)
      .where(eq(timesheets.employeeId, employeeUserId));
    await db.delete(employees)
      .where(eq(employees.userId, employeeUserId));
    await db.delete(users)
      .where(eq(users.id, employeeUserId));
    await db.delete(users)
      .where(eq(users.id, supervisorUserId));
    await db.delete(users)
      .where(eq(users.id, managerUserId));
    await db.delete(departments)
      .where(eq(departments.id, testDepartmentId));
  });

  describe('RBAC Tests', () => {
    it('should allow managers to access approval stats', async () => {
      const response = await request(app)
        .get('/api/time/approval-stats')
        .set('Cookie', managerCookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('weeklyTrends');
      expect(response.body).toHaveProperty('monthlyTrends');
      expect(response.body).toHaveProperty('departmentBreakdown');
    });

    it('should allow supervisors to access approval stats', async () => {
      const response = await request(app)
        .get('/api/time/approval-stats')
        .set('Cookie', supervisorCookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('summary');
    });

    it('should deny regular employees access to approval stats', async () => {
      const response = await request(app)
        .get('/api/time/approval-stats')
        .set('Cookie', employeeCookie);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('permission');
    });

    it('should deny unauthenticated access', async () => {
      const response = await request(app)
        .get('/api/time/approval-stats');

      expect(response.status).toBe(401);
    });
  });

  describe('Aggregation Tests', () => {
    it('should return correct summary statistics', async () => {
      const response = await request(app)
        .get('/api/time/approval-stats')
        .set('Cookie', managerCookie);

      expect(response.status).toBe(200);
      
      const { summary } = response.body;
      expect(summary).toHaveProperty('totalTimesheets');
      expect(summary).toHaveProperty('pendingApprovals');
      expect(summary).toHaveProperty('approvedThisWeek');
      expect(summary).toHaveProperty('rejectedThisWeek');
      expect(summary).toHaveProperty('approvalRate');
      expect(summary).toHaveProperty('averageApprovalTime');
      
      // Validate data types
      expect(typeof summary.totalTimesheets).toBe('number');
      expect(typeof summary.approvalRate).toBe('number');
      expect(summary.approvalRate).toBeGreaterThanOrEqual(0);
      expect(summary.approvalRate).toBeLessThanOrEqual(100);
    });

    it('should calculate weekly trends correctly', async () => {
      const response = await request(app)
        .get('/api/time/approval-stats')
        .set('Cookie', managerCookie);

      const { weeklyTrends } = response.body;
      expect(Array.isArray(weeklyTrends)).toBe(true);
      expect(weeklyTrends.length).toBeLessThanOrEqual(8); // Last 8 weeks

      if (weeklyTrends.length > 0) {
        const week = weeklyTrends[0];
        expect(week).toHaveProperty('weekEnding');
        expect(week).toHaveProperty('submitted');
        expect(week).toHaveProperty('approved');
        expect(week).toHaveProperty('rejected');
        
        // Validate date format
        expect(new Date(week.weekEnding)).toBeInstanceOf(Date);
      }
    });

    it('should calculate monthly trends correctly', async () => {
      const response = await request(app)
        .get('/api/time/approval-stats')
        .set('Cookie', managerCookie);

      const { monthlyTrends } = response.body;
      expect(Array.isArray(monthlyTrends)).toBe(true);
      expect(monthlyTrends.length).toBeLessThanOrEqual(6); // Last 6 months

      if (monthlyTrends.length > 0) {
        const month = monthlyTrends[0];
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('submitted');
        expect(month).toHaveProperty('approved');
        expect(month).toHaveProperty('rejected');
        
        // Validate month format (YYYY-MM)
        expect(month.month).toMatch(/^\d{4}-\d{2}$/);
      }
    });
  });

  describe('Department Breakdown Tests', () => {
    it('should return department statistics with names', async () => {
      const response = await request(app)
        .get('/api/time/approval-stats')
        .set('Cookie', managerCookie);

      const { departmentBreakdown } = response.body;
      expect(Array.isArray(departmentBreakdown)).toBe(true);

      const testDept = departmentBreakdown.find(d => 
        d.departmentName === 'Test Department'
      );

      if (testDept) {
        expect(testDept).toHaveProperty('departmentId');
        expect(testDept).toHaveProperty('departmentName');
        expect(testDept).toHaveProperty('totalEmployees');
        expect(testDept).toHaveProperty('pendingApprovals');
        expect(testDept).toHaveProperty('approvedThisWeek');
        expect(testDept).toHaveProperty('complianceRate');
        
        expect(testDept.departmentName).toBe('Test Department');
        expect(typeof testDept.totalEmployees).toBe('number');
        expect(typeof testDept.complianceRate).toBe('number');
      }
    });

    it('should handle departments without timesheets', async () => {
      // Create a department with no timesheets
      const [emptyDept] = await db.insert(departments).values({
        name: 'Empty Department',
        code: 'EMPTY',
        description: 'Department with no timesheets',
        managerId: null,
        status: 'active',
        createdAt: new Date()
      }).returning();

      const response = await request(app)
        .get('/api/time/approval-stats')
        .set('Cookie', managerCookie);

      const { departmentBreakdown } = response.body;
      const emptyDeptStats = departmentBreakdown.find(d => 
        d.departmentName === 'Empty Department'
      );

      // May or may not be included depending on implementation
      if (emptyDeptStats) {
        expect(emptyDeptStats.pendingApprovals).toBe(0);
        expect(emptyDeptStats.approvedThisWeek).toBe(0);
      }

      // Clean up
      await db.delete(departments).where(eq(departments.id, emptyDept.id));
    });
  });

  describe('Performance Tests', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/time/approval-stats')
        .set('Cookie', managerCookie);

      const responseTime = Date.now() - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should handle concurrent requests', async () => {
      const requests = [];
      
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .get('/api/time/approval-stats')
            .set('Cookie', managerCookie)
        );
      }

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('summary');
      });
    });
  });

  describe('Edge Case Tests', () => {
    it('should handle empty date ranges gracefully', async () => {
      // Delete all timesheets temporarily
      const timesheetsBackup = await db.select().from(timesheets);
      await db.delete(timesheets);

      const response = await request(app)
        .get('/api/time/approval-stats')
        .set('Cookie', managerCookie);

      expect(response.status).toBe(200);
      expect(response.body.summary.totalTimesheets).toBe(0);
      expect(response.body.summary.pendingApprovals).toBe(0);
      expect(response.body.summary.approvalRate).toBe(0);

      // Restore timesheets
      if (timesheetsBackup.length > 0) {
        await db.insert(timesheets).values(timesheetsBackup);
      }
    });

    it('should calculate approval rate correctly with edge values', async () => {
      const response = await request(app)
        .get('/api/time/approval-stats')
        .set('Cookie', managerCookie);

      const { summary } = response.body;
      
      // Approval rate should be between 0 and 100
      expect(summary.approvalRate).toBeGreaterThanOrEqual(0);
      expect(summary.approvalRate).toBeLessThanOrEqual(100);

      // If there are no approved/rejected, rate should be 0
      if (summary.approvedThisWeek === 0 && summary.rejectedThisWeek === 0) {
        expect(summary.approvalRate).toBe(0);
      }
    });
  });
});