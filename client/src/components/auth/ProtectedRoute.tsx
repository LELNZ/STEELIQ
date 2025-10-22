import { Redirect } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { UserPermissions } from "@/lib/auth";
import { LoadingState } from "@/components/ui/loading-spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: (keyof UserPermissions)[];
  requiredRole?: string[];
  fallback?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredPermissions = [], 
  requiredRole = [],
  fallback = "/unauthorized" 
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingState />;
  }

  if (!isAuthenticated || !user) {
    return <Redirect to="/login" />;
  }

  // Check role requirements
  if (requiredRole.length > 0 && !requiredRole.includes(user.role)) {
    console.warn(`Access denied: User role ${user.role} not in ${requiredRole.join(', ')}`);
    return <Redirect to={fallback} />;
  }

  // Check permission requirements
  const hasAllPermissions = requiredPermissions.every(
    permission => user.permissions[permission]
  );

  if (!hasAllPermissions) {
    console.warn(`Access denied: Missing permissions ${requiredPermissions.join(', ')}`);
    return <Redirect to={fallback} />;
  }

  return <>{children}</>;
}