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

// Role Permission Mapping
export const rolePermissions: Record<SystemRole, ProcurementPermission[]> = {
  [SystemRole.OWNER]: [
    // Owners have all permissions
    ...Object.values(ProcurementPermission)
  ],
  [SystemRole.ADMIN]: [
    // Admins have all permissions
    ...Object.values(ProcurementPermission)
  ],
  [SystemRole.MANAGER]: [
    // Managers can manage POs and requisitions
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
    // Users can create and view, but not approve
    ProcurementPermission.CREATE_PO,
    ProcurementPermission.VIEW_PO,
    ProcurementPermission.CREATE_REQUISITION,
    ProcurementPermission.EDIT_REQUISITION,
    ProcurementPermission.VIEW_REQUISITION,
    ProcurementPermission.VIEW_SUPPLIERS,
  ],
  [SystemRole.VIEWER]: [
    // Viewers can only view
    ProcurementPermission.VIEW_PO,
    ProcurementPermission.VIEW_REQUISITION,
    ProcurementPermission.VIEW_SUPPLIERS,
  ],
  [SystemRole.EXTERNAL]: [
    // External users have no procurement permissions by default
  ]
};

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

// Middleware to check specific permissions
export const requirePermission = (permission: ProcurementPermission) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const userRole = normalizeRole(user.role);
      const permissions = rolePermissions[userRole] || [];
      
      if (!permissions.includes(permission)) {
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

// Check if user has specific permission
export function hasPermission(userRole: string | undefined | null, permission: ProcurementPermission): boolean {
  const normalizedRole = normalizeRole(userRole);
  const permissions = rolePermissions[normalizedRole] || [];
  return permissions.includes(permission);
}

// Get all permissions for a role
export function getRolePermissions(userRole: string | undefined | null): ProcurementPermission[] {
  const normalizedRole = normalizeRole(userRole);
  return rolePermissions[normalizedRole] || [];
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

// Export for use in routes
export default {
  requireAuth,
  requirePermission,
  requireRole,
  normalizeRole,
  hasPermission,
  getRolePermissions,
  canManageProcurement,
  canApprovePO,
  canReturnToRequisition,
  SystemRole,
  ProcurementPermission
};