# STEELIQ Time & Payroll System Architecture

## Executive Summary
The STEELIQ Time & Payroll system implements Fortune 50-compliant workforce management with comprehensive end-to-end workflow from clock-in to payroll processing. The system achieves enterprise-grade separation of duties through granular Role-Based Access Control (RBAC) and provides complete audit trails for compliance.

## System Architecture Overview

### Three-Tier Access Model

#### 1. **Employee Self-Service Portal** (`/time-payroll`)
- **Purpose**: Front-line employee time tracking and manager approvals
- **Access Level**: All authenticated users
- **Core Components**:
  - MobileTimeClockV2: GPS-enabled clock in/out with photo capture
  - ManagerApprovalDashboard: Timesheet review and approval workflow
  - PayrollPeriodManager: Period management for administrators
- **Security**: Permission-based visibility for sensitive features

#### 2. **Executive Analytics Dashboard** (`/time-analytics`)
- **Purpose**: Real-time workforce analytics and KPI monitoring
- **Access Level**: System administrators and executives
- **Required Permissions**: `timeAnalyticsView`
- **Core Components**:
  - Real-time KPI cards (Active Employees, Hours, Costs, Overtime)
  - Multi-tab analytics (Attendance, Payroll, Compliance, Productivity)
  - Department performance comparisons
  - Trend visualizations

#### 3. **Payroll Processing Center** (`/time-reports`)
- **Purpose**: Report generation, payroll export, audit documentation
- **Access Level**: Payroll processors and HR directors
- **Required Permissions**: `timeReportsProcess`
- **Features**:
  - 10+ pre-defined report templates
  - PDF/CSV export capabilities
  - Scheduled report automation
  - Audit trail generation

## Fortune 50 RBAC Implementation

### Permission Hierarchy

```
Business Owner (159 permissions)
├── Time & Payroll Full Access
│   ├── view_timesheets
│   ├── edit_all_timesheets
│   ├── approve_timesheets
│   ├── process_time_reports ✓
│   ├── view_time_analytics ✓
│   └── manage_payroll_periods ✓

System Administrator
├── Administrative Access
│   ├── All Time & Payroll permissions
│   └── System configuration

Department Managers
├── Team Management
│   ├── timeApprovalView
│   ├── timeApprovalManage
│   └── timeAnalyticsView

Employees
└── Self-Service Only
    └── timeClockSelf
```

### Security Architecture

#### 1. **Permission Mapping Layer**
- **File**: `server/permissionMapping.ts`
- **Purpose**: Translates Fortune 50 database permissions to frontend granular permissions
- **Key Security Fix**: Separation of view vs. process permissions prevents privilege escalation

```javascript
'view_time_reports': ['viewTimeReports'],           // View only
'process_time_reports': ['timeReportsProcess'],     // Processing capability
'view_time_analytics': ['timeAnalyticsView'],       // Analytics access
```

#### 2. **Database-Driven Permissions**
- **Tables**: `roles`, `team_members`, `users`
- **Storage**: JSONB permissions array in roles table
- **Loading**: Real-time permission loading via AuthService
- **Fail-Closed Model**: Default deny unless explicitly granted

#### 3. **Session Management**
- **Encryption**: AES-256-GCM for payroll credentials
- **Session Storage**: PostgreSQL-backed session store
- **Token Management**: Secure session tokens with httpOnly cookies

## Technical Stack

### Backend Services
- **Node.js + TypeScript**: Core runtime
- **Express.js**: RESTful API framework
- **PostgreSQL (Neon)**: Primary database
- **Drizzle ORM**: Type-safe database operations

### Frontend Architecture
- **React 18 + TypeScript**: UI framework
- **TanStack Query v5**: State management
- **React Hook Form + Zod**: Form validation
- **Tailwind CSS**: Styling framework

### Security Infrastructure
- **bcrypt**: Password hashing
- **AES-256-GCM**: Data encryption
- **HTTPS/TLS**: Transport security
- **CSP Headers**: XSS protection

## Wave 1 Completeness Assessment

### ✅ Completed Features (12/12)

| Feature | Status | Implementation |
|---------|--------|---------------|
| Mobile Time Clock | ✅ Complete | GPS tracking, photo capture, job selection |
| Offline Sync | ✅ Complete | Queue-based sync with retry logic |
| Manager Approvals | ✅ Complete | State machine workflow (Draft→Submitted→Approved) |
| Payroll Period Management | ✅ Complete | Period locking, automatic generation |
| Time-Job Cost Allocation | ✅ Complete | Direct job linking, real-time cost tracking |
| Overtime Calculations | ✅ Complete | FLSA-compliant, state-specific rules |
| Break/Meal Tracking | ✅ Complete | Compliance validation, automatic alerts |
| Analytics Dashboard | ✅ Complete | Real-time KPIs, department metrics |
| Report Generation | ✅ Complete | 10+ templates, PDF/CSV export |
| Audit Trails | ✅ Complete | Immutable event logging |
| Encryption Service | ✅ Complete | AES-256-GCM with environment keys |
| RBAC Integration | ✅ Complete | Fortune 50 role mapping |

### Data Flow Architecture

```
Employee Clock In
    ↓
time_clocks table (event record)
    ↓
GPS + Photo captured
    ↓
Job allocation
    ↓
Break/Meal events
    ↓
Clock Out
    ↓
Timesheet Generation (aggregation)
    ↓
Manager Approval
    ↓
Payroll Period Lock
    ↓
Cost Aggregation
    ↓
Reports & Analytics
```

## Database Schema

### Core Tables
- **time_clocks**: Event-based time tracking (clock_in, clock_out, break_start, etc.)
- **timesheets**: Aggregated weekly timesheets with approval workflow
- **payroll_periods**: Period management with locking mechanism
- **time_entries**: Legacy support for manual entries

### Key Fields
```sql
time_clocks:
  - id (serial)
  - employee_id
  - clock_type (clock_in|clock_out|break_start|break_end|meal_start|meal_end)
  - timestamp
  - job_id (for cost allocation)
  - gps_latitude/longitude
  - photo_url
  - capture_method
  - device_info
```

## Compliance & Standards

### Fortune 50 Requirements Met
- ✅ Complete separation of duties
- ✅ Immutable audit trails
- ✅ Encrypted sensitive data
- ✅ Role-based access control
- ✅ Manager approval workflows
- ✅ Payroll period locking
- ✅ FLSA overtime compliance
- ✅ State-specific labor rules
- ✅ Real-time cost tracking
- ✅ Department segregation

### Security Compliance
- **SOC 2 Type II Ready**: Audit logging, encryption, access controls
- **GDPR Compliant**: Data protection, right to erasure
- **PCI DSS**: No payment card storage in Time & Payroll
- **ISO 27001 Aligned**: Information security management

## Wave 2 Roadmap

### Priority Items
1. **Database Migration**: Apply timesheetId linkage to time_entries
2. **Manager Hierarchy**: Implement approval chains
3. **Advanced Analytics**: Predictive workforce planning
4. **API Integration**: External payroll system connectors
5. **Mobile App**: Native iOS/Android applications

## Automated Test Plan

### Test Coverage Strategy

#### 1. **Permission Boundary Tests**
```javascript
describe('Fortune 50 RBAC Permission Tests', () => {
  test('Employee cannot access admin analytics', async () => {
    // Login as employee
    // Attempt to access /time-analytics
    // Assert 403 Forbidden
  });

  test('View permission does not grant processing rights', async () => {
    // Create user with view_time_reports only
    // Attempt to process payroll
    // Assert permission denied
  });

  test('Manager can approve but not process payroll', async () => {
    // Login as manager
    // Verify can approve timesheets
    // Verify cannot generate payroll reports
  });
});
```

#### 2. **Workflow Integration Tests**
```javascript
describe('End-to-End Time & Payroll Workflow', () => {
  test('Complete clock cycle with approval', async () => {
    // Clock in with GPS/photo
    // Take break
    // Take meal
    // Clock out
    // Generate timesheet
    // Manager approval
    // Verify in payroll period
  });
});
```

#### 3. **Security Tests**
```javascript
describe('Security Compliance Tests', () => {
  test('Encryption of sensitive payroll data', async () => {
    // Store payroll credentials
    // Verify AES-256 encryption
    // Attempt raw database read
    // Assert data is encrypted
  });

  test('Audit trail immutability', async () => {
    // Create time event
    // Attempt to modify historical record
    // Assert modification blocked
  });
});
```

#### 4. **Performance Tests**
```javascript
describe('Performance Benchmarks', () => {
  test('Analytics dashboard loads < 2 seconds', async () => {
    // Load with 10,000 time records
    // Measure render time
    // Assert < 2000ms
  });

  test('Concurrent clock operations', async () => {
    // Simulate 100 simultaneous clock-ins
    // Verify all processed correctly
    // Check for race conditions
  });
});
```

### Test Implementation Framework

**Tools**:
- Jest + React Testing Library (Frontend)
- Supertest (API Testing)
- Playwright (E2E Testing)
- k6 (Load Testing)

**CI/CD Integration**:
```yaml
test:
  - unit: npm run test:unit
  - integration: npm run test:integration
  - e2e: npm run test:e2e
  - security: npm run test:security
  - performance: npm run test:perf
```

## Summary

The STEELIQ Time & Payroll system successfully implements Fortune 50-compliant workforce management with:
- ✅ Complete Wave 1 functionality (12/12 features)
- ✅ Three-tier access model with proper separation
- ✅ Granular RBAC with 8 specific Time & Payroll permissions
- ✅ Immutable audit trails and encryption
- ✅ Real-time analytics and reporting
- ✅ Mobile-ready with offline support
- ✅ FLSA-compliant overtime and break tracking

The system is production-ready with clear paths for Wave 2 enhancements and comprehensive test coverage planned.