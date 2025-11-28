import { ServiceAuthGuard, ServicePermissions } from "../utils/serviceAuthGuard";

/**
 * Permission metadata for TimeAnalyticsService
 */
export const analyticsPermissions: ServicePermissions = ServiceAuthGuard.createPermissions([
  // KPI and metrics operations
  {
    methods: [
      'getKPIs',
      'getDepartmentMetrics',
      'getAttendanceMetrics',
      'getPayrollMetrics',
      'getComplianceMetrics',
      'getProductivityMetrics',
      'getTrendData'
    ],
    mode: 'any',
    permissions: ['view_analytics', 'manage_timesheets', 'manage_payroll'],
    message: 'You do not have permission to view time analytics'
  },
  
  // Individual user analytics
  {
    methods: [
      'getUserMetrics',
      'getUserAttendance',
      'getUserProductivity'
    ],
    mode: 'any',
    permissions: ['view_timesheets', 'manage_timesheets'],
    message: 'You do not have permission to view user analytics'
  },
  
  // Advanced analytics and forecasting
  {
    methods: [
      'generateForecast',
      'analyzeTrends',
      'calculateROI',
      'benchmarkPerformance'
    ],
    mode: 'single',
    permissions: ['manage_payroll'],
    message: 'You do not have permission to access advanced analytics'
  }
]);