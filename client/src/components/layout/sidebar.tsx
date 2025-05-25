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
  Slice
} from "lucide-react";

const navigation = [
  {
    name: "Main",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Jobs & Cutting", href: "/jobs", icon: Briefcase, badge: "12" },
      { name: "Material Library", href: "/materials", icon: Package },
      { name: "Inventory", href: "/inventory", icon: Warehouse, badge: "3", badgeVariant: "warning" },
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
    <div className="w-64 bg-primary text-white flex-shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-primary/20">
        <div className="flex items-center space-x-3">
          <div className="w-16 h-16 rounded-lg flex items-center justify-center bg-white/10">
            <img 
              src={logoIcon} 
              alt="Lateral Engineering Logo" 
              className="w-14 h-14 object-contain filter brightness-0 invert"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Lateral Engineering</h1>
            <p className="text-primary-foreground/70 text-sm">Steel Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6">
        {navigation.map((section) => (
          <div key={section.name} className="mb-6">
            <div className="px-6 mb-4">
              <h3 className="text-primary-foreground/70 text-xs uppercase tracking-wider font-medium">
                {section.name}
              </h3>
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = location === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center px-6 py-3 text-primary-foreground/80 hover:bg-primary/20 hover:text-white transition-colors duration-200",
                        isActive && "bg-primary/30 text-white"
                      )}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      {item.name}
                      {item.badge && (
                        <span
                            className={cn(
                              "ml-auto text-xs px-2 py-1 rounded-full",
                              item.badgeVariant === "warning"
                                ? "bg-warning text-warning-foreground"
                                : "bg-accent text-accent-foreground"
                            )}
                          >
                            {item.badge}
                          </span>
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
  );
}
