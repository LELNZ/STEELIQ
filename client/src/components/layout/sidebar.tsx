import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/auth-context";
import { UserPermissions, UserRole } from "@/lib/auth";
import { 
  LayoutDashboard, 
  Briefcase, 
  Package, 
  Warehouse, 
  Zap,
  BarChart3,
  DollarSign,
  Settings,
  Settings2,
  Users,
  Slice,
  FileText,
  Building2,
  Upload,
  Calculator,
  Bot,
  Timer,
  TrendingUp,
  Mail,
  Smartphone,
  Factory,
  Calendar,
  ShoppingCart,
  Shield,
  Brain
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Define navigation items with permission requirements
interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  badgeVariant?: string;
  permissions?: (keyof UserPermissions)[];
  roles?: UserRole[];
}

interface NavSection {
  name: string;
  items: NavItem[];
  permissions?: (keyof UserPermissions)[];
  roles?: UserRole[];
}

const navigation: NavSection[] = [
  {
    name: "Core Operations",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Jobs & Production", href: "/jobs", icon: Briefcase, permissions: ['viewJobs'] },
      { name: "Procurement", href: "/procurement", icon: ShoppingCart, badge: "NEW", badgeVariant: "success", permissions: ['viewSuppliers'] },
      { name: "AI Estimation Engine", href: "/estimation", icon: Bot, permissions: ['viewJobs', 'createJobs'] },
      { name: "Estimation Pipeline", href: "/estimation-pipeline", icon: TrendingUp, permissions: ['viewJobs'] },
      { name: "Material Library", href: "/materials", icon: Package, permissions: ['viewMaterials'] },
      { name: "Inventory", href: "/inventory", icon: Warehouse, permissions: ['viewInventory'] },
      { name: "Cutting Optimization", href: "/optimization", icon: Slice, permissions: ['viewCuttingPlans'] },
      { name: "Remnant Management", href: "/remnant-management", icon: Package, permissions: ['viewInventory'] },
    ],
  },
  {
    name: "Intelligence Systems",
    items: [
      { name: "AI Control Center", href: "/ai-control-center", icon: Brain, badge: "UNIFIED", badgeVariant: "success", roles: ['owner', 'admin', 'full'] },
      { name: "Financial Intelligence", href: "/financial-intelligence", icon: TrendingUp, permissions: ['viewCosts', 'viewPricing'] },
      { name: "Email Cost Import", href: "/email-cost-import", icon: Mail, permissions: ['viewCosts', 'editPricing'] },
    ],
  },
  {
    name: "Field Operations",
    items: [
      { name: "Production Floor", href: "/production-floor", icon: Factory, permissions: ['viewJobs'] },
      { name: "Resource Planning", href: "/resource-planning", icon: Calendar, permissions: ['viewJobs', 'editJobs'] },
      { name: "Mobile Operations", href: "/mobile-operations", icon: Smartphone, badge: "NEW", badgeVariant: "success" },
    ],
  },
  {
    name: "Integration Hub",
    items: [
      { name: "Supplier Integration", href: "/supplier-integration", icon: Zap, permissions: ['viewSuppliers'] },
      { name: "Contacts", href: "/contacts", icon: Users },
    ],
  },
  {
    name: "Settings & Management",
    roles: ['owner', 'supervisor', 'admin', 'full'],
    items: [
      { name: "Organization Settings", href: "/organization-settings", icon: Building2, roles: ['owner', 'admin', 'full'] },
      { name: "Financial Settings", href: "/settings/financial", icon: DollarSign, permissions: ['viewCosts', 'manageRates'] },
      { name: "Operations Settings", href: "/settings/operations", icon: Settings2, roles: ['owner', 'admin', 'full'] },
      { name: "Team Management", href: "/team-management", icon: Users, permissions: ['manageUsers'] },
      { name: "Time & Payroll", href: "/time-payroll", icon: Timer, permissions: ['viewCosts', 'manageRates'] },
      { name: "Audit Center", href: "/settings/audit-center", icon: Shield, permissions: ['auditLogs'] },
      { name: "My Preferences", href: "/preferences", icon: Settings },
    ],
  },
];

interface SidebarProps {
  isCollapsed?: boolean;
}

export default function Sidebar({ isCollapsed = false }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  // Helper function to check if user has required permissions
  const hasPermissions = (permissions?: (keyof UserPermissions)[]) => {
    if (!permissions || permissions.length === 0) return true;
    if (!user) return false;
    return permissions.every(permission => user.permissions[permission]);
  };

  // Helper function to check if user has required role
  const hasRole = (roles?: UserRole[]) => {
    if (!roles || roles.length === 0) return true;
    if (!user) return false;
    return roles.includes(user.role);
  };

  // Filter navigation based on permissions and roles
  const filteredNavigation = navigation.map(section => {
    // Check if entire section has role/permission requirements
    if (!hasRole(section.roles) || !hasPermissions(section.permissions)) {
      return null;
    }

    // Filter items within the section
    const filteredItems = section.items.filter(item => 
      hasRole(item.roles) && hasPermissions(item.permissions)
    );

    // If no items remain after filtering, don't show the section
    if (filteredItems.length === 0) {
      return null;
    }

    return {
      ...section,
      items: filteredItems
    };
  }).filter(Boolean) as NavSection[];

  return (
    <div className={cn(
      "flex-shrink-0 p-4 pt-8 h-screen transition-all duration-300 ease-in-out",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className="bg-card rounded-xl shadow-lg border h-full flex flex-col overflow-hidden">
        {/* Navigation */}
        <nav className={cn(
          "overflow-y-auto flex-1",
          isCollapsed ? "p-2" : "p-4"
        )}>
          {filteredNavigation.map((section) => (
            <div key={section.name} className={cn(
              isCollapsed ? "mb-3" : "mb-6"
            )}>
              {!isCollapsed && (
                <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {section.name}
                </h3>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location === item.href;
                  const linkContent = (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center text-sm font-medium rounded-lg transition-colors",
                        isCollapsed ? "px-2 py-2 justify-center" : "px-3 py-2.5",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <item.icon className={cn(
                        "h-4 w-4 flex-shrink-0",
                        !isCollapsed && "mr-3"
                      )} />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1">{item.name}</span>
                          {item.badge && (
                            <Badge 
                              variant={item.badgeVariant as any || "secondary"} 
                              className="ml-2 h-5 px-2 text-xs"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  );

                  if (isCollapsed) {
                    return (
                      <li key={item.name}>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            {linkContent}
                          </TooltipTrigger>
                          <TooltipContent side="right" sideOffset={5}>
                            <div className="flex items-center gap-2">
                              <span>{item.name}</span>
                              {item.badge && (
                                <Badge 
                                  variant={item.badgeVariant as any || "secondary"} 
                                  className="h-5 px-2 text-xs"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </li>
                    );
                  }

                  return (
                    <li key={item.name}>
                      {linkContent}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}