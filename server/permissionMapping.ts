/**
 * Fortune 50 Permission Translation Layer
 * Maps database JSONB permission arrays to legacy boolean flags
 * This provides a centralized, declarative mapping configuration
 * for the transition period between Fortune 50 and legacy systems
 */

export interface PermissionMapping {
  category: string;
  operations: {
    [operation: string]: string[];
  };
}

/**
 * Declarative Permission Mapping Manifest
 * Defines how Fortune 50 permission arrays map to legacy boolean flags
 */
export const PERMISSION_MAPPING_MANIFEST: PermissionMapping[] = [
  // Jobs & Projects
  {
    category: 'jobs',
    operations: {
      'view': ['viewJobs'],
      'create': ['createJobs'],
      'edit': ['editJobs'],
      'delete': ['deleteJobs'],
      'approve': ['approveJobs'],
      'manage': ['approveJobs']
    }
  },
  {
    category: 'projects',
    operations: {
      'view_projects': ['viewJobs'],
      'create_projects': ['createJobs'],
      'edit_projects': ['editJobs'],
      'delete_projects': ['deleteJobs']
    }
  },
  
  // Time & Payroll
  {
    category: 'timesheets',
    operations: {
      'view': ['viewTimesheets', 'viewTimeReports'],
      'edit': ['editTimesheets'],
      'approve': ['approveTimesheets'],
      'export': ['exportReports', 'viewTimeReports']
    }
  },
  {
    category: 'payroll',
    operations: {
      'view': ['viewPayroll'],
      'approve': ['approvePayroll'],
      'manage': ['managePayroll']
    }
  },
  {
    category: 'attendance',
    operations: {
      'view': ['viewAttendance'],
      'edit': ['editAttendance'],
      'approve': ['approveAttendance']
    }
  },
  {
    category: 'schedules',
    operations: {
      'view': ['viewSchedules'],
      'edit': ['editSchedules'],
      'create': ['createSchedules']
    }
  },
  {
    category: 'overtime',
    operations: {
      'view': ['viewOvertime'],
      'approve': ['approveOvertime']
    }
  },
  {
    category: 'time',
    operations: {
      'view_timesheets': ['viewTimesheets'],  // Only grants view, not approval
      'edit_own_timesheet': ['editTimesheets', 'timeClockSelf'],
      'edit_all_timesheets': ['editTimesheets', 'timeClockManage'],
      'approve_timesheets': ['approveTimesheets', 'timeApprovalManage', 'timeApprovalView'],
      'view_time_reports': ['viewTimeReports'],  // Only grants report viewing, not processing
      'process_time_reports': ['timeReportsProcess'],  // New: Separate processing permission
      'view_time_analytics': ['timeAnalyticsView'],  // New: Separate analytics permission
      'manage_time_codes': ['manageTimeCards'],
      'manage_payroll_periods': ['payrollPeriodManage'],  // Separated from time codes
      'clock_in_out': ['clockInOut', 'timeClockSelf'],
      'manage_leave_requests': ['manageLeaveRequests']
    }
  },
  
  // Users & Team
  {
    category: 'users',
    operations: {
      'view': ['viewUsers'],
      'view_users': ['viewUsers'],
      'create': ['createUsers'],
      'create_users': ['createUsers'],
      'edit': ['editUsers'],
      'edit_users': ['editUsers'],
      'delete': ['deleteUsers'],
      'delete_users': ['deleteUsers'],
      'manage': ['manageUsers'],
      'manage_users': ['manageUsers'],
      'manage_roles': ['manageUsers'],
      'manage_permissions': ['manageUsers']
    }
  },
  {
    category: 'teamMembers',
    operations: {
      'view': ['viewUsers'],
      'edit': ['editUsers']
    }
  },
  
  // Reports & Analytics
  {
    category: 'reports',
    operations: {
      'view': ['viewReports'],
      'view_reports': ['viewReports'],
      'create': ['generateReports'],
      'create_reports': ['generateReports'],
      'generate': ['generateReports'],
      'export': ['exportReports'],
      'export_reports': ['exportReports'],
      'view_analytics': ['viewAnalytics'],
      'view_kpis': ['viewAnalytics'],
      'access_business_intelligence': ['viewAnalytics']
    }
  },
  {
    category: 'dashboard',
    operations: {
      'view': ['viewAnalytics', 'viewReports']
    }
  },
  
  // Financial
  {
    category: 'financial',
    operations: {
      'view': ['viewFinancials'],
      'view_financial_data': ['viewFinancials'],
      'manage': ['manageFinancials'],
      'manage_invoices': ['manageFinancials'],
      'manage_payments': ['manageFinancials'],
      'view_costs': ['viewCosts'],
      'view_profit_margins': ['viewCosts'],
      'edit_costs': ['editCosts'],
      'edit': ['editCosts'],
      'edit_overhead_rates': ['manageRates'],
      'manage_rates': ['manageRates'],
      'view_pricing': ['viewPricing'],
      'edit_pricing': ['editPricing', 'viewPricing'],
      'approve_quotes': ['managePricing'],
      'approve': ['managePricing']
    }
  },
  
  // System & Settings
  {
    category: 'settings',
    operations: {
      'manage': ['manageSettings'],
      'edit': ['manageSettings'],
      'view': ['manageSettings']
    }
  },
  {
    category: 'system',
    operations: {
      'manage_system_config': ['systemSettings'],
      'manage_integrations': ['manageIntegrations'],
      'view_audit_logs': ['auditLogs'],
      'view_system_logs': ['auditLogs'],
      'manage_backups': ['backupRestore']
    }
  },
  {
    category: 'compliance',
    operations: {
      'view': ['viewCompliance'],
      'monitor': ['viewCompliance'],
      'verify': ['manageCompliance']
    }
  },
  
  // Documents
  {
    category: 'documents',
    operations: {
      'view': ['viewDocuments'],
      'view_documents': ['viewDocuments'],
      'upload': ['uploadDocuments'],
      'upload_documents': ['uploadDocuments'],
      'edit': ['editDocuments'],
      'edit_documents': ['editDocuments'],
      'delete': ['deleteDocuments'],
      'delete_documents': ['deleteDocuments'],
      'manage': ['manageDocuments'],
      'manage_document_approval': ['manageDocuments'],
      'control_document_access': ['manageDocuments']
    }
  },
  
  // Materials & Inventory
  {
    category: 'materials',
    operations: {
      'view': ['viewMaterials'],
      'view_materials': ['viewMaterials'],
      'edit': ['editMaterials'],
      'edit_materials': ['editMaterials'],
      'delete': ['deleteMaterials'],
      'edit_pricing': ['managePricing'],
      'view_stock_levels': ['viewInventory'],
      'manage_inventory': ['editInventory'],
      'manage_suppliers': ['viewSuppliers', 'editSuppliers'],
      'approve_purchases': ['managePriceHistory']
    }
  },
  {
    category: 'inventory',
    operations: {
      'view': ['viewInventory'],
      'edit': ['editInventory'],
      'adjust': ['editInventory', 'stockMovements'],
      'create': ['stockMovements']
    }
  },
  
  // Suppliers
  {
    category: 'suppliers',
    operations: {
      'view': ['viewSuppliers'],
      'edit': ['editSuppliers'],
      'create': ['editSuppliers'],
      'delete': ['deleteSuppliers']
    }
  },
  
  // Cutting Plans
  {
    category: 'cutting',
    operations: {
      'view': ['viewCuttingPlans'],
      'create': ['createCuttingPlans'],
      'edit': ['editCuttingPlans'],
      'optimize': ['runOptimization']
    }
  },
  
  // Production
  {
    category: 'production',
    operations: {
      'view': ['viewProduction'],
      'monitor': ['viewProduction'],
      'view_production_schedule': ['viewProduction'],
      'view_work_orders': ['viewProduction'],
      'update_job_status': ['editProduction', 'updateJobStatus'],
      'manage_job_sequences': ['editProduction'],
      'manage_quality_control': ['manageQualityControl'],
      'edit_cutting_plans': ['viewCuttingPlans', 'editCuttingPlans']
    }
  },
  
  // Quality
  {
    category: 'quality',
    operations: {
      'view': ['viewQuality'],
      'edit': ['conductInspections'],
      'create': ['conductInspections'],
      'approve': ['manageCompliance'],
      'view_safety_reports': ['viewQuality'],
      'conduct_inspections': ['conductInspections'],
      'manage_compliance': ['manageCompliance'],
      'record_non_conformance': ['recordNonConformance']
    }
  },
  {
    category: 'inspections',
    operations: {
      'view': ['viewQuality'],
      'conduct': ['conductInspections'],
      'schedule': ['conductInspections'],
      'approve': ['manageCompliance']
    }
  },
  {
    category: 'ncrs',
    operations: {
      'view': ['viewQuality'],
      'create': ['recordNonConformance', 'manageNCRs'],
      'edit': ['recordNonConformance', 'manageNCRs'],
      'close': ['manageNCRs']
    }
  },
  {
    category: 'testCertificates',
    operations: {
      'view': ['viewQuality'],
      'create': ['manageCertificates'],
      'approve': ['manageCertificates']
    }
  },
  {
    category: 'welderQualifications',
    operations: {
      'view': ['viewQuality'],
      'verify': ['manageCompliance']
    }
  },
  {
    category: 'materialCertificates',
    operations: {
      'view': ['viewDocuments'],
      'verify': ['manageCompliance']
    }
  },
  {
    category: 'auditLogs',
    operations: {
      'view': ['auditLogs']
    }
  }
];

/**
 * Cache for permission translations to improve performance
 */
const permissionCache = new Map<string, any>();

/**
 * Normalize Fortune 50 permissions to include legacy format
 * Uses declarative mapping manifest for maintainability
 * 
 * @param dbPermissions - Raw JSONB permissions from database
 * @returns Combined permissions object with both Fortune 50 and legacy formats
 */
export function normalizePermissions(dbPermissions: any): any {
  // Check cache first
  const cacheKey = JSON.stringify(dbPermissions);
  if (permissionCache.has(cacheKey)) {
    return permissionCache.get(cacheKey);
  }

  // Initialize all legacy permissions as false
  const legacyPermissions: any = {
    // Job Management
    viewJobs: false,
    createJobs: false,
    editJobs: false,
    deleteJobs: false,
    approveJobs: false,
    
    // User Management
    viewUsers: false,
    createUsers: false,
    editUsers: false,
    deleteUsers: false,
    manageUsers: false,
    
    // Reports & Analytics
    viewReports: false,
    generateReports: false,
    exportReports: false,
    viewAnalytics: false,
    
    // Financial
    viewFinancials: false,
    manageFinancials: false,
    viewCosts: false,
    editCosts: false,
    manageRates: false,
    viewPricing: false,
    editPricing: false,
    managePricing: false,
    
    // Settings & System
    manageSettings: false,
    systemSettings: false,
    manageIntegrations: false,
    auditLogs: false,
    backupRestore: false,
    
    // Documents
    viewDocuments: false,
    uploadDocuments: false,
    editDocuments: false,
    deleteDocuments: false,
    manageDocuments: false,
    
    // Materials & Inventory
    viewMaterials: false,
    editMaterials: false,
    deleteMaterials: false,
    viewInventory: false,
    editInventory: false,
    stockMovements: false,
    
    // Suppliers
    viewSuppliers: false,
    editSuppliers: false,
    deleteSuppliers: false,
    managePriceHistory: false,
    
    // Cutting Plans
    viewCuttingPlans: false,
    createCuttingPlans: false,
    editCuttingPlans: false,
    runOptimization: false,
    
    // Time & Payroll
    viewTimesheets: false,
    editTimesheets: false,
    approveTimesheets: false,
    viewTimeReports: false,
    manageTimeCards: false,
    clockInOut: false,
    manageLeaveRequests: false,
    viewPayroll: false,
    approvePayroll: false,
    managePayroll: false,
    viewAttendance: false,
    editAttendance: false,
    approveAttendance: false,
    viewSchedules: false,
    editSchedules: false,
    createSchedules: false,
    viewOvertime: false,
    approveOvertime: false,
    
    // Production
    viewProduction: false,
    editProduction: false,
    manageQualityControl: false,
    updateJobStatus: false,
    
    // Quality
    viewQuality: false,
    conductInspections: false,
    manageCompliance: false,
    recordNonConformance: false,
    manageNCRs: false,
    manageCertificates: false,
    viewCompliance: false
  };

  // Apply mapping from manifest
  if (dbPermissions && typeof dbPermissions === 'object') {
    for (const mapping of PERMISSION_MAPPING_MANIFEST) {
      const categoryPermissions = dbPermissions[mapping.category];
      
      if (Array.isArray(categoryPermissions)) {
        for (const permission of categoryPermissions) {
          const legacyFlags = mapping.operations[permission];
          if (legacyFlags) {
            for (const flag of legacyFlags) {
              legacyPermissions[flag] = true;
            }
          }
        }
      }
    }
  }

  // Combine Fortune 50 and legacy permissions
  const result = {
    ...dbPermissions,
    ...legacyPermissions
  };

  // Cache the result
  permissionCache.set(cacheKey, result);

  return result;
}

/**
 * Clear permission cache (useful after permission updates)
 */
export function clearPermissionCache(): void {
  permissionCache.clear();
}

/**
 * Get legacy permission usage for deprecation tracking
 * Returns list of legacy flags that are being used
 */
export function getLegacyPermissionUsage(permissions: any): string[] {
  const legacyFlags: string[] = [];
  const legacyKeys = Object.keys(permissions).filter(key => 
    !Array.isArray(permissions[key]) && typeof permissions[key] === 'boolean'
  );
  
  for (const key of legacyKeys) {
    if (permissions[key] === true) {
      legacyFlags.push(key);
    }
  }
  
  return legacyFlags;
}

/**
 * Validate permission mapping for a role (for testing)
 */
export function validatePermissionMapping(
  dbPermissions: any,
  expectedLegacyFlags: { [key: string]: boolean }
): { valid: boolean; errors: string[] } {
  const normalized = normalizePermissions(dbPermissions);
  const errors: string[] = [];
  
  for (const [flag, expectedValue] of Object.entries(expectedLegacyFlags)) {
    if (normalized[flag] !== expectedValue) {
      errors.push(
        `Flag '${flag}' expected ${expectedValue} but got ${normalized[flag]}`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}