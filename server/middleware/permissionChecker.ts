import { AuthService } from "../auth";
import { Request, Response, NextFunction } from "express";

/**
 * Permission middleware for route-level permission checking
 * This provides a simpler alternative to the ServiceAuthGuard pattern
 */
export class PermissionChecker {
  /**
   * Check single permission
   */
  static require(permission: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await AuthService.getAuthenticatedUser(req);
        
        if (!user) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        
        const hasPermission = AuthService.checkPermission(user, permission, false);
        
        if (!hasPermission) {
          return res.status(403).json({ 
            error: `Access denied: Missing required permission '${permission}'` 
          });
        }
        
        // Attach user to request for later use
        (req as any).user = user;
        next();
      } catch (error) {
        console.error("Permission check error:", error);
        return res.status(500).json({ error: "Permission check failed" });
      }
    };
  }
  
  /**
   * Check any of multiple permissions
   */
  static requireAny(...permissions: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await AuthService.getAuthenticatedUser(req);
        
        if (!user) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        
        const hasPermission = AuthService.checkAnyPermission(user, permissions, false);
        
        if (!hasPermission) {
          return res.status(403).json({ 
            error: `Access denied: Requires one of [${permissions.join(', ')}]` 
          });
        }
        
        // Attach user to request for later use
        (req as any).user = user;
        next();
      } catch (error) {
        console.error("Permission check error:", error);
        return res.status(500).json({ error: "Permission check failed" });
      }
    };
  }
  
  /**
   * Check all of multiple permissions
   */
  static requireAll(...permissions: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await AuthService.getAuthenticatedUser(req);
        
        if (!user) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        
        const hasPermission = AuthService.checkAllPermissions(user, permissions, false);
        
        if (!hasPermission) {
          return res.status(403).json({ 
            error: `Access denied: Requires all permissions [${permissions.join(', ')}]` 
          });
        }
        
        // Attach user to request for later use
        (req as any).user = user;
        next();
      } catch (error) {
        console.error("Permission check error:", error);
        return res.status(500).json({ error: "Permission check failed" });
      }
    };
  }
  
  /**
   * Check if user owns the resource or has override permission
   */
  static requireOwnerOrPermission(
    ownerIdExtractor: (req: Request) => number | null,
    overridePermission: string
  ) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const user = await AuthService.getAuthenticatedUser(req);
        
        if (!user) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        
        const ownerId = ownerIdExtractor(req);
        const isOwner = ownerId === user.id;
        const hasOverride = AuthService.checkPermission(user, overridePermission, false);
        
        if (!isOwner && !hasOverride) {
          return res.status(403).json({ 
            error: `Access denied: Must be owner or have '${overridePermission}' permission` 
          });
        }
        
        // Attach user to request for later use
        (req as any).user = user;
        next();
      } catch (error) {
        console.error("Permission check error:", error);
        return res.status(500).json({ error: "Permission check failed" });
      }
    };
  }
}