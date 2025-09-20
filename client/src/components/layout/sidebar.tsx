import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  Shield
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navigation = [
  {
    name: "Core Operations",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Jobs & Production", href: "/jobs", icon: Briefcase, badge: "12" },
      { name: "Procurement", href: "/procurement", icon: ShoppingCart, badge: "NEW", badgeVariant: "success" },
      { name: "AI Estimation Engine", href: "/estimation", icon: Bot },
      { name: "Estimation Pipeline", href: "/estimation-pipeline", icon: TrendingUp },
      { name: "Material Library", href: "/materials", icon: Package },
      { name: "Inventory", href: "/inventory", icon: Warehouse, badge: "3", badgeVariant: "warning" },
      { name: "Cutting Optimization", href: "/optimization", icon: Slice },
      { name: "Remnant Management", href: "/remnant-management", icon: Package },
    ],
  },
  {
    name: "Intelligence Systems",
    items: [
      { name: "Financial Intelligence", href: "/financial-intelligence", icon: TrendingUp },
      { name: "Drawing Intelligence", href: "/drawing-intelligence", icon: FileText },
      { name: "Email Cost Import", href: "/email-cost-import", icon: Mail },
    ],
  },
  {
    name: "Field Operations",
    items: [
      { name: "Mobile Operations", href: "/mobile-operations", icon: Smartphone },
      { name: "Production Floor", href: "/production-floor", icon: Factory },
      { name: "Resource Planning", href: "/resource-planning", icon: Calendar },
    ],
  },
  {
    name: "Integration Hub",
    items: [
      { name: "Supplier Integration", href: "/supplier-integration", icon: Zap },
      { name: "Contacts", href: "/contacts", icon: Users },
    ],
  },
  {
    name: "Settings & Management",
    items: [
      { name: "Organization Settings", href: "/organization-settings", icon: Building2 },
      { name: "Financial Settings", href: "/settings/financial", icon: DollarSign },
      { name: "Operations Settings", href: "/settings/operations", icon: Settings2 },
      { name: "Team Management", href: "/team-management", icon: Users },
      { name: "Time & Payroll", href: "/time-payroll", icon: Timer },
      { name: "Audit Center", href: "/settings/audit-center", icon: Shield, badge: "Admin", badgeVariant: "warning" },
      { name: "My Preferences", href: "/preferences", icon: Settings },
    ],
  },
];

interface SidebarProps {
  isCollapsed?: boolean;
}

export default function Sidebar({ isCollapsed = false }: SidebarProps) {
  const [location] = useLocation();

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
          {navigation.map((section) => (
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