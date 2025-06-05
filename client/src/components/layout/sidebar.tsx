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
  Users,
  Slice,
  FileText,
  Building2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navigation = [
  {
    name: "Main",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Jobs & Cutting", href: "/jobs", icon: Briefcase, badge: "12" },
      { name: "Estimates & Quotes", href: "/estimates", icon: FileText, badge: "2", badgeVariant: "info" },
      { name: "Material Library", href: "/materials", icon: Package },
      { name: "Inventory", href: "/inventory", icon: Warehouse, badge: "3", badgeVariant: "warning" },
      { name: "Contacts", href: "/contacts", icon: Users },
      { name: "Financial", href: "/financial", icon: DollarSign },
      { name: "Optimization", href: "/optimization", icon: Zap },
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
      { name: "Preferences", href: "/settings", icon: Settings },
      { name: "Team Management", href: "/team", icon: Users },
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