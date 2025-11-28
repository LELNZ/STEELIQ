import { ServiceAuthGuard, ServicePermissions } from "../utils/serviceAuthGuard";

/**
 * Permission metadata for ComplianceService
 */
export const compliancePermissions: ServicePermissions = ServiceAuthGuard.createPermissions([
  // Check operations
  {
    methods: [
      'checkBreakCompliance',
      'checkMealPeriodCompliance', 
      'checkOvertimeCompliance',
      'checkWeeklyHoursCompliance',
      'checkStateCompliance'
    ],
    mode: 'any',
    permissions: ['view_compliance', 'manage_compliance', 'manage_timesheets'],
    message: 'You do not have permission to check compliance'
  },
  
  // Violation management
  {
    methods: [
      'recordViolation',
      'resolveViolation',
      'getViolationsByUser',
      'getUnresolvedViolations'
    ],
    mode: 'any',
    permissions: ['manage_compliance', 'manage_timesheets'],
    message: 'You do not have permission to manage compliance violations'
  },
  
  // Rule management
  {
    methods: [
      'updateComplianceRules',
      'getComplianceRules',
      'createComplianceRule'
    ],
    mode: 'single',
    permissions: ['manage_compliance'],
    message: 'You do not have permission to manage compliance rules'
  },
  
  // Reporting
  {
    methods: [
      'generateComplianceReport',
      'getComplianceStatistics'
    ],
    mode: 'any',
    permissions: ['view_compliance', 'manage_compliance'],
    message: 'You do not have permission to view compliance reports'
  }
]);