import { useEffect } from "react";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/lib/auth";

// Map each role to their default dashboard
const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  basic: "/dashboards/floor",
  planning: "/dashboards/planning",
  accounting: "/dashboards/accounting",
  supervisor: "/dashboards/supervisor",
  admin: "/dashboards/admin",
  full: "/dashboards/executive"
};

// Roles that should see the main dashboard in addition to their specific dashboard
const MAIN_DASHBOARD_ROLES: UserRole[] = ['supervisor', 'admin', 'full'];

interface RoleRouterProps {
  children?: React.ReactNode;
}

export function RoleRouter({ children }: RoleRouterProps) {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Only redirect if user is authenticated and on the root path
    if (isAuthenticated && user && location === "/") {
      const targetDashboard = ROLE_DASHBOARD_MAP[user.role];
      if (targetDashboard) {
        setLocation(targetDashboard);
      }
    }
  }, [isAuthenticated, user, location, setLocation]);

  // Allow main dashboard access for privileged roles
  if (location === "/dashboard" && user) {
    if (!MAIN_DASHBOARD_ROLES.includes(user.role)) {
      return <Redirect to={ROLE_DASHBOARD_MAP[user.role]} />;
    }
  }

  return <>{children}</>;
}