import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import logoIcon from "@assets/LEL Symbol only.png";
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
  Smartphone
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navigation = [
  {
    name: "Main",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Jobs & Cutting", href: "/jobs", icon: Briefcase, badge: "12" },
      { name: "AI Estimation Engine", href: "/estimation", icon: Bot, badge: "ENHANCED", badgeVariant: "success" },
      { name: "Estimation Pipeline", href: "/estimation-pipeline", icon: TrendingUp, badge: "NEW", badgeVariant: "info" },
      { name: "Email Cost Import", href: "/email-cost-import", icon: Mail, badge: "PHASE 1", badgeVariant: "info" },
      { name: "Drawing Intelligence", href: "/drawing-intelligence", icon: FileText, badge: "PHASE 1", badgeVariant: "info" },
      { name: "Supplier Integration", href: "/supplier-integration", icon: Zap, badge: "PHASE 1", badgeVariant: "info" },
      { name: "Mobile Operations", href: "/mobile-operations", icon: Smartphone, badge: "PHASE 1", badgeVariant: "info" },
      { name: "Material Library", href: "/materials", icon: Package },
      { name: "Inventory", href: "/inventory", icon: Warehouse, badge: "3", badgeVariant: "warning" },
      { name: "Contacts", href: "/contacts", icon: Users },
      { name: "Financial", href: "/financial", icon: DollarSign },
      { name: "Optimization", href: "/optimization", icon: Slice },
    ],
  },
  {
    name: "Reports",
    items: [
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
      { name: "Cost Analysis", href: "/costs", icon: DollarSign },
    ],
  },
  {
    name: "Settings",
    items: [
      { name: "Organization Settings", href: "/organization-settings", icon: Building2 },
      { name: "Financial Settings", href: "/settings/financial", icon: DollarSign },
      { name: "Operations Settings", href: "/settings/operations", icon: Settings2 },
      { name: "My Preferences", href: "/preferences", icon: Settings },
    ],
  },
  {
    name: "Management",
    items: [
      { name: "Team Management", href: "/team-management", icon: Users },
      { name: "Time & Payroll", href: "/time-payroll", icon: Timer },
    ],
  },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 flex-shrink-0 p-4 pt-8">
      <div className="bg-card rounded-xl shadow-lg border h-full">

        {/* Navigation */}
        <nav className="p-4">
          {navigation.map((section) => (
            <div key={section.name} className="mb-6">
              <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {section.name}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <item.icon className="mr-3 h-4 w-4" />
                        <span className="flex-1">{item.name}</span>
                        {item.badge && (
                          <Badge 
                            variant={item.badgeVariant as any || "secondary"} 
                            className="ml-2 h-5 px-2 text-xs"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </Link>
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