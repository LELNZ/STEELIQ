/**
 * Authentication and Authorization System
 * Industry-standard permission levels for fabrication/manufacturing environment
 */

export interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  permissions: UserPermissions;
  department?: string;
  employeeId?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

export type UserRole = 
  | 'basic'        // View-only access, basic reporting
  | 'planning'     // Job planning, cutting optimization
  | 'accounting'   // Financial data, pricing, supplier management
  | 'supervisor'   // Department supervision, user management
  | 'admin'        // System administration, full access
  | 'full';        // Complete system access, user creation

export interface UserPermissions {
  // Material Library
  viewMaterials: boolean;
  editMaterials: boolean;
  deleteMaterials: boolean;
  managePricing: boolean;
  
  // Supplier Management
  viewSuppliers: boolean;
  editSuppliers: boolean;
  deleteSuppliers: boolean;
  managePriceHistory: boolean;
  
  // Job Management
  viewJobs: boolean;
  createJobs: boolean;
  editJobs: boolean;
  deleteJobs: boolean;
  approveJobs: boolean;
  
  // Cutting Plans
  viewCuttingPlans: boolean;
  createCuttingPlans: boolean;
  editCuttingPlans: boolean;
  runOptimization: boolean;
  
  // Inventory
  viewInventory: boolean;
  editInventory: boolean;
  stockMovements: boolean;
  
  // Financial
  viewPricing: boolean;
  editPricing: boolean;
  viewCosts: boolean;
  manageRates: boolean;
  
  // Reporting
  viewReports: boolean;
  exportData: boolean;
  
  // System Administration
  manageUsers: boolean;
  systemSettings: boolean;
  auditLogs: boolean;
  backupRestore: boolean;
}

/**
 * Get default permissions for a role
 */
export function getDefaultPermissions(role: UserRole): UserPermissions {
  const basePermissions: UserPermissions = {
    viewMaterials: false,
    editMaterials: false,
    deleteMaterials: false,
    managePricing: false,
    viewSuppliers: false,
    editSuppliers: false,
    deleteSuppliers: false,
    managePriceHistory: false,
    viewJobs: false,
    createJobs: false,
    editJobs: false,
    deleteJobs: false,
    approveJobs: false,
    viewCuttingPlans: false,
    createCuttingPlans: false,
    editCuttingPlans: false,
    runOptimization: false,
    viewInventory: false,
    editInventory: false,
    stockMovements: false,
    viewPricing: false,
    editPricing: false,
    viewCosts: false,
    manageRates: false,
    viewReports: false,
    exportData: false,
    manageUsers: false,
    systemSettings: false,
    auditLogs: false,
    backupRestore: false,
  };

  switch (role) {
    case 'basic':
      return {
        ...basePermissions,
        viewMaterials: true,
        viewSuppliers: true,
        viewJobs: true,
        viewCuttingPlans: true,
        viewInventory: true,
        viewReports: true,
      };

    case 'planning':
      return {
        ...basePermissions,
        viewMaterials: true,
        editMaterials: true,
        viewSuppliers: true,
        viewJobs: true,
        createJobs: true,
        editJobs: true,
        viewCuttingPlans: true,
        createCuttingPlans: true,
        editCuttingPlans: true,
        runOptimization: true,
        viewInventory: true,
        editInventory: true,
        stockMovements: true,
        viewReports: true,
        exportData: true,
      };

    case 'accounting':
      return {
        ...basePermissions,
        viewMaterials: true,
        editMaterials: true,
        managePricing: true,
        viewSuppliers: true,
        editSuppliers: true,
        managePriceHistory: true,
        viewJobs: true,
        editJobs: true,
        approveJobs: true,
        viewInventory: true,
        viewPricing: true,
        editPricing: true,
        viewCosts: true,
        manageRates: true,
        viewReports: true,
        exportData: true,
      };

    case 'supervisor':
      return {
        ...basePermissions,
        viewMaterials: true,
        editMaterials: true,
        managePricing: true,
        viewSuppliers: true,
        editSuppliers: true,
        deleteSuppliers: true,
        managePriceHistory: true,
        viewJobs: true,
        createJobs: true,
        editJobs: true,
        deleteJobs: true,
        approveJobs: true,
        viewCuttingPlans: true,
        createCuttingPlans: true,
        editCuttingPlans: true,
        runOptimization: true,
        viewInventory: true,
        editInventory: true,
        stockMovements: true,
        viewPricing: true,
        editPricing: true,
        viewCosts: true,
        manageRates: true,
        viewReports: true,
        exportData: true,
        manageUsers: true,
      };

    case 'admin':
      return {
        ...basePermissions,
        viewMaterials: true,
        editMaterials: true,
        deleteMaterials: true,
        managePricing: true,
        viewSuppliers: true,
        editSuppliers: true,
        deleteSuppliers: true,
        managePriceHistory: true,
        viewJobs: true,
        createJobs: true,
        editJobs: true,
        deleteJobs: true,
        approveJobs: true,
        viewCuttingPlans: true,
        createCuttingPlans: true,
        editCuttingPlans: true,
        runOptimization: true,
        viewInventory: true,
        editInventory: true,
        stockMovements: true,
        viewPricing: true,
        editPricing: true,
        viewCosts: true,
        manageRates: true,
        viewReports: true,
        exportData: true,
        manageUsers: true,
        systemSettings: true,
        auditLogs: true,
      };

    case 'full':
      return Object.keys(basePermissions).reduce((acc, key) => {
        acc[key as keyof UserPermissions] = true;
        return acc;
      }, {} as UserPermissions);

    default:
      return basePermissions;
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: User | null, permission: keyof UserPermissions): boolean {
  if (!user || !user.isActive) return false;
  return user.permissions[permission] || false;
}

/**
 * Check if user can edit historical data (for audit purposes)
 */
export function canEditHistoricalData(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'full';
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    basic: 'Basic User',
    planning: 'Planning Operator',
    accounting: 'Accounting/Finance',
    supervisor: 'Department Supervisor',
    admin: 'System Administrator',
    full: 'Full Access'
  };
  return roleNames[role];
}

/**
 * Get department options
 */
export function getDepartmentOptions(): string[] {
  return [
    'Fabrication',
    'Planning',
    'Procurement',
    'Quality Control',
    'Accounting',
    'Management',
    'Administration'
  ];
}