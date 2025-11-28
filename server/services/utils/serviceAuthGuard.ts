import { AuthService } from "../../auth";

/**
 * Context for service method invocations
 */
export interface ServiceContext {
  user: any;
  requestId?: string;
  metadata?: Record<string, any>;
  skipPermissionCheck?: boolean; // For system/integration calls
}

/**
 * Permission requirements for a service method
 */
export interface MethodPermission {
  mode: 'single' | 'any' | 'all';
  permissions: string[];
  onDenyMessage?: string;
}

/**
 * Service permission metadata
 */
export type ServicePermissions = Record<string, MethodPermission>;

/**
 * Custom error for permission failures
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly permission?: string,
    public readonly userId?: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Service Auth Guard - Proxy-based permission enforcement
 */
export class ServiceAuthGuard {
  /**
   * Create a guarded version of a service with permission enforcement
   */
  static guard<T extends object>(
    service: T,
    permissions: ServicePermissions,
    serviceName: string
  ): T {
    return new Proxy(service, {
      get(target, prop, receiver) {
        const original = Reflect.get(target, prop, receiver);
        
        // Skip non-function properties
        if (typeof original !== 'function' || typeof prop !== 'string') {
          return original;
        }
        
        // Skip private methods (starting with _)
        if (prop.startsWith('_')) {
          return original;
        }
        
        // Get permission requirements for this method
        const methodPermission = permissions[prop];
        
        // If no permissions defined, allow but log warning
        if (!methodPermission) {
          console.warn(`[ServiceAuthGuard] No permissions defined for ${serviceName}.${prop}`);
          return original;
        }
        
        // Return wrapped method with permission checking
        return function(...args: any[]) {
          // Extract ServiceContext from first argument
          const context = args[0] as ServiceContext;
          
          // If context is missing or not valid, throw error
          if (!context || typeof context !== 'object' || !context.user) {
            throw new AuthError(
              `Invalid ServiceContext for ${serviceName}.${prop}`,
              undefined,
              undefined
            );
          }
          
          // Skip permission check if explicitly requested (for system calls)
          if (context.skipPermissionCheck === true) {
            console.log(`[ServiceAuthGuard] Skipping permission check for system call: ${serviceName}.${prop}`);
            // Remove context from args and call original method
            const methodArgs = args.slice(1);
            return original.apply(target, methodArgs);
          }
          
          // Check permissions based on mode
          let hasPermission = false;
          const { mode, permissions: requiredPerms, onDenyMessage } = methodPermission;
          
          try {
            switch (mode) {
              case 'single':
                hasPermission = AuthService.checkPermission(
                  context.user,
                  requiredPerms[0],
                  false
                );
                break;
              
              case 'any':
                hasPermission = AuthService.checkAnyPermission(
                  context.user,
                  requiredPerms,
                  false
                );
                break;
              
              case 'all':
                hasPermission = AuthService.checkAllPermissions(
                  context.user,
                  requiredPerms,
                  false
                );
                break;
            }
          } catch (error) {
            console.error(`[ServiceAuthGuard] Permission check error: ${error}`);
            hasPermission = false;
          }
          
          // If permission denied, throw AuthError
          if (!hasPermission) {
            const message = onDenyMessage || 
              `Access denied: Missing required permissions for ${serviceName}.${prop}`;
            
            throw new AuthError(
              message,
              requiredPerms.join(', '),
              context.user?.id
            );
          }
          
          // Permission granted - call original method
          // Remove context from args and pass remaining arguments
          const methodArgs = args.slice(1);
          
          // Handle both sync and async methods
          const result = original.apply(target, methodArgs);
          
          // Ensure we always return a Promise for consistency
          return Promise.resolve(result);
        };
      }
    });
  }
  
  /**
   * Helper to create permission metadata for a service
   */
  static createPermissions(
    definitions: Array<{
      methods: string[];
      mode: 'single' | 'any' | 'all';
      permissions: string[];
      message?: string;
    }>
  ): ServicePermissions {
    const permissions: ServicePermissions = {};
    
    for (const def of definitions) {
      for (const method of def.methods) {
        permissions[method] = {
          mode: def.mode,
          permissions: def.permissions,
          onDenyMessage: def.message
        };
      }
    }
    
    return permissions;
  }
}

/**
 * Helper to extract user from request for API routes
 */
export async function createServiceContext(req: any): Promise<ServiceContext | null> {
  const user = await AuthService.getAuthenticatedUser(req);
  
  if (!user) {
    return null;
  }
  
  return {
    user,
    requestId: req.headers['x-request-id'] || undefined,
    metadata: {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }
  };
}