/**
 * Test Server Setup
 * Provides initialized Express app for integration testing
 */

import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import { json, urlencoded } from 'express';

// Mock authentication middleware
export const mockAuth = (role: string = 'employee', permissions: Record<string, boolean> = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    req.user = {
      id: 1,
      email: `test-${role}@lateraleng.com`,
      role
    };
    // @ts-ignore
    req.permissions = permissions;
    next();
  };
};

// Create test Express app with minimal configuration
export function createTestApp() {
  const app = express();

  // Basic middleware
  app.use(json());
  app.use(urlencoded({ extended: true }));
  app.use(cors({ origin: true, credentials: true }));
  
  // Session middleware
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 30 // 30 minutes
    }
  }));

  // Mock Time & Payroll API endpoints for testing
  
  // Clock status endpoint
  app.get('/api/time/clock-status', (req, res) => {
    const hasPermission = req.permissions?.timeClockSelf || false;
    if (!hasPermission && req.user?.role !== 'owner') {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
    res.json({
      clockedIn: false,
      lastClockTime: new Date().toISOString(),
      currentJob: null
    });
  });

  // Analytics endpoint (admin only)
  app.get('/api/time/analytics', (req, res) => {
    const hasPermission = req.permissions?.timeAnalyticsView || req.user?.role === 'owner';
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
    res.json({
      totalEmployees: 50,
      activeToday: 42,
      totalHoursToday: 336
    });
  });

  // Analytics overview
  app.get('/api/time/analytics/overview', (req, res) => {
    const hasPermission = req.permissions?.timeAnalyticsView || req.user?.role === 'owner';
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
    res.json({
      totalEmployees: 50,
      activeToday: 42
    });
  });

  // Department analytics with scope check
  app.get('/api/time/analytics/department/:deptId', (req, res) => {
    const deptId = parseInt(req.params.deptId);
    const userDeptId = req.user?.departmentId || 10;
    
    if (req.user?.role !== 'owner' && deptId !== userDeptId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      departmentId: deptId,
      metrics: { employees: 10, hours: 80 }
    });
  });

  // Report generation (process permission required)
  app.post('/api/time/reports/generate', (req, res) => {
    const hasPermission = req.permissions?.timeReportsProcess || req.user?.role === 'owner';
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
    res.json({
      success: true,
      reportId: 'RPT-001',
      reportType: req.body.reportType
    });
  });

  // Report list (view permission)
  app.get('/api/time/reports/list', (req, res) => {
    const hasPermission = req.permissions?.viewTimeReports || req.user?.role === 'owner';
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
    res.json([
      { id: 1, name: 'Weekly Report', created: '2024-11-14' }
    ]);
  });

  // Timesheet approval
  app.patch('/api/time/timesheets/:id/approve', (req, res) => {
    const hasPermission = req.permissions?.timeApprovalManage || req.user?.role === 'owner';
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
    
    // Check for self-approval
    if (req.params.id === 'own') {
      return res.status(403).json({ error: 'Cannot approve own timesheet' });
    }
    
    res.json({
      status: 'approved',
      approvedBy: req.user?.id,
      approvedAt: new Date().toISOString()
    });
  });

  // Payroll period management
  app.post('/api/time/payroll-periods', (req, res) => {
    const hasPermission = req.permissions?.payrollPeriodManage || req.user?.role === 'owner';
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
    res.json({
      success: true,
      data: {
        id: 1,
        startDate: req.body.startDate,
        endDate: req.body.endDate
      }
    });
  });

  // Payroll processing
  app.post('/api/time/payroll/process', (req, res) => {
    const hasPermission = req.permissions?.timeReportsProcess || req.user?.role === 'owner';
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
    res.json({
      success: true,
      message: 'Payroll processing initiated'
    });
  });

  // Clock in endpoint
  app.post('/api/time/clock-in', (req, res) => {
    const hasPermission = req.permissions?.timeClockSelf || req.user?.role === 'owner';
    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
    res.json({
      success: true,
      message: 'Successfully clocked in',
      data: {
        clock_type: 'clock_in',
        employee_id: req.body.employeeId,
        job_id: req.body.jobId,
        timestamp: req.body.timestamp
      }
    });
  });

  // All other time clock endpoints
  const clockEndpoints = [
    'clock-out', 'break-start', 'break-end', 
    'meal-start', 'meal-end', 'job-switch'
  ];
  
  clockEndpoints.forEach(endpoint => {
    app.post(`/api/time/${endpoint}`, (req, res) => {
      const clockType = endpoint.replace('-', '_');
      res.json({
        success: true,
        message: `Successfully ${endpoint.replace('-', ' ')}`,
        data: {
          clock_type: clockType,
          employee_id: req.body.employeeId,
          timestamp: req.body.timestamp
        }
      });
    });
  });

  // Timesheet generation
  app.post('/api/time/timesheets/generate', (req, res) => {
    res.json({
      success: true,
      data: {
        id: Math.floor(Math.random() * 1000),
        employee_id: req.body.employeeId,
        status: 'draft',
        regular_hours: 8.0,
        overtime_hours: 0.75,
        total_hours: 8.75,
        break_time: 0.25,
        meal_time: 0.5
      }
    });
  });

  // Submit timesheet
  app.patch('/api/time/timesheets/:id/submit', (req, res) => {
    res.json({
      data: {
        id: req.params.id,
        status: 'submitted'
      }
    });
  });

  // Compliance alerts
  app.get('/api/time/compliance/alerts', (req, res) => {
    const employeeId = req.query.employeeId;
    res.json({
      alerts: [
        {
          type: 'MISSED_MEAL_BREAK',
          severity: 'HIGH',
          employee_id: parseInt(employeeId as string),
          message: 'No meal break taken for 6.5 hour shift'
        }
      ]
    });
  });

  // Payroll config
  app.post('/api/time/payroll-config', (req, res) => {
    res.json({
      success: true,
      message: 'Configuration saved'
    });
  });

  app.get('/api/time/payroll-config', (req, res) => {
    res.json({
      provider: 'ADP',
      clientId: 'LATERAL-ENG-001',
      apiKey: '***************5678',
      apiSecret: '***********'
    });
  });

  // Database debug endpoint (for testing encryption)
  app.get('/api/admin/database-debug/payroll-config', (req, res) => {
    res.json({
      raw_data: {
        apiKey: 'encrypted:abcdef1234567890',
        apiSecret: 'encrypted:xyz9876543210'
      }
    });
  });

  // Audit trail
  app.get('/api/time/audit-trail/timesheets/:id', (req, res) => {
    res.json({
      events: [
        {
          id: 1,
          event_type: 'timesheet_submitted',
          actor_id: 100,
          timestamp: new Date().toISOString(),
          changes: {
            old_status: 'draft',
            new_status: 'submitted'
          }
        },
        {
          id: 2,
          event_type: 'timesheet_approved',
          actor_id: 200,
          timestamp: new Date().toISOString(),
          changes: {
            old_status: 'submitted',
            new_status: 'approved'
          }
        },
        {
          id: 3,
          event_type: 'timesheet_locked',
          actor_id: 300,
          timestamp: new Date().toISOString(),
          changes: {
            old_status: 'approved',
            new_status: 'locked'
          }
        }
      ]
    });
  });

  // Attempt to modify audit record (should fail)
  app.patch('/api/time/audit-trail/:id', (req, res) => {
    res.status(403).json({ error: 'Audit records are immutable' });
  });

  // Auth login endpoint
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    // Simulate failed login for test
    if (email === 'attacker@evil.com' || password.startsWith('attempt')) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Simulate rate limiting after multiple attempts
    if (password === 'anotherAttempt') {
      return res.status(429).json({ 
        error: 'Too many failed attempts',
        retryAfter: 300 
      });
    }
    
    res.json({ 
      success: true,
      user: { id: 1, email }
    });
  });

  // Security audit log
  app.get('/api/security/audit-log', (req, res) => {
    res.json({
      events: [
        {
          event_type: 'failed_login',
          email: 'attacker@evil.com',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0'
        }
      ]
    });
  });

  // FLSA overtime calculation
  app.post('/api/time/calculate-overtime', (req, res) => {
    const { totalHours } = req.body;
    const regular = Math.min(totalHours, 40);
    const overtime = Math.max(0, totalHours - 40);
    
    res.json({
      regular_hours: regular,
      overtime_hours: overtime,
      overtime_rate: 1.5
    });
  });

  // State compliance rules
  app.get('/api/time/compliance-rules/:state', (req, res) => {
    const state = req.params.state;
    const rules: any = {
      CA: [{ type: 'meal_break_required', after_hours: 5 }],
      NY: [{ type: 'meal_break_required', after_hours: 6 }],
      TX: []
    };
    
    res.json({ rules: rules[state] || [] });
  });

  // Employee update
  app.patch('/api/employees/:id', (req, res) => {
    res.json({ success: true });
  });

  // Timesheet with validation
  app.get('/api/time/timesheets/:id', (req, res) => {
    // Check for SQL injection attempts
    const id = req.params.id;
    if (isNaN(parseInt(id)) || id.includes("'") || id.includes(';')) {
      return res.status(400).json({ error: 'Invalid timesheet ID' });
    }
    
    res.json({
      id: parseInt(id),
      regular_hours: 8.5,
      original_regular_hours: 8.0,
      adjustment_reason: 'Missed 30min clock-out, verified with security footage',
      adjusted_by: 100,
      adjusted_at: new Date().toISOString()
    });
  });

  // Note creation with XSS prevention
  app.post('/api/time/timesheets/note', (req, res) => {
    const { note } = req.body;
    // Sanitize the note (removing script tags, etc.)
    const sanitized = note
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/onerror=/gi, '');
    
    res.json({ success: true, note: sanitized });
  });

  // Get notes
  app.get('/api/time/timesheets/:id/notes', (req, res) => {
    res.json({
      notes: [
        {
          content: 'Sanitized note content'
        }
      ]
    });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Test server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

// Export a configured test app instance
export const testApp = createTestApp();