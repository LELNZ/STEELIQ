import { ServiceAuthGuard, ServicePermissions } from "../utils/serviceAuthGuard";

/**
 * Permission metadata for OvertimeCalculationService
 */
export const overtimePermissions: ServicePermissions = ServiceAuthGuard.createPermissions([
  // Calculate operations
  {
    methods: [
      'calculateOvertimeForPeriod',
      'calculateWeeklyOvertime',
      'calculateDailyOvertime',
      'calculateConsecutiveDayOvertime',
      'applyOvertimeRules'
    ],
    mode: 'any',
    permissions: ['view_timesheets', 'manage_timesheets', 'process_payroll'],
    message: 'You do not have permission to calculate overtime'
  },
  
  // Configuration operations
  {
    methods: [
      'updateOvertimeRules',
      'getOvertimeRules',
      'createOvertimeRule'
    ],
    mode: 'single',
    permissions: ['manage_payroll'],
    message: 'You do not have permission to manage overtime rules'
  }
]);