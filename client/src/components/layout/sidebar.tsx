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
  Smartphone,
  Factory,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navigation = [
  {
    name: "Core Operations",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Jobs & Production", href: "/jobs", icon: Briefcase, badge: "12" },
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
      { name: "My Preferences", href: "/preferences", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 flex-shrink-0 p-4 pt-8 h-screen">
      <div className="bg-card rounded-xl shadow-lg border h-full flex flex-col overflow-hidden">

        {/* Navigation */}
        <nav className="p-4 overflow-y-auto flex-1">
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