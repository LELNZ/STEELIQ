/**
 * Role-Based Access Control (RBAC) Middleware
 * Fortune 50 compliant permission enforcement system
 * 
 * Implementation modes:
 * - shadow: Logs permission checks without blocking (for analysis)
 * - enforce: Blocks unauthorized access (production mode)
 * - bypass: Disabled for testing
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users, roles, auditLog } from '@shared/schema';
import { eq } from 'drizzle-orm';
import config from '../config';
import logger from '../utils/logger';
import { getDefaultPermissions, UserRole, UserPermissions } from '../../client/src/lib/auth';

// RBAC enforcement modes
export type RBACMode = 'shadow' | 'enforce' | 'bypass';

// Permission action types
export type PermissionAction = 
  | 'view' 
  | 'create' 
  | 'edit' 
  | 'delete' 
  | 'approve' 
  | 'export' 
  | 'manage';

// Resource types aligned with Fortune 50 security model
export type ResourceType = 
  | 'financial'
  | 'jobs'
  | 'materials' 
  | 'suppliers'
  | 'procurement'
  | 'production'
  | 'ai_estimation'
  | 'users'
  | 'system'
  | 'audit'
  | 'inventory'
  | 'documents'
  | 'reports'
  | 'quality'
  | 'safety';

// Permission definition
export interface Permission {
  resource: ResourceType;
  action: PermissionAction;
  scope?: 'own' | 'department' | 'organization'; // Data visibility scope
}

// Enhanced session with cached permissions
export interface EnhancedSession {
  userId: number;
  role: UserRole;
  permissions: UserPermissions;
  departments?: string[];
  dataScope?: 'self' | 'department' | 'organization';
  permissionsCachedAt?: Date;
}

// Permission rules mapping - defines what each role can do
const PERMISSION_RULES: Record<string, Permission[]> = {
  // Floor workers - minimal access
  basic: [
    { resource: 'jobs', action: 'view', scope: 'own' },
    { resource: 'production', action: 'view', scope: 'department' },
    { resource: 'safety', action: 'view', scope: 'organization' },
    { resource: 'quality', action: 'view', scope: 'own' },
    { resource: 'documents', action: 'view', scope: 'own' },
  ],

  // Planning team - job and material management
  planning: [
    { resource: 'jobs', action: 'view', scope: 'organization' },
    { resource: 'jobs', action: 'create' },
    { resource: 'jobs', action: 'edit', scope: 'department' },
    { resource: 'materials', action: 'view' },
    { resource: 'materials', action: 'edit' },
    { resource: 'production', action: 'view', scope: 'organization' },
    { resource: 'production', action: 'edit', scope: 'department' },
    { resource: 'inventory', action: 'view' },
    { resource: 'inventory', action: 'edit' },
    { resource: 'reports', action: 'view' },
    { resource: 'reports', action: 'export' },
  ],

  // Accounting - financial and procurement access
  accounting: [
    { resource: 'financial', action: 'view', scope: 'organization' },
    { resource: 'financial', action: 'edit' },
    { resource: 'financial', action: 'export' },
    { resource: 'procurement', action: 'view', scope: 'organization' },
    { resource: 'procurement', action: 'edit' },
    { resource: 'procurement', action: 'approve' },
    { resource: 'suppliers', action: 'view' },
    { resource: 'suppliers', action: 'edit' },
    { resource: 'suppliers', action: 'manage' },
    { resource: 'jobs', action: 'view', scope: 'organization' },
    { resource: 'reports', action: 'view' },
    { resource: 'reports', action: 'export' },
  ],

  // Supervisors - departmental control
  supervisor: [
    { resource: 'jobs', action: 'view', scope: 'organization' },
    { resource: 'jobs', action: 'edit', scope: 'organization' },
    { resource: 'jobs', action: 'approve', scope: 'department' },
    { resource: 'materials', action: 'manage' },
    { resource: 'production', action: 'manage', scope: 'department' },
    { resource: 'quality', action: 'manage', scope: 'department' },
    { resource: 'safety', action: 'manage', scope: 'department' },
    { resource: 'users', action: 'view', scope: 'department' },
    { resource: 'users', action: 'edit', scope: 'department' },
    { resource: 'reports', action: 'manage' },
    { resource: 'financial', action: 'view', scope: 'department' },
  ],

  // Full - complete access
  full: [
    // All resources, all actions, organization scope
    { resource: 'financial', action: 'manage', scope: 'organization' },
    { resource: 'jobs', action: 'manage', scope: 'organization' },
    { resource: 'materials', action: 'manage', scope: 'organization' },
    { resource: 'suppliers', action: 'manage', scope: 'organization' },
    { resource: 'procurement', action: 'manage', scope: 'organization' },
    { resource: 'production', action: 'manage', scope: 'organization' },
    { resource: 'ai_estimation', action: 'manage', scope: 'organization' },
    { resource: 'users', action: 'manage', scope: 'organization' },
    { resource: 'system', action: 'manage', scope: 'organization' },
    { resource: 'audit', action: 'manage', scope: 'organization' },
    { resource: 'inventory', action: 'manage', scope: 'organization' },
    { resource: 'documents', action: 'manage', scope: 'organization' },
    { resource: 'reports', action: 'manage', scope: 'organization' },
    { resource: 'quality', action: 'manage', scope: 'organization' },
    { resource: 'safety', action: 'manage', scope: 'organization' },
  ],
};

// Route to resource mapping - determines which resource an endpoint belongs to
const ROUTE_RESOURCES: Record<string, ResourceType> = {
  // Financial routes
  '/api/invoices': 'financial',
  '/api/payments': 'financial',
  '/api/cost': 'financial',
  '/api/financial': 'financial',
  '/api/analytics/financial': 'financial',
  
  // Job routes
  '/api/jobs': 'jobs',
  '/api/job': 'jobs',
  
  // Material routes
  '/api/materials': 'materials',
  '/api/material': 'materials',
  
  // Supplier routes
  '/api/suppliers': 'suppliers',
  '/api/supplier': 'suppliers',
  
  // Procurement routes
  '/api/procurement': 'procurement',
  '/api/purchase': 'procurement',
  '/api/rfq': 'procurement',
  '/api/requisition': 'procurement',
  
  // Production routes
  '/api/production': 'production',
  '/api/machines': 'production',
  '/api/work-orders': 'production',
  
  // AI/Estimation routes
  '/api/ai': 'ai_estimation',
  '/api/estimation': 'ai_estimation',
  
  // User management routes
  '/api/users': 'users',
  '/api/roles': 'users',
  '/api/departments': 'users',
  '/api/team': 'users',
  
  // System routes
  '/api/settings': 'system',
  '/api/system': 'system',
  '/api/backup': 'system',
  
  // Audit routes
  '/api/audit': 'audit',
  '/api/logs': 'audit',
  
  // Other routes
  '/api/inventory': 'inventory',
  '/api/documents': 'documents',
  '/api/files': 'documents',
  '/api/reports': 'reports',
  '/api/quality': 'quality',
  '/api/safety': 'safety',
};

// Get RBAC mode from config/environment
function getRBACMode(): RBACMode {
  const mode = process.env.RBAC_MODE || 'shadow';
  if (!['shadow', 'enforce', 'bypass'].includes(mode)) {
    logger.warn(`Invalid RBAC mode: ${mode}, defaulting to shadow mode`);
    return 'shadow';
  }
  return mode as RBACMode;
}

// Determine resource type from request path
function getResourceFromPath(path: string): ResourceType | null {
  // Remove query params and trailing slashes
  const cleanPath = path.split('?')[0].replace(/\/$/, '');
  
  // Find matching resource by prefix
  for (const [route, resource] of Object.entries(ROUTE_RESOURCES)) {
    if (cleanPath.startsWith(route)) {
      return resource;
    }
  }
  
  // Default to null if no match (public route)
  return null;
}

// Determine action from HTTP method
function getActionFromMethod(method: string): PermissionAction {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'view';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'edit';
    case 'DELETE':
      return 'delete';
    default:
      return 'view';
  }
}

// Check if user has permission for resource/action
function hasPermission(
  userRole: UserRole,
  resource: ResourceType,
  action: PermissionAction,
  userPermissions?: UserPermissions
): boolean {
  // Get role-based permissions
  const rolePermissions = PERMISSION_RULES[userRole] || [];
  
  // Check if role has this specific permission
  const hasRolePermission = rolePermissions.some(p => {
    // Check exact match
    if (p.resource === resource && p.action === action) {
      return true;
    }
    // Check if role has 'manage' permission (includes all actions)
    if (p.resource === resource && p.action === 'manage') {
      return true;
    }
    return false;
  });

  // If role has permission, no need to check user overrides
  if (hasRolePermission) {
    return true;
  }

  // Check user-specific permission overrides if provided
  if (userPermissions) {
    // Map resource/action to specific permission field
    const permissionKey = getPermissionKey(resource, action);
    if (permissionKey && userPermissions[permissionKey as keyof UserPermissions]) {
      return true;
    }
  }

  return false;
}

// Map resource/action to permission key in UserPermissions interface
function getPermissionKey(resource: ResourceType, action: PermissionAction): string | null {
  const mapping: Record<string, string> = {
    'materials_view': 'viewMaterials',
    'materials_edit': 'editMaterials',
    'materials_delete': 'deleteMaterials',
    'suppliers_view': 'viewSuppliers',
    'suppliers_edit': 'editSuppliers',
    'suppliers_delete': 'deleteSuppliers',
    'jobs_view': 'viewJobs',
    'jobs_create': 'createJobs',
    'jobs_edit': 'editJobs',
    'jobs_delete': 'deleteJobs',
    'jobs_approve': 'approveJobs',
    'financial_view': 'viewPricing',
    'financial_edit': 'editPricing',
    'inventory_view': 'viewInventory',
    'inventory_edit': 'editInventory',
    'reports_view': 'viewReports',
    'reports_export': 'exportData',
    'users_manage': 'manageUsers',
    'system_manage': 'systemSettings',
    'audit_view': 'auditLogs',
  };
  
  return mapping[`${resource}_${action}`] || null;
}

// Log audit event for permission check
async function logPermissionAudit(
  userId: number,
  resource: ResourceType,
  action: PermissionAction,
  allowed: boolean,
  mode: RBACMode,
  path: string,
  method: string
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      userId,
      action: allowed ? 'PERMISSION_GRANTED' : 'PERMISSION_DENIED',
      entityType: 'permission_check',
      entityId: 0,
      metadata: {
        resource,
        permissionAction: action,
        allowed,
        mode,
        path,
        method,
        timestamp: new Date().toISOString(),
      },
      ipAddress: '',
      userAgent: '',
    });
  } catch (error) {
    logger.error('Failed to log permission audit:', error);
  }
}

// Load and cache user permissions
async function loadUserPermissions(userId: number): Promise<EnhancedSession | null> {
  try {
    // Get user with role
    const user = await db
      .select({
        id: users.id,
        role: users.role,
        permissions: users.permissions,
        department: users.department,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || user.length === 0) {
      return null;
    }

    const userData = user[0];
    
    // Get role permissions if role ID is stored separately
    let rolePermissions: UserPermissions = getDefaultPermissions(userData.role as UserRole);
    
    // Merge user-specific permission overrides
    const userPermissions = userData.permissions as UserPermissions || {};
    const mergedPermissions = { ...rolePermissions, ...userPermissions };

    // Determine data scope based on role
    let dataScope: 'self' | 'department' | 'organization' = 'self';
    if (['admin', 'full'].includes(userData.role)) {
      dataScope = 'organization';
    } else if (['supervisor', 'planning', 'accounting'].includes(userData.role)) {
      dataScope = 'department';
    }

    return {
      userId: userData.id,
      role: userData.role as UserRole,
      permissions: mergedPermissions,
      departments: userData.department ? [userData.department] : [],
      dataScope,
      permissionsCachedAt: new Date(),
    };
  } catch (error) {
    logger.error('Failed to load user permissions:', error);
    return null;
  }
}

// Main RBAC middleware
export function rbacMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const mode = getRBACMode();
    
    // Bypass mode - skip all checks
    if (mode === 'bypass') {
      return next();
    }

    // Get user from session
    const userId = req.session?.userId;
    if (!userId) {
      // No user in session - let auth middleware handle it
      return next();
    }

    // Determine resource from path
    const resource = getResourceFromPath(req.path);
    if (!resource) {
      // Not a protected resource (public route)
      return next();
    }

    // Determine action from method
    const action = getActionFromMethod(req.method);

    // Load cached permissions from session or fetch from DB
    let enhancedSession: EnhancedSession | null = req.session?.rbac;
    
    // Cache miss or stale cache (older than 5 minutes)
    if (!enhancedSession || 
        !enhancedSession.permissionsCachedAt ||
        (new Date().getTime() - new Date(enhancedSession.permissionsCachedAt).getTime() > 5 * 60 * 1000)) {
      enhancedSession = await loadUserPermissions(userId);
      
      if (!enhancedSession) {
        // Failed to load permissions - deny access in enforce mode
        if (mode === 'enforce') {
          logger.warn(`Failed to load permissions for user ${userId}`);
          return res.status(403).json({
            error: 'Permission check failed',
            message: 'Unable to verify user permissions',
          });
        }
        return next();
      }

      // Cache in session
      req.session.rbac = enhancedSession;
    }

    // Check permission
    const hasAccess = hasPermission(
      enhancedSession.role,
      resource,
      action,
      enhancedSession.permissions
    );

    // Log the permission check
    await logPermissionAudit(
      userId,
      resource,
      action,
      hasAccess,
      mode,
      req.path,
      req.method
    );

    // Log detailed info for shadow mode
    if (mode === 'shadow') {
      logger.info('RBAC Shadow Mode:', {
        userId,
        role: enhancedSession.role,
        path: req.path,
        method: req.method,
        resource,
        action,
        allowed: hasAccess,
        dataScope: enhancedSession.dataScope,
      });
    }

    // Enforce mode - block if no permission
    if (mode === 'enforce' && !hasAccess) {
      logger.warn('RBAC Access Denied:', {
        userId,
        role: enhancedSession.role,
        path: req.path,
        method: req.method,
        resource,
        action,
      });

      return res.status(403).json({
        error: 'Access denied',
        message: `You do not have permission to ${action} ${resource}`,
        required: {
          resource,
          action,
          currentRole: enhancedSession.role,
        },
      });
    }

    // Attach enhanced session to request for downstream use
    (req as any).rbac = enhancedSession;

    next();
  };
}

// Middleware to check specific permissions
export function requirePermission(resource: ResourceType, action: PermissionAction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const mode = getRBACMode();
    
    // Bypass mode
    if (mode === 'bypass') {
      return next();
    }

    // Get enhanced session from request (set by rbacMiddleware)
    const enhancedSession: EnhancedSession = (req as any).rbac;
    
    if (!enhancedSession) {
      if (mode === 'enforce') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Permission check required but session not found',
        });
      }
      return next();
    }

    // Check specific permission
    const hasAccess = hasPermission(
      enhancedSession.role,
      resource,
      action,
      enhancedSession.permissions
    );

    if (mode === 'enforce' && !hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: `You do not have permission to ${action} ${resource}`,
        required: {
          resource,
          action,
          currentRole: enhancedSession.role,
        },
      });
    }

    next();
  };
}

// Helper to get data scope filter for queries
export function getDataScopeFilter(req: Request): any {
  const enhancedSession: EnhancedSession = (req as any).rbac;
  
  if (!enhancedSession) {
    return {};
  }

  switch (enhancedSession.dataScope) {
    case 'self':
      return { userId: enhancedSession.userId };
    case 'department':
      return { department: { in: enhancedSession.departments || [] } };
    case 'organization':
      return {}; // No filter - see all data
    default:
      return { userId: enhancedSession.userId };
  }
}

// Export types and helpers for use in services
export {
  EnhancedSession,
  PERMISSION_RULES,
  hasPermission,
  loadUserPermissions,
};