import { ServiceAuthGuard, ServicePermissions } from "../utils/serviceAuthGuard";

/**
 * Permission metadata for TimesheetAggregationService and TimesheetReportService
 */
export const timesheetAggregationPermissions: ServicePermissions = ServiceAuthGuard.createPermissions([
  // Generate operations
  {
    methods: [
      'generateTimesheet',
      'generateTimesheetForPeriod',
      'generateBatchTimesheets',
      'aggregateTimeEntries'
    ],
    mode: 'any',
    permissions: ['manage_timesheets', 'process_payroll'],
    message: 'You do not have permission to generate timesheets'
  },
  
  // View operations
  {
    methods: [
      'getTimesheetByUserId',
      'getTimesheetsByPeriod',
      'getTimesheetSummary'
    ],
    mode: 'any',
    permissions: ['view_timesheets', 'manage_timesheets'],
    message: 'You do not have permission to view timesheets'
  },
  
  // Approval operations
  {
    methods: [
      'approveTimesheet',
      'rejectTimesheet',
      'submitForApproval'
    ],
    mode: 'single',
    permissions: ['approve_timesheets'],
    message: 'You do not have permission to approve timesheets'
  }
]);

export const timesheetReportPermissions: ServicePermissions = ServiceAuthGuard.createPermissions([
  // Report generation - users can generate their own reports
  {
    methods: [
      'generateTimesheetReport',
      'generateReportToken',
      'validateReportToken'
    ],
    mode: 'any',
    permissions: ['view_timesheets', 'manage_timesheets', 'manage_payroll'],
    message: 'You do not have permission to generate timesheet reports'
  },
  
  // Department reports - managers only
  {
    methods: ['generateDepartmentReports'],
    mode: 'single',
    permissions: ['manage_payroll'],
    message: 'Only payroll managers can generate department-wide reports'
  }
]);