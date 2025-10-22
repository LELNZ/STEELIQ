/**
 * Express type extensions for RBAC and enhanced sessions
 */

import { UserRole, UserPermissions } from '../../client/src/lib/auth';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    username?: string;
    role?: string;
    // RBAC enhanced session data
    rbac?: {
      userId: number;
      role: UserRole;
      permissions: UserPermissions;
      departments?: string[];
      dataScope?: 'self' | 'department' | 'organization';
      permissionsCachedAt?: Date;
    };
  }
}

declare global {
  namespace Express {
    interface Request {
      // RBAC enhanced session attached by middleware
      rbac?: {
        userId: number;
        role: UserRole;
        permissions: UserPermissions;
        departments?: string[];
        dataScope?: 'self' | 'department' | 'organization';
        permissionsCachedAt?: Date;
      };
    }
  }
}

export {};