import { ServiceAuthGuard, ServicePermissions } from "../utils/serviceAuthGuard";

/**
 * Permission metadata for PayrollPeriodService
 */
export const payrollPeriodPermissions: ServicePermissions = ServiceAuthGuard.createPermissions([
  // View operations - basic read access
  {
    methods: [
      'getCurrentPeriod',
      'getPeriodById',
      'getPeriodByDate',
      'getPeriodsInRange',
      'getRecentPeriods',
      'getPeriodStatistics'
    ],
    mode: 'any',
    permissions: ['view_payroll', 'manage_payroll', 'view_timesheets', 'manage_timesheets'],
    message: 'You do not have permission to view payroll periods'
  },
  
  // Create and modify operations
  {
    methods: [
      'createPeriod',
      'updatePeriod',
      'deletePeriod'
    ],
    mode: 'single',
    permissions: ['manage_payroll'],
    message: 'You do not have permission to manage payroll periods'
  },
  
  // Lock operations - different levels
  {
    methods: ['lockPeriod'],
    mode: 'any',
    permissions: ['lock_periods', 'manage_payroll'],
    message: 'You do not have permission to lock payroll periods'
  },
  
  {
    methods: ['unlockPeriod'],
    mode: 'single',
    permissions: ['manage_payroll'],
    message: 'Only payroll administrators can unlock periods'
  },
  
  // Processing operations
  {
    methods: [
      'transitionStatus',
      'processPeriod',
      'exportPeriod'
    ],
    mode: 'single',
    permissions: ['process_payroll'],
    message: 'You do not have permission to process payroll'
  },
  
  // Validation and audit operations
  {
    methods: [
      'validatePeriod',
      'checkOverlappingPeriods',
      'getUnapprovedTimesheets'
    ],
    mode: 'any',
    permissions: ['view_payroll', 'manage_payroll'],
    message: 'You do not have permission to validate payroll periods'
  },
  
  // Sync operations
  {
    methods: [
      'syncWithProvider',
      'generateProviderExport'
    ],
    mode: 'single',
    permissions: ['export_payroll'],
    message: 'You do not have permission to sync with external payroll providers'
  },
  
  // Audit operations
  {
    methods: ['auditLog'],
    mode: 'any',
    permissions: ['view_payroll', 'manage_payroll'],
    message: 'You do not have permission to view audit logs'
  }
]);