// Role-Based Access Control (RBAC) Configuration for STEELIQ
// Fortune 500-standard security and permission management

import { AuthService } from './auth';
import { Request, Response, NextFunction } from 'express';

// Define system roles with hierarchical permissions
export enum SystemRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  VIEWER = 'viewer',
  EXTERNAL = 'external'
}

// Define procurement-specific permissions
export enum ProcurementPermission {
  // Purchase Order Permissions
  CREATE_PO = 'procurement.po.create',
  EDIT_PO = 'procurement.po.edit',
  DELETE_PO = 'procurement.po.delete',
  APPROVE_PO = 'procurement.po.approve',
  SEND_PO = 'procurement.po.send',
  CANCEL_PO = 'procurement.po.cancel',
  RETURN_TO_REQUISITION = 'procurement.po.return',
  VIEW_PO = 'procurement.po.view',
  
  // Requisition Permissions
  CREATE_REQUISITION = 'procurement.requisition.create',
  EDIT_REQUISITION = 'procurement.requisition.edit',
  DELETE_REQUISITION = 'procurement.requisition.delete',
  APPROVE_REQUISITION = 'procurement.requisition.approve',
  VIEW_REQUISITION = 'procurement.requisition.view',
  
  // Supplier Permissions
  MANAGE_SUPPLIERS = 'procurement.suppliers.manage',
  VIEW_SUPPLIERS = 'procurement.suppliers.view',
  
  // Settings Permissions
  MANAGE_APPROVAL_RULES = 'procurement.settings.approval_rules',
  MANAGE_TEMPLATES = 'procurement.settings.templates',
}

// Define time and payroll permissions
export enum TimePayrollPermission {
  // Clock Operations
  CLOCK_IN_OUT = 'time.clock.punch',
  CLOCK_FOR_OTHERS = 'time.clock.proxy',
  VIEW_OWN_TIME = 'time.view.own',
  VIEW_TEAM_TIME = 'time.view.team',
  VIEW_ALL_TIME = 'time.view.all',
  
  // Time Entry Management
  EDIT_OWN_TIME = 'time.entry.edit_own',
  EDIT_TEAM_TIME = 'time.entry.edit_team',
  EDIT_ALL_TIME = 'time.entry.edit_all',
  APPROVE_TIME = 'time.entry.approve',
  REJECT_TIME = 'time.entry.reject',
  BULK_CORRECT_TIME = 'time.entry.bulk_correct',
  
  // Time-Off Management
  REQUEST_TIME_OFF = 'time.timeoff.request',
  APPROVE_TIME_OFF = 'time.timeoff.approve',
  MANAGE_TIME_OFF = 'time.timeoff.manage',
  
  // Payroll Operations
  VIEW_PAYROLL = 'payroll.view',
  PROCESS_PAYROLL = 'payroll.process',
  APPROVE_PAYROLL = 'payroll.approve',
  EXPORT_PAYROLL = 'payroll.export',
  ADMIN_PAYROLL = 'payroll.admin',
  MANAGE_PAY_RATES = 'payroll.rates.manage',
  
  // Settings
  MANAGE_TIME_POLICIES = 'time.settings.policies',
  MANAGE_OVERTIME_RULES = 'time.settings.overtime',
  MANAGE_SHIFTS = 'time.settings.shifts',
}

// Define GPS and geofence permissions
export enum GPSPermission {
  // Location Tracking
  SUBMIT_LOCATION = 'gps.location.submit',
  VIEW_OWN_LOCATION = 'gps.location.view_own',
  VIEW_TEAM_LOCATION = 'gps.location.view_team',
  VIEW_ALL_LOCATION = 'gps.location.view_all',
  
  // Geofence Management
  MANAGE_GEOFENCES = 'gps.geofence.manage',
  VIEW_GEOFENCES = 'gps.geofence.view',
  OVERRIDE_GEOFENCE = 'gps.geofence.override',
  
  // Violation Handling
  VIEW_OWN_VIOLATIONS = 'gps.violation.view_own',
  VIEW_TEAM_VIOLATIONS = 'gps.violation.view_team',
  VIEW_ALL_VIOLATIONS = 'gps.violation.view_all',
  DISMISS_VIOLATIONS = 'gps.violation.dismiss',
  ESCALATE_VIOLATIONS = 'gps.violation.escalate',
  
  // Settings
  MANAGE_GPS_POLICIES = 'gps.settings.policies',
  MANAGE_GPS_ALERTS = 'gps.settings.alerts',
}

// Define notification permissions
export enum NotificationPermission {
  // Personal Notifications
  RECEIVE_PERSONAL = 'notification.receive.personal',
  MANAGE_OWN_PREFERENCES = 'notification.preferences.own',
  
  // Team Notifications
  SEND_TEAM_NOTIFICATIONS = 'notification.send.team',
  RECEIVE_TEAM = 'notification.receive.team',
  
  // System Notifications
  SEND_SYSTEM_NOTIFICATIONS = 'notification.send.system',
  RECEIVE_SYSTEM = 'notification.receive.system',
  
  // Alert Management
  MANAGE_ALERT_RULES = 'notification.alerts.manage',
  ESCALATE_ALERTS = 'notification.alerts.escalate',
  ACKNOWLEDGE_ALERTS = 'notification.alerts.acknowledge',
  
  // Settings
  MANAGE_NOTIFICATION_TEMPLATES = 'notification.settings.templates',
  MANAGE_NOTIFICATION_CHANNELS = 'notification.settings.channels',
}

// Define dual authorization permissions  
export enum DualAuthPermission {
  // Request Operations
  INITIATE_DUAL_AUTH = 'dualauth.request.initiate',
  APPROVE_DUAL_AUTH = 'dualauth.request.approve',
  REJECT_DUAL_AUTH = 'dualauth.request.reject',
  VIEW_PENDING_REQUESTS = 'dualauth.request.view',
  
  // Management
  MANAGE_DUAL_AUTH_RULES = 'dualauth.settings.rules',
  VIEW_DUAL_AUTH_HISTORY = 'dualauth.history.view',
}

// Union type for all permissions
export type AllPermission = ProcurementPermission | TimePayrollPermission | GPSPermission | NotificationPermission | DualAuthPermission;

// Role Procurement Permission Mapping
export const rolePermissions: Record<SystemRole, ProcurementPermission[]> = {
  [SystemRole.OWNER]: [...Object.values(ProcurementPermission)],
  [SystemRole.ADMIN]: [...Object.values(ProcurementPermission)],
  [SystemRole.MANAGER]: [
    ProcurementPermission.CREATE_PO,
    ProcurementPermission.EDIT_PO,
    ProcurementPermission.APPROVE_PO,
    ProcurementPermission.SEND_PO,
    ProcurementPermission.CANCEL_PO,
    ProcurementPermission.RETURN_TO_REQUISITION,
    ProcurementPermission.VIEW_PO,
    ProcurementPermission.CREATE_REQUISITION,
    ProcurementPermission.EDIT_REQUISITION,
    ProcurementPermission.APPROVE_REQUISITION,
    ProcurementPermission.VIEW_REQUISITION,
    ProcurementPermission.MANAGE_SUPPLIERS,
    ProcurementPermission.VIEW_SUPPLIERS,
  ],
  [SystemRole.USER]: [
    ProcurementPermission.CREATE_PO,
    ProcurementPermission.VIEW_PO,
    ProcurementPermission.CREATE_REQUISITION,
    ProcurementPermission.EDIT_REQUISITION,
    ProcurementPermission.VIEW_REQUISITION,
    ProcurementPermission.VIEW_SUPPLIERS,
  ],
  [SystemRole.VIEWER]: [
    ProcurementPermission.VIEW_PO,
    ProcurementPermission.VIEW_REQUISITION,
    ProcurementPermission.VIEW_SUPPLIERS,
  ],
  [SystemRole.EXTERNAL]: []
};

// Role Time/Payroll Permission Mapping
export const roleTimePayrollPermissions: Record<SystemRole, TimePayrollPermission[]> = {
  [SystemRole.OWNER]: [...Object.values(TimePayrollPermission)],
  [SystemRole.ADMIN]: [...Object.values(TimePayrollPermission)],
  [SystemRole.MANAGER]: [
    TimePayrollPermission.CLOCK_IN_OUT,
    TimePayrollPermission.CLOCK_FOR_OTHERS,
    TimePayrollPermission.VIEW_OWN_TIME,
    TimePayrollPermission.VIEW_TEAM_TIME,
    TimePayrollPermission.EDIT_OWN_TIME,
    TimePayrollPermission.EDIT_TEAM_TIME,
    TimePayrollPermission.APPROVE_TIME,
    TimePayrollPermission.REJECT_TIME,
    TimePayrollPermission.REQUEST_TIME_OFF,
    TimePayrollPermission.APPROVE_TIME_OFF,
    TimePayrollPermission.VIEW_PAYROLL,
    TimePayrollPermission.PROCESS_PAYROLL,
  ],
  [SystemRole.USER]: [
    TimePayrollPermission.CLOCK_IN_OUT,
    TimePayrollPermission.VIEW_OWN_TIME,
    TimePayrollPermission.EDIT_OWN_TIME,
    TimePayrollPermission.REQUEST_TIME_OFF,
  ],
  [SystemRole.VIEWER]: [
    TimePayrollPermission.VIEW_OWN_TIME,
  ],
  [SystemRole.EXTERNAL]: []
};

// Role GPS Permission Mapping
export const roleGPSPermissions: Record<SystemRole, GPSPermission[]> = {
  [SystemRole.OWNER]: [...Object.values(GPSPermission)],
  [SystemRole.ADMIN]: [...Object.values(GPSPermission)],
  [SystemRole.MANAGER]: [
    GPSPermission.SUBMIT_LOCATION,
    GPSPermission.VIEW_OWN_LOCATION,
    GPSPermission.VIEW_TEAM_LOCATION,
    GPSPermission.VIEW_GEOFENCES,
    GPSPermission.VIEW_OWN_VIOLATIONS,
    GPSPermission.VIEW_TEAM_VIOLATIONS,
    GPSPermission.DISMISS_VIOLATIONS,
    GPSPermission.ESCALATE_VIOLATIONS,
  ],
  [SystemRole.USER]: [
    GPSPermission.SUBMIT_LOCATION,
    GPSPermission.VIEW_OWN_LOCATION,
    GPSPermission.VIEW_GEOFENCES,
    GPSPermission.VIEW_OWN_VIOLATIONS,
  ],
  [SystemRole.VIEWER]: [
    GPSPermission.VIEW_OWN_LOCATION,
    GPSPermission.VIEW_OWN_VIOLATIONS,
  ],
  [SystemRole.EXTERNAL]: []
};

// Role Notification Permission Mapping
export const roleNotificationPermissions: Record<SystemRole, NotificationPermission[]> = {
  [SystemRole.OWNER]: [...Object.values(NotificationPermission)],
  [SystemRole.ADMIN]: [...Object.values(NotificationPermission)],
  [SystemRole.MANAGER]: [
    NotificationPermission.RECEIVE_PERSONAL,
    NotificationPermission.MANAGE_OWN_PREFERENCES,
    NotificationPermission.SEND_TEAM_NOTIFICATIONS,
    NotificationPermission.RECEIVE_TEAM,
    NotificationPermission.RECEIVE_SYSTEM,
    NotificationPermission.ESCALATE_ALERTS,
    NotificationPermission.ACKNOWLEDGE_ALERTS,
  ],
  [SystemRole.USER]: [
    NotificationPermission.RECEIVE_PERSONAL,
    NotificationPermission.MANAGE_OWN_PREFERENCES,
    NotificationPermission.RECEIVE_TEAM,
    NotificationPermission.RECEIVE_SYSTEM,
    NotificationPermission.ACKNOWLEDGE_ALERTS,
  ],
  [SystemRole.VIEWER]: [
    NotificationPermission.RECEIVE_PERSONAL,
    NotificationPermission.RECEIVE_SYSTEM,
  ],
  [SystemRole.EXTERNAL]: [
    NotificationPermission.RECEIVE_PERSONAL,
  ]
};

// Role Dual Authorization Permission Mapping
export const roleDualAuthPermissions: Record<SystemRole, DualAuthPermission[]> = {
  [SystemRole.OWNER]: [...Object.values(DualAuthPermission)],
  [SystemRole.ADMIN]: [...Object.values(DualAuthPermission)],
  [SystemRole.MANAGER]: [
    DualAuthPermission.INITIATE_DUAL_AUTH,
    DualAuthPermission.APPROVE_DUAL_AUTH,
    DualAuthPermission.REJECT_DUAL_AUTH,
    DualAuthPermission.VIEW_PENDING_REQUESTS,
    DualAuthPermission.VIEW_DUAL_AUTH_HISTORY,
  ],
  [SystemRole.USER]: [
    DualAuthPermission.INITIATE_DUAL_AUTH,
    DualAuthPermission.VIEW_PENDING_REQUESTS,
  ],
  [SystemRole.VIEWER]: [
    DualAuthPermission.VIEW_PENDING_REQUESTS,
  ],
  [SystemRole.EXTERNAL]: []
};

// Combined permissions getter for any permission type
export function getAllPermissionsForRole(role: SystemRole): AllPermission[] {
  return [
    ...rolePermissions[role],
    ...roleTimePayrollPermissions[role],
    ...roleGPSPermissions[role],
    ...roleNotificationPermissions[role],
    ...roleDualAuthPermissions[role],
  ];
}

// Middleware to check authentication
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.auth_token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await AuthService.validateSession(token);
    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Attach user to request
    (req as any).user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

// Middleware to check specific permissions (supports all permission types)
export const requirePermission = (permission: AllPermission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userRole = normalizeRole(user.role);
      const allPermissions = getAllPermissionsForRole(userRole);
      
      if (!allPermissions.includes(permission)) {
        return res.status(403).json({ 
          error: "Insufficient permissions",
          required: permission,
          userRole: userRole
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: "Permission check failed" });
    }
  };
};

// Type-specific permission middleware for Time/Payroll
export const requireTimePayrollPermission = (permission: TimePayrollPermission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userRole = normalizeRole(user.role);
      const permissions = roleTimePayrollPermissions[userRole] || [];
      
      if (!permissions.includes(permission)) {
        return res.status(403).json({ 
          error: "Insufficient time/payroll permissions",
          required: permission,
          userRole: userRole
        });
      }
      
      next();
    } catch (error) {
      console.error('Time/Payroll permission check error:', error);
      return res.status(500).json({ error: "Permission check failed" });
    }
  };
};

// Type-specific permission middleware for GPS
export const requireGPSPermission = (permission: GPSPermission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userRole = normalizeRole(user.role);
      const permissions = roleGPSPermissions[userRole] || [];
      
      if (!permissions.includes(permission)) {
        return res.status(403).json({ 
          error: "Insufficient GPS permissions",
          required: permission,
          userRole: userRole
        });
      }
      
      next();
    } catch (error) {
      console.error('GPS permission check error:', error);
      return res.status(500).json({ error: "Permission check failed" });
    }
  };
};

// Type-specific permission middleware for Notifications
export const requireNotificationPermission = (permission: NotificationPermission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userRole = normalizeRole(user.role);
      const permissions = roleNotificationPermissions[userRole] || [];
      
      if (!permissions.includes(permission)) {
        return res.status(403).json({ 
          error: "Insufficient notification permissions",
          required: permission,
          userRole: userRole
        });
      }
      
      next();
    } catch (error) {
      console.error('Notification permission check error:', error);
      return res.status(500).json({ error: "Permission check failed" });
    }
  };
};

// Type-specific permission middleware for Dual Authorization
export const requireDualAuthPermission = (permission: DualAuthPermission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userRole = normalizeRole(user.role);
      const permissions = roleDualAuthPermissions[userRole] || [];
      
      if (!permissions.includes(permission)) {
        return res.status(403).json({ 
          error: "Insufficient dual authorization permissions",
          required: permission,
          userRole: userRole
        });
      }
      
      next();
    } catch (error) {
      console.error('Dual auth permission check error:', error);
      return res.status(500).json({ error: "Permission check failed" });
    }
  };
};

// Middleware to check role level
export const requireRole = (...allowedRoles: SystemRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userRole = normalizeRole(user.role);
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: "Insufficient role permissions",
          required: allowedRoles,
          userRole: userRole
        });
      }
      
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ error: "Role check failed" });
    }
  };
};

// Normalize role names to system roles
export function normalizeRole(role: string | undefined | null): SystemRole {
  if (!role) return SystemRole.VIEWER;
  
  const normalizedRole = role.toLowerCase();
  
  // Map various role names to system roles
  if (['owner', 'business owner'].includes(normalizedRole)) {
    return SystemRole.OWNER;
  }
  if (['admin', 'administrator'].includes(normalizedRole)) {
    return SystemRole.ADMIN;
  }
  if (['manager', 'supervisor'].includes(normalizedRole)) {
    return SystemRole.MANAGER;
  }
  if (['user', 'employee', 'staff'].includes(normalizedRole)) {
    return SystemRole.USER;
  }
  if (['viewer', 'readonly', 'guest'].includes(normalizedRole)) {
    return SystemRole.VIEWER;
  }
  if (['external', 'supplier', 'contractor'].includes(normalizedRole)) {
    return SystemRole.EXTERNAL;
  }
  
  return SystemRole.VIEWER;
}

// Check if user has specific permission (supports all permission types)
export function hasPermission(userRole: string | undefined | null, permission: AllPermission): boolean {
  const normalizedRole = normalizeRole(userRole);
  const allPermissions = getAllPermissionsForRole(normalizedRole);
  return allPermissions.includes(permission);
}

// Type-specific permission check for Time/Payroll
export function hasTimePayrollPermission(userRole: string | undefined | null, permission: TimePayrollPermission): boolean {
  const normalizedRole = normalizeRole(userRole);
  const permissions = roleTimePayrollPermissions[normalizedRole] || [];
  return permissions.includes(permission);
}

// Type-specific permission check for GPS
export function hasGPSPermission(userRole: string | undefined | null, permission: GPSPermission): boolean {
  const normalizedRole = normalizeRole(userRole);
  const permissions = roleGPSPermissions[normalizedRole] || [];
  return permissions.includes(permission);
}

// Type-specific permission check for Notifications
export function hasNotificationPermission(userRole: string | undefined | null, permission: NotificationPermission): boolean {
  const normalizedRole = normalizeRole(userRole);
  const permissions = roleNotificationPermissions[normalizedRole] || [];
  return permissions.includes(permission);
}

// Type-specific permission check for Dual Authorization
export function hasDualAuthPermission(userRole: string | undefined | null, permission: DualAuthPermission): boolean {
  const normalizedRole = normalizeRole(userRole);
  const permissions = roleDualAuthPermissions[normalizedRole] || [];
  return permissions.includes(permission);
}

// Get all permissions for a role (procurement only - legacy)
export function getRolePermissions(userRole: string | undefined | null): ProcurementPermission[] {
  const normalizedRole = normalizeRole(userRole);
  return rolePermissions[normalizedRole] || [];
}

// Get all permissions for a role (all types combined)
export function getAllRolePermissions(userRole: string | undefined | null): AllPermission[] {
  const normalizedRole = normalizeRole(userRole);
  return getAllPermissionsForRole(normalizedRole);
}

// Check if role can manage procurement (approve, cancel, return)
export function canManageProcurement(userRole: string | undefined | null): boolean {
  const normalizedRole = normalizeRole(userRole);
  return [SystemRole.OWNER, SystemRole.ADMIN, SystemRole.MANAGER].includes(normalizedRole);
}

// Check if role can approve purchase orders
export function canApprovePO(userRole: string | undefined | null): boolean {
  return hasPermission(userRole, ProcurementPermission.APPROVE_PO);
}

// Check if role can return PO to requisition
export function canReturnToRequisition(userRole: string | undefined | null): boolean {
  return hasPermission(userRole, ProcurementPermission.RETURN_TO_REQUISITION);
}

// Check if role can manage time/payroll
export function canManageTimePayroll(userRole: string | undefined | null): boolean {
  return hasTimePayrollPermission(userRole, TimePayrollPermission.ADMIN_PAYROLL) ||
         hasTimePayrollPermission(userRole, TimePayrollPermission.APPROVE_TIME);
}

// Check if role can approve dual authorization requests
export function canApproveDualAuth(userRole: string | undefined | null): boolean {
  return hasDualAuthPermission(userRole, DualAuthPermission.APPROVE_DUAL_AUTH);
}

// Check if role can manage geofences
export function canManageGeofences(userRole: string | undefined | null): boolean {
  return hasGPSPermission(userRole, GPSPermission.MANAGE_GEOFENCES);
}

/**
 * Database Permission String Mapping
 * Maps RBAC enums to the database permission strings used by PermissionChecker
 * This bridges the typed RBAC system with the existing database-stored permissions
 */
export const TimePayrollPermissionStrings = {
  [TimePayrollPermission.CLOCK_IN_OUT]: 'time_clock_punch',
  [TimePayrollPermission.CLOCK_FOR_OTHERS]: 'time_clock_proxy',
  [TimePayrollPermission.VIEW_OWN_TIME]: 'view_own_time',
  [TimePayrollPermission.VIEW_TEAM_TIME]: 'view_team_time',
  [TimePayrollPermission.VIEW_ALL_TIME]: 'view_all_time',
  [TimePayrollPermission.EDIT_OWN_TIME]: 'edit_own_time',
  [TimePayrollPermission.EDIT_TEAM_TIME]: 'edit_team_time',
  [TimePayrollPermission.EDIT_ALL_TIME]: 'time_payroll_override',
  [TimePayrollPermission.APPROVE_TIME]: 'time_payroll_approve',
  [TimePayrollPermission.REJECT_TIME]: 'time_payroll_approve',
  [TimePayrollPermission.BULK_CORRECT_TIME]: 'time_payroll_bulk_adjust_request',
  [TimePayrollPermission.REQUEST_TIME_OFF]: 'request_time_off',
  [TimePayrollPermission.APPROVE_TIME_OFF]: 'approve_time_off',
  [TimePayrollPermission.MANAGE_TIME_OFF]: 'manage_time_off',
  [TimePayrollPermission.VIEW_PAYROLL]: 'view_payroll',
  [TimePayrollPermission.PROCESS_PAYROLL]: 'process_payroll',
  [TimePayrollPermission.APPROVE_PAYROLL]: 'approve_payroll',
  [TimePayrollPermission.EXPORT_PAYROLL]: 'export_payroll',
  [TimePayrollPermission.ADMIN_PAYROLL]: 'payroll_admin',
  [TimePayrollPermission.MANAGE_PAY_RATES]: 'manage_pay_rates',
  [TimePayrollPermission.MANAGE_TIME_POLICIES]: 'timesheet_management',
  [TimePayrollPermission.MANAGE_OVERTIME_RULES]: 'manage_overtime',
  [TimePayrollPermission.MANAGE_SHIFTS]: 'manage_shifts',
} as const;

export const GPSPermissionStrings = {
  [GPSPermission.SUBMIT_LOCATION]: 'gps_submit',
  [GPSPermission.VIEW_OWN_LOCATION]: 'view_own_gps',
  [GPSPermission.VIEW_TEAM_LOCATION]: 'view_team_gps',
  [GPSPermission.VIEW_ALL_LOCATION]: 'view_all_gps',
  [GPSPermission.MANAGE_GEOFENCES]: 'manage_geofences',
  [GPSPermission.VIEW_GEOFENCES]: 'view_geofences',
  [GPSPermission.OVERRIDE_GEOFENCE]: 'time_payroll_gps_override_request',
  [GPSPermission.VIEW_OWN_VIOLATIONS]: 'view_own_violations',
  [GPSPermission.VIEW_TEAM_VIOLATIONS]: 'view_team_violations',
  [GPSPermission.VIEW_ALL_VIOLATIONS]: 'view_all_violations',
  [GPSPermission.DISMISS_VIOLATIONS]: 'dismiss_violations',
  [GPSPermission.ESCALATE_VIOLATIONS]: 'escalate_violations',
  [GPSPermission.MANAGE_GPS_POLICIES]: 'manage_gps_policies',
  [GPSPermission.MANAGE_GPS_ALERTS]: 'manage_gps_alerts',
} as const;

// Note: DualAuth permissions can map to multiple underlying grants depending on context
// Use getDualAuthPermissionStrings() for multi-grant resolution
export const DualAuthPermissionStrings = {
  [DualAuthPermission.INITIATE_DUAL_AUTH]: 'dual_auth_initiate', // Generic - use context-specific below
  [DualAuthPermission.APPROVE_DUAL_AUTH]: 'time_payroll_override', // Base approval - may need additional grants
  [DualAuthPermission.REJECT_DUAL_AUTH]: 'time_payroll_override',
  [DualAuthPermission.VIEW_PENDING_REQUESTS]: 'view_dual_auth_requests',
  [DualAuthPermission.MANAGE_DUAL_AUTH_RULES]: 'manage_dual_auth',
  [DualAuthPermission.VIEW_DUAL_AUTH_HISTORY]: 'view_dual_auth_history',
} as const;

// Context-specific permission mappings for GPS override flow
export const GPSOverridePermissionStrings = {
  request: 'time_payroll_gps_override_request',
  approve: ['time_payroll_gps_override_approve', 'time_payroll_override'], // Requires BOTH
} as const;

// Context-specific permission mappings for bulk correction flow
export const BulkCorrectionPermissionStrings = {
  request: 'time_payroll_bulk_adjust_request',
  approve: ['time_payroll_bulk_adjust_approve', 'time_payroll_override'], // Requires BOTH
} as const;

// Get required permission strings for dual auth operations by context
export function getDualAuthPermissionStrings(
  operation: 'request' | 'approve',
  context: 'gps_override' | 'bulk_correction'
): string | string[] {
  if (context === 'gps_override') {
    return operation === 'request' 
      ? GPSOverridePermissionStrings.request 
      : GPSOverridePermissionStrings.approve;
  }
  return operation === 'request'
    ? BulkCorrectionPermissionStrings.request
    : BulkCorrectionPermissionStrings.approve;
}

// Get database permission string for any permission enum
export function getPermissionString(permission: AllPermission): string {
  if (Object.values(TimePayrollPermission).includes(permission as TimePayrollPermission)) {
    return TimePayrollPermissionStrings[permission as TimePayrollPermission] || permission;
  }
  if (Object.values(GPSPermission).includes(permission as GPSPermission)) {
    return GPSPermissionStrings[permission as GPSPermission] || permission;
  }
  if (Object.values(DualAuthPermission).includes(permission as DualAuthPermission)) {
    return DualAuthPermissionStrings[permission as DualAuthPermission] || permission;
  }
  // For other permission types, return as-is
  return permission;
}

// Export for use in routes
export default {
  requireAuth,
  requirePermission,
  requireTimePayrollPermission,
  requireGPSPermission,
  requireNotificationPermission,
  requireDualAuthPermission,
  requireRole,
  normalizeRole,
  hasPermission,
  hasTimePayrollPermission,
  hasGPSPermission,
  hasNotificationPermission,
  hasDualAuthPermission,
  getRolePermissions,
  getAllRolePermissions,
  getAllPermissionsForRole,
  getPermissionString,
  canManageProcurement,
  canApprovePO,
  canReturnToRequisition,
  canManageTimePayroll,
  canApproveDualAuth,
  canManageGeofences,
  SystemRole,
  ProcurementPermission,
  TimePayrollPermission,
  GPSPermission,
  NotificationPermission,
  DualAuthPermission,
  TimePayrollPermissionStrings,
  GPSPermissionStrings,
  DualAuthPermissionStrings,
  GPSOverridePermissionStrings,
  BulkCorrectionPermissionStrings,
  getDualAuthPermissionStrings
};