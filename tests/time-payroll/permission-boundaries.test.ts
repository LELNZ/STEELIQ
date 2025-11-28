/**
 * Fortune 50 RBAC Permission Boundary Tests
 * Tests to ensure proper separation of duties and prevent privilege escalation
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'wouter';
import '@testing-library/jest-dom';
import { createTestApp, mockAuth } from '../helpers/test-server';
import type { Express } from 'express';

// Mock the auth context
const mockAuthContext = {
  user: null as any,
  permissions: {} as any,
  setUser: jest.fn(),
  logout: jest.fn(),
};

jest.mock('@/lib/auth', () => ({
  useAuth: () => mockAuthContext,
  hasPermission: (permission: string) => mockAuthContext.permissions[permission] || false,
}));

// Helper function to wrap components with providers
const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Fortune 50 RBAC Permission Boundary Tests', () => {
  let app: Express;
  
  beforeEach(() => {
    // Create fresh test app for each test
    app = createTestApp();
    jest.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Employee Access Control', () => {
    test('Employee can access time clock self-service', async () => {
      // Setup: Employee with only timeClockSelf permission
      app.use(mockAuth('operator', { timeClockSelf: true }));
      
      const response = await request(app)
        .get('/api/time/clock-status')
        .expect(200);

      expect(response.body).toHaveProperty('clockedIn');
      expect(response.body).toHaveProperty('lastClockTime');
    });

    test('Employee cannot access admin analytics dashboard', async () => {
      // Setup: Employee without timeAnalyticsView permission
      mockAuth.user = { 
        id: 1, 
        email: 'employee@test.com',
        role: 'operator' 
      };
      mockAuth.permissions = { timeClockSelf: true };

      const response = await request(app)
        .get('/api/time/analytics')
        .set('Cookie', 'session=employee-session')
        .expect(403);

      expect(response.body.error).toContain('Forbidden');
      expect(response.body.message).toContain('Insufficient permissions');
    });

    test('Employee cannot process payroll reports', async () => {
      // Setup: Employee without timeReportsProcess permission
      mockAuth.user = { 
        id: 1, 
        email: 'employee@test.com',
        role: 'operator' 
      };
      mockAuth.permissions = { timeClockSelf: true };

      const response = await request(app)
        .post('/api/time/reports/generate')
        .send({ reportType: 'payroll_summary' })
        .set('Cookie', 'session=employee-session')
        .expect(403);

      expect(response.body.error).toContain('Forbidden');
    });
  });

  describe('View vs Process Permission Separation', () => {
    test('View permission does not grant processing rights', async () => {
      // Setup: User with only view_time_reports permission
      mockAuth.user = { 
        id: 2, 
        email: 'viewer@test.com',
        role: 'custom' 
      };
      mockAuth.permissions = { 
        viewTimeReports: true,
        timeReportsProcess: false 
      };

      // Can view reports
      const viewResponse = await request(app)
        .get('/api/time/reports/list')
        .set('Cookie', 'session=viewer-session')
        .expect(200);

      // Cannot process/generate reports
      const processResponse = await request(app)
        .post('/api/time/reports/generate')
        .send({ reportType: 'payroll_summary' })
        .set('Cookie', 'session=viewer-session')
        .expect(403);

      expect(viewResponse.body).toBeInstanceOf(Array);
      expect(processResponse.body.error).toContain('Forbidden');
    });

    test('Analytics view permission does not grant payroll processing', async () => {
      // Setup: User with analytics view but not process
      mockAuth.user = { 
        id: 3, 
        email: 'analyst@test.com',
        role: 'custom' 
      };
      mockAuth.permissions = { 
        timeAnalyticsView: true,
        timeReportsProcess: false,
        payrollPeriodManage: false
      };

      // Can view analytics
      const analyticsResponse = await request(app)
        .get('/api/time/analytics/overview')
        .set('Cookie', 'session=analyst-session')
        .expect(200);

      // Cannot manage payroll periods
      const payrollResponse = await request(app)
        .post('/api/time/payroll-periods')
        .send({ startDate: '2024-01-01', endDate: '2024-01-14' })
        .set('Cookie', 'session=analyst-session')
        .expect(403);

      expect(analyticsResponse.body).toHaveProperty('totalEmployees');
      expect(payrollResponse.body.error).toContain('Forbidden');
    });
  });

  describe('Manager Approval Boundaries', () => {
    test('Manager can approve but not process payroll', async () => {
      // Setup: Manager with approval but not processing permissions
      mockAuth.user = { 
        id: 4, 
        email: 'manager@test.com',
        role: 'supervisor' 
      };
      mockAuth.permissions = { 
        timeApprovalView: true,
        timeApprovalManage: true,
        timeReportsProcess: false
      };

      // Can approve timesheets
      const approveResponse = await request(app)
        .patch('/api/time/timesheets/1/approve')
        .set('Cookie', 'session=manager-session')
        .expect(200);

      // Cannot process payroll
      const processResponse = await request(app)
        .post('/api/time/payroll/process')
        .send({ periodId: 1 })
        .set('Cookie', 'session=manager-session')
        .expect(403);

      expect(approveResponse.body.status).toBe('approved');
      expect(processResponse.body.error).toContain('Forbidden');
    });

    test('Manager cannot approve their own timesheet', async () => {
      // Setup: Manager attempting self-approval
      mockAuth.user = { 
        id: 5, 
        email: 'manager@test.com',
        role: 'supervisor' 
      };
      mockAuth.permissions = { 
        timeApprovalManage: true
      };

      const response = await request(app)
        .patch('/api/time/timesheets/own/approve')
        .set('Cookie', 'session=manager-session')
        .expect(403);

      expect(response.body.error).toContain('Cannot approve own timesheet');
    });
  });

  describe('Cross-Department Access Control', () => {
    test('Department manager can only view their department data', async () => {
      // Setup: Department manager with limited scope
      mockAuth.user = { 
        id: 6, 
        email: 'dept.manager@test.com',
        role: 'supervisor',
        departmentId: 10 
      };
      mockAuth.permissions = { 
        timeApprovalView: true,
        timeApprovalManage: true
      };

      // Can view own department
      const ownDeptResponse = await request(app)
        .get('/api/time/analytics/department/10')
        .set('Cookie', 'session=dept-manager-session')
        .expect(200);

      // Cannot view other department
      const otherDeptResponse = await request(app)
        .get('/api/time/analytics/department/20')
        .set('Cookie', 'session=dept-manager-session')
        .expect(403);

      expect(ownDeptResponse.body.departmentId).toBe(10);
      expect(otherDeptResponse.body.error).toContain('Access denied');
    });
  });

  describe('Business Owner Full Access', () => {
    test('Business Owner has complete Time & Payroll access', async () => {
      // Setup: Business Owner with all permissions
      mockAuth.user = { 
        id: 7, 
        email: 'adam.green@lateraleng.com',
        role: 'owner' 
      };
      mockAuth.permissions = { 
        timeClockSelf: true,
        timeClockManage: true,
        timeApprovalView: true,
        timeApprovalManage: true,
        timeAnalyticsView: true,
        timeReportsProcess: true,
        payrollPeriodManage: true
      };

      // Can access all three pages
      const clockResponse = await request(app)
        .get('/api/time/clock-status')
        .set('Cookie', 'session=owner-session')
        .expect(200);

      const analyticsResponse = await request(app)
        .get('/api/time/analytics')
        .set('Cookie', 'session=owner-session')
        .expect(200);

      const reportsResponse = await request(app)
        .get('/api/time/reports')
        .set('Cookie', 'session=owner-session')
        .expect(200);

      // Can perform all operations
      const processResponse = await request(app)
        .post('/api/time/payroll/process')
        .send({ periodId: 1 })
        .set('Cookie', 'session=owner-session')
        .expect(200);

      expect(clockResponse.body).toBeDefined();
      expect(analyticsResponse.body).toBeDefined();
      expect(reportsResponse.body).toBeDefined();
      expect(processResponse.body.success).toBe(true);
    });
  });

  describe('UI Component Visibility', () => {
    test('Admin components hidden from regular employees', async () => {
      const TimePayroll = require('@/pages/time-payroll').default;
      
      // Setup: Employee without admin permissions
      mockAuth.user = { 
        id: 8, 
        email: 'employee@test.com',
        role: 'operator' 
      };
      mockAuth.permissions = { timeClockSelf: true };

      renderWithProviders(<TimePayroll />);

      // Should see clock in/out button
      await waitFor(() => {
        expect(screen.getByText(/Clock In/i)).toBeInTheDocument();
      });

      // Should NOT see manager approval dashboard
      expect(screen.queryByText(/Manager Approval Dashboard/i)).not.toBeInTheDocument();
      
      // Should NOT see payroll period manager
      expect(screen.queryByText(/Payroll Period Manager/i)).not.toBeInTheDocument();
    });

    test('Manager sees approval dashboard but not payroll processing', async () => {
      const TimePayroll = require('@/pages/time-payroll').default;
      
      // Setup: Manager with approval permissions
      mockAuth.user = { 
        id: 9, 
        email: 'manager@test.com',
        role: 'supervisor' 
      };
      mockAuth.permissions = { 
        timeClockSelf: true,
        timeApprovalView: true,
        timeApprovalManage: true
      };

      renderWithProviders(<TimePayroll />);

      await waitFor(() => {
        // Should see approval dashboard
        expect(screen.getByText(/Manager Approval Dashboard/i)).toBeInTheDocument();
      });

      // Should NOT see payroll period manager
      expect(screen.queryByText(/Payroll Period Manager/i)).not.toBeInTheDocument();
    });
  });
});

export {};